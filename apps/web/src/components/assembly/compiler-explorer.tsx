"use client";

import { ArrowDown, ArrowRight, Binary, Braces, Check, Cpu, FileCode2, Gauge, Info, ScanLine, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";

type Compiler = "GCC" | "Clang" | "MSVC";
type Optimization = "-O0" | "-O1" | "-O2" | "-O3" | "-Os";

interface AsmLine {
  readonly address: string;
  readonly bytes: string;
  readonly mnemonic: string;
  readonly operands: string;
  readonly note?: string;
}

const optimizedWindows: readonly AsmLine[] = [
  { address: "0x140001000", bytes: "8B C1", mnemonic: "mov", operands: "eax, ecx", note: "a chega em ECX; EAX carrega o retorno" },
  { address: "0x140001002", bytes: "03 C2", mnemonic: "add", operands: "eax, edx", note: "b chega em EDX" },
  { address: "0x140001004", bytes: "C3", mnemonic: "ret", operands: "", note: "RIP volta ao caller" }
];

const optimizedSysV: readonly AsmLine[] = [
  { address: "0x401000", bytes: "8D 04 37", mnemonic: "lea", operands: "eax, [rdi + rsi]", note: "GCC/Clang usam RDI e RSI no System V ABI" },
  { address: "0x401003", bytes: "C3", mnemonic: "ret", operands: "", note: "o inteiro retorna em EAX" }
];

const unoptimizedWindows: readonly AsmLine[] = [
  { address: "0x140001000", bytes: "89 4C 24 08", mnemonic: "mov", operands: "dword ptr [rsp+8], ecx" },
  { address: "0x140001004", bytes: "89 54 24 10", mnemonic: "mov", operands: "dword ptr [rsp+16], edx" },
  { address: "0x140001008", bytes: "8B 44 24 08", mnemonic: "mov", operands: "eax, dword ptr [rsp+8]" },
  { address: "0x14000100C", bytes: "03 44 24 10", mnemonic: "add", operands: "eax, dword ptr [rsp+16]" },
  { address: "0x140001010", bytes: "C3", mnemonic: "ret", operands: "" }
];

const unoptimizedSysV: readonly AsmLine[] = [
  { address: "0x401000", bytes: "55", mnemonic: "push", operands: "rbp" },
  { address: "0x401001", bytes: "48 89 E5", mnemonic: "mov", operands: "rbp, rsp" },
  { address: "0x401004", bytes: "89 7D FC", mnemonic: "mov", operands: "dword [rbp-4], edi" },
  { address: "0x401007", bytes: "89 75 F8", mnemonic: "mov", operands: "dword [rbp-8], esi" },
  { address: "0x40100A", bytes: "8B 45 FC", mnemonic: "mov", operands: "eax, dword [rbp-4]" },
  { address: "0x40100D", bytes: "03 45 F8", mnemonic: "add", operands: "eax, dword [rbp-8]" },
  { address: "0x401010", bytes: "5D", mnemonic: "pop", operands: "rbp" },
  { address: "0x401011", bytes: "C3", mnemonic: "ret", operands: "" }
];

const optimizationNotes: Readonly<Record<Optimization, { title: string; detail: string }>> = {
  "-O0": { title: "Debug first", detail: "Preserva estrutura e temporários; stack frame explícito." },
  "-O1": { title: "Local cleanup", detail: "Remove tráfego redundante sem transformar agressivamente." },
  "-O2": { title: "Production balance", detail: "Inlining, data flow e simplificações seguras." },
  "-O3": { title: "Throughput", detail: "Inclui vetorização e transformações mais agressivas." },
  "-Os": { title: "Code size", detail: "Favorece um binário menor e cache de instruções." }
};

const sourceDefault = `int soma(int a, int b)
{
    return a + b;
}`;

export function CompilerExplorer() {
  const [compiler, setCompiler] = useState<Compiler>("MSVC");
  const [optimization, setOptimization] = useState<Optimization>("-O2");
  const source = sourceDefault;
  const lines = useMemo(() => {
    const optimized = optimization !== "-O0";
    if (compiler === "MSVC") return optimized ? optimizedWindows : unoptimizedWindows;
    return optimized ? optimizedSysV : unoptimizedSysV;
  }, [compiler, optimization]);
  const instructionBytes = lines.flatMap((line) => line.bytes.split(" ")).length;

  return (
    <div className="compiler-lab-page">
      <header className="compiler-header">
        <div><span className="eyebrow">C/C++ ↔ Assembly</span><h1>Veja o que o compilador decidiu.</h1><p>Compare source, ABI, instruções e bytes. Os snapshots são determinísticos e explicam a forma do código gerado.</p></div>
        <div className="compiler-controls">
          <label>COMPILER<select value={compiler} onChange={(event) => setCompiler(event.target.value as Compiler)}><option>GCC</option><option>Clang</option><option>MSVC</option></select></label>
          <label>OPTIMIZATION<select value={optimization} onChange={(event) => setOptimization(event.target.value as Optimization)}><option>-O0</option><option>-O1</option><option>-O2</option><option>-O3</option><option>-Os</option></select></label>
          <span data-online={compiler !== "MSVC"}><i />{compiler === "MSVC" ? "reference target" : "local toolchain"}</span>
        </div>
      </header>

      <section className="compiler-pipeline" aria-label="Pipeline de compilação">
        {[{ icon: Braces, label: "C / C++", detail: "source" }, { icon: Settings2, label: "Compiler", detail: `${compiler} ${optimization}` }, { icon: FileCode2, label: "Assembly", detail: compiler === "MSVC" ? "Windows x64" : "System V AMD64" }, { icon: Binary, label: "Machine Code", detail: `${instructionBytes} bytes` }, { icon: Cpu, label: "CPU", detail: "x86-64" }].map(({ icon: Icon, label, detail }, index, stages) => <div key={label}><span><Icon size={15} /></span><strong>{label}</strong><small>{detail}</small>{index < stages.length - 1 ? <ArrowRight size={14} /> : null}</div>)}
      </section>

      <nav className="optimization-strip" aria-label="Níveis de otimização">
        {(Object.keys(optimizationNotes) as Optimization[]).map((level) => <button type="button" data-active={optimization === level} onClick={() => setOptimization(level)} key={level}><strong>{level}</strong><span>{optimizationNotes[level].title}</span></button>)}
      </nav>

      <main className="compiler-workbench">
        <section className="compiler-editor source-editor">
          <header><span><Braces size={11} />SOURCE · soma.cpp</span><small>C++20</small></header>
          <div className="editor-body"><div className="editor-gutter">{source.split("\n").map((_, index) => <span key={index}>{index + 1}</span>)}</div><textarea spellCheck={false} aria-label="Código C++ de referência" value={source} readOnly /></div>
          <footer><span>DETERMINISTIC SNAPSHOT</span><span>{source.length} chars</span></footer>
        </section>

        <section className="compiler-editor assembly-output">
          <header><span><FileCode2 size={11} />ASSEMBLY · {compiler.toLowerCase()}</span><small>Intel syntax</small></header>
          <div className="asm-output-lines">{lines.map((line, index) => <div key={`${line.address}-${index}`}><span>{index + 1}</span><code className="asm-label">{index === 0 ? "soma:" : ""}</code><code><b>{line.mnemonic}</b>{line.operands ? ` ${line.operands}` : ""}</code></div>)}</div>
          <div className="compiler-decision"><Info size={13} /><div><strong>{optimizationNotes[optimization].title}</strong><p>{optimizationNotes[optimization].detail}</p></div></div>
        </section>

        <aside className="compiler-inspector">
          <header><ScanLine size={11} /><span>LOWERING NOTES</span></header>
          <div className="abi-contract"><span>ACTIVE ABI</span><strong>{compiler === "MSVC" ? "Windows x64" : "System V AMD64"}</strong><code>{compiler === "MSVC" ? "a → ECX   b → EDX   return → EAX" : "a → EDI   b → ESI   return → EAX"}</code></div>
          <div className="lowering-list">{lines.map((line, index) => <p key={`${line.address}-note`} data-active={Boolean(line.note)}><span>{String(index + 1).padStart(2, "0")}</span><code>{line.mnemonic}</code><small>{line.note ?? "support instruction emitted at this optimization level"}</small></p>)}</div>
          <div className="compiler-metrics"><p><span>instructions</span><strong>{lines.length}</strong></p><p><span>code size</span><strong>{instructionBytes} B</strong></p><p><span>stack frame</span><strong>{optimization === "-O0" ? "yes" : "no"}</strong></p></div>
        </aside>
      </main>

      <section className="opcode-explorer" id="opcodes">
        <header className="compiler-section-title"><div><span className="eyebrow">Opcode Explorer</span><h2>Uma instrução também é uma sequência de bytes.</h2></div><p><code>B8 01 00 00 00</code> → <code>mov eax, 1</code></p></header>
        <div className="opcode-table" role="table" aria-label="Opcodes gerados">
          <header role="row"><span>ADDRESS</span><span>BYTES</span><span>INSTRUCTION</span><span>OPERANDS</span><span>SIZE</span></header>
          {lines.map((line) => <div role="row" key={line.address}><code>{line.address}</code><code>{line.bytes}</code><strong>{line.mnemonic}</strong><code>{line.operands || "—"}</code><span>{line.bytes.split(" ").length} B</span></div>)}
        </div>
      </section>

      <section className="abi-comparator" id="abi">
        <header className="compiler-section-title"><div><span className="eyebrow">Calling conventions</span><h2>Mesma função, contratos diferentes.</h2></div><LinkToAssembly /></header>
        <div className="abi-columns">
          <article><header><span>WINDOWS X64</span><strong>Microsoft ABI</strong></header><AbiRow label="Integer args" value="RCX · RDX · R8 · R9" /><AbiRow label="Return" value="RAX / XMM0" /><AbiRow label="Stack" value="16-byte aligned outside prologue" /><AbiRow label="Caller area" value="32-byte shadow space" /><AbiRow label="Caller-saved" value="RAX · RCX · RDX · R8–R11" /><AbiRow label="Callee-saved" value="RBX · RBP · RSI · RDI · R12–R15" /></article>
          <article><header><span>SYSTEM V AMD64</span><strong>Linux / BSD / macOS</strong></header><AbiRow label="Integer args" value="RDI · RSI · RDX · RCX · R8 · R9" /><AbiRow label="Return" value="RAX / XMM0" /><AbiRow label="Stack" value="16-byte aligned before call" /><AbiRow label="Below RSP" value="128-byte red zone for leaf work" /><AbiRow label="Caller-saved" value="RAX · RCX · RDX · RSI · RDI · R8–R11" /><AbiRow label="Callee-saved" value="RBX · RBP · R12–R15" /></article>
        </div>
        <div className="abi-call-flow"><span>CALLER</span><ArrowDown size={12} /><span>place args + preserve volatile state</span><ArrowDown size={12} /><span className="active">call / return address on stack</span><ArrowDown size={12} /><span>CALLEE · prologue · body · epilogue</span></div>
      </section>
    </div>
  );
}

function AbiRow({ label, value }: { readonly label: string; readonly value: string }) {
  return <p><span>{label}</span><code>{value}</code><Check size={10} /></p>;
}

function LinkToAssembly() {
  return <a href="/labs/assembly"><Gauge size={12} />ver no Assembly Visualizer <ArrowRight size={11} /></a>;
}
