import type {
  AssemblyPreviewInstruction,
  CTraceEvent,
  CpuState,
  ParsedInstruction,
  RegisterName,
  SimFlags,
  SimulationEvent,
  SimulationSnapshot
} from "./types";

const MASK_64 = (1n << 64n) - 1n;
const SIGN_64 = 1n << 63n;
const REGISTER_NAMES: readonly RegisterName[] = [
  "RAX", "RBX", "RCX", "RDX", "RSI", "RDI", "RBP", "RSP",
  "R8", "R9", "R10", "R11", "R12", "R13", "R14", "R15"
];

const REGISTER_ALIASES: Readonly<Record<string, RegisterName>> = {
  RAX: "RAX", EAX: "RAX", RBX: "RBX", EBX: "RBX", RCX: "RCX", ECX: "RCX",
  RDX: "RDX", EDX: "RDX", RSI: "RSI", ESI: "RSI", RDI: "RDI", EDI: "RDI",
  RBP: "RBP", EBP: "RBP", RSP: "RSP", ESP: "RSP",
  R8: "R8", R8D: "R8", R9: "R9", R9D: "R9", R10: "R10", R10D: "R10",
  R11: "R11", R11D: "R11", R12: "R12", R12D: "R12", R13: "R13", R13D: "R13",
  R14: "R14", R14D: "R14", R15: "R15", R15D: "R15"
};

export interface ParsedProgram {
  readonly instructions: readonly ParsedInstruction[];
  readonly labels: Readonly<Record<string, number>>;
}

interface OperandValue {
  readonly value: bigint;
  readonly address?: bigint;
}

interface MutableCpuState {
  registers: Record<RegisterName, bigint>;
  flags: SimFlags;
  memory: Record<string, bigint>;
  stack: Array<{ id: string; address: bigint; value: bigint; label: string }>;
  callStack: string[];
  instructionIndex: number;
  halted: boolean;
}

function blankRegisters(): Record<RegisterName, bigint> {
  return Object.fromEntries(REGISTER_NAMES.map((name) => [name, 0n])) as Record<RegisterName, bigint>;
}

export function createInitialCpuState(): CpuState {
  return {
    registers: { ...blankRegisters(), RSP: 0x7ff0n, RBP: 0x7ff0n },
    flags: { ZF: 0, CF: 0, OF: 0, SF: 0, PF: 0 },
    memory: {},
    stack: [],
    callStack: ["entry"],
    instructionIndex: 0,
    halted: false
  };
}

function toMutable(state: CpuState): MutableCpuState {
  return {
    registers: { ...state.registers },
    flags: { ...state.flags },
    memory: { ...state.memory },
    stack: state.stack.map((cell) => ({ ...cell })),
    callStack: [...state.callStack],
    instructionIndex: state.instructionIndex,
    halted: state.halted
  };
}

function freezeState(state: MutableCpuState): CpuState {
  return {
    registers: state.registers,
    flags: state.flags,
    memory: state.memory,
    stack: state.stack,
    callStack: state.callStack,
    instructionIndex: state.instructionIndex,
    halted: state.halted
  };
}

export function parseAssembly(source: string): ParsedProgram {
  const instructions: ParsedInstruction[] = [];
  const labels: Record<string, number> = {};
  let pendingLabel: string | undefined;

  source.split(/\r?\n/).forEach((rawLine, lineIndex) => {
    const withoutComment = rawLine.replace(/;.*$/, "").trim();
    if (!withoutComment || /^\s*(section|global|extern|bits|default)\b/i.test(withoutComment)) return;

    const labelMatch = withoutComment.match(/^([A-Za-z_.$][\w.$]*):\s*(.*)$/);
    const instructionSource = labelMatch?.[2]?.trim() ?? withoutComment;
    if (labelMatch?.[1]) {
      labels[labelMatch[1].toLowerCase()] = instructions.length;
      pendingLabel = labelMatch[1];
    }
    if (!instructionSource) return;

    const match = instructionSource.match(/^([A-Za-z][\w.]*)\s*(.*)$/);
    if (!match?.[1]) return;
    const operands = (match[2] ?? "").split(",").map((operand) => operand.trim()).filter(Boolean);
    instructions.push({
      id: `instruction-${instructions.length}`,
      line: lineIndex + 1,
      source: instructionSource,
      mnemonic: match[1].toLowerCase(),
      operands,
      ...(pendingLabel ? { label: pendingLabel } : {})
    });
    pendingLabel = undefined;
  });

  return { instructions, labels };
}

