"use client";

import type { CreateExecutionResponse, ExecutionJob } from "@0xlab/contracts";
import {
  Activity,
  AlertTriangle,
  Binary,
  Box,
  Boxes,
  Braces,
  Bug,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  Clock3,
  Code2,
  Columns3,
  Copy,
  Cpu,
  FileCode2,
  FilePlus2,
  Flag,
  FolderOpen,
  Gauge,
  GitBranch,
  GripVertical,
  HardDrive,
  History,
  Layers3,
  LayoutDashboard,
  LoaderCircle,
  Maximize2,
  MemoryStick,
  Minus,
  Network,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  SkipBack,
  StepForward,
  TerminalSquare,
  Trash2,
  X,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { CpuScene } from "./cpu-scene";
import { LabEditor } from "./lab-editor";
import {
  AssemblyPane,
  extractAssemblyRows,
  InspectorOrigin,
  MemoryInspector,
  PanelFrame,
  RegisterInspector,
  StackInspector,
  Visualizer2D,
  type AssemblyRow
} from "./lab-panels";
import { createBlankFile, instantiatePreset, LAB_PRESETS } from "./presets";
import { analyzeSourceVisualModel } from "./source-model";
import {
  createInitialCpuState,
  formatHex,
  inferCAssemblyPreview,
  inferCTrace,
  instructionCount,
  parseAssembly,
  replaceMemory,
  replaceRegister,
  stepCpu
} from "./simulator";
import type {
  Architecture,
  AssemblySyntax,
  ExplanationLevel,
  LabFile,
  LabLanguage,
  LabMode,
  ManualSnapshot,
  PanelId,
  RegisterName,
  RunHistoryEntry,
  SavedExperiment,
  SimFlags,
  SimulationSnapshot,
  VisualizerKind
} from "./types";

type BottomTab = "terminal" | "compiler" | "debugger" | "analysis" | "timeline" | "hex" | "memory-map";
type ExplorerTab = "workspace" | "presets" | "experiments";

const DEFAULT_FILES: readonly LabFile[] = LAB_PRESETS[0]!.files.map((file, index) => ({ ...file, id: `initial-${index}` }));
const REGISTER_ORDER: readonly RegisterName[] = ["RAX", "RBX", "RCX", "RDX", "RSI", "RDI", "RSP", "RBP", "R8", "R9", "R10", "R11", "R12", "R13", "R14", "R15"];
const OPTIMIZATIONS = ["-O0", "-O1", "-O2", "-O3", "-Os", "-Og"] as const;
const EXTRA_FLAGS = ["-Wall", "-Wextra", "-Wpedantic", "-Wconversion", "-Wshadow", "-g", "-fno-omit-frame-pointer", "-fsanitize=address", "-fsanitize=undefined"] as const;
const PANEL_LABELS: Readonly<Record<string, string>> = {
  source: "Source Editor", assembly: "Assembly", visualizer: "Visualizer",
  registers: "Registers", memory: "Memory", stack: "Stack"
};

function compilerFor(language: LabLanguage, compiler: "GCC" | "Clang"): "gcc" | "g++" | "clang" | "clang++" {
  if (language === "cpp") return compiler === "GCC" ? "g++" : "clang++";
  return compiler === "GCC" ? "gcc" : "clang";
}

function languageLabel(language: LabLanguage): string {
  return language === "cpp" ? "C++23" : language === "asm" ? "Assembly" : "C17";
}

function statusFor(job: ExecutionJob): RunHistoryEntry["status"] {
  if (job.status === "failed" || !job.result) return "Unavailable";
  if (job.result.compileExitCode !== 0) return "Build error";
  if (job.result.analysis.category === "memory" || job.result.analysis.category === "undefined-behavior") return "Memory error";
  if (job.result.runExitCode !== 0) return "Crash";
  return "Success";
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(iso));
}

function parseUserValue(value: string): bigint {
  const normalized = value.trim().replace(/_/g, "");
  if (!/^-?(?:0x[\da-f]+|\d+)$/i.test(normalized)) throw new Error("Use decimal ou hexadecimal, por exemplo 256 ou 0x100.");
  return BigInt(normalized);
}

interface OriginChipProps {
  readonly real: boolean;
  readonly children?: ReactNode;
}

function OriginChip({ real, children }: OriginChipProps) {
  return <span className="ll-data-origin" data-real={real}><CircleDot size={8} />{children ?? (real ? "REAL EXECUTION DATA" : "EDUCATIONAL SIMULATION")}</span>;
}

