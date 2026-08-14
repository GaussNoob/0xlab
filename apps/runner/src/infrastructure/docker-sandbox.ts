import type { CreateExecutionRequest, ExecutionResult } from "@0xlab/contracts";
import { spawn } from "node:child_process";
import { chmod, chown, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import type { ExecutionSandbox } from "../application/job-queue.js";
import { analyzeExecution, parseDiagnostics } from "../domain/analysis.js";

const MAX_OUTPUT_BYTES = 128 * 1024;

interface CommandResult {
  readonly exitCode: number;
  readonly timedOut: boolean;
}

async function runCommand(command: string, args: readonly string[], timeoutMs: number): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const child = spawn(command, args, { shell: false, windowsHide: true, signal: controller.signal, stdio: "ignore" });
    let timedOut = false;
    controller.signal.addEventListener("abort", () => { timedOut = true; });
    child.on("error", (error) => {
      clearTimeout(timeout);
      if (timedOut && error.name === "AbortError") resolve({ exitCode: 124, timedOut: true });
      else reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ exitCode: code ?? 1, timedOut });
    });
  });
}

async function readLimited(path: string): Promise<{ text: string; truncated: boolean }> {
  try {
    const buffer = await readFile(path);
    if (buffer.byteLength <= MAX_OUTPUT_BYTES) return { text: buffer.toString("utf8"), truncated: false };
    return { text: `${buffer.subarray(0, MAX_OUTPUT_BYTES).toString("utf8")}\n[output truncated by 0xLAB]`, truncated: true };
  } catch {
    return { text: "", truncated: false };
  }
}

async function readExitCode(path: string, fallback: number | null): Promise<number | null> {
  try {
    const value = Number.parseInt((await readFile(path, "utf8")).trim(), 10);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export class DockerSandbox implements ExecutionSandbox {
  constructor(
    private readonly image: string,
    private readonly timeoutMs: number,
    private readonly jobsRoot = "",
    private readonly jobsVolume: string | null = null
  ) {}

  async execute(jobId: string, request: CreateExecutionRequest): Promise<ExecutionResult> {
    const root = this.jobsRoot || tmpdir();
    const workspace = await mkdtemp(join(root, `0xlab-${jobId.slice(0, 8)}-`));
    const containerName = `oxlab-job-${jobId}`;
    const startedAt = performance.now();
    let timedOut = false;

    try {
      await chmod(workspace, 0o770).catch(() => undefined);
      await chown(workspace, 10001, 10001).catch(async () => chmod(workspace, 0o777).catch(() => undefined));
      await Promise.all(request.files.map((file) => writeFile(join(workspace, file.name), file.content, { encoding: "utf8", mode: 0o644 })));
      await writeFile(join(workspace, "stdin.txt"), request.stdin ?? "", { encoding: "utf8", mode: 0o644 });
      const sources = request.files.filter((file) => /\.(?:c|cc|cpp|cxx)$/.test(file.name)).map((file) => file.name);
      const workspaceName = basename(workspace);
      const mountArguments = this.jobsVolume
        ? ["--mount", `type=volume,src=${this.jobsVolume},dst=/workspace,volume-subpath=${workspaceName}`]
        : ["--volume", `${workspace}:/workspace:rw`];
      const args = [
        "run", "--rm", "--name", containerName,
        "--network", "none",
        "--cpus", "0.50",
        "--memory", "256m",
        "--memory-swap", "256m",
        "--pids-limit", "64",
        "--read-only",
        "--tmpfs", "/tmp:rw,noexec,nosuid,nodev,size=32m",
        "--cap-drop", "ALL",
        "--security-opt", "no-new-privileges:true",
        "--user", "10001:10001",
        "--ulimit", "nofile=64:64",
        "--ulimit", "fsize=2097152:2097152",
        ...mountArguments,
        this.image,
        "/opt/0xlab/run-job.sh",
        request.compiler,
        ...request.flags,
        "--",
        ...sources
      ];

      const command = await runCommand("docker", args, this.timeoutMs);
      timedOut = command.timedOut;
      if (timedOut) await runCommand("docker", ["rm", "--force", containerName], 3_000).catch(() => undefined);

      const [compileStdout, compileStderr, stdout, stderr, disassembly, sections] = await Promise.all([
        readLimited(join(workspace, "compile.stdout")),
        readLimited(join(workspace, "compile.stderr")),
        readLimited(join(workspace, "run.stdout")),
        readLimited(join(workspace, "run.stderr")),
        readLimited(join(workspace, "disassembly.txt")),
        readLimited(join(workspace, "sections.txt"))
      ]);
      const compileExitCode = (await readExitCode(join(workspace, "compile.exit"), command.exitCode)) ?? command.exitCode;
      const runExitCode = compileExitCode === 0 ? await readExitCode(join(workspace, "run.exit"), timedOut ? 124 : command.exitCode) : null;
      const timeoutMarker = await readExitCode(join(workspace, "run.timeout"), 0) === 1;
      const oomKilled = await readExitCode(join(workspace, "run.oom"), 0) === 1;
      const effectiveTimeout = timedOut || compileExitCode === 124 || runExitCode === 124 || timeoutMarker;
      const analysis = analyzeExecution({ compileExitCode, runExitCode, compileStderr: compileStderr.text, stderr: stderr.text, timedOut: effectiveTimeout, oomKilled });

      return {
        compileExitCode,
        runExitCode,
        compileStdout: compileStdout.text,
        compileStderr: compileStderr.text,
        stdout: stdout.text,
        stderr: stderr.text,
        durationMs: Math.round(performance.now() - startedAt),
        timedOut: effectiveTimeout,
        truncated: compileStdout.truncated || compileStderr.truncated || stdout.truncated || stderr.truncated,
        diagnostics: parseDiagnostics(compileStderr.text),
        analysis,
        ...(disassembly.text || sections.text ? {
          artifacts: {
            disassembly: disassembly.text,
            sections: sections.text,
            provenance: "real-compiler-artifact" as const,
            addressSemantics: "link-time-virtual-address" as const
          }
        } : {})
      };
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }
}
