import { parseAssembly } from "./simulator";
import type {
  LabLanguage,
  SourceMemoryCell,
  SourceVisualEdge,
  SourceVisualModel,
  SourceVisualNode,
  SourceVisualNodeKind
} from "./types";

const C_RESERVED_TYPES = new Set([
  "break", "case", "continue", "do", "else", "for", "free", "goto", "if",
  "return", "sizeof", "switch", "while"
]);

const REGISTER_PATTERN = /\b(?:r(?:1[0-5]|[8-9]|ax|bx|cx|dx|si|di|bp|sp)|e(?:ax|bx|cx|dx|si|di|bp|sp)|(?:[abcd][lh])|[abcd]x|[sd]il|[sb]pl)\b/gi;

const TYPE_SIZES: Readonly<Record<string, number>> = {
  char: 1,
  bool: 1,
  short: 2,
  int: 4,
  float: 4,
  long: 8,
  double: 8,
  "long long": 8,
  size_t: 8
};

interface StructField {
  readonly name: string;
  readonly type: string;
  readonly size: number;
  readonly offset: number;
}

interface StructDefinition {
  readonly name: string;
  readonly fields: readonly StructField[];
  readonly size: number;
}

function fingerprintSource(source: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function compact(value: string, maxLength = 34): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
    .replace(/\/\/.*$/gm, "");
}

function lineAt(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

function normalizedType(type: string): string {
  return type.replace(/\b(?:const|volatile|static|register|signed|unsigned)\b/g, "").replace(/\s+/g, " ").trim();
}

function typeSize(type: string): number {
  const normalized = normalizedType(type).replace(/^struct\s+/, "");
  return TYPE_SIZES[normalized] ?? (normalized.includes("char") ? 1 : normalized.includes("short") ? 2 : normalized.includes("double") || normalized.includes("long") ? 8 : 4);
}

function align(offset: number, alignment: number): number {
  return Math.ceil(offset / alignment) * alignment;
}

function extractStructs(source: string): { readonly definitions: ReadonlyMap<string, StructDefinition>; readonly masked: string } {
  const definitions = new Map<string, StructDefinition>();
  const pattern = /(?:typedef\s+)?struct(?:\s+([A-Za-z_]\w*))?\s*\{([\s\S]*?)\}\s*([A-Za-z_]\w*)?\s*;/g;
  const masked = source.replace(pattern, (full, tag: string | undefined, body: string, alias: string | undefined) => {
    const name = alias ?? tag ?? "anonymous_struct";
    const fields: StructField[] = [];
    let offset = 0;
    let largestAlignment = 1;
    const fieldPattern = /\b((?:(?:const|volatile|unsigned|signed|long|short)\s+)*(?:struct\s+)?[A-Za-z_]\w*)\s*(\*{0,3})\s*([A-Za-z_]\w*)\s*(?:\[\s*(\d+)\s*\])?\s*;/g;
    for (const match of body.matchAll(fieldPattern)) {
      const fieldName = match[3];
      if (!fieldName) continue;
      const pointerDepth = match[2]?.length ?? 0;
      const baseSize = pointerDepth ? 8 : typeSize(match[1] ?? "int");
      const count = Math.max(1, Number(match[4] ?? 1));
      const size = baseSize * count;
      const alignment = Math.min(8, baseSize);
      offset = align(offset, alignment);
      fields.push({ name: fieldName, type: `${compact(match[1] ?? "int")}${"*".repeat(pointerDepth)}`, size, offset });
      offset += size;
      largestAlignment = Math.max(largestAlignment, alignment);
    }
    definitions.set(name, { name, fields, size: align(offset, largestAlignment) });
    return full.replace(/[^\n]/g, " ");
  });
  return { definitions, masked };
}

function uniquePush<T extends { readonly id: string }>(items: T[], item: T): void {
  const index = items.findIndex((current) => current.id === item.id);
  if (index >= 0) items[index] = item;
  else items.push(item);
}

function makeNode(
  id: string,
  kind: SourceVisualNodeKind,
  label: string,
  detail: string,
  line?: number,
  value?: string,
  status?: SourceVisualNode["status"]
): SourceVisualNode {
  return {
    id,
    kind,
    label,
    detail,
    ...(line === undefined ? {} : { line }),
    ...(value === undefined ? {} : { value }),
    ...(status === undefined ? {} : { status })
  };
}

function allocationCellCount(expression: string): number {
  const multiplied = expression.match(/(?:sizeof\s*(?:\([^)]*\)|[^*),]+)\s*\*\s*(\d+)|(\d+)\s*\*\s*sizeof)/i);
  const calloc = expression.match(/\bcalloc\s*\(\s*(\d+)/i);
  return Math.max(1, Math.min(24, Number(multiplied?.[1] ?? multiplied?.[2] ?? calloc?.[1] ?? 1)));
}

