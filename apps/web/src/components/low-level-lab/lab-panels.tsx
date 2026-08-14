"use client";

import type { ReactNode } from "react";
import {
  Box,
  Braces,
  ChevronRight,
  EyeOff,
  Maximize2,
  Minimize2,
  Move,
  Pencil,
  Rotate3D
} from "lucide-react";
import { formatHex } from "./simulator";
import type { CTraceEvent, CpuState, PanelId, RegisterName, SimulationEvent, SourceVisualModel, SourceVisualNode, VisualizerKind } from "./types";

export interface AssemblyRow {
  readonly id: string;
  readonly address: string;
  readonly bytes: string;
  readonly instruction: string;
  readonly sourceLine?: number;
  readonly real: boolean;
}

const REFERENCE_ROWS: readonly AssemblyRow[] = [
  { id: "reference-0", address: "—", bytes: "—", instruction: "push rbp", sourceLine: 9, real: false },
  { id: "reference-1", address: "—", bytes: "—", instruction: "mov rbp, rsp", sourceLine: 9, real: false },
  { id: "reference-2", address: "—", bytes: "—", instruction: "mov edi, 8", sourceLine: 10, real: false },
  { id: "reference-3", address: "—", bytes: "—", instruction: "call malloc", sourceLine: 10, real: false },
  { id: "reference-4", address: "—", bytes: "—", instruction: "mov dword ptr [rax], 10", sourceLine: 13, real: false },
  { id: "reference-5", address: "—", bytes: "—", instruction: "mov dword ptr [rax+4], 20", sourceLine: 14, real: false },
  { id: "reference-6", address: "—", bytes: "—", instruction: "call free", sourceLine: 17, real: false }
];

export function extractAssemblyRows(disassembly?: string): readonly AssemblyRow[] {
  if (!disassembly) return REFERENCE_ROWS;
  const rows: AssemblyRow[] = [];
  let sourceLine: number | undefined;
  let insideMain = false;
  for (const line of disassembly.split(/\r?\n/)) {
    const sourceMatch = line.match(/(?:\/workspace\/)?[^\s:]+\.(?:c|cc|cpp|cxx):(\d+)/i);
    if (sourceMatch?.[1]) sourceLine = Number.parseInt(sourceMatch[1], 10);
    const symbol = line.match(/^\s*[0-9a-f]+\s+<([^>]+)>:/i)?.[1];
    if (symbol) {
      if (symbol === "main") insideMain = true;
      else if (insideMain && rows.length) break;
    }
    if (!insideMain) continue;
    const match = line.match(/^\s*([0-9a-f]+):\s+((?:[0-9a-f]{2}\s+)+)\s*(.*?)\s*$/i);
    if (!match?.[1] || !match[2]) continue;
    rows.push({
      id: `native-${rows.length}`,
      address: `0x${match[1]}`,
      bytes: match[2].trim().replace(/\s+/g, " "),
      instruction: match[3] || "—",
      ...(sourceLine ? { sourceLine } : {}),
      real: true
    });
    if (rows.length >= 120) break;
  }
  return rows.length ? rows : REFERENCE_ROWS;
}

interface PanelFrameProps {
  readonly id: PanelId;
  readonly title: string;
  readonly meta: string;
  readonly icon: ReactNode;
  readonly badge?: ReactNode;
  readonly maximized: boolean;
  readonly onMaximize: () => void;
  readonly onHide: () => void;
  readonly onDragStart: (id: PanelId) => void;
  readonly onDrop: (id: PanelId) => void;
  readonly children: ReactNode;
}

export function PanelFrame({ id, title, meta, icon, badge, maximized, onMaximize, onHide, onDragStart, onDrop, children }: PanelFrameProps) {
  return (
    <section
      className="ll-panel"
      data-panel={id}
      data-maximized={maximized}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDrop(id)}
    >
      <header className="ll-panel-header" draggable onDragStart={() => onDragStart(id)}>
        <span className="ll-panel-handle"><Move size={11} /></span>
        <span className="ll-panel-icon">{icon}</span>
        <strong>{title}</strong>
        <small>{meta}</small>
        {badge}
        <button type="button" aria-label={`${maximized ? "Restaurar" : "Maximizar"} painel ${title}`} onClick={onMaximize}>{maximized ? <Minimize2 size={11} /> : <Maximize2 size={11} />}</button>
        <button type="button" aria-label={`Ocultar painel ${title}`} onClick={onHide}><EyeOff size={11} /></button>
      </header>
      <div className="ll-panel-content">{children}</div>
    </section>
  );
}

