import type { CreateExecutionRequest, CreateExecutionResponse, ExecutionJob } from "@0xlab/contracts";

const runnerUrl = process.env.RUNNER_URL ?? "http://127.0.0.1:8787";
const runnerToken = process.env.RUNNER_API_TOKEN ?? "local-development-token";

export class RunnerUnavailableError extends Error {
  constructor() {
    super("O runner isolado não está disponível. Inicie o Docker Compose para executar código nativo.");
    this.name = "RunnerUnavailableError";
  }
}

async function runnerFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${runnerUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        authorization: `Bearer ${runnerToken}`,
        "content-type": "application/json",
        ...init?.headers
      },
      signal: AbortSignal.timeout(4_000)
    });
  } catch {
    throw new RunnerUnavailableError();
  }
}

export async function createExecution(request: CreateExecutionRequest): Promise<CreateExecutionResponse> {
  const response = await runnerFetch("/v1/executions", { method: "POST", body: JSON.stringify(request) });
  const body = await response.json() as CreateExecutionResponse | { error?: string };
  if (!response.ok) throw new Error("error" in body ? body.error ?? "Execution was rejected." : "Execution was rejected.");
  return body as CreateExecutionResponse;
}

export async function getExecution(jobId: string): Promise<ExecutionJob> {
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) throw new Error("Invalid execution id.");
  const response = await runnerFetch(`/v1/executions/${jobId}`);
  const body = await response.json() as ExecutionJob | { error?: string };
  if (!response.ok) throw new Error("error" in body ? body.error ?? "Execution not found." : "Execution not found.");
  return body as ExecutionJob;
}

export async function getRunnerHealth(): Promise<"online" | "offline"> {
  try {
    const response = await fetch(`${runnerUrl}/health`, { cache: "no-store", signal: AbortSignal.timeout(1_500) });
    return response.ok ? "online" : "offline";
  } catch {
    return "offline";
  }
}

