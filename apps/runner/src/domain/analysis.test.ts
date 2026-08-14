import { describe, expect, it } from "vitest";
import { analyzeExecution, parseDiagnostics } from "./analysis.js";

describe("parseDiagnostics", () => {
  it("parses GCC diagnostics and strips the sandbox path", () => {
    expect(parseDiagnostics("/workspace/main.c:7:12: warning: unused variable 'x' [-Wunused-variable]")).toEqual([
      { severity: "warning", file: "main.c", line: 7, column: 12, message: "unused variable 'x' [-Wunused-variable]" }
    ]);
  });
});

describe("analyzeExecution", () => {
  it("recognizes an AddressSanitizer bounds error", () => {
    const result = analyzeExecution({
      compileExitCode: 0,
      runExitCode: 1,
      compileStderr: "",
      stderr: "ERROR: AddressSanitizer: stack-buffer-overflow at /workspace/main.c:17",
      timedOut: false
    });
    expect(result.category).toBe("memory");
    expect(result.summary).toContain("main.c:17");
  });

  it("extracts a GCC sanitizer frame location", () => {
    const result = analyzeExecution({
      compileExitCode: 0,
      runExitCode: 1,
      compileStderr: "",
      stderr: "ERROR: AddressSanitizer: stack-buffer-overflow\n    #0 0x123 in main /workspace/main.c:4",
      timedOut: false
    });
    expect(result.summary).toContain("main.c:4");
  });

  it("explains a cgroup out-of-memory kill", () => {
    const result = analyzeExecution({
      compileExitCode: 0,
      runExitCode: 137,
      compileStderr: "",
      stderr: "",
      timedOut: false,
      oomKilled: true
    });
    expect(result.category).toBe("memory");
    expect(result.headline).toContain("limite de memória");
  });
});
