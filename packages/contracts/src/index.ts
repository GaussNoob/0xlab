export const COMPILERS = ["gcc", "g++", "clang", "clang++"] as const;
export const LANGUAGES = ["c", "cpp"] as const;
export const TARGETS = ["linux"] as const;

export type Compiler = (typeof COMPILERS)[number];
export type Language = (typeof LANGUAGES)[number];
export type ExecutionTarget = (typeof TARGETS)[number];

export const ALLOWED_COMPILER_FLAGS = [
  "-Wall",
  "-Wextra",
  "-Wpedantic",
  "-Wconversion",
  "-Wshadow",
  "-g",
  "-O0",
  "-O1",
  "-O2",
  "-O3",
  "-Os",
  "-Og",
  "-fno-omit-frame-pointer",
  "-std=c17",
  "-std=c23",
  "-std=c++17",
  "-std=c++20",
  "-std=c++23",
  "-fsanitize=address",
  "-fsanitize=undefined",
  "-pthread"
] as const;

export interface CompilerArtifacts {
  /** Disassembly produced from the compiled binary by objdump. */
  readonly disassembly: string;
  /** ELF section table produced by readelf. */
  readonly sections: string;
  /** Makes the provenance boundary explicit to every consumer. */
  readonly provenance: "real-compiler-artifact";
  readonly addressSemantics: "link-time-virtual-address";
}

export interface SourceFile {
  readonly name: string;
  readonly content: string;
}

export interface CreateExecutionRequest {
  readonly language: Language;
  readonly compiler: Compiler;
  readonly target: ExecutionTarget;
  readonly files: readonly SourceFile[];
  readonly flags: readonly string[];
  readonly stdin?: string;
}

export type ExecutionStatus = "queued" | "compiling" | "running" | "completed" | "failed";

export interface CompilerDiagnostic {
  readonly severity: "error" | "warning" | "note";
  readonly file?: string;
  readonly line?: number;
  readonly column?: number;
  readonly message: string;
}

export interface ExecutionAnalysis {
  readonly headline: string;
  readonly summary: string;
  readonly category: "success" | "compiler" | "memory" | "undefined-behavior" | "runtime" | "timeout";
  readonly suggestions: readonly string[];
}

export interface ExecutionResult {
  readonly compileExitCode: number;
  readonly runExitCode: number | null;
  readonly compileStdout: string;
  readonly compileStderr: string;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
  readonly timedOut: boolean;
  readonly truncated: boolean;
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly analysis: ExecutionAnalysis;
  readonly artifacts?: CompilerArtifacts;
}

export interface ExecutionJob {
  readonly id: string;
  readonly status: ExecutionStatus;
  readonly createdAt: string;
  readonly startedAt?: string;
  readonly finishedAt?: string;
  readonly result?: ExecutionResult;
  readonly error?: string;
}

export interface CreateExecutionResponse {
  readonly jobId: string;
  readonly status: ExecutionStatus;
}

export interface ProgressSnapshot {
  readonly completedLessonIds: readonly string[];
  readonly completedExerciseIds: readonly string[];
  readonly completedChallengeIds: readonly string[];
  readonly studyMinutes: number;
  readonly lastLessonId: string | null;
  readonly updatedAt: string;
}