function registerFor(operand: string): RegisterName | undefined {
  return REGISTER_ALIASES[operand.replace(/^%/, "").toUpperCase()];
}

function parseImmediate(operand: string): bigint | undefined {
  const normalized = operand.replace(/^[$#]/, "").replace(/\b(?:byte|word|dword|qword)\s+(?:ptr\s+)?/i, "").trim();
  if (/^-?0x[\da-f]+$/i.test(normalized) || /^-?\d+$/.test(normalized)) {
    try { return BigInt(normalized); } catch { return undefined; }
  }
  return undefined;
}

function memoryAddress(operand: string, state: MutableCpuState): bigint | undefined {
  const match = operand.match(/\[([^\]]+)\]/);
  if (!match?.[1]) return undefined;
  const expression = match[1].replace(/-/g, "+-");
  let address = 0n;
  for (const term of expression.split("+").map((item) => item.trim()).filter(Boolean)) {
    const scaled = term.match(/^([A-Za-z0-9]+)\s*\*\s*(\d+)$/);
    if (scaled?.[1] && scaled[2]) {
      const register = registerFor(scaled[1]);
      if (!register) return undefined;
      address += state.registers[register] * BigInt(scaled[2]);
      continue;
    }
    const register = registerFor(term);
    if (register) address += state.registers[register];
    else {
      const immediate = parseImmediate(term);
      if (immediate === undefined) return undefined;
      address += immediate;
    }
  }
  return address & MASK_64;
}

function memoryKey(address: bigint): string {
  return `0x${(address & MASK_64).toString(16).padStart(16, "0")}`;
}

function readOperand(operand: string, state: MutableCpuState): OperandValue {
  const register = registerFor(operand);
  if (register) {
    const raw = state.registers[register];
    return { value: operand.replace(/^%/, "").toUpperCase().endsWith("D") || operand.toUpperCase().startsWith("E") ? raw & 0xffffffffn : raw };
  }
  const address = memoryAddress(operand, state);
  if (address !== undefined) return { address, value: state.memory[memoryKey(address)] ?? 0n };
  return { value: parseImmediate(operand) ?? 0n };
}

function writeOperand(operand: string, value: bigint, state: MutableCpuState): { register?: RegisterName; address?: bigint } {
  const register = registerFor(operand);
  if (register) {
    const alias = operand.replace(/^%/, "").toUpperCase();
    state.registers[register] = alias.startsWith("E") || alias.endsWith("D") ? value & 0xffffffffn : value & MASK_64;
    return { register };
  }
  const address = memoryAddress(operand, state);
  if (address !== undefined) {
    state.memory[memoryKey(address)] = value & MASK_64;
    return { address };
  }
  return {};
}

function parity(value: bigint): 0 | 1 {
  let byte = Number(value & 0xffn);
  let bits = 0;
  while (byte) { bits += byte & 1; byte >>= 1; }
  return bits % 2 === 0 ? 1 : 0;
}

function arithmeticFlags(left: bigint, right: bigint, result: bigint, operation: "add" | "sub"): SimFlags {
  const wrapped = result & MASK_64;
  const leftSign = Boolean(left & SIGN_64);
  const rightSign = Boolean(right & SIGN_64);
  const resultSign = Boolean(wrapped & SIGN_64);
  const overflow = operation === "add"
    ? leftSign === rightSign && leftSign !== resultSign
    : leftSign !== rightSign && leftSign !== resultSign;
  return {
    ZF: wrapped === 0n ? 1 : 0,
    CF: operation === "add" ? (result > MASK_64 ? 1 : 0) : (left < right ? 1 : 0),
    OF: overflow ? 1 : 0,
    SF: resultSign ? 1 : 0,
    PF: parity(wrapped)
  };
}

function explanationFor(instruction: ParsedInstruction, before: CpuState, after: CpuState): SimulationEvent["explanation"] {
  const [destination = "", source = ""] = instruction.operands;
  const destinationRegister = registerFor(destination);
  const oldValue = destinationRegister ? formatHex(before.registers[destinationRegister]) : "memória simulada";
  const newValue = destinationRegister ? formatHex(after.registers[destinationRegister]) : "estado atualizado";
  const beginnerByMnemonic: Record<string, string> = {
    mov: `Copia ${source || "um valor"} para ${destination || "o destino"}.`,
    add: `Soma ${source} ao valor de ${destination}.`,
    sub: `Subtrai ${source} do valor de ${destination}.`,
    cmp: `Compara ${destination} com ${source} e atualiza as flags.`,
    push: `Coloca ${destination} no topo da stack simulada.`,
    pop: `Remove o topo da stack e copia o valor para ${destination}.`,
    call: `Cria um retorno na stack e transfere o fluxo para ${destination}.`,
    ret: "Retorna ao chamador; sem chamador, encerra a simulação.",
    jne: "Salta quando a comparação anterior não produziu igualdade.",
    je: "Salta quando a comparação anterior produziu igualdade."
  };
  return {
    beginner: beginnerByMnemonic[instruction.mnemonic] ?? `Executa ${instruction.source} no modelo educacional.`,
    advanced: `${instruction.mnemonic.toUpperCase()} lê os operandos declarados e aplica semântica x86-64 simplificada. ${destinationRegister ? `${destinationRegister}: ${oldValue} → ${newValue}.` : "O fluxo ou a memória simulada foi atualizado."}`,
    "low-level": `Instruction: ${instruction.mnemonic.toUpperCase()} · operands: ${instruction.operands.join(", ") || "none"} · registers read/written and flags are derived by the deterministic simulator, not captured from a native CPU.`
  };
}

function changedRegisters(before: CpuState, after: CpuState): RegisterName[] {
  return REGISTER_NAMES.filter((name) => before.registers[name] !== after.registers[name]);
}

function changedFlags(before: CpuState, after: CpuState): (keyof SimFlags)[] {
  return (Object.keys(before.flags) as (keyof SimFlags)[]).filter((name) => before.flags[name] !== after.flags[name]);
}

export function stepCpu(program: ParsedProgram, input: CpuState): SimulationSnapshot {
  if (input.halted) return { state: input };
  const instruction = program.instructions[input.instructionIndex];
  if (!instruction) return { state: { ...input, halted: true } };

  const state = toMutable(input);
  const before = input;
  const [destination = "", source = ""] = instruction.operands;
  const mnemonic = instruction.mnemonic;
  let nextIndex = input.instructionIndex + 1;
  let memoryRead: string | undefined;
  let memoryWrite: string | undefined;
  let stage: SimulationEvent["stage"] = "execute";

  const destinationValue = readOperand(destination, state);
  const sourceValue = readOperand(source, state);
  if (destinationValue.address !== undefined) memoryRead = memoryKey(destinationValue.address);
  if (sourceValue.address !== undefined) memoryRead = memoryKey(sourceValue.address);

  if (mnemonic === "mov") {
    const write = writeOperand(destination, sourceValue.value, state);
    if (write.address !== undefined) memoryWrite = memoryKey(write.address);
  } else if (["add", "sub", "xor", "and", "or"].includes(mnemonic)) {
    const left = destinationValue.value;
    const right = sourceValue.value;
    const rawResult = mnemonic === "add" ? left + right
      : mnemonic === "sub" ? left - right
        : mnemonic === "xor" ? left ^ right
          : mnemonic === "and" ? left & right : left | right;
    const write = writeOperand(destination, rawResult, state);
    if (write.address !== undefined) memoryWrite = memoryKey(write.address);
    state.flags = mnemonic === "add" || mnemonic === "sub"
      ? arithmeticFlags(left, right, rawResult, mnemonic)
      : { ...state.flags, ZF: (rawResult & MASK_64) === 0n ? 1 : 0, SF: rawResult & SIGN_64 ? 1 : 0, PF: parity(rawResult), CF: 0, OF: 0 };
  } else if (mnemonic === "inc" || mnemonic === "dec") {
    const delta = mnemonic === "inc" ? 1n : -1n;
    const rawResult = destinationValue.value + delta;
    writeOperand(destination, rawResult, state);
    const nextFlags = arithmeticFlags(destinationValue.value, 1n, rawResult, mnemonic === "inc" ? "add" : "sub");
    state.flags = { ...nextFlags, CF: state.flags.CF };
  } else if (mnemonic === "cmp" || mnemonic === "test") {
    const result = mnemonic === "cmp" ? destinationValue.value - sourceValue.value : destinationValue.value & sourceValue.value;
    state.flags = mnemonic === "cmp"
      ? arithmeticFlags(destinationValue.value, sourceValue.value, result, "sub")
      : { ...state.flags, ZF: result === 0n ? 1 : 0, SF: result & SIGN_64 ? 1 : 0, PF: parity(result), CF: 0, OF: 0 };
  } else if (mnemonic === "lea") {
    writeOperand(destination, memoryAddress(source, state) ?? 0n, state);
  } else if (mnemonic === "push") {
    state.registers.RSP = (state.registers.RSP - 8n) & MASK_64;
    state.memory[memoryKey(state.registers.RSP)] = destinationValue.value;
    state.stack = [{ id: `stack-${input.instructionIndex}-${state.stack.length}`, address: state.registers.RSP, value: destinationValue.value, label: destination }, ...state.stack];
    memoryWrite = memoryKey(state.registers.RSP);
    stage = "memory";
  } else if (mnemonic === "pop") {
    const top = state.stack[0];
    const value = top?.value ?? state.memory[memoryKey(state.registers.RSP)] ?? 0n;
    writeOperand(destination, value, state);
    memoryRead = memoryKey(state.registers.RSP);
    state.stack = state.stack.slice(1);
    state.registers.RSP = (state.registers.RSP + 8n) & MASK_64;
    stage = "memory";
  } else if (mnemonic === "call") {
    const target = program.labels[destination.toLowerCase()];
    state.registers.RSP = (state.registers.RSP - 8n) & MASK_64;
    state.memory[memoryKey(state.registers.RSP)] = BigInt(nextIndex);
    state.stack = [{ id: `return-${input.instructionIndex}`, address: state.registers.RSP, value: BigInt(nextIndex), label: `return → IP#${nextIndex}` }, ...state.stack];
    state.callStack = [...state.callStack, destination];
    memoryWrite = memoryKey(state.registers.RSP);
    if (target !== undefined) nextIndex = target;
  } else if (mnemonic === "ret") {
    const top = state.stack[0];
    if (state.callStack.length > 1 && top) {
      nextIndex = Number(top.value);
      state.stack = state.stack.slice(1);
      state.registers.RSP = (state.registers.RSP + 8n) & MASK_64;
      state.callStack = state.callStack.slice(0, -1);
      memoryRead = memoryKey(top.address);
    } else {
      state.halted = true;
    }
  } else if (["jmp", "je", "jz", "jne", "jnz", "jg", "jl"].includes(mnemonic)) {
    const shouldJump = mnemonic === "jmp"
      || ((mnemonic === "je" || mnemonic === "jz") && state.flags.ZF === 1)
      || ((mnemonic === "jne" || mnemonic === "jnz") && state.flags.ZF === 0)
      || (mnemonic === "jg" && state.flags.ZF === 0 && state.flags.SF === state.flags.OF)
      || (mnemonic === "jl" && state.flags.SF !== state.flags.OF);
    if (shouldJump) nextIndex = program.labels[destination.toLowerCase()] ?? nextIndex;
  } else if (mnemonic === "nop") {
    // Deliberately no state change.
  }

  state.instructionIndex = state.halted ? input.instructionIndex : nextIndex;
  const after = freezeState(state);
  const event: SimulationEvent = {
    instruction,
    before,
    after,
    changedRegisters: changedRegisters(before, after),
    changedFlags: changedFlags(before, after),
    ...(memoryRead ? { memoryRead: `SIM:${memoryRead}` } : {}),
    ...(memoryWrite ? { memoryWrite: `SIM:${memoryWrite}` } : {}),
    explanation: explanationFor(instruction, before, after),
    stage
  };
  return { state: after, event };
}

export function replaceRegister(state: CpuState, register: RegisterName, value: bigint): CpuState {
  return { ...state, registers: { ...state.registers, [register]: value & MASK_64 } };
}

export function replaceMemory(state: CpuState, address: string, value: bigint): CpuState {
  const normalized = address.replace(/^SIM:/, "");
  return { ...state, memory: { ...state.memory, [normalized]: value & MASK_64 } };
}

export function formatHex(value: bigint, width = 16): string {
  return `0x${(value & MASK_64).toString(16).padStart(width, "0")}`;
}

export function instructionCount(disassembly: string): number {
  return disassembly.split(/\r?\n/).filter((line) => /^\s*[0-9a-f]+:\s+(?:[0-9a-f]{2}\s+)+/i.test(line)).length;
}

function compactPreviewOperand(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 28 ? `${compact.slice(0, 27)}…` : compact;
}

/**
 * Produces a source-derived teaching preview while no native compiler artifact
 * exists. These symbolic instructions deliberately omit addresses and bytes;
 * Build & Run replaces them with the exact objdump output.
 */
export function inferCAssemblyPreview(source: string): readonly AssemblyPreviewInstruction[] {
  const instructions: AssemblyPreviewInstruction[] = [];
  let insideFunction = false;

  function emit(instruction: string, sourceLine: number): void {
    instructions.push({
      id: `preview-${instructions.length}`,
      instruction,
      sourceLine
    });
  }

  source.split(/\r?\n/).forEach((rawLine, index) => {
    const sourceLine = index + 1;
    const text = rawLine.replace(/\/\/.*$/, "").trim();
    if (!text || text.startsWith("#") || text === "{" || text === "}") return;

    const functionDefinition = text.match(/^(?:(?:static|inline|constexpr|extern)\s+)*(?:[\w:<>]+\s*[*&]?\s+)+([A-Za-z_]\w*)\s*\([^;]*\)\s*(?:const\s*)?\{/);
    if (functionDefinition?.[1]) {
      insideFunction = true;
      emit("push rbp", sourceLine);
      emit("mov rbp, rsp", sourceLine);
      return;
    }

    const allocation = text.match(/\b(malloc|calloc|realloc)\s*\((.*)\)\s*;/);
    if (allocation?.[1]) {
      const argument = compactPreviewOperand(allocation[2] ?? "size");
      const target = text.match(/\b([A-Za-z_]\w*)\s*=\s*(?:\([^)]*\)\s*)?(?:malloc|calloc|realloc)\b/)?.[1];
      emit(`mov rdi, ${argument || "size"}`, sourceLine);
      emit(`call ${allocation[1]}`, sourceLine);
      if (target) emit(`mov qword ptr [${target}], rax`, sourceLine);
      return;
    }

    const free = text.match(/\bfree\s*\(\s*([A-Za-z_]\w*)\s*\)/);
    if (free?.[1]) {
      emit(`mov rdi, qword ptr [${free[1]}]`, sourceLine);
      emit("call free", sourceLine);
      return;
    }

    const libraryCall = text.match(/\b(printf|puts|scanf|fprintf|fputs)\s*\(/);
    if (libraryCall?.[1]) {
      emit("lea rdi, [rip + .LC0]", sourceLine);
      if (libraryCall[1] === "printf" || libraryCall[1] === "scanf" || libraryCall[1] === "fprintf") {
        emit("xor eax, eax", sourceLine);
      }
      emit(`call ${libraryCall[1]}`, sourceLine);
      return;
    }

    const returnMatch = text.match(/^return(?:\s+(.+?))?\s*;/);
    if (returnMatch) {
      emit(`mov eax, ${compactPreviewOperand(returnMatch[1] ?? "0")}`, sourceLine);
      if (insideFunction) emit("leave", sourceLine);
      emit("ret", sourceLine);
      return;
    }

    const branch = text.match(/^if\s*\((.*)\)/);
    if (branch?.[1]) {
      emit(`cmp ${compactPreviewOperand(branch[1])}, 0`, sourceLine);
      emit("je .Lnext", sourceLine);
      return;
    }

    const loop = text.match(/^(?:for|while)\s*\((.*)\)/);
    if (loop?.[1]) {
      emit(`cmp ${compactPreviewOperand(loop[1])}, 0`, sourceLine);
      emit("jne .Lloop", sourceLine);
      return;
    }

    const indirectWrite = text.match(/^(?:[A-Za-z_]\w*\s+)*(?:\*\s*)?([A-Za-z_]\w*)\s*->\s*([A-Za-z_]\w*)\s*=\s*([^;]+);/);
    if (indirectWrite?.[1] && indirectWrite[2]) {
      emit(`mov dword ptr [${indirectWrite[1]} + ${indirectWrite[2]}], ${compactPreviewOperand(indirectWrite[3] ?? "?")}`, sourceLine);
      return;
    }

    const dereferenceWrite = text.match(/^\*\s*([A-Za-z_]\w*)\s*=\s*([^;]+);/);
    if (dereferenceWrite?.[1]) {
      emit(`mov dword ptr [${dereferenceWrite[1]}], ${compactPreviewOperand(dereferenceWrite[2] ?? "?")}`, sourceLine);
      return;
    }

    const initializedScalar = text.match(/^(?:const\s+)?(?:unsigned\s+|signed\s+)?(?:int|char|short|long|float|double|size_t)\s+([A-Za-z_]\w*)\s*=\s*([^;]+);/);
    if (initializedScalar?.[1]) {
      emit(`mov dword ptr [${initializedScalar[1]}], ${compactPreviewOperand(initializedScalar[2] ?? "?")}`, sourceLine);
      return;
    }

    const generalCall = text.match(/\b([A-Za-z_]\w*)\s*\(/);
    if (generalCall?.[1] && !["if", "for", "while", "switch", "sizeof"].includes(generalCall[1])) {
      emit(`call ${generalCall[1]}`, sourceLine);
    }
  });

  return instructions;
}

export function inferCTrace(source: string): readonly CTraceEvent[] {
  const events: CTraceEvent[] = [];
  source.split(/\r?\n/).forEach((line, index) => {
    const text = line.trim();
    if (!text || text.startsWith("#") || text.startsWith("//") || text === "{" || text === "}") return;
    let event: Omit<CTraceEvent, "id" | "line" | "source"> | undefined;
    if (/\b(?:malloc|calloc|realloc)\s*\(/.test(text)) event = { title: "Reserva no heap", detail: "O modelo cria uma região abstrata heap#1. Nenhum endereço nativo foi capturado.", kind: "allocation" };
    else if (/\bfree\s*\(/.test(text)) event = { title: "Lifetime encerrado", detail: "A região abstrata passa a FREED e acessos posteriores devem ser tratados como inválidos.", kind: "free" };
    else if (/\w+\s*->\s*\w+\s*=|\*\s*\w+\s*=/.test(text)) event = { title: "Escrita indireta", detail: "O lvalue é resolvido pelo ponteiro antes da escrita no objeto de destino.", kind: "write" };
    else if (/\w+\s*\[.+\]\s*=/.test(text)) event = { title: "Escrita indexada", detail: "O índice é convertido em deslocamento usando o tamanho do elemento.", kind: "write" };
    else if (/\w+\s*\*\s*\w+\s*=\s*&/.test(text) || /\w+\s*\*\s*\w+\s*=/.test(text)) event = { title: "Ponteiro associado", detail: "O modelo registra uma relação de referência entre dois objetos abstratos.", kind: "pointer" };
    else if (/\b(?:printf|puts|scanf)\s*\(/.test(text)) event = { title: "Chamada de biblioteca", detail: "Argumentos são preparados conforme a ABI; compile para obter as instruções reais.", kind: "call" };
    else if (/^return\b/.test(text)) event = { title: "Retorno", detail: "O controle retorna ao chamador e o frame atual deixa de estar ativo.", kind: "return" };
    else if (/^(?:const\s+)?(?:unsigned\s+|signed\s+)?(?:int|char|float|double|size_t|\w+\s*\*)\b/.test(text)) event = { title: "Objeto declarado", detail: "O objeto entra no modelo de escopo; localização física depende do compilador e da otimização.", kind: "declare" };
    if (event) events.push({ id: `c-event-${events.length}`, line: index + 1, source: text, ...event });
  });
  return events;
}

export function snapshotAfter(source: string, limit = 200): readonly SimulationSnapshot[] {
  const program = parseAssembly(source);
  const snapshots: SimulationSnapshot[] = [{ state: createInitialCpuState() }];
  while (!snapshots.at(-1)?.state.halted && snapshots.length <= limit) {
    const next = stepCpu(program, snapshots.at(-1)!.state);
    snapshots.push(next);
    if (!next.event) break;
  }
  return snapshots;
}
