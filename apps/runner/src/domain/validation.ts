import {
  ALLOWED_COMPILER_FLAGS,
  COMPILERS,
  LANGUAGES,
  type Compiler,
  type CreateExecutionRequest,
  type ExecutionTarget,
  type Language,
  type SourceFile
} from "@0xlab/contracts";

const MAX_FILES = 12;
const MAX_FILE_BYTES = 64 * 1024;
const MAX_TOTAL_BYTES = 256 * 1024;
const MAX_STDIN_BYTES = 16 * 1024;
const SAFE_FILE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}\.(?:c|cc|cpp|cxx|h|hpp)$/;
const allowedFlags = new Set<string>(ALLOWED_COMPILER_FLAGS);

export class InvalidExecutionRequest extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidExecutionRequest";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateFile(value: unknown): SourceFile {
  if (!isRecord(value) || typeof value.name !== "string" || typeof value.content !== "string") {
    throw new InvalidExecutionRequest("Each file requires string name and content fields.");
  }
  if (!SAFE_FILE_NAME.test(value.name) || value.name.includes("..")) {
    throw new InvalidExecutionRequest(`Unsafe or unsupported filename: ${value.name}`);
  }
  if (Buffer.byteLength(value.content, "utf8") > MAX_FILE_BYTES) {
    throw new InvalidExecutionRequest(`${value.name} exceeds the 64 KiB file limit.`);
  }
  return { name: value.name, content: value.content };
}

export function validateExecutionRequest(value: unknown): CreateExecutionRequest {
  if (!isRecord(value)) throw new InvalidExecutionRequest("Request body must be an object.");
  if (!LANGUAGES.includes(value.language as Language)) throw new InvalidExecutionRequest("Unsupported language.");
  if (!COMPILERS.includes(value.compiler as Compiler)) throw new InvalidExecutionRequest("Unsupported compiler.");
  if (value.target !== "linux") throw new InvalidExecutionRequest("Only the isolated Linux target is executable in this release.");
  if (!Array.isArray(value.files) || value.files.length === 0 || value.files.length > MAX_FILES) {
    throw new InvalidExecutionRequest(`Provide between 1 and ${MAX_FILES} source files.`);
  }
  if (!Array.isArray(value.flags) || value.flags.some((flag) => typeof flag !== "string" || !allowedFlags.has(flag))) {
    throw new InvalidExecutionRequest("One or more compiler flags are not allowed.");
  }
  if (value.stdin !== undefined && typeof value.stdin !== "string") throw new InvalidExecutionRequest("stdin must be a string.");
  if (Buffer.byteLength(value.stdin ?? "", "utf8") > MAX_STDIN_BYTES) throw new InvalidExecutionRequest("stdin exceeds 16 KiB.");

  const files = value.files.map(validateFile);
  const uniqueNames = new Set(files.map((file) => file.name));
  if (uniqueNames.size !== files.length) throw new InvalidExecutionRequest("Filenames must be unique.");
  if (files.reduce((total, file) => total + Buffer.byteLength(file.content, "utf8"), 0) > MAX_TOTAL_BYTES) {
    throw new InvalidExecutionRequest("Combined source size exceeds 256 KiB.");
  }

  const language = value.language as Language;
  const compiler = value.compiler as Compiler;
  if (language === "c" && (compiler === "g++" || compiler === "clang++")) {
    throw new InvalidExecutionRequest("Select gcc or clang for C sources.");
  }
  if (language === "cpp" && (compiler === "gcc" || compiler === "clang")) {
    throw new InvalidExecutionRequest("Select g++ or clang++ for C++ sources.");
  }

  return {
    language,
    compiler,
    target: value.target as ExecutionTarget,
    files,
    flags: [...new Set(value.flags as string[])],
    ...(value.stdin === undefined ? {} : { stdin: value.stdin as string })
  };
}

