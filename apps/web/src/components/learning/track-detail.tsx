import {
  ArrowDown,
  ArrowRight,
  Binary,
  BookOpen,
  Box,
  Braces,
  Check,
  Cpu,
  FlaskConical,
  Gamepad2,
  Layers3,
  Network,
  ShieldAlert,
  TerminalSquare
} from "lucide-react";
import Link from "next/link";
import type { CurriculumTrack } from "@/modules/learning/curriculum";
import { lessonHref, moduleHref } from "@/modules/learning/lesson-slugs";

const connections: Readonly<Record<string, readonly { label: string; href: string; note: string }[]>> = {
  assembly: [
    { label: "C/C++", href: "/learn/cpp", note: "source, compiler e ABI" },
    { label: "Memory", href: "/learn/memory", note: "stack, heap e alignment" },
    { label: "Reverse Engineering", href: "/learn/reverse-engineering", note: "disassembly e debugging" },
    { label: "Systems", href: "/learn/systems", note: "syscalls e privilege" }
  ],
  windows: [
    { label: "C++", href: "/learn/cpp", note: "RAII para HANDLEs" },
    { label: "Assembly", href: "/learn/assembly", note: "Windows x64 ABI" },
    { label: "Graphics", href: "/learn/graphics", note: "HWND, DXGI e Direct3D" },
    { label: "Memory", href: "/learn/memory", note: "virtual pages e protection" }
  ],
  graphics: [
    { label: "C++", href: "/learn/cpp", note: "resources e ownership" },
    { label: "Windows", href: "/learn/windows", note: "window e presentation" },
    { label: "Memory", href: "/learn/memory", note: "buffers, alignment e VRAM" },
    { label: "Reverse Engineering", href: "/learn/reverse-engineering", note: "frames próprios e draw calls" }
  ],
  "security-research": [
    { label: "C / Memory", href: "/learn/memory", note: "bounds, lifetime e layout" },
    { label: "Assembly", href: "/learn/assembly", note: "frame, RSP/RBP e RIP" },
    { label: "Reverse Engineering", href: "/learn/reverse-engineering", note: "binários próprios" },
    { label: "Cybersecurity", href: "/learn/cybersecurity", note: "threat model e hardening" }
  ],
  "game-security": [
    { label: "C / Memory", href: "/learn/memory", note: "structs, offsets e cadeias" },
    { label: "Graphics", href: "/learn/graphics", note: "câmera, matrizes e W2S" },
    { label: "Security Research", href: "/learn/security-research", note: "integridade e detecção" },
    { label: "Networking", href: "/learn/networking", note: "servidor autoritativo" }
  ]
};

const primaryLabByTrack: Readonly<Record<string, { label: string; href: string }>> = {
  assembly: { label: "Abrir Assembly Visualizer", href: "/labs/assembly" },
  windows: { label: "Abrir Windows Internals Lab", href: "/labs/windows" },
  graphics: { label: "Abrir Graphics Playground", href: "/labs/graphics" },
  memory: { label: "Abrir Memory Visualizer", href: "/labs/memory" },
  networking: { label: "Abrir Network Visualizer", href: "/labs/network" },
  "security-research": { label: "Abrir Security Lab", href: "/labs/security" },
  "game-security": { label: "Abrir Game Security Lab", href: "/labs/game-security" }
};

function flowFor(track: CurriculumTrack): readonly string[] {
  if (track.id === "assembly") return ["C / C++", "Compiler", "Assembly", "Machine Code", "CPU", "Memory"];
  if (track.id === "windows") return ["Application", "Win32 API", "ntdll", "Native API", "Kernel", "Driver / Hardware"];
  if (track.id === "graphics") return ["C++", "Window System", "Graphics API", "Driver", "GPU", "Framebuffer"];
  if (track.id === "networking") return ["Application", "Socket", "Kernel Stack", "Driver", "NIC", "Network"];
  if (track.id === "security-research") return ["Vulnerable code", "Memory / Assembly", "Sanitizer", "Patch", "Telemetry", "Detection"];
  if (track.id === "game-security") return ["Game", "Memory", "Binary", "Research tool", "Detection", "Harden"];
  return ["Source", "Compiler", "Runtime", "Operating System", "Hardware"];
}

