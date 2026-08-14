"use client";

import {
  ArrowDownToLine,
  Binary,
  Braces,
  ChevronRight,
  CircleDot,
  Cpu,
  FastForward,
  Flag,
  Layers3,
  Pause,
  Play,
  RotateCcw,
  StepForward
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type RegisterName = "RAX" | "RBX" | "RCX" | "RDX" | "RSI" | "RDI" | "RSP" | "RBP" | "RIP" | "R8" | "R9" | "R10" | "R11" | "R12" | "R13" | "R14" | "R15";
type FlagName = "ZF" | "CF" | "OF" | "SF" | "PF";
type ScenarioId = "sum" | "stack" | "branch";

interface Instruction {
  readonly address: string;
  readonly bytes: string;
  readonly intel: string;
  readonly att: string;
  readonly note: string;
  readonly effects?: Partial<Record<RegisterName, string>>;
  readonly flagEffects?: Partial<Record<FlagName, 0 | 1>>;
  readonly memory?: string;
  readonly stack?: { readonly action: "push" | "pop" | "read"; readonly address: string; readonly value: string; readonly label: string };
}

interface Scenario {
  readonly label: string;
  readonly subtitle: string;
  readonly source: string;
  readonly instructions: readonly Instruction[];
  readonly initialRegisters?: Partial<Record<RegisterName, string>>;
  readonly stack: readonly { readonly address: string; readonly value: string; readonly label: string }[];
}

const ZERO = "0x0000000000000000";
const initialRegisters: Record<RegisterName, string> = {
  RAX: ZERO, RBX: ZERO, RCX: ZERO, RDX: ZERO, RSI: ZERO, RDI: ZERO,
  RSP: "0x000000007ffea120", RBP: "0x000000007ffea180", RIP: "0x0000000000401000",
  R8: ZERO, R9: ZERO, R10: ZERO, R11: ZERO, R12: ZERO, R13: ZERO, R14: ZERO, R15: ZERO
};

const scenarios: Readonly<Record<ScenarioId, Scenario>> = {
  sum: {
    label: "Soma em registradores",
    subtitle: "mov · add · ret",
    source: "long sum(void) { return 10 + 20; }",
    stack: [
      { address: "0x7ffea120", value: "0x0000000000401030", label: "return address" },
      { address: "0x7ffea128", value: "0x0000000000000000", label: "caller data" },
      { address: "0x7ffea130", value: "0x0000000000000000", label: "caller data" }
    ],
    instructions: [
      { address: "0x401000", bytes: "48 C7 C0 0A 00 00 00", intel: "mov rax, 10", att: "movq $10, %rax", note: "O imediato 10 é gravado em RAX; RIP avança para a próxima instrução.", effects: { RAX: "0x000000000000000a", RIP: "0x0000000000401007" } },
      { address: "0x401007", bytes: "48 C7 C3 14 00 00 00", intel: "mov rbx, 20", att: "movq $20, %rbx", note: "O imediato 20 é gravado em RBX; nenhuma memória de dados é acessada.", effects: { RBX: "0x0000000000000014", RIP: "0x000000000040100e" } },
      { address: "0x40100E", bytes: "48 01 D8", intel: "add rax, rbx", att: "addq %rbx, %rax", note: "A ALU soma 20 a 10. RAX recebe 30 e RFLAGS registra o resultado.", effects: { RAX: "0x000000000000001e", RIP: "0x0000000000401011" }, flagEffects: { ZF: 0, CF: 0, OF: 0, SF: 0, PF: 1 } },
      { address: "0x401011", bytes: "C3", intel: "ret", att: "retq", note: "ret lê o endereço no topo da stack e transfere o controle ao caller.", effects: { RSP: "0x000000007ffea128", RIP: "0x0000000000401030" }, memory: "READ [RSP] → 0x401030", stack: { action: "pop", address: "0x7ffea120", value: "0x401030", label: "return address" } }
    ]
  },
  stack: {
    label: "Stack frame e chamada",
    subtitle: "prologue · call · epilogue",
    source: "int twice(int x) { return x * 2; }",
    initialRegisters: { RCX: "0x0000000000000015", RIP: "0x0000000000401040" },
    stack: [
      { address: "0x7ffea120", value: "0x0000000000401070", label: "return address" },
      { address: "0x7ffea128", value: "0x0000000000000000", label: "shadow space [0]" },
      { address: "0x7ffea130", value: "0x0000000000000000", label: "shadow space [1]" }
    ],
    instructions: [
      { address: "0x401040", bytes: "55", intel: "push rbp", att: "pushq %rbp", note: "O base pointer do caller é preservado no topo da stack.", effects: { RSP: "0x000000007ffea118", RIP: "0x0000000000401041" }, memory: "WRITE [0x7ffea118] ← RBP", stack: { action: "push", address: "0x7ffea118", value: "0x7ffea180", label: "saved RBP" } },
      { address: "0x401041", bytes: "48 89 E5", intel: "mov rbp, rsp", att: "movq %rsp, %rbp", note: "RBP ancora o novo stack frame.", effects: { RBP: "0x000000007ffea118", RIP: "0x0000000000401044" } },
      { address: "0x401044", bytes: "48 83 EC 20", intel: "sub rsp, 32", att: "subq $32, %rsp", note: "A stack permanece alinhada e reserva shadow space conforme a ABI Windows x64.", effects: { RSP: "0x000000007ffea0f8", RIP: "0x0000000000401048" }, flagEffects: { ZF: 0, CF: 0, OF: 0, SF: 0, PF: 0 }, memory: "RESERVE [RSP..RSP+0x20]" },
      { address: "0x401048", bytes: "E8 13 00 00 00", intel: "call twice", att: "callq twice", note: "Step Over trata a chamada como uma unidade: o retorno chega em RAX e RIP volta ao caller.", effects: { RAX: "0x000000000000002a", RIP: "0x000000000040104d" }, memory: "EXEC twice(RCX=21) → RAX=42", stack: { action: "read", address: "0x7ffea0f0", value: "0x40104d", label: "nested return" } },
      { address: "0x40104D", bytes: "48 83 C4 20", intel: "add rsp, 32", att: "addq $32, %rsp", note: "O caller libera o shadow space reservado antes da chamada.", effects: { RSP: "0x000000007ffea118", RIP: "0x0000000000401051" }, flagEffects: { ZF: 0, CF: 0, OF: 0, SF: 0, PF: 1 } },
      { address: "0x401051", bytes: "5D", intel: "pop rbp", att: "popq %rbp", note: "O frame anterior é restaurado.", effects: { RBP: "0x000000007ffea180", RSP: "0x000000007ffea120", RIP: "0x0000000000401052" }, memory: "READ [0x7ffea118] → RBP", stack: { action: "pop", address: "0x7ffea118", value: "0x7ffea180", label: "saved RBP" } },
      { address: "0x401052", bytes: "C3", intel: "ret", att: "retq", note: "O endereço de retorno original volta para RIP.", effects: { RSP: "0x000000007ffea128", RIP: "0x0000000000401070" }, memory: "READ [RSP] → RIP", stack: { action: "pop", address: "0x7ffea120", value: "0x401070", label: "return address" } }
    ]
  },
  branch: {
    label: "Flags e branch",
    subtitle: "cmp · je · control flow",
    source: "bool is_zero(int x) { return x == 0; }",
    initialRegisters: { RCX: ZERO, RIP: "0x0000000000401080" },
    stack: [{ address: "0x7ffea120", value: "0x00000000004010a0", label: "return address" }],
    instructions: [
      { address: "0x401080", bytes: "85 C9", intel: "test ecx, ecx", att: "testl %ecx, %ecx", note: "AND lógico sem armazenar o resultado; ZF recebe 1 porque ECX é zero.", effects: { RIP: "0x0000000000401082" }, flagEffects: { ZF: 1, CF: 0, OF: 0, SF: 0, PF: 1 } },
      { address: "0x401082", bytes: "74 07", intel: "je .is_zero", att: "je .is_zero", note: "je consulta ZF. Como ZF=1, o branch é tomado.", effects: { RIP: "0x000000000040108b" } },
      { address: "0x40108B", bytes: "B8 01 00 00 00", intel: "mov eax, 1", att: "movl $1, %eax", note: "Escrever EAX também zera os 32 bits superiores de RAX.", effects: { RAX: "0x0000000000000001", RIP: "0x0000000000401090" } },
      { address: "0x401090", bytes: "C3", intel: "ret", att: "retq", note: "A função retorna true em EAX/RAX e continua no caller.", effects: { RSP: "0x000000007ffea128", RIP: "0x00000000004010a0" }, stack: { action: "pop", address: "0x7ffea120", value: "0x4010a0", label: "return address" } }
    ]
  }
};

const registerOrder: readonly RegisterName[] = ["RAX", "RBX", "RCX", "RDX", "RSI", "RDI", "R8", "R9", "R10", "R11", "R12", "R13", "R14", "R15", "RSP", "RBP", "RIP"];
const flagOrder: readonly FlagName[] = ["ZF", "CF", "OF", "SF", "PF"];

function normalizeAddress(value: string): string {
  const normalized = value.replaceAll("`", "").toLowerCase().replace(/^0x0+/, "0x");
  return normalized === "0x" ? "0x0" : normalized;
}

function formatRegisterValue(value: string, architecture: "x86-64" | "x86"): string {
  if (architecture === "x86-64") return value;
  const digits = value.replace(/^0x/, "").slice(-8).padStart(8, "0");
  return `0x${digits}`;
}

function registerLabel(register: RegisterName, architecture: "x86-64" | "x86"): string {
  if (architecture === "x86-64") return register;
  const x86Names: Partial<Record<RegisterName, string>> = {
    RAX: "EAX", RBX: "EBX", RCX: "ECX", RDX: "EDX", RSI: "ESI", RDI: "EDI",
    RSP: "ESP", RBP: "EBP", RIP: "EIP"
  };
  return x86Names[register] ?? register;
}

export function AssemblyVisualizer() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("sum");
  const [cursor, setCursor] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [syntax, setSyntax] = useState<"intel" | "att">("intel");
  const [architecture, setArchitecture] = useState<"x86-64" | "x86">("x86-64");
  const [assembler, setAssembler] = useState<"NASM" | "MASM" | "GAS">("NASM");
  const scenario = scenarios[scenarioId];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setCursor((current) => {
      if (current >= scenario.instructions.length - 1) { setPlaying(false); return current; }
      return current + 1;
    }), 1_050);
    return () => window.clearInterval(timer);
  }, [playing, scenario.instructions.length]);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("scenario");
    if (requested === "sum" || requested === "stack" || requested === "branch") setScenarioId(requested);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
      if (event.key === "F7" || event.key === "F8") {
        event.preventDefault();
        setCursor((value) => Math.min(scenario.instructions.length - 1, value + 1));
        setPlaying(false);
      }
      if (event.key === "F5") {
        event.preventDefault();
        if (cursor < scenario.instructions.length - 1) setPlaying((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cursor, scenario.instructions.length]);

  const state = useMemo(() => {
    const registers = { ...initialRegisters, ...scenario.initialRegisters };
    const flags: Record<FlagName, 0 | 1> = { ZF: 0, CF: 0, OF: 0, SF: 0, PF: 0 };
    const stack = [...scenario.stack];
    for (let index = 0; index <= cursor; index += 1) {
      const instruction = scenario.instructions[index];
      if (!instruction) continue;
      Object.assign(registers, instruction.effects);
      Object.assign(flags, instruction.flagEffects);
      if (instruction.stack?.action === "push") stack.unshift({ address: instruction.stack.address, value: instruction.stack.value, label: instruction.stack.label });
      if (instruction.stack?.action === "pop") {
        const target = stack.findIndex((item) => item.address === instruction.stack?.address);
        if (target >= 0) stack.splice(target, 1);
      }
    }
    return { registers, flags, stack };
  }, [cursor, scenario]);

  const executed = cursor >= 0 ? scenario.instructions[cursor] : undefined;
  const highlightedIndex = cursor < scenario.instructions.length - 1 ? cursor + 1 : -1;
  const modifiedRegisters = new Set(Object.keys(executed?.effects ?? {}));
  const modifiedFlags = new Set(Object.keys(executed?.flagEffects ?? {}));

  function reset() { setCursor(-1); setPlaying(false); }
  function changeScenario(id: ScenarioId) {
    setScenarioId(id);
    setCursor(-1);
    setPlaying(false);
    const url = new URL(window.location.href);
    url.searchParams.set("scenario", id);
    window.history.replaceState({}, "", url);
  }
  function stepInto() { setCursor((value) => Math.min(scenario.instructions.length - 1, value + 1)); setPlaying(false); }
  function stepOver() { stepInto(); }

  function changeSyntax(next: "intel" | "att") {
    setSyntax(next);
    if (next === "att") setAssembler("GAS");
    if (next === "intel" && assembler === "GAS") setAssembler("NASM");
  }

  function changeAssembler(next: "NASM" | "MASM" | "GAS") {
    setAssembler(next);
    setSyntax(next === "GAS" ? "att" : "intel");
  }

  return (
    <div className="assembly-lab-shell">
      <header className="assembly-tool-header">
        <div><span className="eyebrow">Assembly Visualizer</span><h1>Execute a instrução. Observe o estado.</h1></div>
        <div className="assembly-config">
          <label>ARCH<select value={architecture} onChange={(event) => setArchitecture(event.target.value as "x86-64" | "x86")}><option>x86-64</option><option>x86</option></select></label>
          <label>SYNTAX<select value={syntax} onChange={(event) => changeSyntax(event.target.value as "intel" | "att")}><option value="intel">Intel</option><option value="att">AT&amp;T</option></select></label>
          <label>ASSEMBLER<select value={assembler} onChange={(event) => changeAssembler(event.target.value as "NASM" | "MASM" | "GAS")}><option>NASM</option><option>MASM</option><option>GAS</option></select></label>
        </div>
      </header>

      <div className="assembly-context-bar">
        <span><CircleDot size={10} /> deterministic CPU model</span><span><Cpu size={10} /> {architecture}</span><span><Binary size={10} /> {syntax === "intel" ? "Intel syntax" : "AT&T syntax"}</span><span><Layers3 size={10} /> little endian</span><strong>{cursor < 0 ? "READY" : `STEP ${cursor + 1}/${scenario.instructions.length}`}</strong>
      </div>

      <main className="assembly-workbench">
        <aside className="asm-scenario-panel">
          <header>PROGRAMS <span>03</span></header>
          {(Object.keys(scenarios) as ScenarioId[]).map((id, index) => <button type="button" data-active={scenarioId === id} onClick={() => changeScenario(id)} key={id}><span>0{index + 1}</span><div><strong>{scenarios[id].label}</strong><small>{scenarios[id].subtitle}</small></div><ChevronRight size={11} /></button>)}
          <section className="asm-source-link"><header><Braces size={11} />SOURCE MODEL</header><code>{scenario.source}</code><div><ArrowDownToLine size={11} /><span>compiler lowers source into ABI-conformant instructions</span></div></section>
          <section className="asm-legend"><header>TRACE LEGEND</header><p><i className="changed" />modified this step</p><p><i className="accessed" />memory accessed</p><p><i className="current" />current RIP</p></section>
        </aside>

        <section className="asm-code-panel">
          <header><span>CODE</span><small>{scenarioId}.asm · .text · {assembler.toLowerCase()}</small></header>
          <div className="asm-code-head"><span>ADDRESS</span><span>BYTES</span><span>INSTRUCTION</span></div>
          <div className="asm-code-lines">
            {scenario.instructions.map((instruction, index) => {
              const instructionText = syntax === "intel" ? instruction.intel : instruction.att;
              const [mnemonic, ...operands] = instructionText.split(" ");
              return <button type="button" data-current={highlightedIndex === index} data-executed={cursor >= index} onClick={() => { setCursor(index - 1); setPlaying(false); }} key={instruction.address}><span className="rip-marker">{highlightedIndex === index ? <Play size={8} fill="currentColor" /> : null}</span><code>{instruction.address}</code><code>{instruction.bytes}</code><span><b>{mnemonic}</b> {operands.join(" ")}</span></button>;
            })}
          </div>
          <div className="asm-explanation"><span>{cursor < 0 ? "00" : String(cursor + 1).padStart(2, "0")}</span><div><strong>{executed ? executed.intel : "Pronto para executar"}</strong><p>{executed?.note ?? "Step Into executa a instrução destacada e congela todo o estado observável."}</p></div></div>
          <div className="asm-memory-access" data-active={Boolean(executed?.memory)}><span>MEMORY BUS</span><code>{executed?.memory ?? "no memory access in current step"}</code></div>
        </section>

        <aside className="asm-state-panel">
          <section className="register-panel"><header><Cpu size={12} /><span>REGISTERS</span><small>{architecture}</small></header><div>{registerOrder.map((register) => {
            const x86Unavailable = architecture === "x86" && register.startsWith("R") && !["RAX", "RBX", "RCX", "RDX", "RSI", "RDI", "RSP", "RBP", "RIP"].includes(register);
            return <p data-changed={modifiedRegisters.has(register)} data-disabled={x86Unavailable} key={register}><span>{registerLabel(register, architecture)}</span><code>{x86Unavailable ? "—" : formatRegisterValue(state.registers[register], architecture)}</code></p>;
          })}</div></section>
          <section className="flag-panel"><header><Flag size={12} /><span>RFLAGS</span><small>status bits</small></header><div>{flagOrder.map((flag) => <p data-changed={modifiedFlags.has(flag)} key={flag}><span>{flag}</span><b>{state.flags[flag]}</b></p>)}</div></section>
        </aside>

        <section className="asm-stack-panel">
          <header><Layers3 size={12} /><span>STACK</span><small>grows toward lower addresses ↓</small></header>
          <div>{state.stack.length ? state.stack.map((item) => <p data-accessed={executed?.stack?.address === item.address} key={`${item.address}-${item.label}`}><code>{item.address}</code><code>{item.value}</code><span>{item.label}</span>{normalizeAddress(item.address) === normalizeAddress(state.registers.RSP) ? <b>← RSP</b> : null}</p>) : <div className="empty-stack">stack frame returned to caller</div>}</div>
        </section>
      </main>

      <footer className="assembly-controls">
        <div className="assembly-transport">
          <button type="button" onClick={reset}><RotateCcw size={12} />Reset</button>
          <button type="button" onClick={stepInto} disabled={cursor >= scenario.instructions.length - 1}><StepForward size={12} />Step Into <kbd>F7</kbd></button>
          <button type="button" onClick={stepOver} disabled={cursor >= scenario.instructions.length - 1}><FastForward size={12} />Step Over <kbd>F8</kbd></button>
          <button className="continue-button" type="button" onClick={() => setPlaying((value) => !value)} disabled={cursor >= scenario.instructions.length - 1}>{playing ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}{playing ? "Pause" : "Continue"} <kbd>F5</kbd></button>
        </div>
        <div className="assembly-timeline">{scenario.instructions.map((instruction, index) => <button type="button" aria-label={`Ir para ${instruction.address}`} data-active={index <= cursor} data-current={index === highlightedIndex} onClick={() => { setCursor(index); setPlaying(false); }} key={instruction.address}><i /><span>{index + 1}</span></button>)}</div>
        <span className="cpu-cycle"><CircleDot size={9} /> educational · not cycle accurate</span>
      </footer>
    </div>
  );
}