interface AssemblyPaneProps {
  readonly rows: readonly AssemblyRow[];
  readonly hasRealArtifact: boolean;
  readonly activeSourceLine?: number | undefined;
  readonly currentSimulationSource?: string | undefined;
  readonly onSelectSourceLine: (line: number) => void;
}

export function AssemblyPane({ rows, hasRealArtifact, activeSourceLine, currentSimulationSource, onSelectSourceLine }: AssemblyPaneProps) {
  return (
    <div className="ll-assembly-pane">
      <div className="ll-assembly-origin" data-real={hasRealArtifact}>
        <span>{hasRealArtifact ? "REAL COMPILER ARTIFACT" : "EDUCATIONAL REFERENCE"}</span>
        <small>{hasRealArtifact ? "linked ELF · objdump · link-time addresses" : "compile to replace · no addresses or bytes asserted"}</small>
      </div>
      <div className="ll-assembly-head"><span>ADDRESS</span><span>BYTES</span><span>INSTRUCTION</span></div>
      <div className="ll-assembly-lines">
        {rows.map((row, index) => (
          <button
            type="button"
            key={row.id}
            data-active={Boolean(row.sourceLine && row.sourceLine === activeSourceLine) || row.instruction === currentSimulationSource}
            data-real={row.real}
            onClick={() => row.sourceLine && onSelectSourceLine(row.sourceLine)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <code>{row.address}</code>
            <code>{row.bytes}</code>
            <code>{row.instruction}</code>
            {row.sourceLine ? <i>C:{row.sourceLine}</i> : null}
          </button>
        ))}
      </div>
      {!hasRealArtifact ? <div className="ll-awaiting-build"><Braces size={12} /><span>Build &amp; Run gera Assembly e machine code do binário real.</span></div> : null}
    </div>
  );
}

interface Visualizer2DProps {
  readonly kind: VisualizerKind;
  readonly state: CpuState;
  readonly event?: SimulationEvent | undefined;
  readonly cEvent?: CTraceEvent | undefined;
  readonly model: SourceVisualModel;
}

function visualNodeLabel(node: SourceVisualNode): string {
  return node.value && node.value !== "?" ? `${node.label} = ${node.value}` : node.label;
}

function VisualModelEmpty({ title, detail }: { readonly title: string; readonly detail: string }) {
  return <div className="ll-model-empty"><Braces size={16} /><strong>{title}</strong><span>{detail}</span></div>;
}

export function Visualizer2D({ kind, state, event, cEvent, model }: Visualizer2DProps) {
  const nodeMap = new Map(model.nodes.map((node) => [node.id, node]));
  const sourceModelBadge = <div className="ll-source-model-bar"><span>LIVE SOURCE MODEL</span><code>{model.fingerprint.toUpperCase()}</code><strong>{model.title}</strong></div>;
  if (kind === "cpu") {
    const active = (event?.stage ?? "fetch").replace("-", " ");
    return (
      <div className="ll-2d-cpu" data-model-fingerprint={model.fingerprint} aria-label="Visualização 2D da CPU simulada">
        <div className="ll-pipeline-flow">
          {["fetch", "decode", "execute", "memory", "write back"].map((stage, index) => <div key={stage} data-active={stage === active}><span>0{index + 1}</span><strong>{stage}</strong>{index < 4 ? <ChevronRight size={11} /> : null}</div>)}
        </div>
        <div className="ll-data-path">
          <article data-active={event?.changedRegisters.length ? true : undefined}><span>REGISTER FILE</span><strong>{event?.changedRegisters.join(" · ") || model.registers.join(" · ") || `${model.nodes.length} source nodes`}</strong></article>
          <ChevronRight />
          <article data-active={event?.stage === "execute"}><span>ALU</span><strong>{event?.instruction.mnemonic.toUpperCase() ?? (model.instructionCount ? `${model.instructionCount} instructions` : "awaiting step")}</strong></article>
          <ChevronRight />
          <article data-active={Boolean(event?.memoryRead || event?.memoryWrite)}><span>MEMORY BUS</span><strong>{event?.memoryWrite ?? event?.memoryRead ?? `${model.memoryCells.length} modeled cells`}</strong></article>
        </div>
        {sourceModelBadge}
      </div>
    );
  }
  if (kind === "stack") {
    const sourceNodes = model.stackNodeIds.map((id) => nodeMap.get(id)).filter((node): node is SourceVisualNode => Boolean(node)).slice(0, 8);
    return <div className="ll-2d-stack" data-model-fingerprint={model.fingerprint}><span>HIGH ADDRESS</span>{state.stack.length ? state.stack.map((cell) => <div key={cell.id}><code>SIM:{formatHex(cell.address)}</code><strong>{cell.label}</strong><code>{formatHex(cell.value)}</code></div>) : sourceNodes.length ? sourceNodes.map((node) => <div key={node.id} data-active={node.line === event?.instruction.line}><code>{node.line ? `SRC:L${node.line}` : "SOURCE"}</code><strong>{node.label}</strong><code>{node.value ?? node.detail}</code></div>) : <VisualModelEmpty title="No stack objects" detail="Declare a variable or add a stack instruction." />}<span>LOW ADDRESS · source-derived abstract layout</span></div>;
  }
  if (kind === "heap") {
    const allocations = model.heapNodeIds.map((id) => nodeMap.get(id)).filter((node): node is SourceVisualNode => Boolean(node));
    const cells = allocations.flatMap((allocation) => model.memoryCells.filter((cell) => cell.ownerId === allocation.id)).slice(0, 16);
    const freed = allocations.some((allocation) => allocation.status === "freed");
    return <div className="ll-2d-heap" data-freed={freed} data-model-fingerprint={model.fingerprint}>{allocations.length ? <><header><Box size={13} /><span>{allocations.map((allocation) => allocation.label).join(" · ")}</span><b>{freed ? "FREED IN SOURCE" : "ABSTRACT ALLOCATION"}</b></header><div className="ll-heap-cells">{cells.length ? cells.map((cell) => <span key={cell.id} data-status={cell.status}><small>+{cell.offset} · {cell.label}</small><strong>{cell.value}</strong></span>) : allocations.map((allocation) => <span key={allocation.id} data-status={allocation.status}><small>region</small><strong>{allocation.value ?? "allocated"}</strong></span>)}</div><p>Sem endereço nativo: estrutura inferida do código atual.</p></> : <VisualModelEmpty title="No heap allocation" detail="Add malloc, calloc or realloc to the current source." />}</div>;
  }
  if (kind === "pointers") {
    const selectedIds = new Set(model.pointerNodeIds);
    for (let pass = 0; pass < 3; pass += 1) model.edges.forEach((edge) => { if (selectedIds.has(edge.from)) selectedIds.add(edge.to); });
    const selectedNodes = [...selectedIds].map((id) => nodeMap.get(id)).filter((node): node is SourceVisualNode => Boolean(node)).slice(0, 14);
    const visibleEdges = model.edges.filter((edge) => selectedIds.has(edge.from) && selectedIds.has(edge.to)).slice(0, 16);
    return <div className="ll-2d-pointers" data-model-fingerprint={model.fingerprint}>{selectedNodes.length ? <><div className="ll-pointer-node-list">{selectedNodes.map((node) => <article key={node.id} data-status={node.status} data-active={node.line === cEvent?.line}><span>{node.kind} · {node.detail}</span><strong>{visualNodeLabel(node)}</strong></article>)}</div><div className="ll-pointer-edge-list">{visibleEdges.map((edge) => <div key={edge.id}><code>{nodeMap.get(edge.from)?.label ?? edge.from}</code><ChevronRight size={12} /><i>{edge.label}</i><ChevronRight size={12} /><code>{nodeMap.get(edge.to)?.label ?? edge.to}</code></div>)}</div></> : <VisualModelEmpty title="No pointer relation" detail="Declare a pointer or use registers in Assembly." />}</div>;
  }
  if (kind === "memory") {
    const entries = Object.entries(state.memory);
    return <div className="ll-2d-memory" data-model-fingerprint={model.fingerprint}><header><span>{entries.length ? "SIM ADDRESS" : "SOURCE LOCATION"}</span><span>{entries.length ? "HEX VALUE" : "MODELED VALUE"}</span><span>STATE</span></header>{entries.length ? entries.map(([address, value]) => <div key={address}><code>{address}</code><code>{formatHex(value)}</code><code>{Number(value & 0xffn) >= 32 ? String.fromCharCode(Number(value & 0xffn)) : "."}</code></div>) : model.memoryCells.length ? model.memoryCells.slice(0, 14).map((cell) => <div key={cell.id} data-status={cell.status}><code>{cell.label} +{cell.offset}</code><code>{cell.value}</code><code>{cell.status}</code></div>) : <VisualModelEmpty title="No modeled memory" detail="Arrays, structs and memory operands appear here." />}</div>;
  }
  const cfgNodes = model.cfgNodeIds.map((id) => nodeMap.get(id)).filter((node): node is SourceVisualNode => Boolean(node)).slice(0, 12);
  return <div className="ll-2d-cfg" data-model-fingerprint={model.fingerprint}>{cfgNodes.length ? <div className="ll-cfg-flow">{cfgNodes.map((node, index) => <div key={node.id}>{index ? <i /> : null}<article data-kind={node.kind} data-active={node.line === event?.instruction.line}><small>{node.kind.toUpperCase()}{node.line ? ` · L${node.line}` : ""}</small><strong>{node.label}</strong></article></div>)}</div> : <VisualModelEmpty title="No control flow" detail="Add a function or Assembly instruction." />}</div>;
}

interface InspectorOriginProps {
  readonly simulation: boolean;
}

export function InspectorOrigin({ simulation }: InspectorOriginProps) {
  return simulation
    ? <span className="ll-origin-badge simulated">EDUCATIONAL SIMULATION</span>
    : <span className="ll-origin-badge unavailable">NATIVE DATA NOT CAPTURED</span>;
}

interface RegisterInspectorProps {
  readonly state: CpuState;
  readonly event?: SimulationEvent | undefined;
  readonly simulation: boolean;
  readonly onEdit: (register: RegisterName) => void;
}

const REGISTERS: readonly RegisterName[] = ["RAX", "RBX", "RCX", "RDX", "RSI", "RDI", "RSP", "RBP", "R8", "R9", "R10", "R11"];

export function RegisterInspector({ state, event, simulation, onEdit }: RegisterInspectorProps) {
  return (
    <div className="ll-register-grid">
      {REGISTERS.map((register) => <button type="button" key={register} title={simulation ? `${register} = ${formatHex(state.registers[register])} · clique para editar` : `${register}: native value not captured`} data-changed={event?.changedRegisters.includes(register)} disabled={!simulation} onClick={() => onEdit(register)}><span>{register}</span>{simulation ? <code>{formatHex(state.registers[register]).replace(/^0x0{8}/, "0x")}</code> : <code>not captured</code>}{simulation ? <Pencil size={8} /> : null}</button>)}
    </div>
  );
}

interface MemoryInspectorProps {
  readonly state: CpuState;
  readonly event?: SimulationEvent | undefined;
  readonly simulation: boolean;
  readonly radix: string;
  readonly onRadixChange: (radix: string) => void;
  readonly onEdit: (address: string) => void;
}

function memoryValue(value: bigint, radix: string): string {
  if (radix === "decimal") return value.toString(10);
  if (radix === "binary") return value.toString(2).padStart(64, "0");
  if (radix === "ascii") return Array.from({ length: 8 }, (_, index) => { const byte = Number((value >> BigInt(index * 8)) & 0xffn); return byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : "."; }).join("");
  return formatHex(value);
}

export function MemoryInspector({ state, event, simulation, radix, onRadixChange, onEdit }: MemoryInspectorProps) {
  const entries = Object.entries(state.memory).slice(0, 8);
  return (
    <div className="ll-memory-inspector">
      <div className="ll-memory-toolbar"><span>ADDRESS / VALUE</span><select value={radix} onChange={(event) => onRadixChange(event.target.value)}><option value="hex">Hex</option><option value="decimal">Decimal</option><option value="binary">Binary</option><option value="ascii">ASCII</option></select></div>
      {!simulation ? <div className="ll-not-captured">Runtime memory requires a native debug adapter. No values are inferred.</div> : (entries.length ? entries : [["0x0000000000007fe8", 0n] as const]).map(([address, value]) => <button type="button" key={address} title={`SIM:${address} = ${formatHex(value)} · clique para editar`} data-active={event?.memoryRead?.includes(address) || event?.memoryWrite?.includes(address)} onClick={() => onEdit(address)}><code>SIM:{address}</code><code>{memoryValue(value, radix)}</code><Pencil size={8} /></button>)}
    </div>
  );
}

interface StackInspectorProps {
  readonly state: CpuState;
  readonly event?: SimulationEvent | undefined;
  readonly simulation: boolean;
}

export function StackInspector({ state, event, simulation }: StackInspectorProps) {
  if (!simulation) return <div className="ll-not-captured">Call stack and native frames were not captured. Build artifacts remain available.</div>;
  return (
    <div className="ll-stack-inspector">
      {(state.stack.length ? state.stack : [{ id: "frame", address: state.registers.RSP, value: 0n, label: "current frame · empty" }]).slice(0, 6).map((cell, index) => <div key={cell.id} data-active={event?.memoryRead?.includes(cell.address.toString(16)) || event?.memoryWrite?.includes(cell.address.toString(16))}><span>{index === 0 ? "RSP →" : ""}</span><code>SIM:{formatHex(cell.address)}</code><strong>{cell.label}</strong><code>{formatHex(cell.value)}</code></div>)}
    </div>
  );
}

export function VisualizerEmptyState() {
  return <div className="ll-visualizer-empty"><Rotate3D size={20} /><strong>Visualizer paused</strong><span>Enable a 2D or 3D layer from the toolbar.</span></div>;
}