export function LowLevelLab() {
  const [files, setFiles] = useState<LabFile[]>([...DEFAULT_FILES]);
  const [activeFileId, setActiveFileId] = useState(DEFAULT_FILES[0]!.id);
  const [mode, setMode] = useState<LabMode>("simulation");
  const [architecture, setArchitecture] = useState<Architecture>("x86-64");
  const [syntax, setSyntax] = useState<AssemblySyntax>("intel");
  const [assembler, setAssembler] = useState<"NASM" | "GAS">("NASM");
  const [compiler, setCompiler] = useState<"GCC" | "Clang">("GCC");
  const [optimization, setOptimization] = useState("-O0");
  const [extraFlags, setExtraFlags] = useState<string[]>(["-Wall", "-Wextra", "-Wpedantic", "-g", "-fno-omit-frame-pointer"]);
  const [explanationLevel, setExplanationLevel] = useState<ExplanationLevel>("advanced");
  const [fontSize, setFontSize] = useState(14);
  const [breakpoints, setBreakpoints] = useState<Record<string, readonly number[]>>({});
  const [watches, setWatches] = useState<string[]>([...LAB_PRESETS[0]!.watches]);
  const [latestJob, setLatestJob] = useState<ExecutionJob | null>(null);
  const [builtRevision, setBuiltRevision] = useState(-1);
  const [sourceRevision, setSourceRevision] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [runHistory, setRunHistory] = useState<RunHistoryEntry[]>([]);
  const [manualSnapshots, setManualSnapshots] = useState<ManualSnapshot[]>([]);
  const [simSnapshots, setSimSnapshots] = useState<SimulationSnapshot[]>([{ state: createInitialCpuState() }]);
  const [simCursor, setSimCursor] = useState(0);
  const [cCursor, setCCursor] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visualizerKind, setVisualizerKind] = useState<VisualizerKind>("pointers");
  const [visualDimension, setVisualDimension] = useState<"2d" | "3d">("3d");
  const [animateScene, setAnimateScene] = useState(true);
  const [bottomTab, setBottomTab] = useState<BottomTab>("timeline");
  const [explorerTab, setExplorerTab] = useState<ExplorerTab>("workspace");
  const [panelOrder, setPanelOrder] = useState<PanelId[]>(["source", "assembly", "visualizer"]);
  const [hiddenPanels, setHiddenPanels] = useState<string[]>([]);
  const [maximizedPanel, setMaximizedPanel] = useState<PanelId | null>(null);
  const [panelSizes, setPanelSizes] = useState<Record<PanelId, number>>({ source: 1.28, assembly: 0.96, visualizer: 0.9 });
  const [draggedPanel, setDraggedPanel] = useState<PanelId | null>(null);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [memoryRadix, setMemoryRadix] = useState("hex");
  const [assemblySelectedLine, setAssemblySelectedLine] = useState<number | undefined>();
  const [experiments, setExperiments] = useState<SavedExperiment[]>([]);
  const [activeExperimentName, setActiveExperimentName] = useState("untitled-experiment");
  const runTokenRef = useRef(0);
  const panelStageRef = useRef<HTMLDivElement | null>(null);

  const activeFile = files.find((file) => file.id === activeFileId) ?? files[0]!;
  const activeLanguage = activeFile?.language ?? "c";
  const parsedProgram = useMemo(() => parseAssembly(activeLanguage === "asm" ? activeFile.content : ""), [activeFile.content, activeLanguage]);
  const cTrace = useMemo(() => activeLanguage === "asm" ? [] : inferCTrace(activeFile.content), [activeFile.content, activeLanguage]);
  const visualModel = useMemo(() => analyzeSourceVisualModel(activeFile.content, activeLanguage), [activeFile.content, activeLanguage]);
  const currentSnapshot = simSnapshots[simCursor] ?? simSnapshots[0]!;
  const currentEvent = currentSnapshot.event;
  const currentCEvent = cCursor >= 0 ? cTrace[cCursor] : undefined;
  const simulationActive = mode === "simulation";
  const artifactCurrent = builtRevision === sourceRevision ? latestJob?.result?.artifacts : undefined;
  const hasRealArtifact = Boolean(artifactCurrent?.disassembly);
  const nativeRows = useMemo(() => extractAssemblyRows(artifactCurrent?.disassembly), [artifactCurrent?.disassembly]);
  const sourcePreviewRows = useMemo<readonly AssemblyRow[]>(() => (
    inferCAssemblyPreview(activeFile.content).map((instruction) => ({
      id: instruction.id,
      address: "src",
      bytes: "preview",
      instruction: instruction.instruction,
      sourceLine: instruction.sourceLine,
      real: false
    }))
  ), [activeFile.content]);
  const assemblyRows = useMemo<readonly AssemblyRow[]>(() => {
    if (hasRealArtifact) return nativeRows;
    if (activeLanguage === "asm") return parsedProgram.instructions.map((instruction, index) => ({
      id: instruction.id,
      address: `IP#${String(index).padStart(3, "0")}`,
      bytes: "compile for bytes",
      instruction: instruction.source,
      sourceLine: instruction.line,
      real: false
    }));
    return sourcePreviewRows;
  }, [activeLanguage, hasRealArtifact, nativeRows, parsedProgram.instructions, sourcePreviewRows]);
  const highlightedSourceLine = assemblySelectedLine
    ?? (activeLanguage === "asm" ? currentEvent?.instruction.line : currentCEvent?.line);

  useEffect(() => {
    try {
      const savedExperiments = JSON.parse(window.localStorage.getItem("0xlab.low-level.experiments") ?? "[]") as SavedExperiment[];
      const savedHistory = JSON.parse(window.localStorage.getItem("0xlab.low-level.run-history") ?? "[]") as RunHistoryEntry[];
      if (Array.isArray(savedExperiments)) setExperiments(savedExperiments);
      if (Array.isArray(savedHistory)) setRunHistory(savedHistory.slice(0, 20));
      const savedFontSize = Number.parseInt(window.localStorage.getItem("0xlab.low-level.font-size") ?? "", 10);
      if (savedFontSize >= 11 && savedFontSize <= 22) setFontSize(savedFontSize);

      const importedRaw = window.sessionStorage.getItem("0xlab.code-import");
      if (importedRaw) {
        const imported = JSON.parse(importedRaw) as { source?: unknown; filename?: unknown; language?: unknown; destination?: unknown };
        if (imported.destination === "low-level" && typeof imported.source === "string") {
          const language: LabLanguage = imported.language === "asm" ? "asm" : imported.language === "cpp" ? "cpp" : "c";
          const extension = language === "asm" ? "asm" : language === "cpp" ? "cpp" : "c";
          const file: LabFile = {
            id: `lesson-import-${Date.now()}`,
            name: typeof imported.filename === "string" ? imported.filename : `lesson.${extension}`,
            language,
            content: imported.source
          };
          setFiles([file]);
          setActiveFileId(file.id);
          setActiveExperimentName("lesson-experiment");
          setWatches(language === "asm" ? ["RAX", "RBX", "RSP", "ZF"] : []);
          setVisualizerKind(language === "asm" ? "cpu" : "memory");
          setSourceRevision((revision) => revision + 1);
          window.sessionStorage.removeItem("0xlab.code-import");
        }
      }
    } catch {
      // A corrupt local preference must never block access to the lab.
    }
  }, []);

  useEffect(() => {
    setIsPlaying(false);
    setSimSnapshots([{ state: createInitialCpuState() }]);
    setSimCursor(0);
    setCCursor(-1);
    setAssemblySelectedLine(undefined);
  }, [activeFile.id, activeFile.content]);

  const stepOnce = useCallback(() => {
    if (!simulationActive) return;
    if (activeLanguage === "asm") {
      if (simCursor < simSnapshots.length - 1) {
        const nextIndex = simCursor + 1;
        setSimCursor(nextIndex);
        const nextLine = simSnapshots[nextIndex]?.event?.instruction.line;
        if (nextLine && breakpoints[activeFile.id]?.includes(nextLine)) setIsPlaying(false);
        return;
      }
      if (currentSnapshot.state.halted || simSnapshots.length > 200) {
        setIsPlaying(false);
        return;
      }
      const next = stepCpu(parsedProgram, currentSnapshot.state);
      if (!next.event) {
        setIsPlaying(false);
        return;
      }
      setSimSnapshots((current) => [...current, next]);
      setSimCursor((current) => current + 1);
      if (next.state.halted || breakpoints[activeFile.id]?.includes(next.event.instruction.line)) setIsPlaying(false);
    } else {
      const nextIndex = cCursor + 1;
      if (nextIndex >= cTrace.length) {
        setIsPlaying(false);
        return;
      }
      setCCursor(nextIndex);
      if (breakpoints[activeFile.id]?.includes(cTrace[nextIndex]!.line) || nextIndex === cTrace.length - 1) setIsPlaying(false);
    }
  }, [activeFile.id, activeLanguage, breakpoints, cCursor, cTrace, currentSnapshot.state, parsedProgram, simCursor, simSnapshots, simulationActive]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setTimeout(stepOnce, 520);
    return () => window.clearTimeout(timer);
  }, [isPlaying, stepOnce]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F7") { event.preventDefault(); stepOnce(); }
      if (event.key === "F5") { event.preventDefault(); setIsPlaying((value) => !value); }
      if (event.key === "F6") { event.preventDefault(); resetSimulation(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [stepOnce]);

  function updateActiveFile(content: string) {
    setFiles((current) => current.map((file) => file.id === activeFile.id ? { ...file, content } : file));
    setSourceRevision((revision) => revision + 1);
  }

  function toggleBreakpoint(line: number) {
    setBreakpoints((current) => {
      const existing = current[activeFile.id] ?? [];
      return { ...current, [activeFile.id]: existing.includes(line) ? existing.filter((item) => item !== line) : [...existing, line].sort((a, b) => a - b) };
    });
  }

  function addFile() {
    const choice = window.prompt("Linguagem do novo arquivo: c, cpp ou asm", activeLanguage);
    if (!choice) return;
    const language: LabLanguage = choice.toLowerCase() === "cpp" || choice.toLowerCase() === "c++" ? "cpp" : choice.toLowerCase() === "asm" || choice.toLowerCase() === "assembly" ? "asm" : "c";
    const file = createBlankFile(language, files.length + 1);
    setFiles((current) => [...current, file]);
    setActiveFileId(file.id);
    setSourceRevision((revision) => revision + 1);
  }

  function renameFile(file: LabFile) {
    const name = window.prompt("Nome do arquivo", file.name)?.trim();
    if (!name || name.includes("/") || name.includes("\\")) return;
    setFiles((current) => current.map((item) => item.id === file.id ? { ...item, name } : item));
    setSourceRevision((revision) => revision + 1);
  }

  function deleteFile(file: LabFile) {
    if (files.length === 1) return;
    const remaining = files.filter((item) => item.id !== file.id);
    setFiles(remaining);
    setBreakpoints((current) => { const next = { ...current }; delete next[file.id]; return next; });
    if (activeFileId === file.id) setActiveFileId(remaining[0]!.id);
    setSourceRevision((revision) => revision + 1);
  }

  function loadPreset(presetId: string) {
    const preset = LAB_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    const nextFiles = instantiatePreset(preset);
    setFiles(nextFiles);
    setActiveFileId(nextFiles[0]!.id);
    setArchitecture(preset.architecture);
    setWatches([...preset.watches]);
    setBreakpoints({});
    setLatestJob(null);
    setBuiltRevision(-1);
    setSourceRevision((revision) => revision + 1);
    setActiveExperimentName(preset.title.toLowerCase().replace(/\s+/g, "-"));
    setMode("simulation");
    setVisualizerKind(preset.group === "Assembly" ? "cpu" : preset.id.includes("stack") || preset.id === "recursion" ? "stack" : preset.id.includes("buffer") || preset.id.includes("free") ? "heap" : "pointers");
    setExplorerTab("workspace");
  }

  function resetSimulation() {
    setIsPlaying(false);
    setSimSnapshots([{ state: createInitialCpuState() }]);
    setSimCursor(0);
    setCCursor(-1);
  }

  function stepBack() {
    setIsPlaying(false);
    if (activeLanguage === "asm") setSimCursor((current) => Math.max(0, current - 1));
    else setCCursor((current) => Math.max(-1, current - 1));
  }

  function stopRun() {
    runTokenRef.current += 1;
    setIsRunning(false);
    setIsPlaying(false);
    setRequestError("Observação interrompida. O processo isolado será encerrado pelo timeout do sandbox caso ainda esteja ativo.");
  }

  function commitHistory(entry: RunHistoryEntry) {
    setRunHistory((current) => {
      const next = [entry, ...current.filter((item) => item.id !== entry.id)].slice(0, 20);
      window.localStorage.setItem("0xlab.low-level.run-history", JSON.stringify(next.map(({ job: _job, ...item }) => item)));
      return next;
    });
  }

  async function runNative() {
    if (isRunning) return;
    if (activeLanguage === "asm") {
      setRequestError("Assembly livre é executado no CPU Simulation nesta versão. A sandbox nativa aceita projetos C/C++; GAS/NASM nativo permanece isolado até o linker adapter estar disponível.");
      setBottomTab("terminal");
      return;
    }
    if (architecture === "x86") {
      setRequestError("O worker nativo atual é x86-64. O target x86 só será habilitado quando a imagem tiver multilib e um adapter de debug próprio; nenhuma execução x86-64 será rotulada como x86.");
      setBottomTab("terminal");
      return;
    }
    const runRevision = sourceRevision;
    const token = runTokenRef.current + 1;
    runTokenRef.current = token;
    setMode("native");
    setIsPlaying(false);
    setIsRunning(true);
    setRequestError(null);
    setBottomTab("terminal");
    setLatestJob(null);
    const selectedCompiler = compilerFor(activeLanguage, compiler);
    const flags = [...new Set([...extraFlags, optimization, activeLanguage === "cpp" ? "-std=c++23" : "-std=c17"])];
    try {
      const response = await fetch("/api/executions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          language: activeLanguage,
          compiler: selectedCompiler,
          target: "linux",
          files: files.filter((file) => file.language !== "asm").map(({ name, content }) => ({ name, content })),
          flags,
          stdin: ""
        })
      });
      const created = await response.json() as CreateExecutionResponse | { error?: string };
      if (!response.ok || !("jobId" in created)) throw new Error("error" in created ? created.error : "Não foi possível criar a execução.");
      for (let attempt = 0; attempt < 90; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        if (runTokenRef.current !== token) return;
        const pollResponse = await fetch(`/api/executions/${created.jobId}`, { cache: "no-store" });
        const job = await pollResponse.json() as ExecutionJob | { error?: string };
        if (!pollResponse.ok || !("status" in job)) throw new Error("error" in job ? job.error : "Estado da execução indisponível.");
        setLatestJob(job);
        if (job.status === "completed" || job.status === "failed") {
          setBuiltRevision(runRevision);
          const entry: RunHistoryEntry = {
            id: job.id,
            jobId: job.id,
            timestamp: job.finishedAt ?? new Date().toISOString(),
            compiler: selectedCompiler,
            optimization,
            status: statusFor(job),
            ...(job.result ? { durationMs: job.result.durationMs } : {}),
            ...(job.result?.artifacts?.disassembly ? { instructionCount: instructionCount(job.result.artifacts.disassembly) } : {}),
            job
          };
          commitHistory(entry);
          if (job.result?.diagnostics.length) setBottomTab("compiler");
          else if (job.result?.analysis.category !== "success") setBottomTab("analysis");
          return;
        }
      }
      throw new Error("A execução excedeu o tempo de observação do cliente.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha desconhecida ao executar.";
      setRequestError(message);
      commitHistory({ id: `failed-${Date.now()}`, timestamp: new Date().toISOString(), compiler: selectedCompiler, optimization, status: "Unavailable" });
    } finally {
      if (runTokenRef.current === token) setIsRunning(false);
    }
  }

  async function reopenRun(entry: RunHistoryEntry) {
    if (entry.job) {
      setLatestJob(entry.job);
      setBuiltRevision(-1);
      setBottomTab("terminal");
      return;
    }
    if (!entry.jobId) return;
    try {
      const response = await fetch(`/api/executions/${entry.jobId}`, { cache: "no-store" });
      const job = await response.json() as ExecutionJob | { error?: string };
      if (!response.ok || !("status" in job)) throw new Error("Esta execução não está mais disponível na fila efêmera.");
      setLatestJob(job);
      setBuiltRevision(-1);
      setBottomTab("terminal");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Execução indisponível.");
    }
  }

  function createExperiment(name: string, id = crypto.randomUUID()): SavedExperiment {
    return {
      id,
      name,
      files,
      compiler,
      optimization,
      architecture,
      syntax,
      flags: extraFlags,
      watches,
      breakpoints,
      panelOrder,
      hiddenPanels,
      updatedAt: new Date().toISOString()
    };
  }

  function saveExperiment() {
    const name = window.prompt("Nome do experimento", activeExperimentName)?.trim();
    if (!name) return;
    const existing = experiments.find((item) => item.name === name);
    const saved = createExperiment(name, existing?.id);
    const next = [saved, ...experiments.filter((item) => item.id !== saved.id)].slice(0, 30);
    setExperiments(next);
    setActiveExperimentName(name);
    window.localStorage.setItem("0xlab.low-level.experiments", JSON.stringify(next));
    setExplorerTab("experiments");
  }

  function forkExperiment() {
    const name = window.prompt("Nome do fork", `${activeExperimentName}-fork`)?.trim();
    if (!name) return;
    const saved = createExperiment(name);
    const next = [saved, ...experiments].slice(0, 30);
    setExperiments(next);
    setActiveExperimentName(name);
    window.localStorage.setItem("0xlab.low-level.experiments", JSON.stringify(next));
    setExplorerTab("experiments");
  }

  function loadExperiment(experiment: SavedExperiment) {
    const cloned = experiment.files.map((file, index) => ({ ...file, id: `loaded-${experiment.id}-${index}-${Date.now()}` }));
    setFiles(cloned);
    if (cloned[0]) setActiveFileId(cloned[0].id);
    setCompiler(experiment.compiler === "Clang" ? "Clang" : "GCC");
    setOptimization(experiment.optimization);
    setArchitecture(experiment.architecture);
    setSyntax(experiment.syntax);
    setExtraFlags([...experiment.flags]);
    setWatches([...experiment.watches]);
    setBreakpoints({});
    setPanelOrder([...experiment.panelOrder]);
    setHiddenPanels([...experiment.hiddenPanels]);
    setActiveExperimentName(experiment.name);
    setLatestJob(null);
    setBuiltRevision(-1);
    setSourceRevision((revision) => revision + 1);
    setExplorerTab("workspace");
  }

  function addWatch() {
    const expression = window.prompt("Expressão para observar", activeLanguage === "asm" ? "RAX" : "point->x")?.trim();
    if (expression && !watches.includes(expression)) setWatches((current) => [...current, expression]);
  }

  function watchValue(expression: string): string {
    const register = REGISTER_ORDER.find((item) => item === expression.toUpperCase());
    if (register) return simulationActive ? formatHex(currentSnapshot.state.registers[register]) : "not captured";
    const flag = expression.toUpperCase() as keyof SimFlags;
    if (flag in currentSnapshot.state.flags) return simulationActive ? String(currentSnapshot.state.flags[flag]) : "not captured";
    if (!simulationActive) return "requires debugger";
    const traversed = cTrace.slice(0, cCursor + 1);
    const allocated = traversed.some((item) => item.kind === "allocation");
    const freed = traversed.some((item) => item.kind === "free");
    const writes = traversed.filter((item) => item.kind === "write").length;
    if (/point$|ptr$|value$/.test(expression)) return freed ? "NULL / freed" : allocated ? "heap#1 (abstract)" : "uninitialized";
    if (/->x|\*value/.test(expression)) return writes >= 1 ? "10" : "?";
    if (/->y/.test(expression)) return writes >= 2 ? "20" : "?";
    return "not resolved by model";
  }

  function editRegister(register: RegisterName) {
    if (!simulationActive) return;
    const raw = window.prompt(`Novo valor para ${register}`, formatHex(currentSnapshot.state.registers[register]));
    if (raw === null) return;
    try {
      const state = replaceRegister(currentSnapshot.state, register, parseUserValue(raw));
      setSimSnapshots((current) => [...current.slice(0, simCursor), { ...currentSnapshot, state }]);
      setIsPlaying(false);
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Valor inválido."); }
  }

  function editFlag(flag: keyof SimFlags) {
    if (!simulationActive) return;
    const state = { ...currentSnapshot.state, flags: { ...currentSnapshot.state.flags, [flag]: currentSnapshot.state.flags[flag] ? 0 : 1 } };
    setSimSnapshots((current) => [...current.slice(0, simCursor), { ...currentSnapshot, state }]);
    setIsPlaying(false);
  }

  function editMemory(address: string) {
    if (!simulationActive) return;
    const current = currentSnapshot.state.memory[address] ?? 0n;
    const raw = window.prompt(`Novo valor em SIM:${address}`, formatHex(current));
    if (raw === null) return;
    try {
      const state = replaceMemory(currentSnapshot.state, address, parseUserValue(raw));
      setSimSnapshots((items) => [...items.slice(0, simCursor), { ...currentSnapshot, state }]);
      setIsPlaying(false);
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Valor inválido."); }
  }

  function createManualSnapshot() {
    if (!simulationActive) {
      setRequestError("Snapshots manuais de estado exigem dados observáveis. A execução nativa atual não expõe registradores ou memória.");
      return;
    }
    const label = window.prompt("Nome do snapshot", activeLanguage === "asm" ? `After step ${simCursor}` : `After source event ${cCursor + 1}`)?.trim();
    if (!label) return;
    setManualSnapshots((current) => [{ id: crypto.randomUUID(), label, createdAt: new Date().toISOString(), sourceStep: activeLanguage === "asm" ? simCursor : cCursor + 1, state: currentSnapshot.state }, ...current]);
    setBottomTab("timeline");
  }

  function togglePanel(id: string) {
    setHiddenPanels((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    if (maximizedPanel === id) setMaximizedPanel(null);
  }

  function dropPanel(target: PanelId) {
    if (!draggedPanel || draggedPanel === target) return;
    setPanelOrder((current) => {
      const next = current.filter((item) => item !== draggedPanel);
      next.splice(next.indexOf(target), 0, draggedPanel);
      return next;
    });
    setDraggedPanel(null);
  }

  function beginResize(left: PanelId, right: PanelId, event: ReactPointerEvent<HTMLDivElement>) {
    const width = panelStageRef.current?.getBoundingClientRect().width ?? 1;
    const startX = event.clientX;
    const leftStart = panelSizes[left];
    const rightStart = panelSizes[right];
    const total = leftStart + rightStart;
    const onMove = (pointerEvent: PointerEvent) => {
      const delta = (pointerEvent.clientX - startX) / width * 3;
      const nextLeft = Math.max(0.42, Math.min(total - 0.42, leftStart + delta));
      setPanelSizes((current) => ({ ...current, [left]: nextLeft, [right]: total - nextLeft }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function changeFontSize(delta: number) {
    setFontSize((current) => {
      const next = Math.max(11, Math.min(22, current + delta));
      window.localStorage.setItem("0xlab.low-level.font-size", String(next));
      return next;
    });
  }

  const panelContent: Record<PanelId, ReactNode> = {
    source: (
      <PanelFrame id="source" title="Code Editor" meta={`${activeFile.name} · ${languageLabel(activeLanguage)}`} icon={<Code2 size={12} />} maximized={maximizedPanel === "source"} onMaximize={() => setMaximizedPanel((current) => current === "source" ? null : "source")} onHide={() => togglePanel("source")} onDragStart={setDraggedPanel} onDrop={dropPanel} badge={<span className="ll-editor-scale"><button type="button" aria-label="Diminuir fonte" onClick={() => changeFontSize(-1)}><Minus size={8} /></button>{fontSize}px<button type="button" aria-label="Aumentar fonte" onClick={() => changeFontSize(1)}><Plus size={8} /></button></span>}>
        <div className="ll-file-tabs">
          {files.map((file) => <button type="button" key={file.id} data-active={file.id === activeFile.id} onClick={() => setActiveFileId(file.id)}><span className={`ll-file-dot ${file.language}`} />{file.name}{breakpoints[file.id]?.length ? <i>{breakpoints[file.id]!.length}</i> : null}</button>)}
          <button type="button" aria-label="Novo arquivo" onClick={addFile}><Plus size={10} /></button>
        </div>
        <div className="ll-editor-host">
          <LabEditor file={activeFile} diagnostics={latestJob?.result?.diagnostics ?? []} breakpoints={breakpoints[activeFile.id] ?? []} highlightedLine={highlightedSourceLine} fontSize={fontSize} onChange={updateActiveFile} onToggleBreakpoint={toggleBreakpoint} onRun={runNative} />
        </div>
      </PanelFrame>
    ),
    assembly: (
      <PanelFrame id="assembly" title="Assembly / Machine Code" meta={hasRealArtifact ? `${compiler} ${optimization} · objdump` : activeLanguage === "asm" ? `${assembler} · ${syntax}` : "live source preview"} icon={<Binary size={12} />} maximized={maximizedPanel === "assembly"} onMaximize={() => setMaximizedPanel((current) => current === "assembly" ? null : "assembly")} onHide={() => togglePanel("assembly")} onDragStart={setDraggedPanel} onDrop={dropPanel} badge={<OriginChip real={hasRealArtifact}>{hasRealArtifact ? "REAL ARTIFACT" : activeLanguage === "asm" ? "SIM SOURCE" : "SOURCE PREVIEW"}</OriginChip>}>
        <AssemblyPane rows={assemblyRows} hasRealArtifact={hasRealArtifact} previewKind={activeLanguage === "asm" ? "assembly" : "source"} activeSourceLine={highlightedSourceLine} currentSimulationSource={activeLanguage === "asm" ? currentEvent?.instruction.source : undefined} onSelectSourceLine={setAssemblySelectedLine} />
      </PanelFrame>
    ),
    visualizer: (
      <PanelFrame id="visualizer" title="State Visualizer" meta={`${visualizerKind.toUpperCase()} · ${visualDimension.toUpperCase()}`} icon={<Cpu size={12} />} maximized={maximizedPanel === "visualizer"} onMaximize={() => setMaximizedPanel((current) => current === "visualizer" ? null : "visualizer")} onHide={() => togglePanel("visualizer")} onDragStart={setDraggedPanel} onDrop={dropPanel} badge={<OriginChip real={false} />}>
        <div className="ll-visualizer-toolbar">
          <div>{([ ["cpu", Cpu], ["stack", Layers3], ["heap", Box], ["pointers", Network], ["memory", MemoryStick], ["cfg", GitBranch] ] as const).map(([kind, Icon]) => <button type="button" key={kind} aria-label={`Visualizar ${kind}`} data-active={visualizerKind === kind} onClick={() => setVisualizerKind(kind)}><Icon size={11} /></button>)}</div>
          <span />
          <button type="button" data-active={visualDimension === "2d"} onClick={() => setVisualDimension("2d")}>2D</button>
          <button type="button" data-active={visualDimension === "3d"} onClick={() => setVisualDimension("3d")}>3D</button>
          <button type="button" aria-label={animateScene ? "Pausar animação" : "Retomar animação"} data-active={animateScene} onClick={() => setAnimateScene((value) => !value)}>{animateScene ? <Pause size={9} /> : <Play size={9} />}</button>
        </div>
        <div className="ll-visualizer-host">
          {visualDimension === "3d" ? <CpuScene kind={visualizerKind} state={currentSnapshot.state} event={currentEvent} cEvent={currentCEvent} model={visualModel} animate={animateScene} /> : <Visualizer2D kind={visualizerKind} state={currentSnapshot.state} event={currentEvent} cEvent={currentCEvent} model={visualModel} />}
          <div className="ll-visualizer-caption" data-model-fingerprint={visualModel.fingerprint}><span>{currentEvent?.instruction.source ?? currentCEvent?.source ?? `${visualModel.title} · live from ${activeFile.name}`}</span><small>model {visualModel.fingerprint.toUpperCase()} · {visualDimension === "3d" ? "drag to orbit · wheel to zoom" : "updates while editing"}</small></div>
        </div>
      </PanelFrame>
    )
  };

  const visibleTopPanels = (maximizedPanel ? [maximizedPanel] : panelOrder.filter((id) => !hiddenPanels.includes(id)));
  const currentStep = activeLanguage === "asm" ? simCursor : cCursor + 1;
  const totalSteps = activeLanguage === "asm" ? parsedProgram.instructions.length : cTrace.length;
  const latestRealRuns = runHistory.filter((entry) => entry.instructionCount !== undefined).slice(0, 2);

  return (
    <div className="low-level-lab">
      <header className="ll-toolbar">
        <div className="ll-lab-title"><span className="ll-lab-mark"><Cpu size={13} /></span><div><strong>LOW-LEVEL LAB</strong><small>{activeExperimentName}</small></div></div>
        <div className="ll-toolbar-divider" />
        <label className="ll-select"><span>COMPILER</span><select value={compiler} onChange={(event) => setCompiler(event.target.value as "GCC" | "Clang")}><option>GCC</option><option>Clang</option></select><ChevronDown size={9} /></label>
        <label className="ll-select"><span>OPT</span><select value={optimization} onChange={(event) => setOptimization(event.target.value)}>{OPTIMIZATIONS.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={9} /></label>
        <label className="ll-select"><span>ARCH</span><select value={architecture} onChange={(event) => setArchitecture(event.target.value as Architecture)}><option>x86-64</option><option value="x86" disabled>x86 · adapter pending</option></select><ChevronDown size={9} /></label>
        <button className="ll-toolbar-button" type="button" data-active={showBuildMenu} onClick={() => { setShowBuildMenu((value) => !value); setShowLayoutMenu(false); }}><Settings2 size={11} /><span>Build flags</span><b>{extraFlags.length}</b></button>
        <div className="ll-mode-switch" aria-label="Modo de execução"><button type="button" data-active={mode === "simulation"} onClick={() => setMode("simulation")}><Cpu size={10} />CPU Simulation</button><button type="button" data-active={mode === "native"} onClick={() => setMode("native")}><ShieldCheck size={10} />Native Sandbox</button></div>
        <span className="ll-toolbar-spacer" />
        <button className="ll-icon-action" type="button" title="Criar snapshot" onClick={createManualSnapshot}><Camera size={12} /></button>
        <button className="ll-icon-action" type="button" title="Salvar experimento" onClick={saveExperiment}><Save size={12} /></button>
        <button className="ll-icon-action" type="button" title="Fork experiment" onClick={forkExperiment}><Copy size={12} /></button>
        <button className="ll-toolbar-button" type="button" data-active={showLayoutMenu} onClick={() => { setShowLayoutMenu((value) => !value); setShowBuildMenu(false); }}><LayoutDashboard size={11} /><span>Layout</span></button>
        {isRunning ? <button className="ll-stop-button" type="button" onClick={stopRun}><X size={11} />Stop</button> : mode === "native" ? <button className="ll-run-button" type="button" onClick={runNative}><Play size={10} fill="currentColor" />Build &amp; Run <kbd>⌃↵</kbd></button> : <button className="ll-run-button" type="button" onClick={() => setIsPlaying((value) => !value)}><Play size={10} fill="currentColor" />{isPlaying ? "Running…" : "Run trace"}<kbd>F5</kbd></button>}

        {showBuildMenu ? <div className="ll-popover ll-build-popover"><header><Settings2 size={12} /><strong>BUILD CONFIGURATION</strong><button type="button" onClick={() => setShowBuildMenu(false)}><X size={10} /></button></header><p>Flags são validadas por allowlist antes de chegar ao runner.</p><div>{EXTRA_FLAGS.map((flag) => <button type="button" key={flag} data-active={extraFlags.includes(flag)} onClick={() => setExtraFlags((current) => current.includes(flag) ? current.filter((item) => item !== flag) : [...current, flag])}><span>{extraFlags.includes(flag) ? <Check size={9} /> : null}</span><code>{flag}</code></button>)}</div><footer><ShieldCheck size={10} /><span>network off · 256 MiB · 0.5 CPU · 64 PIDs · timeout</span></footer></div> : null}
        {showLayoutMenu ? <div className="ll-popover ll-layout-popover"><header><Columns3 size={12} /><strong>WORKSPACE PANELS</strong><button type="button" onClick={() => setShowLayoutMenu(false)}><X size={10} /></button></header>{Object.entries(PANEL_LABELS).map(([id, label]) => <button type="button" key={id} data-active={!hiddenPanels.includes(id)} onClick={() => togglePanel(id)}><span>{!hiddenPanels.includes(id) ? <Check size={9} /> : null}</span><strong>{label}</strong><small>{id === "source" || id === "assembly" || id === "visualizer" ? "drag + resize" : "dock"}</small></button>)}<footer><button type="button" onClick={() => { setPanelOrder(["source", "assembly", "visualizer"]); setHiddenPanels([]); setPanelSizes({ source: 1.28, assembly: 0.96, visualizer: 0.9 }); setMaximizedPanel(null); }}>Restore default layout</button></footer></div> : null}
      </header>

      <div className="ll-context-strip">
        <div><OriginChip real={mode === "native" && Boolean(latestJob?.result)}>{mode === "native" ? latestJob?.result ? "REAL SANDBOX RESULT" : "NATIVE MODE · AWAITING RUN" : "EDUCATIONAL SIMULATION"}</OriginChip><span className="ll-context-separator" /><code>{activeLanguage === "asm" ? `${assembler} · ${syntax.toUpperCase()}` : `${compiler} ${optimization} · Linux ${architecture}`}</code><span className="ll-context-separator" /><span>{mode === "native" ? "No register/memory telemetry" : "Deterministic · not cycle accurate"}</span></div>
        <div className="ll-transport"><button type="button" onClick={resetSimulation} disabled={!simulationActive}><RotateCcw size={10} />Reset <kbd>F6</kbd></button><button type="button" onClick={stepBack} disabled={!simulationActive || currentStep <= 0}><SkipBack size={10} />Back</button><button type="button" onClick={stepOnce} disabled={!simulationActive}><StepForward size={10} />Step <kbd>F7</kbd></button><button type="button" onClick={() => setIsPlaying((value) => !value)} disabled={!simulationActive}>{isPlaying ? <Pause size={10} /> : <Play size={10} />}Continue</button><strong>{simulationActive ? `STEP ${String(currentStep).padStart(3, "0")} / ${String(totalSteps).padStart(3, "0")}` : latestJob?.status?.toUpperCase() ?? "READY"}</strong></div>
      </div>

      <div className="ll-body">
        <aside className="ll-explorer">
          <div className="ll-explorer-tabs"><button type="button" title="Workspace" data-active={explorerTab === "workspace"} onClick={() => setExplorerTab("workspace")}><FolderOpen size={12} /></button><button type="button" title="Presets" data-active={explorerTab === "presets"} onClick={() => setExplorerTab("presets")}><Zap size={12} /></button><button type="button" title="Experiments" data-active={explorerTab === "experiments"} onClick={() => setExplorerTab("experiments")}><History size={12} /></button></div>
          {explorerTab === "workspace" ? <>
            <header className="ll-explorer-title"><span>EXPERIMENT</span><button type="button" aria-label="Novo arquivo" onClick={addFile}><FilePlus2 size={11} /></button></header>
            <div className="ll-experiment-name"><CircleDot size={8} /><strong>{activeExperimentName}</strong><small>unsynced · local</small></div>
            <section className="ll-files"><header><span>FILES</span><b>{files.length}</b></header>{files.map((file) => <div key={file.id} data-active={file.id === activeFile.id}><button type="button" onClick={() => setActiveFileId(file.id)}><FileCode2 size={11} /><span>{file.name}</span><small>{file.language.toUpperCase()}</small></button><button type="button" title="Renomear" onClick={() => renameFile(file)}><Braces size={9} /></button><button type="button" title="Excluir" disabled={files.length === 1} onClick={() => deleteFile(file)}><X size={9} /></button></div>)}</section>
            <section className="ll-outline"><header><span>OUTLINE</span></header>{activeLanguage === "asm" ? parsedProgram.instructions.filter((instruction) => instruction.label).map((instruction) => <button type="button" key={instruction.id} onClick={() => setAssemblySelectedLine(instruction.line)}><GitBranch size={9} /><span>{instruction.label}</span><small>L{instruction.line}</small></button>) : cTrace.slice(0, 8).map((event) => <button type="button" key={event.id} onClick={() => setAssemblySelectedLine(event.line)}><Circle size={6} /><span>{event.title}</span><small>L{event.line}</small></button>)}</section>
            <section className="ll-run-history"><header><span>RUN HISTORY</span><b>{runHistory.length}</b></header>{runHistory.slice(0, 5).map((entry) => <button type="button" key={entry.id} onClick={() => void reopenRun(entry)} data-status={entry.status}><span><CircleDot size={7} /></span><div><strong>{entry.compiler} {entry.optimization}</strong><small>{formatTime(entry.timestamp)} · {entry.durationMs ? `${entry.durationMs} ms` : entry.status}</small></div></button>)}{!runHistory.length ? <p>No native runs yet.</p> : null}</section>
          </> : null}
          {explorerTab === "presets" ? <div className="ll-preset-list"><header><span>STARTING POINTS</span><small>Always editable</small></header>{LAB_PRESETS.map((preset) => <button type="button" key={preset.id} onClick={() => loadPreset(preset.id)}><span>{preset.group === "Assembly" ? <Binary size={11} /> : <Braces size={11} />}</span><div><strong>{preset.title}</strong><small>{preset.description}</small></div><ChevronRight size={9} /></button>)}</div> : null}
          {explorerTab === "experiments" ? <div className="ll-saved-list"><header><span>SAVED EXPERIMENTS</span><button type="button" onClick={saveExperiment}><Save size={10} />Save</button></header>{experiments.map((experiment) => <button type="button" key={experiment.id} onClick={() => loadExperiment(experiment)}><span><HardDrive size={10} /></span><div><strong>{experiment.name}</strong><small>{experiment.files.length} files · {experiment.compiler} {experiment.optimization}</small></div><ChevronRight size={9} /></button>)}{!experiments.length ? <div className="ll-empty-list"><Save size={17} /><strong>No saved experiments</strong><span>Save files, flags, watches, breakpoints and layout.</span></div> : null}</div> : null}
          <footer className="ll-explorer-footer"><ShieldCheck size={10} /><span>native jobs are disposable</span></footer>
        </aside>

        <main className="ll-workspace">
          <div className="ll-panel-stage" ref={panelStageRef} data-maximized={Boolean(maximizedPanel)}>
            {visibleTopPanels.length ? visibleTopPanels.map((id, index) => <div className="ll-panel-fragment" key={id} style={{ flexGrow: maximizedPanel ? 1 : panelSizes[id] }}><div className="ll-panel-slot">{panelContent[id]}</div>{!maximizedPanel && index < visibleTopPanels.length - 1 ? <div className="ll-panel-resizer" title="Arraste para redimensionar" onPointerDown={(event) => beginResize(id, visibleTopPanels[index + 1]!, event)}><GripVertical size={9} /></div> : null}</div>) : <div className="ll-all-hidden"><LayoutDashboard size={22} /><strong>All workspace panels are hidden</strong><button type="button" onClick={() => setHiddenPanels([])}>Restore panels</button></div>}
          </div>

          <div className="ll-inspector-strip">
            {!hiddenPanels.includes("registers") ? <section className="ll-inspector-panel registers"><header><Cpu size={11} /><strong>REGISTERS</strong><InspectorOrigin simulation={simulationActive} /><span /><small>{architecture}</small><button type="button" onClick={() => togglePanel("registers")}><X size={9} /></button></header><RegisterInspector state={currentSnapshot.state} event={currentEvent} simulation={simulationActive} onEdit={editRegister} /><div className="ll-flags-row"><span>RFLAGS</span>{(Object.keys(currentSnapshot.state.flags) as (keyof SimFlags)[]).map((flag) => <button type="button" key={flag} disabled={!simulationActive} data-changed={currentEvent?.changedFlags.includes(flag)} onClick={() => editFlag(flag)}><b>{flag}</b><code>{simulationActive ? currentSnapshot.state.flags[flag] : "—"}</code></button>)}</div></section> : null}
            {!hiddenPanels.includes("memory") ? <section className="ll-inspector-panel memory"><header><MemoryStick size={11} /><strong>MEMORY</strong><InspectorOrigin simulation={simulationActive} /><span /><button type="button" onClick={() => togglePanel("memory")}><X size={9} /></button></header><MemoryInspector state={currentSnapshot.state} event={currentEvent} simulation={simulationActive} radix={memoryRadix} onRadixChange={setMemoryRadix} onEdit={editMemory} /></section> : null}
            {!hiddenPanels.includes("stack") ? <section className="ll-inspector-panel stack"><header><Layers3 size={11} /><strong>STACK / CALLS</strong><InspectorOrigin simulation={simulationActive} /><span /><button type="button" onClick={() => togglePanel("stack")}><X size={9} /></button></header><StackInspector state={currentSnapshot.state} event={currentEvent} simulation={simulationActive} /></section> : null}
          </div>

          <section className="ll-bottom-dock">
            <header className="ll-dock-tabs">
              {([ ["terminal", TerminalSquare, "Terminal"], ["compiler", Binary, "Compiler"], ["debugger", Bug, "Debugger"], ["analysis", Activity, "Analysis"], ["timeline", Clock3, "Timeline"], ["hex", Gauge, "Hex"], ["memory-map", MemoryStick, "Memory Map"] ] as const).map(([id, Icon, label]) => <button type="button" key={id} data-active={bottomTab === id} onClick={() => setBottomTab(id)}><Icon size={10} />{label}{id === "compiler" && latestJob?.result?.diagnostics.length ? <b>{latestJob.result.diagnostics.length}</b> : null}</button>)}
              <span />
              <button type="button" title="Maximizar dock"><Maximize2 size={9} /></button>
              <button type="button" title="Limpar terminal" onClick={() => { setLatestJob(null); setRequestError(null); }}><Trash2 size={9} /></button>
            </header>
            <div className="ll-dock-content">
              {bottomTab === "terminal" ? <div className="ll-terminal-view"><div className="ll-terminal-lines"><p><span>0xlab</span><code>$ {isRunning ? `running ${compilerFor(activeLanguage, compiler)} ${optimization} inside disposable sandbox…` : mode === "simulation" ? `cpu-sim --arch ${architecture} --syntax ${syntax}` : "ready"}</code></p>{requestError ? <p className="error"><AlertTriangle size={10} /><code>{requestError}</code></p> : null}{latestJob?.result?.stdout ? <pre>{latestJob.result.stdout}</pre> : null}{latestJob?.result?.stderr ? <pre className="stderr">{latestJob.result.stderr}</pre> : null}{!requestError && !latestJob?.result?.stdout ? <p className="muted"><code>{simulationActive ? "F7 steps through observable educational state. Ctrl+Enter switches to native build/run." : "Build & Run compiles and executes only inside the isolated runner."}</code></p> : null}</div><aside><span>EXIT</span><strong>{latestJob?.result?.runExitCode ?? "—"}</strong><span>DURATION</span><strong>{latestJob?.result ? `${latestJob.result.durationMs} ms` : "—"}</strong><span>OUTPUT</span><strong>{latestJob?.result?.truncated ? "TRUNCATED" : "COMPLETE"}</strong></aside></div> : null}
              {bottomTab === "compiler" ? <div className="ll-compiler-view"><aside><OriginChip real={hasRealArtifact} /><dl><div><dt>Compiler</dt><dd>{compilerFor(activeLanguage, compiler)}</dd></div><div><dt>Optimization</dt><dd>{optimization}</dd></div><div><dt>Target</dt><dd>Linux {architecture}</dd></div><div><dt>Artifact</dt><dd>{hasRealArtifact ? "ELF / objdump" : "not built"}</dd></div></dl></aside><div>{latestJob?.result?.diagnostics.length ? latestJob.result.diagnostics.map((diagnostic, index) => <button type="button" key={index} onClick={() => diagnostic.line && setAssemblySelectedLine(diagnostic.line)} data-severity={diagnostic.severity}><span>{diagnostic.severity.toUpperCase()}</span><code>{diagnostic.file}:{diagnostic.line}:{diagnostic.column}</code><p>{diagnostic.message}</p></button>) : <div className="ll-clean-build"><Check size={17} /><strong>{latestJob?.result ? "No compiler diagnostics" : "Build the current source to inspect real diagnostics"}</strong><span>Inline markers are attached to the exact source file and line.</span></div>}</div></div> : null}
              {bottomTab === "debugger" ? <div className="ll-debugger-view"><section><header><strong>WATCH</strong><button type="button" onClick={addWatch}><Plus size={9} />Add expression</button></header>{watches.map((watch) => <div key={watch}><code>{watch}</code><strong>{watchValue(watch)}</strong><button type="button" onClick={() => setWatches((current) => current.filter((item) => item !== watch))}><X size={8} /></button></div>)}</section><section><header><strong>CALL STACK</strong><small>{simulationActive ? "SIMULATED" : "NOT CAPTURED"}</small></header>{simulationActive ? [...currentSnapshot.state.callStack].reverse().map((frame, index) => <div key={`${frame}-${index}`}><span>{index === 0 ? <ChevronRight size={8} /> : null}</span><strong>{frame}()</strong><code>{index === 0 ? `IP#${currentSnapshot.state.instructionIndex}` : "return frame"}</code></div>) : <div className="ll-adapter-message"><Bug size={15} /><p>A execução nativa atual retorna output, diagnostics, sanitizers e artefatos do binário. Registradores, frames e breakpoints nativos exigem o futuro GDB adapter; nenhum valor é inferido.</p></div>}</section><section><header><strong>BREAKPOINTS</strong><small>{Object.values(breakpoints).flat().length}</small></header>{files.flatMap((file) => (breakpoints[file.id] ?? []).map((line) => <button type="button" key={`${file.id}-${line}`} onClick={() => { setActiveFileId(file.id); setAssemblySelectedLine(line); }}><CircleDot size={7} /><code>{file.name}:{line}</code></button>))}</section></div> : null}
              {bottomTab === "analysis" ? <div className="ll-analysis-view"><section className="ll-step-explanation"><header><div><Activity size={11} /><strong>STEP EXPLANATION</strong></div><select value={explanationLevel} onChange={(event) => setExplanationLevel(event.target.value as ExplanationLevel)}><option value="beginner">Beginner</option><option value="advanced">Advanced</option><option value="low-level">Low-Level Details</option></select></header><code>{currentEvent?.instruction.source ?? currentCEvent?.source ?? "Select or execute an event"}</code><p>{currentEvent?.explanation[explanationLevel] ?? currentCEvent?.detail ?? "Step the simulator or select a source event to inspect its effect."}</p>{currentEvent ? <dl><div><dt>Registers read/write</dt><dd>{currentEvent.changedRegisters.join(", ") || "none"}</dd></div><div><dt>Flags affected</dt><dd>{currentEvent.changedFlags.join(", ") || "none"}</dd></div><div><dt>Memory read</dt><dd>{currentEvent.memoryRead ?? "none"}</dd></div><div><dt>Memory written</dt><dd>{currentEvent.memoryWrite ?? "none"}</dd></div></dl> : null}</section><section className="ll-run-analysis"><header><strong>NATIVE ANALYSIS</strong><OriginChip real={Boolean(latestJob?.result)} /></header>{latestJob?.result ? <><h3>{latestJob.result.analysis.headline}</h3><p>{latestJob.result.analysis.summary}</p><ul>{latestJob.result.analysis.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul></> : <div className="ll-adapter-message"><ShieldCheck size={15} /><p>Run with ASan/UBSan to turn crashes, overflows and use-after-free into evidence-backed diagnostics.</p></div>}</section><section className="ll-optimization-compare"><header><strong>OPTIMIZATION COMPARE</strong><small>STATIC ARTIFACT</small></header>{latestRealRuns.length >= 2 ? latestRealRuns.map((run) => <article key={run.id}><span>{run.compiler} {run.optimization}</span><strong>{run.instructionCount}</strong><small>disassembled instructions</small></article>) : <div className="ll-adapter-message"><Gauge size={15} /><p>Run two optimization levels to compare actual static instruction counts. This is not a runtime benchmark.</p></div>}</section></div> : null}
              {bottomTab === "timeline" ? <div className="ll-timeline-view"><section><header><strong>EXECUTION TIMELINE</strong><span>{simulationActive ? "EDUCATIONAL SNAPSHOTS" : "NO NATIVE STATE SNAPSHOTS"}</span></header><div>{simulationActive ? activeLanguage === "asm" ? simSnapshots.slice(1).map((snapshot, index) => <button type="button" key={index} data-active={simCursor === index + 1} onClick={() => { setSimCursor(index + 1); setIsPlaying(false); }}><span>{String(index + 1).padStart(3, "0")}</span><i /><strong>{snapshot.event?.instruction.source}</strong><small>{snapshot.event?.changedRegisters.join(", ") || "control flow"}</small></button>) : cTrace.map((event, index) => <button type="button" key={event.id} data-active={cCursor === index} onClick={() => { setCCursor(index); setIsPlaying(false); }}><span>{String(index + 1).padStart(3, "0")}</span><i /><strong>{event.title}</strong><small>{event.source}</small></button>) : <div className="ll-adapter-message"><Clock3 size={15} /><p>Native time-travel is not emulated. Only educational snapshots can be revisited.</p></div>}</div></section><aside><header><strong>MANUAL SNAPSHOTS</strong><button type="button" onClick={createManualSnapshot}><Camera size={9} />Capture</button></header>{manualSnapshots.map((snapshot) => <button type="button" key={snapshot.id}><Camera size={9} /><div><strong>{snapshot.label}</strong><small>step {snapshot.sourceStep} · {formatTime(snapshot.createdAt)}</small></div></button>)}{!manualSnapshots.length ? <p>Capture “before/after” states for comparison.</p> : null}</aside></div> : null}
              {bottomTab === "hex" ? <div className="ll-hex-view"><header><OriginChip real={hasRealArtifact} /><span>Assembly</span><ChevronRight size={10} /><span>Machine code</span><small>{hasRealArtifact ? "bytes from linked ELF" : "bytes intentionally unavailable until compilation"}</small></header><div>{assemblyRows.slice(0, 80).map((row) => <button type="button" key={row.id}><code>{row.address}</code><strong>{row.instruction}</strong><span>{row.bytes === "—" || row.bytes === "preview" || row.bytes === "compile for bytes" ? <i>not asserted</i> : row.bytes.split(" ").map((byte, index) => <b key={`${byte}-${index}`}>{byte}</b>)}</span></button>)}</div></div> : null}
              {bottomTab === "memory-map" ? <div className="ll-memory-map-view"><section><header><strong>PROCESS VIRTUAL MEMORY</strong><OriginChip real={Boolean(artifactCurrent?.sections)} /></header>{artifactCurrent?.sections ? <pre>{artifactCurrent.sections}</pre> : <div className="ll-map-diagram"><div>.text <small>code</small></div><div>.rodata <small>constants</small></div><div>.data / .bss <small>globals</small></div><div className="heap">heap <small>grows ↓</small></div><span>unmapped / abstract space</span><div className="stack">stack <small>grows ↑</small></div><footer>EDUCATIONAL LAYOUT · NO NATIVE ADDRESSES</footer></div>}</section><aside><strong>ADDRESS SEMANTICS</strong><p>{artifactCurrent ? "The section table and disassembly addresses come from the linked ELF. With PIE/ASLR, runtime virtual addresses can differ." : "The diagram shows segment roles only. It does not claim process addresses or allocation positions."}</p><dl><div><dt>Runtime registers</dt><dd>not captured</dd></div><div><dt>Heap allocations</dt><dd>{simulationActive ? "abstract model" : "not captured"}</dd></div><div><dt>Stack frames</dt><dd>{simulationActive ? "CPU model" : "not captured"}</dd></div></dl></aside></div> : null}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
