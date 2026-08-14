import type { ExecutionJob } from "@0xlab/contracts";

export type LabLanguage = "c" | "cpp" | "asm";
export type LabMode = "simulation" | "native";
export type Architecture = "x86-64" | "x86";
export type AssemblySyntax = "intel" | "att";
export type ExplanationLevel = "beginner" | "advanced" | "low-level";
export type VisualizerKind = "cpu" | "stack" | "heap" | "pointers" | "memory" | "cfg";
export type PanelId = "source" | "assembly" | "visualizer";

export interface LabFile {
  readonly id: string;
  readonly name: string;
  readonly language: LabLanguage;
  readonly content: string;
}

export interface LabPreset {
  readonly id: string;
  readonly title: string;
  readonly group: "C / Memory" | "Assembly";
  readonly description: string;
  readonly architecture: Architecture;
  readonly files: readonly Omit<LabFile, "id">[];
  readonly watches: readonly string[];
}

export type RegisterName =
  | "RAX" | "RBX" | "RCX" | "RDX"
  | "RSI" | "RDI" | "RBP" | "RSP"
  | "R8" | "R9" | "R10" | "R11"
  | "R12" | "R13" | "R14" | "R15";

export interface SimFlags {
  readonly ZF: 0 | 1;
  readonly CF: 0 | 1;
  readonly OF: 0 | 1;
  readonly SF: 0 | 1;
  readonly PF: 0 | 1;
}

export interface SimStackCell {
  readonly id: string;
  readonly address: bigint;
  readonly value: bigint;
  readonly label: string;
}

export interface CpuState {
  readonly registers: Readonly<Record<RegisterName, bigint>>;
  readonly flags: SimFlags;
  readonly memory: Readonly<Record<string, bigint>>;
  readonly stack: readonly SimStackCell[];
  readonly callStack: readonly string[];
  readonly instructionIndex: number;
  readonly halted: boolean;
}

export interface ParsedInstruction {
  readonly id: string;
  readonly line: number;
  readonly source: string;
  readonly mnemonic: string;
  readonly operands: readonly string[];
  readonly label?: string;
}

export interface SimulationEvent {
  readonly instruction: ParsedInstruction;
  readonly before: CpuState;
  readonly after: CpuState;
  readonly changedRegisters: readonly RegisterName[];
  readonly changedFlags: readonly (keyof SimFlags)[];
  readonly memoryRead?: string;
  readonly memoryWrite?: string;
  readonly explanation: {
    readonly beginner: string;
    readonly advanced: string;
    readonly "low-level": string;
  };
  readonly stage: "fetch" | "decode" | "execute" | "memory" | "write-back";
}

export interface SimulationSnapshot {
  readonly state: CpuState;
  readonly event?: SimulationEvent;
}

export interface CTraceEvent {
  readonly id: string;
  readonly line: number;
  readonly source: string;
  readonly title: string;
  readonly detail: string;
  readonly kind: "declare" | "pointer" | "allocation" | "write" | "read" | "call" | "free" | "return";
}

export type SourceVisualNodeKind =
  | "source"
  | "function"
  | "instruction"
  | "branch"
  | "return"
  | "register"
  | "variable"
  | "pointer"
  | "array"
  | "struct"
  | "field"
  | "heap"
  | "memory";

export interface SourceVisualNode {
  readonly id: string;
  readonly kind: SourceVisualNodeKind;
  readonly label: string;
  readonly detail: string;
  readonly line?: number;
  readonly value?: string;
  readonly status?: "active" | "uninitialized" | "freed";
}

export interface SourceVisualEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly label: string;
}

export interface SourceMemoryCell {
  readonly id: string;
  readonly ownerId: string;
  readonly label: string;
  readonly offset: number;
  readonly size: number;
  readonly value: string;
  readonly status: "active" | "uninitialized" | "freed";
}

/**
 * Static, source-derived data used by the educational visualizers. It never
 * represents a native process address or a captured runtime value.
 */
export interface SourceVisualModel {
  readonly language: LabLanguage;
  readonly fingerprint: string;
  readonly title: string;
  readonly nodes: readonly SourceVisualNode[];
  readonly edges: readonly SourceVisualEdge[];
  readonly memoryCells: readonly SourceMemoryCell[];
  readonly stackNodeIds: readonly string[];
  readonly heapNodeIds: readonly string[];
  readonly pointerNodeIds: readonly string[];
  readonly cfgNodeIds: readonly string[];
  readonly registers: readonly string[];
  readonly instructionCount: number;
}

export interface SavedExperiment {
  readonly id: string;
  readonly name: string;
  readonly files: readonly LabFile[];
  readonly compiler: string;
  readonly optimization: string;
  readonly architecture: Architecture;
  readonly syntax: AssemblySyntax;
  readonly flags: readonly string[];
  readonly watches: readonly string[];
  readonly breakpoints: Readonly<Record<string, readonly number[]>>;
  readonly panelOrder: readonly PanelId[];
  readonly hiddenPanels: readonly string[];
  readonly updatedAt: string;
}

export interface RunHistoryEntry {
  readonly id: string;
  readonly jobId?: string;
  readonly timestamp: string;
  readonly compiler: string;
  readonly optimization: string;
  readonly status: "Success" | "Build error" | "Crash" | "Memory error" | "Unavailable";
  readonly durationMs?: number;
  readonly instructionCount?: number;
  readonly job?: ExecutionJob;
}

export interface ManualSnapshot {
  readonly id: string;
  readonly label: string;
  readonly createdAt: string;
  readonly sourceStep: number;
  readonly state: CpuState;
}
