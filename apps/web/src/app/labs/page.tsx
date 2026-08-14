import type { LucideIcon } from "lucide-react";
import { AppWindow, ArrowRight, Binary, Boxes, Braces, Cpu, FlaskConical, MemoryStick, Network, ScanLine } from "lucide-react";
import Link from "next/link";

const labs: readonly { title: string; eyebrow: string; description: string; href: string; icon: LucideIcon; tone: string; capabilities: readonly string[]; status: string }[] = [
  { title: "Low-Level Lab", eyebrow: "C / ASM / CPU", description: "IDE, compiler explorer, CPU simulation, debugger educacional, memória e visualização 2D/3D em um único workspace livre.", href: "/labs/low-level", icon: Cpu, tone: "green", capabilities: ["Multi-file Monaco", "Real compiler artifacts", "Editable CPU state"], status: "FLAGSHIP" },
  { title: "Assembly Visualizer", eyebrow: "CPU / ISA", description: "Execute x86-64 instrução por instrução e observe registers, RFLAGS, RIP, memória e stack.", href: "/labs/assembly", icon: Cpu, tone: "amber", capabilities: ["Intel + AT&T", "NASM / MASM / GAS", "Step trace"], status: "INTERACTIVE" },
  { title: "C/C++ ↔ Assembly", eyebrow: "COMPILER / ABI", description: "Compare GCC, Clang e MSVC, níveis de otimização, opcodes e calling conventions.", href: "/labs/compiler", icon: Braces, tone: "cyan", capabilities: ["-O0…-O3 / -Os", "Opcode Explorer", "ABI comparator"], status: "INTERACTIVE" },
  { title: "Windows Internals Lab", eyebrow: "WIN32 / PE", description: "Explore memória virtual, PE headers, message loop, processos, threads, handles e sincronização.", href: "/labs/windows", icon: AppWindow, tone: "blue", capabilities: ["VirtualAlloc trace", "PE Explorer", "WndProc monitor"], status: "INTERACTIVE" },
  { title: "Graphics Playground", eyebrow: "GPU / RENDERING", description: "Siga vertices até pixels, edite shaders, inspecione frames e compare OpenGL, DirectX e Vulkan.", href: "/labs/graphics", icon: Boxes, tone: "violet", capabilities: ["3D preview", "Frame Debugger", "CPU/GPU timeline"], status: "WEBGL" },
  { title: "Memory Visualizer", eyebrow: "POINTERS / LAYOUT", description: "Veja objetos, endereços e indireções dentro de um stack frame tridimensional.", href: "/labs/memory", icon: MemoryStick, tone: "cyan", capabilities: ["Pointer trace", "Stack / Heap", "3D memory map"], status: "WEBGL" },
  { title: "Network Visualizer", eyebrow: "PACKETS / PROTOCOLS", description: "Percorra encapsulamento, sockets e o caminho entre processo, kernel, NIC e rede.", href: "/labs/network", icon: Network, tone: "green", capabilities: ["TCP timeline", "Packet layers", "HTTP flow"], status: "INTERACTIVE" }
] as const;

export const metadata = { title: "Labs" };

export default function LabsPage() {
  return (
    <div className="labs-index-page">
      <header className="labs-index-header">
        <div><span className="eyebrow">Observable systems / laboratory index</span><h1>Não imagine o estado.<br />Inspecione-o.</h1><p>Laboratórios determinísticos conectam o mesmo evento entre source, compiler, CPU, memória, operating system, driver e hardware.</p></div>
        <div className="labs-signal"><FlaskConical size={22} /><strong>07</strong><span>ACTIVE LABS</span><small>safe · local · educational</small></div>
      </header>
      <section className="labs-grid">
        {labs.map(({ title, eyebrow, description, href, icon: Icon, tone, capabilities, status }, index) => <Link className="lab-index-card" data-tone={tone} href={href} key={title}><header><span>{String(index + 1).padStart(2, "0")}</span><Icon size={18} /><b>{status}</b></header><div><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div><footer>{capabilities.map((capability) => <code key={capability}>{capability}</code>)}<ArrowRight size={14} /></footer></Link>)}
      </section>
      <section className="lab-method"><header><ScanLine size={14} /><span>LAB METHOD</span></header><div>{[{ icon: Braces, title: "Source", detail: "Comece por uma intenção expressa em C, C++ ou shader." }, { icon: Binary, title: "Lowering", detail: "Observe ABI, instructions, bytes e command streams." }, { icon: Cpu, title: "State", detail: "Congele registers, memory, handles, resources e flags." }, { icon: Boxes, title: "Hardware", detail: "Relacione o estado observável ao CPU, GPU, driver ou dispositivo." }].map(({ icon: Icon, title, detail }, index) => <article key={title}><span>0{index + 1}</span><Icon size={15} /><strong>{title}</strong><p>{detail}</p></article>)}</div></section>
    </div>
  );
}