function analyzeC(source: string, language: LabLanguage, fingerprint: string): SourceVisualModel {
  const clean = withoutComments(source);
  const { definitions, masked } = extractStructs(clean);
  const nodes: SourceVisualNode[] = [];
  const edges: SourceVisualEdge[] = [];
  const memoryCells: SourceMemoryCell[] = [];
  const stackNodeIds: string[] = [];
  const heapNodeIds: string[] = [];
  const pointerNodeIds: string[] = [];
  const cfgNodeIds: string[] = [];
  const symbolIds = new Map<string, string>();
  const heapByPointer = new Map<string, string>();

  for (const definition of definitions.values()) {
    const id = `type:${definition.name}`;
    uniquePush(nodes, makeNode(id, "struct", definition.name, `struct type · ${definition.size} B`, undefined, `${definition.fields.length} fields`));
    definition.fields.forEach((field) => {
      const fieldId = `${id}.${field.name}`;
      uniquePush(nodes, makeNode(fieldId, "field", field.name, `${field.type} · offset +${field.offset}`, undefined, `${field.size} B`));
      edges.push({ id: `${id}->${fieldId}`, from: id, to: fieldId, label: `+${field.offset}` });
    });
  }

  const declarationPattern = /\b((?:(?:const|volatile|static|register|unsigned|signed|long|short)\s+)*(?:struct\s+)?[A-Za-z_]\w*)\s*(\*{0,3})\s*([A-Za-z_]\w*)\s*(?:\[\s*(\d+)\s*\])?\s*(?:=\s*([^;]+))?\s*;/g;
  for (const match of masked.matchAll(declarationPattern)) {
    const rawType = compact(match[1] ?? "int");
    if (C_RESERVED_TYPES.has(rawType.split(/\s+/).at(-1) ?? rawType)) continue;
    const name = match[3];
    if (!name) continue;
    const pointerDepth = match[2]?.length ?? 0;
    const arrayLength = match[4] ? Math.max(0, Math.min(64, Number(match[4]))) : 0;
    const initializer = match[5]?.trim();
    const line = lineAt(masked, match.index ?? 0);
    const structName = normalizedType(rawType).replace(/^struct\s+/, "");
    const definition = definitions.get(structName);
    const kind: SourceVisualNodeKind = pointerDepth ? "pointer" : arrayLength ? "array" : definition ? "struct" : "variable";
    const id = `symbol:${name}`;
    const value = initializer ? compact(initializer) : "?";
    uniquePush(nodes, makeNode(id, kind, name, `${rawType}${"*".repeat(pointerDepth)} · L${line}`, line, value, initializer ? "active" : "uninitialized"));
    symbolIds.set(name, id);
    stackNodeIds.push(id);
    if (pointerDepth) pointerNodeIds.push(id);

    if (arrayLength) {
      const elementSize = typeSize(rawType);
      const values = initializer?.match(/^\s*\{([\s\S]*)\}\s*$/)?.[1]?.split(",").map((item) => compact(item)) ?? [];
      for (let index = 0; index < Math.min(24, arrayLength); index += 1) {
        memoryCells.push({
          id: `${id}:cell:${index}`,
          ownerId: id,
          label: `${name}[${index}]`,
          offset: index * elementSize,
          size: elementSize,
          value: values[index] ?? "?",
          status: values[index] === undefined ? "uninitialized" : "active"
        });
      }
    }

    if (definition && !pointerDepth) {
      definition.fields.forEach((field) => {
        const fieldId = `${id}.${field.name}`;
        uniquePush(nodes, makeNode(fieldId, "field", `${name}.${field.name}`, `${field.type} · offset +${field.offset}`, line, "?", "uninitialized"));
        edges.push({ id: `${id}->${fieldId}`, from: id, to: fieldId, label: `+${field.offset}` });
        memoryCells.push({ id: `${fieldId}:cell`, ownerId: id, label: field.name, offset: field.offset, size: field.size, value: "?", status: "uninitialized" });
      });
    }

    const allocation = initializer?.match(/\b(?:malloc|calloc|realloc)\s*\(([\s\S]*)\)/i);
    if (pointerDepth && allocation) {
      const heapId = `heap:${name}`;
      heapByPointer.set(name, heapId);
      heapNodeIds.push(heapId);
      uniquePush(nodes, makeNode(heapId, "heap", `${name} allocation`, "abstract heap region · no native address", line, compact(initializer ?? "allocation"), "active"));
      edges.push({ id: `${id}->${heapId}`, from: id, to: heapId, label: "points to" });
      const count = definition ? definition.fields.length : allocationCellCount(initializer ?? "");
      if (definition) {
        definition.fields.forEach((field) => {
          const fieldId = `${heapId}.${field.name}`;
          uniquePush(nodes, makeNode(fieldId, "field", `${name}->${field.name}`, `${field.type} · offset +${field.offset}`, line, "?", "uninitialized"));
          edges.push({ id: `${heapId}->${fieldId}`, from: heapId, to: fieldId, label: `+${field.offset}` });
          memoryCells.push({ id: `${fieldId}:cell`, ownerId: heapId, label: field.name, offset: field.offset, size: field.size, value: "?", status: "uninitialized" });
        });
      } else {
        const elementSize = typeSize(rawType);
        for (let index = 0; index < count; index += 1) {
          memoryCells.push({ id: `${heapId}:cell:${index}`, ownerId: heapId, label: `${name}[${index}]`, offset: index * elementSize, size: elementSize, value: "?", status: "uninitialized" });
        }
      }
    } else if (pointerDepth && initializer) {
      const targetName = initializer.match(/^\s*&\s*([A-Za-z_]\w*)/)?.[1] ?? initializer.match(/^\s*([A-Za-z_]\w*)\s*$/)?.[1];
      if (targetName) {
        const targetId = symbolIds.get(targetName) ?? `symbol:${targetName}`;
        edges.push({ id: `${id}->${targetId}`, from: id, to: targetId, label: pointerDepth > 1 ? "points to pointer" : "points to" });
      }
    }
  }

  // Resolve forward references after every declaration is known.
  for (let index = 0; index < edges.length; index += 1) {
    const edge = edges[index];
    if (edge?.to.startsWith("symbol:") && !nodes.some((node) => node.id === edge.to)) {
      const targetName = edge.to.slice("symbol:".length);
      const resolved = symbolIds.get(targetName);
      if (resolved) edges[index] = { ...edge, to: resolved };
    }
  }

  const assignmentPattern = /(?:\b([A-Za-z_]\w*)\s*(?:->|\.)\s*([A-Za-z_]\w*)|\b([A-Za-z_]\w*)\s*\[\s*(\d+)\s*\]|\*\s*([A-Za-z_]\w*)|\b([A-Za-z_]\w*))\s*=\s*([^;]+)\s*;/g;
  for (const match of clean.matchAll(assignmentPattern)) {
    const value = compact(match[7] ?? "?");
    const line = lineAt(clean, match.index ?? 0);
    const objectName = match[1];
    const fieldName = match[2];
    const arrayName = match[3];
    const arrayIndex = Number(match[4] ?? -1);
    const dereferenceName = match[5];
    const scalarName = match[6];
    if (objectName && fieldName) {
      const heapId = heapByPointer.get(objectName);
      const ownerId = heapId ?? symbolIds.get(objectName);
      if (ownerId) {
        const candidates = [`${ownerId}.${fieldName}`, `${ownerId}:field:${fieldName}`];
        const fieldId = candidates.find((candidate) => nodes.some((node) => node.id === candidate)) ?? candidates[0]!;
        uniquePush(nodes, makeNode(fieldId, "field", `${objectName}${heapId ? "->" : "."}${fieldName}`, `field write · L${line}`, line, value, "active"));
        if (!edges.some((edge) => edge.from === ownerId && edge.to === fieldId)) edges.push({ id: `${ownerId}->${fieldId}`, from: ownerId, to: fieldId, label: "field" });
        const cellIndex = memoryCells.findIndex((cell) => cell.ownerId === ownerId && cell.label === fieldName);
        if (cellIndex >= 0 && memoryCells[cellIndex]) memoryCells[cellIndex] = { ...memoryCells[cellIndex], value, status: "active" };
      }
    } else if (arrayName && arrayIndex >= 0) {
      const ownerId = symbolIds.get(arrayName) ?? heapByPointer.get(arrayName);
      const cellIndex = memoryCells.findIndex((cell) => cell.ownerId === ownerId && cell.label.endsWith(`[${arrayIndex}]`));
      if (cellIndex >= 0 && memoryCells[cellIndex]) memoryCells[cellIndex] = { ...memoryCells[cellIndex], value, status: "active" };
    } else if (dereferenceName) {
      const targetEdge = edges.find((edge) => edge.from === symbolIds.get(dereferenceName));
      const targetId = targetEdge?.to;
      if (targetId?.startsWith("heap:")) {
        const cellIndex = memoryCells.findIndex((cell) => cell.ownerId === targetId);
        if (cellIndex >= 0 && memoryCells[cellIndex]) memoryCells[cellIndex] = { ...memoryCells[cellIndex], value, status: "active" };
      } else if (targetId) {
        const nodeIndex = nodes.findIndex((node) => node.id === targetId);
        if (nodeIndex >= 0 && nodes[nodeIndex]) nodes[nodeIndex] = { ...nodes[nodeIndex], value, status: "active" };
      }
    } else if (scalarName) {
      const nodeIndex = nodes.findIndex((node) => node.id === symbolIds.get(scalarName));
      if (nodeIndex >= 0 && nodes[nodeIndex]) nodes[nodeIndex] = { ...nodes[nodeIndex], value, status: "active" };
    }
  }

  for (const freeMatch of clean.matchAll(/\bfree\s*\(\s*([A-Za-z_]\w*)\s*\)/g)) {
    const pointerName = freeMatch[1];
    if (!pointerName) continue;
    const heapId = heapByPointer.get(pointerName);
    if (!heapId) continue;
    const heapIndex = nodes.findIndex((node) => node.id === heapId);
    if (heapIndex >= 0 && nodes[heapIndex]) nodes[heapIndex] = { ...nodes[heapIndex], status: "freed", detail: "freed abstract heap region · no native address" };
    for (let index = 0; index < memoryCells.length; index += 1) {
      const cell = memoryCells[index];
      if (cell?.ownerId === heapId) memoryCells[index] = { ...cell, status: "freed" };
    }
  }

  const functionPattern = /\b(?:[A-Za-z_]\w*[\s*]+)+([A-Za-z_]\w*)\s*\([^;{}]*\)\s*\{/g;
  const controlKeywords = new Set(["if", "for", "while", "switch", "sizeof"]);
  const functions: SourceVisualNode[] = [];
  for (const match of clean.matchAll(functionPattern)) {
    const name = match[1];
    if (!name || controlKeywords.has(name)) continue;
    const line = lineAt(clean, match.index ?? 0);
    functions.push(makeNode(`cfg:function:${name}:${line}`, "function", name, `function entry · L${line}`, line));
  }
  if (!functions.length) functions.push(makeNode("cfg:translation-unit", "function", "translation unit", "source entry"));
  functions.forEach((node) => { uniquePush(nodes, node); cfgNodeIds.push(node.id); });

  clean.split(/\r?\n/).forEach((rawLine, index) => {
    const sourceLine = compact(rawLine, 42);
    if (!sourceLine || sourceLine.startsWith("#") || /^[{}]+$/.test(sourceLine)) return;
    let kind: SourceVisualNodeKind | undefined;
    if (/\b(?:if|else|for|while|switch)\b/.test(sourceLine)) kind = "branch";
    else if (/\breturn\b/.test(sourceLine)) kind = "return";
    if (!kind) return;
    const id = `cfg:${kind}:${index + 1}`;
    uniquePush(nodes, makeNode(id, kind, sourceLine, `${kind} · L${index + 1}`, index + 1));
    cfgNodeIds.push(id);
  });
  for (let index = 1; index < cfgNodeIds.length; index += 1) {
    edges.push({ id: `cfg-edge:${index}`, from: cfgNodeIds[index - 1]!, to: cfgNodeIds[index]!, label: "flow" });
  }

  if (!nodes.length) {
    nodes.push(makeNode("source:empty", "source", "empty source", "start typing to build the model"));
  }

  const symbols = stackNodeIds.length;
  const allocations = heapNodeIds.length;
  return {
    language,
    fingerprint,
    title: `${symbols} symbol${symbols === 1 ? "" : "s"} · ${allocations} allocation${allocations === 1 ? "" : "s"}`,
    nodes,
    edges,
    memoryCells,
    stackNodeIds,
    heapNodeIds,
    pointerNodeIds,
    cfgNodeIds,
    registers: [],
    instructionCount: 0
  };
}

function canonicalRegister(register: string): string {
  const upper = register.toUpperCase();
  const aliases: Readonly<Record<string, string>> = {
    EAX: "RAX", AX: "RAX", AH: "RAX", AL: "RAX",
    EBX: "RBX", BX: "RBX", BH: "RBX", BL: "RBX",
    ECX: "RCX", CX: "RCX", CH: "RCX", CL: "RCX",
    EDX: "RDX", DX: "RDX", DH: "RDX", DL: "RDX",
    ESI: "RSI", SIL: "RSI", EDI: "RDI", DIL: "RDI",
    EBP: "RBP", BPL: "RBP", ESP: "RSP", SPL: "RSP"
  };
  if (/^R(?:[89]|1[0-5])D$/.test(upper)) return upper.slice(0, -1);
  return aliases[upper] ?? upper;
}

function analyzeAssembly(source: string, language: LabLanguage, fingerprint: string): SourceVisualModel {
  const program = parseAssembly(source);
  const nodes: SourceVisualNode[] = [];
  const edges: SourceVisualEdge[] = [];
  const memoryCells: SourceMemoryCell[] = [];
  const cfgNodeIds: string[] = [];
  const stackNodeIds: string[] = [];
  const registers = [...new Set(Array.from(source.matchAll(REGISTER_PATTERN), (match) => canonicalRegister(match[0])))];

  registers.forEach((register) => nodes.push(makeNode(`register:${register}`, "register", register, "register operand")));
  program.instructions.slice(0, 24).forEach((instruction, index) => {
    const id = `cfg:instruction:${instruction.id}`;
    nodes.push(makeNode(id, "instruction", compact(instruction.source, 38), `instruction · L${instruction.line}`, instruction.line, instruction.mnemonic.toUpperCase()));
    cfgNodeIds.push(id);
    if (/^(?:push|pop|call|ret|enter|leave)$/i.test(instruction.mnemonic)) stackNodeIds.push(id);
    if (index > 0) edges.push({ id: `cfg-edge:${index}`, from: cfgNodeIds[index - 1]!, to: id, label: /^(?:j|loop)/i.test(instruction.mnemonic) ? "branch" : "next" });
    const referencedRegisters = [...new Set(Array.from(instruction.source.matchAll(REGISTER_PATTERN), (match) => canonicalRegister(match[0])))];
    referencedRegisters.forEach((register) => edges.push({ id: `${id}->register:${register}`, from: id, to: `register:${register}`, label: "operand" }));
    instruction.operands.forEach((operand, operandIndex) => {
      if (!/(?:\[[^\]]*\]|\([^)]*\))/.test(operand)) return;
      const memoryId = `memory:${instruction.id}:${operandIndex}`;
      nodes.push(makeNode(memoryId, "memory", compact(operand, 28), `memory operand · L${instruction.line}`, instruction.line));
      memoryCells.push({ id: `${memoryId}:cell`, ownerId: memoryId, label: compact(operand, 24), offset: 0, size: 0, value: "runtime value unknown", status: "uninitialized" });
      edges.push({ id: `${id}->${memoryId}`, from: id, to: memoryId, label: "memory operand" });
    });
  });

  if (!nodes.length) nodes.push(makeNode("source:empty", "source", "empty assembly", "start typing to build the model"));
  return {
    language,
    fingerprint,
    title: `${program.instructions.length} instruction${program.instructions.length === 1 ? "" : "s"} · ${registers.length} register${registers.length === 1 ? "" : "s"}`,
    nodes,
    edges,
    memoryCells,
    stackNodeIds,
    heapNodeIds: [],
    pointerNodeIds: registers.map((register) => `register:${register}`),
    cfgNodeIds,
    registers,
    instructionCount: program.instructions.length
  };
}

export function analyzeSourceVisualModel(source: string, language: LabLanguage): SourceVisualModel {
  const fingerprint = fingerprintSource(`${language}\0${source}`);
  return language === "asm" ? analyzeAssembly(source, language, fingerprint) : analyzeC(source, language, fingerprint);
}