export function TrackDetail({ track }: { readonly track: CurriculumTrack }) {
  const flow = flowFor(track);
  const lessonCount = track.modules.reduce((count, module) => count + module.topics.length, 0);
  const primaryLab = primaryLabByTrack[track.id] ?? track.modules.find((module) => module.lab)?.lab;
  const related = connections[track.id] ?? [
    { label: "Assembly", href: "/learn/assembly", note: "o código que a CPU recebe" },
    { label: "Systems", href: "/learn/systems", note: "o runtime por baixo da API" },
    { label: "Memory", href: "/learn/memory", note: "onde o estado realmente vive" }
  ];

  return (
    <div className="track-detail-page" data-tone={track.tone}>
      <header className="track-hero">
        <div className="track-hero-copy">
          <span className="eyebrow">Learn / {track.kicker}</span>
          <h1>{track.title}</h1>
          <p>{track.description}</p>
          <div className="track-actions">
            {primaryLab ? <Link className="button-primary" href={primaryLab.href}>{primaryLab.label} <ArrowRight size={13} /></Link> : null}
            <Link className="button-secondary" href="/projects">Ver projetos <Box size={13} /></Link>
          </div>
        </div>
        <aside className="track-manifest">
          <span>TRACK MANIFEST</span>
          <dl>
            <div><dt>modules</dt><dd>{String(track.modules.length).padStart(2, "0")}</dd></div>
            <div><dt>lessons</dt><dd>{lessonCount}</dd></div>
            <div><dt>labs</dt><dd>{track.labs}</dd></div>
            <div><dt>projects</dt><dd>{track.projects}</dd></div>
          </dl>
          <small>LEVEL · {track.level.toUpperCase()}</small>
        </aside>
      </header>

      <section className="machine-flow" aria-label="Fluxo entre abstrações">
        <header><span>FOLLOW THE EVENT</span><small>do alto nível ao mecanismo real</small></header>
        <div>{flow.map((node, index) => <span key={node}><b>{node}</b>{index < flow.length - 1 ? <ArrowRight size={13} /> : null}</span>)}</div>
      </section>

      <div className="track-intro-grid">
        <section className="track-outcomes">
          <header><Check size={14} /><span>Ao concluir, você consegue</span></header>
          {track.outcomes.map((outcome) => <p key={outcome}><Check size={11} />{outcome}</p>)}
        </section>
        <section className="track-prerequisites">
          <header><BookOpen size={14} /><span>Pré-requisitos</span></header>
          {track.prerequisites.map((item, index) => <p key={item}><span>0{index + 1}</span>{item}</p>)}
        </section>
      </div>

      <section className="track-modules">
        <header className="track-section-heading"><div><span className="eyebrow">Curriculum sequence</span><h2>Construa o modelo em camadas.</h2></div><span>{track.modules.length} MODULES · {lessonCount} LESSONS</span></header>
        <div className="track-module-list">
          {track.modules.map((module) => (
            <article id={module.id} key={module.id}>
              <span className="module-big-index">{module.index}</span>
              <div className="track-module-copy">
                <span>{module.topics.length} AULAS PUBLICADAS</span>
                <h3><Link href={moduleHref(track, module)}>{module.title}</Link></h3>
                <p>{module.summary}</p>
                <div className="module-topic-list">{module.topics.map((topic) => <Link href={lessonHref(track, module, topic)} key={topic}><code>{topic}</code></Link>)}</div>
              </div>
              <div className="module-bridge"><span>CONCEPT BRIDGE</span><p>{module.bridge}</p></div>
              <div className="module-action">
                <Link href={moduleHref(track, module)}><BookOpen size={12} />Abrir módulo<ArrowRight size={11} /></Link>
                {module.lab ? <Link href={module.lab.href}><FlaskConical size={12} />{module.lab.label}</Link> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      {track.id === "assembly" ? <AssemblyReference /> : null}
      {track.id === "windows" ? <WindowsReference /> : null}
      {track.id === "graphics" ? <GraphicsReference /> : null}
      {track.id === "security-research" ? <SecurityReference /> : null}
      {track.id === "game-security" ? <GameSecurityReference /> : null}

      <section className="track-connections">
        <header className="track-section-heading"><div><span className="eyebrow">Keep following the system</span><h2>Esta trilha não termina aqui.</h2></div></header>
        <div>{related.map((item) => <Link href={item.href} key={item.label}><strong>{item.label}</strong><span>{item.note}</span><ArrowRight size={13} /></Link>)}</div>
      </section>
    </div>
  );
}

function AssemblyReference() {
  const registerGroups = [
    { group: "General purpose", values: ["RAX", "RBX", "RCX", "RDX"] },
    { group: "Data / parameters", values: ["RSI", "RDI", "R8", "R9", "R10", "R11"] },
    { group: "Non-volatile", values: ["R12", "R13", "R14", "R15"] },
    { group: "Execution", values: ["RSP", "RBP", "RIP", "RFLAGS"] }
  ];
  const instructions = ["mov", "lea", "push", "pop", "add", "sub", "imul", "idiv", "and", "or", "xor", "not", "shl", "shr", "cmp", "test", "jmp", "je", "jne", "jg", "jl", "jge", "jle", "call", "ret", "inc", "dec", "nop"];
  return (
    <section className="technical-reference assembly-reference">
      <header className="track-section-heading"><div><span className="eyebrow">Architecture field guide</span><h2>O estado que uma instrução pode mudar.</h2></div><Link href="/labs/assembly">Abrir trace vivo <ArrowRight size={12} /></Link></header>
      <div className="assembly-reference-grid">
        <article className="register-field"><header><Cpu size={14} /><span>REGISTER FILE · X86-64</span></header>{registerGroups.map((group) => <div key={group.group}><span>{group.group}</span><p>{group.values.map((value) => <code key={value}>{value}</code>)}</p></div>)}</article>
        <article className="flags-field"><header><Binary size={14} /><span>EFLAGS / RFLAGS</span></header><div>{[["ZF", "zero"], ["CF", "carry"], ["OF", "signed overflow"], ["SF", "sign"], ["PF", "parity"]].map(([flag, label]) => <p key={flag}><code>{flag}</code><span>{label}</span><i /></p>)}</div></article>
        <article className="instruction-field"><header><TerminalSquare size={14} /><span>CORE INSTRUCTION SET</span></header><div>{instructions.map((instruction) => <code key={instruction}>{instruction}</code>)}</div></article>
      </div>
      <div className="syntax-abi-grid">
        <article><header><span>INTEL SYNTAX · NASM / MASM</span><small>destination, source</small></header><pre><code>{`mov rax, 10\nmov rbx, 20\nadd rax, rbx\nret`}</code></pre></article>
        <article><header><span>AT&amp;T SYNTAX · GAS</span><small>source, destination</small></header><pre><code>{`movq $10, %rax\nmovq $20, %rbx\naddq %rbx, %rax\nret`}</code></pre></article>
        <article className="abi-table"><header><span>CALLING CONVENTIONS</span><small>first integer arguments</small></header><div><p><strong>Windows x64</strong><code>RCX · RDX · R8 · R9</code><span>32-byte shadow space</span></p><p><strong>System V AMD64</strong><code>RDI · RSI · RDX · RCX · R8 · R9</code><span>128-byte red zone</span></p></div></article>
      </div>
      <div className="syscall-reference-grid">
        <article><header><span>LINUX SYSTEM CALL</span><small>stable names · architecture-specific ABI</small></header><div className="syscall-flow"><code>user mode</code><ArrowRight size={10} /><code>syscall</code><ArrowRight size={10} /><code>kernel mode</code><ArrowRight size={10} /><code>return</code></div><p>read · write · open · close · mmap · munmap · fork · execve · socket</p></article>
        <article><header><span>WINDOWS SERVICE PATH</span><small>never depend on fixed syscall numbers</small></header><div className="syscall-flow"><code>Application</code><ArrowRight size={10} /><code>Win32</code><ArrowRight size={10} /><code>ntdll</code><ArrowRight size={10} /><code>Native API</code><ArrowRight size={10} /><code>Kernel</code></div><p>Win32 is the documented application contract; Native API and syscall IDs are implementation details that may vary.</p></article>
      </div>
    </section>
  );
}

function WindowsReference() {
  const types = [["HWND", "window handle"], ["HANDLE", "kernel/user object reference"], ["DWORD", "32-bit unsigned integer"], ["BOOL", "integer truth value"], ["WPARAM", "pointer-sized message value"], ["LPARAM", "pointer-sized signed value"], ["LRESULT", "message result"], ["HINSTANCE", "module instance"], ["HMODULE", "loaded module handle"], ["LPCSTR", "ANSI byte string pointer"], ["LPCWSTR", "UTF-16 string pointer"]];
  const families = [
    ["GUI", "RegisterClass · CreateWindowEx · ShowWindow · GetMessage · DispatchMessage"],
    ["Process", "CreateProcess · OpenProcess · GetCurrentProcess · GetProcessId · TerminateProcess"],
    ["Thread", "CreateThread · ExitThread · WaitForSingle/MultipleObjects · Mutex · Event · Semaphore · CriticalSection"],
    ["Memory", "VirtualAlloc · VirtualFree · VirtualProtect · VirtualQuery · HeapAlloc · HeapFree"],
    ["Files", "CreateFile · ReadFile · WriteFile · GetFileSize · SetFilePointer · CopyFile · MoveFile"],
    ["DLL", "LoadLibrary · GetProcAddress · FreeLibrary"]
  ];
  return (
    <section className="technical-reference windows-reference">
      <header className="track-section-heading"><div><span className="eyebrow">Win32 field guide</span><h2>Uma API de handles, mensagens e objetos.</h2></div><Link href="/labs/windows">Inspecionar Windows model <ArrowRight size={12} /></Link></header>
      <div className="win-type-grid">{types.map(([type, meaning]) => <div key={type}><code>{type}</code><span>{meaning}</span></div>)}</div>
      <div className="win-message-flow" aria-label="Fluxo do message loop"><span><AppWindowIcon />Windows</span><ArrowDown size={13} /><span>Message Queue</span><ArrowDown size={13} /><span>GetMessage</span><ArrowDown size={13} /><span>DispatchMessage</span><ArrowDown size={13} /><span className="active">WndProc</span></div>
      <div className="win-api-families">{families.map(([name, apis]) => <article key={name}><strong>{name}</strong><code>{apis}</code></article>)}</div>
    </section>
  );
}

function AppWindowIcon() {
  return <Layers3 size={13} />;
}

function GraphicsReference() {
  const comparisons = [
    ["Draw indexed", "glDrawElements", "DrawIndexed", "DrawIndexedInstanced", "vkCmdDrawIndexed"],
    ["Image resource", "Texture", "ID3D11Texture2D", "ID3D12Resource", "VkImage"],
    ["Pipeline state", "Implicit/global", "State objects", "PSO", "VkPipeline"],
    ["Memory", "Driver-managed", "Mostly managed", "Explicit heaps", "Explicit allocation"],
    ["Synchronization", "Mostly implicit", "Mostly implicit", "Fences/barriers", "Semaphores/barriers"]
  ];
  const pipeline = ["Vertex Data", "Vertex Shader", "Primitive Assembly", "Rasterization", "Fragment / Pixel Shader", "Framebuffer", "Screen"];
  return (
    <section className="technical-reference graphics-reference">
      <header className="track-section-heading"><div><span className="eyebrow">Graphics field guide</span><h2>O frame é um fluxo de dados e dependências.</h2></div><Link href="/labs/graphics">Executar pipeline <ArrowRight size={12} /></Link></header>
      <div className="graphics-pipeline-flow">{pipeline.map((stage, index) => <span key={stage}><b>{stage}</b>{index < pipeline.length - 1 ? <ArrowRight size={12} /> : null}</span>)}</div>
      <div className="api-compare-table" role="table" aria-label="Comparação de APIs gráficas">
        <header role="row"><span>CONCEITO</span><span>OPENGL</span><span>D3D11</span><span>D3D12</span><span>VULKAN</span></header>
        {comparisons.map((row) => <div role="row" key={row[0]}>{row.map((cell, index) => index === 0 ? <strong key={`concept-${index}`}>{cell}</strong> : <code key={`api-${index}`}>{cell}</code>)}</div>)}
      </div>
      <div className="graphics-project-strip"><Braces size={15} /><span>C++ + Win32 + OpenGL</span><span>C++ + Win32 + Direct3D 11/12</span><span>C++ + SDL3 + Vulkan</span><Network size={14} /></div>
    </section>
  );
}

function SecurityReference() {
  const pairs = [
    ["Buffer overflow", "Bounds checking / bounded copy"],
    ["Use-after-free", "Ownership / RAII"],
    ["Format string", "Constant format + typed args"],
    ["Integer overflow", "Validated arithmetic before alloc"],
    ["Protocol length bug", "max_frame + need_more + reject"]
  ];
  const method = ["Understand", "Build", "Break", "Observe", "Debug", "Analyze", "Fix", "Detect", "Prevent"];
  return (
    <section className="technical-reference windows-reference">
      <header className="track-section-heading"><div><span className="eyebrow">Security field guide</span><h2>Ofensivo e defensivo descrevem o mesmo estado.</h2></div><Link href="/labs/security"><ShieldAlert size={13} />Abrir Security Lab <ArrowRight size={12} /></Link></header>
      <div className="graphics-pipeline-flow">{method.map((stage, index) => <span key={stage}><b>{stage}</b>{index < method.length - 1 ? <ArrowRight size={12} /> : null}</span>)}</div>
      <div className="win-api-families">{pairs.map(([offense, defense]) => <article key={offense}><strong>{offense}</strong><code>{defense}</code></article>)}</div>
      <div className="syscall-reference-grid">
        <article><header><span>WINDOWS PATH</span></header><div className="syscall-flow"><code>C++</code><ArrowRight size={10} /><code>Win32</code><ArrowRight size={10} /><code>ntdll</code><ArrowRight size={10} /><code>Kernel</code></div><p>APIs duais: o nome não é veredito; sequência, alvo e telemetria são.</p></article>
        <article><header><span>LINUX PATH</span></header><div className="syscall-flow"><code>C</code><ArrowRight size={10} /><code>libc</code><ArrowRight size={10} /><code>syscall</code><ArrowRight size={10} /><code>Kernel</code></div><p>/proc, maps e seccomp são evidência e contenção no laboratório isolado.</p></article>
      </div>
    </section>
  );
}

function GameSecurityReference() {
  const pairs = [
    ["Game state in memory", "Typed structs + offsetof + versioned build"],
    ["Pointer chain", "Null checks + stride + named nodes"],
    ["World-to-screen", "Same view-projection as the lab renderer"],
    ["Client-trusted position", "Authoritative server + sanity + seq"],
    ["Naive integrity hash", "Full-struct hash + speed + input correlation"]
  ];
  const method = ["Understand Game", "Understand Memory", "Understand Binary", "Analyze Behavior", "Build Research Tool", "Build Detection", "Improve Security"];
  return (
    <section className="technical-reference windows-reference">
      <header className="track-section-heading"><div><span className="eyebrow">Game security field guide</span><h2>Pesquisa de cheat é pesquisa de estado — e depois de defesa.</h2></div><Link href="/labs/game-security"><Gamepad2 size={13} />Abrir Game Security Lab <ArrowRight size={12} /></Link></header>
      <div className="graphics-pipeline-flow">{method.map((stage, index) => <span key={stage}><b>{stage}</b>{index < method.length - 1 ? <ArrowRight size={12} /> : null}</span>)}</div>
      <div className="win-api-families">{pairs.map(([research, defense]) => <article key={research}><strong>{research}</strong><code>{defense}</code></article>)}</div>
      <div className="syscall-reference-grid">
        <article><header><span>LAB RULE</span></header><div className="syscall-flow"><code>own game</code><ArrowRight size={10} /><code>own binary</code><ArrowRight size={10} /><code>isolated AC</code><ArrowRight size={10} /><code>patch detector</code></div><p>Exercícios práticos usam só artefatos da plataforma. BattlEye, EAC e Vanguard não são alvos.</p></article>
        <article><header><span>SOURCE → RESEARCH</span></header><div className="syscall-flow"><code>C++</code><ArrowRight size={10} /><code>binary</code><ArrowRight size={10} /><code>memory</code><ArrowRight size={10} /><code>tool</code><ArrowRight size={10} /><code>detect</code></div><p>Ferramentas são RESEARCH / DEBUG e só falam com o processo do laboratório.</p></article>
      </div>
    </section>
  );
}
