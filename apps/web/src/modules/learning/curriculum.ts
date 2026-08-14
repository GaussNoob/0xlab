export type CurriculumTone = "cyan" | "violet" | "amber" | "green" | "blue" | "rose";

export interface CurriculumLab {
  readonly label: string;
  readonly href: string;
}

export interface CurriculumModule {
  readonly id: string;
  readonly index: string;
  readonly title: string;
  readonly summary: string;
  readonly topics: readonly string[];
  readonly bridge: string;
  readonly lessons: number;
  readonly lab?: CurriculumLab;
}

export interface CurriculumTrack {
  readonly id: string;
  readonly title: string;
  readonly shortTitle: string;
  readonly kicker: string;
  readonly description: string;
  readonly tone: CurriculumTone;
  readonly href: string;
  readonly lessons: number;
  readonly labs: number;
  readonly projects: number;
  readonly level: "Fundamentos" | "Intermediário" | "Avançado";
  readonly prerequisites: readonly string[];
  readonly outcomes: readonly string[];
  readonly modules: readonly CurriculumModule[];
}

const compactTracks: readonly CurriculumTrack[] = [
  {
    id: "c",
    title: "C — da linguagem à máquina",
    shortTitle: "C",
    kicker: "Language foundation",
    description: "Tipos, ponteiros, layout, toolchain e acesso preciso aos serviços do sistema.",
    tone: "cyan",
    href: "/learn/c",
    lessons: 32,
    labs: 14,
    projects: 5,
    level: "Fundamentos",
    prerequisites: ["Nenhum"],
    outcomes: ["Rastrear dados até seus bytes", "Escrever C seguro e observável", "Ler a saída do compilador"],
    modules: [
      { id: "c-toolchain", index: "01", title: "Tipos, bytes e toolchain", summary: "Da unidade de tradução ao executável.", topics: ["tipos", "representação", "compiler", "linker"], bridge: "C → compiler → object file → executable", lessons: 8 },
      { id: "c-pointers", index: "02", title: "Ponteiros e modelo de memória", summary: "Endereços, indireção, lifetime e layout.", topics: ["pointers", "stack", "heap", "alignment"], bridge: "expressão C → endereço → load/store", lessons: 10, lab: { label: "Memory Visualizer", href: "/labs/memory" } },
      { id: "c-os", index: "03", title: "C na fronteira do sistema", summary: "Arquivos, processos, sockets e APIs nativas.", topics: ["POSIX", "Win32", "files", "sockets"], bridge: "função C → libc/Win32 → syscall → kernel", lessons: 8 },
      { id: "c-binary", index: "04", title: "C sob o debugger", summary: "Assembly gerado, ABI e falhas de memória.", topics: ["assembly", "ABI", "debugging", "sanitizers"], bridge: "source → assembly → machine code → CPU", lessons: 6, lab: { label: "Compiler Explorer", href: "/labs/compiler" } }
    ]
  },
  {
    id: "cpp",
    title: "C++ — abstrações com custo visível",
    shortTitle: "C++",
    kicker: "Systems engineering",
    description: "Ownership, RAII, templates, concorrência e gráficos sem perder de vista a máquina.",
    tone: "violet",
    href: "/learn/cpp",
    lessons: 38,
    labs: 12,
    projects: 7,
    level: "Intermediário",
    prerequisites: ["C ou programação estruturada", "Ponteiros"],
    outcomes: ["Modelar ownership com RAII", "Analisar custo de abstrações", "Construir aplicações nativas"],
    modules: [
      { id: "cpp-objects", index: "01", title: "Objetos, lifetime e RAII", summary: "Construção, destruição, move e ownership.", topics: ["classes", "RAII", "move", "smart pointers"], bridge: "objeto C++ → layout → chamadas implícitas", lessons: 11 },
      { id: "cpp-generic", index: "02", title: "STL e programação genérica", summary: "Containers, iterators, algorithms e templates.", topics: ["STL", "templates", "concepts", "allocators"], bridge: "template → instanciação → código gerado", lessons: 10 },
      { id: "cpp-runtime", index: "03", title: "Concorrência e runtime", summary: "Threads, atomics, memória e profiling.", topics: ["threads", "atomics", "memory model", "profiling"], bridge: "std::thread → OS thread → scheduler → core", lessons: 9 },
      { id: "cpp-native", index: "04", title: "Aplicações e renderers nativos", summary: "Integração com Win32, SDL3 e APIs gráficas.", topics: ["Win32", "SDL3", "OpenGL", "Vulkan"], bridge: "C++ → window system → graphics API → GPU", lessons: 8, lab: { label: "Graphics Playground", href: "/labs/graphics" } }
    ]
  },
  {
    id: "systems",
    title: "Sistemas operacionais e arquitetura",
    shortTitle: "Systems",
    kicker: "Machine model",
    description: "Processos, threads, memória virtual, filesystems, drivers e o limite user/kernel.",
    tone: "amber",
    href: "/learn/systems",
    lessons: 35,
    labs: 10,
    projects: 6,
    level: "Intermediário",
    prerequisites: ["C", "Memória e ponteiros"],
    outcomes: ["Explicar isolamento de processos", "Seguir uma syscall", "Relacionar ABI, loader e kernel"],
    modules: [
      { id: "sys-cpu", index: "01", title: "CPU, privilégio e interrupções", summary: "Execução, rings, traps e troca de contexto.", topics: ["CPU", "user mode", "kernel mode", "interrupts"], bridge: "instruction → trap → kernel handler", lessons: 8 },
      { id: "sys-process", index: "02", title: "Processos, threads e scheduler", summary: "Contexto, virtualização e concorrência.", topics: ["process", "thread", "scheduler", "IPC"], bridge: "program → process → threads → cores", lessons: 9 },
      { id: "sys-memory", index: "03", title: "Memória virtual e loaders", summary: "Pages, MMU, executáveis e bibliotecas.", topics: ["pages", "MMU", "PE", "ELF"], bridge: "VA → page table → physical memory", lessons: 10 },
      { id: "sys-io", index: "04", title: "I/O, filesystem e drivers", summary: "Handles, descritores, cache e dispositivos.", topics: ["I/O", "filesystem", "drivers", "DMA"], bridge: "API → kernel → driver → hardware", lessons: 8 }
    ]
  },
  {
    id: "linux",
    title: "Linux e interfaces POSIX",
    shortTitle: "Linux",
    kicker: "Kernel boundary",
    description: "Syscalls, processos, sinais, arquivos, mmap, sockets e o formato ELF.",
    tone: "green",
    href: "/learn/linux",
    lessons: 29,
    labs: 9,
    projects: 5,
    level: "Intermediário",
    prerequisites: ["C", "Sistemas"],
    outcomes: ["Usar POSIX com segurança", "Inspecionar ELF", "Observar processos e syscalls"],
    modules: [
      { id: "linux-syscalls", index: "01", title: "Syscalls e libc", summary: "read, write, open, close, mmap e munmap.", topics: ["syscall", "libc", "strace", "errno"], bridge: "C → libc wrapper → syscall → VFS", lessons: 8 },
      { id: "linux-process", index: "02", title: "Processos e execução", summary: "fork, execve, sinais e pipes.", topics: ["fork", "execve", "signals", "pipes"], bridge: "shell → fork → execve → ELF loader", lessons: 8 },
      { id: "linux-network", index: "03", title: "Sockets e epoll", summary: "I/O bloqueante e event-driven.", topics: ["socket", "epoll", "TCP", "UDP"], bridge: "socket API → network stack → NIC", lessons: 7 },
      { id: "linux-elf", index: "04", title: "ELF, linking e runtime", summary: "Sections, segments, symbols e loader dinâmico.", topics: ["ELF", "ld.so", "symbols", "relocations"], bridge: "ELF → loader → mapped segments → RIP", lessons: 6 }
    ]
  },
  {
    id: "memory",
    title: "Memória, ponteiros e allocators",
    shortTitle: "Memory",
    kicker: "Data in motion",
    description: "Do bit ao endereço virtual: representação, cache, stack, heap e segurança.",
    tone: "cyan",
    href: "/learn/memory",
    lessons: 30,
    labs: 13,
    projects: 5,
    level: "Fundamentos",
    prerequisites: ["C básico"],
    outcomes: ["Visualizar layouts", "Raciocinar sobre lifetime", "Diagnosticar corrupção"],
    modules: [
      { id: "mem-layout", index: "01", title: "Representação e layout", summary: "Bits, bytes, endian, padding e alinhamento.", topics: ["binary", "hex", "endian", "alignment"], bridge: "tipo → bytes → cache line", lessons: 7 },
      { id: "mem-regions", index: "02", title: "Stack, heap e memória virtual", summary: "Regiões, páginas e permissões.", topics: ["stack", "heap", "pages", "protection"], bridge: "pointer → VA → page table → RAM", lessons: 9, lab: { label: "Memory Visualizer", href: "/labs/memory" } },
      { id: "mem-alloc", index: "03", title: "Allocators e localidade", summary: "Arenas, free lists, fragmentação e cache.", topics: ["malloc", "arenas", "fragmentation", "cache"], bridge: "allocation → virtual pages → working set", lessons: 7 },
      { id: "mem-safety", index: "04", title: "Falhas e mitigação", summary: "Overflow, UAF, ASLR, DEP e sanitizers.", topics: ["overflow", "UAF", "ASLR", "DEP"], bridge: "bug de lifetime → memória corrompida → mitigação", lessons: 7 }
    ]
  },
  {
    id: "networking",
    title: "Redes, TCP/IP e HTTP",
    shortTitle: "Networking",
    kicker: "Bytes across machines",
    description: "Pacotes, sockets, protocolos e segurança do processo à placa de rede.",
    tone: "green",
    href: "/learn/networking",
    lessons: 31,
    labs: 12,
    projects: 6,
    level: "Intermediário",
    prerequisites: ["C", "I/O e processos"],
    outcomes: ["Ler capturas de pacotes", "Implementar protocolos", "Relacionar socket e kernel"],
    modules: [
      { id: "net-model", index: "01", title: "Ethernet a TCP/IP", summary: "Frames, packets, routing e transporte.", topics: ["Ethernet", "IP", "TCP", "UDP"], bridge: "bytes → packet → route → remote process", lessons: 9, lab: { label: "Network Visualizer", href: "/labs/network" } },
      { id: "net-sockets", index: "02", title: "Sockets e I/O concorrente", summary: "Clientes, servidores e multiplexação.", topics: ["sockets", "select", "epoll", "IOCP"], bridge: "send() → kernel buffers → NIC", lessons: 8 },
      { id: "net-http", index: "03", title: "HTTP, TLS e aplicações", summary: "Mensagens, estado e transporte seguro.", topics: ["HTTP", "DNS", "TLS", "WebSocket"], bridge: "HTTP message → TLS records → TCP segments", lessons: 8 },
      { id: "net-security", index: "04", title: "Protocolos robustos", summary: "Parsing seguro, limites e observabilidade.", topics: ["parsing", "timeouts", "fuzzing", "logging"], bridge: "untrusted bytes → parser → validated state", lessons: 6 }
    ]
  },
  {
    id: "reverse-engineering",
    title: "Engenharia reversa autorizada",
    shortTitle: "Reverse Engineering",
    kicker: "Observe compiled systems",
    description: "Binaries próprios, debuggers, disassembly, formatos e fluxo gráfico em ambientes autorizados.",
    tone: "rose",
    href: "/learn/reverse-engineering",
    lessons: 34,
    labs: 11,
    projects: 7,
    level: "Avançado",
    prerequisites: ["C/C++", "Assembly", "Sistemas"],
    outcomes: ["Inspecionar executáveis próprios", "Reconstruir fluxos de dados", "Documentar evidências"],
    modules: [
      { id: "re-binary", index: "01", title: "Binaries e disassembly", summary: "Código, dados, symbols e control flow.", topics: ["disassembly", "CFG", "symbols", "strings"], bridge: "bytes → instructions → basic blocks → behavior", lessons: 9 },
      { id: "re-debug", index: "02", title: "Debugging e instrumentação", summary: "Breakpoints, registers, stack e memória.", topics: ["debugger", "breakpoints", "registers", "memory"], bridge: "event → process state → hypothesis", lessons: 9, lab: { label: "Assembly Visualizer", href: "/labs/assembly" } },
      { id: "re-formats", index: "03", title: "PE, ELF e loaders", summary: "Imports, exports, relocations e mapping.", topics: ["PE", "ELF", "imports", "relocations"], bridge: "file layout → loader → process image", lessons: 8 },
      { id: "re-graphics", index: "04", title: "Arquitetura gráfica observável", summary: "Render loops, swapchains, buffers e matrices em programas próprios.", topics: ["render loop", "swapchain", "shaders", "camera"], bridge: "frame capture → draw calls → resources → pixels", lessons: 8, lab: { label: "Frame Debugger", href: "/labs/graphics?view=frame" } }
    ]
  },
  {
    id: "cybersecurity",
    title: "Cibersegurança de sistemas",
    shortTitle: "Cybersecurity",
    kicker: "Build, break, harden",
    description: "Threat modeling, memory safety, protocol security e hardening em laboratórios isolados.",
    tone: "rose",
    href: "/learn/cybersecurity",
    lessons: 33,
    labs: 12,
    projects: 6,
    level: "Avançado",
    prerequisites: ["C", "Memory", "Networking", "Systems"],
    outcomes: ["Modelar ameaças", "Reproduzir falhas com segurança", "Validar mitigações"],
    modules: [
      { id: "sec-model", index: "01", title: "Ameaças e superfícies", summary: "Trust boundaries, assets e abuse cases.", topics: ["threat model", "attack surface", "trust", "risk"], bridge: "architecture → trust boundary → control", lessons: 7 },
      { id: "sec-memory", index: "02", title: "Memory safety", summary: "Classes de corrupção e mitigação moderna.", topics: ["overflow", "UAF", "ASLR", "CFI"], bridge: "unsafe operation → corruption → crash evidence", lessons: 9 },
      { id: "sec-protocol", index: "03", title: "Parsing e protocolos hostis", summary: "Fuzzing, validação e limites de recursos.", topics: ["fuzzing", "parsing", "DoS", "auth"], bridge: "untrusted input → validation → bounded processing", lessons: 9 },
      { id: "sec-hardening", index: "04", title: "Hardening e observabilidade", summary: "Compiler flags, sandbox, logging e resposta.", topics: ["hardening", "sandbox", "telemetry", "response"], bridge: "source policy → binary properties → runtime controls", lessons: 8 }
    ]
  }
] as const;

const assemblyTrack: CurriculumTrack = {
  id: "assembly",
  title: "Assembly x86 e x86-64",
  shortTitle: "Assembly",
  kicker: "Instructions are the ground truth",
  description: "Siga uma função do source aos opcodes: registradores, ABI, stack, syscalls, SIMD e integração real com C/C++.",
  tone: "amber",
  href: "/learn/assembly",
  lessons: 54,
  labs: 21,
  projects: 9,
  level: "Intermediário",
  prerequisites: ["C básico", "Hexadecimal e ponteiros"],
  outcomes: ["Ler Intel e AT&T syntax", "Rastrear uma chamada pela ABI", "Relacionar instruções, bytes e estado da CPU", "Integrar NASM, MASM ou GAS com C/C++"],
  modules: [
    { id: "asm-bits", index: "01", title: "Bits, bases e representação", summary: "Binário, hexadecimal, signed integers e ordenação dos bytes.", topics: ["binary", "hex", "two's complement", "little endian", "big endian"], bridge: "valor C → representação binária → bytes na memória", lessons: 5, lab: { label: "Opcode Explorer", href: "/labs/compiler#opcodes" } },
    { id: "asm-registers", index: "02", title: "Modelo da CPU x86-64", summary: "RAX–R15, RIP, RSP, RBP e subregistradores de 32/16/8 bits.", topics: ["RAX–R15", "RIP", "RSP", "RBP", "x86 vs x86-64"], bridge: "variável → register allocation → physical register", lessons: 6, lab: { label: "Register Visualizer", href: "/labs/assembly" } },
    { id: "asm-flags", index: "03", title: "Instruções, flags e controle", summary: "Movimentação, aritmética, lógica, shifts, cmp/test e branches.", topics: ["mov / lea", "add / sub / imul / idiv", "and / or / xor", "jmp / jcc", "ZF CF OF SF PF"], bridge: "if/loop C → cmp/test → RFLAGS → branch", lessons: 7, lab: { label: "Instruction Stepper", href: "/labs/assembly" } },
    { id: "asm-memory", index: "04", title: "Memória, addressing e stack", summary: "Effective addresses, operands, push/pop, frames e alinhamento.", topics: ["addressing modes", "stack", "heap", "push / pop", "alignment"], bridge: "pointer expression → effective address → load/store → cache", lessons: 6, lab: { label: "Stack Trace", href: "/labs/assembly?scenario=stack" } },
    { id: "asm-syntax", index: "05", title: "Sintaxes e assemblers", summary: "Intel vs AT&T e workflows com NASM, MASM e GNU as.", topics: ["Intel syntax", "AT&T syntax", "NASM", "MASM", "GAS"], bridge: "same instruction semantics → different source notation → same opcode", lessons: 5 },
    { id: "asm-abi", index: "06", title: "Funções e calling conventions", summary: "Parâmetros, retorno, caller/callee-saved, prólogo e epílogo.", topics: ["Windows x64", "System V AMD64", "shadow space", "stack frame", "call / ret"], bridge: "C++ call → ABI contract → stack/register state", lessons: 7, lab: { label: "ABI Comparator", href: "/labs/compiler#abi" } },
    { id: "asm-compiler", index: "07", title: "C/C++ → Assembly → machine code", summary: "GCC, Clang e MSVC de -O0 a -O3/-Os, opcodes e instruction encoding.", topics: ["compiler", "optimization", "opcodes", "instruction bytes", "disassembly"], bridge: "source → IR → assembly → opcodes → CPU", lessons: 7, lab: { label: "Compiler Explorer", href: "/labs/compiler" } },
    { id: "asm-syscalls", index: "08", title: "Syscalls, interrupções e privilégio", summary: "Linux syscall e a cadeia Win32 → ntdll → Native API → kernel.", topics: ["syscall", "interrupts", "user mode", "kernel mode", "Native API"], bridge: "application → API wrapper → transition → kernel service", lessons: 5 },
    { id: "asm-simd", index: "09", title: "SIMD e vetorização", summary: "SSE, SSE2, AVX, AVX2 e introdução responsável ao AVX-512.", topics: ["SIMD", "SSE/SSE2", "AVX/AVX2", "AVX-512", "aligned memory"], bridge: "scalar loop → compiler vectorizer → vector registers → data lanes", lessons: 4 },
    { id: "asm-capstone", index: "10", title: "Otimização, emulação e análise", summary: "Medição, pequena VM, CPU simplificada e disassembler educacional.", topics: ["profiling", "microarchitecture", "VM", "emulator", "disassembler"], bridge: "performance hypothesis → instruction trace → measured evidence", lessons: 2 }
  ]
};

const windowsTrack: CurriculumTrack = {
  id: "windows",
  title: "Windows API e internals",
  shortTitle: "Windows",
  kicker: "From HWND to kernel object",
  description: "Win32 em C++ por baixo das abstrações: mensagens, handles, processos, memória virtual, DLLs, PE e a fronteira Native API.",
  tone: "blue",
  href: "/learn/windows",
  lessons: 66,
  labs: 24,
  projects: 11,
  level: "Intermediário",
  prerequisites: ["C/C++", "Ponteiros", "Noções de sistemas"],
  outcomes: ["Construir uma GUI Win32", "Rastrear handles e objetos do kernel", "Inspecionar um PE próprio", "Explicar VirtualAlloc até as page tables"],
  modules: [
    { id: "win-model", index: "01", title: "Modelo Win32 e tipos fundamentais", summary: "Windows.h, handles, integers, callbacks e erro estruturado.", topics: ["HWND / HANDLE", "DWORD / BOOL", "WPARAM / LPARAM", "HINSTANCE / HMODULE", "LRESULT"], bridge: "typedef Win32 → ABI x64 → kernel/user object", lessons: 5 },
    { id: "win-text", index: "02", title: "Strings, ANSI e Unicode", summary: "LPCSTR, LPCWSTR, UTF-16 e sufixos A/W.", topics: ["Unicode", "UTF-16", "MessageBoxA", "MessageBoxW", "TCHAR"], bridge: "C++ string → encoding → Win32 boundary", lessons: 4 },
    { id: "win-gui", index: "03", title: "Win32 GUI e message loop", summary: "WinMain, classes de janela, criação, dispatch e WndProc.", topics: ["WNDCLASSEX", "CreateWindowEx", "GetMessage", "DispatchMessage", "WndProc"], bridge: "input device → message queue → WndProc → application state", lessons: 8, lab: { label: "Message Loop Lab", href: "/labs/windows?view=messages" } },
    { id: "win-paint", index: "04", title: "Mensagens, pintura e controles", summary: "WM_CREATE, PAINT, SIZE, keyboard, mouse e controles nativos.", topics: ["WM_PAINT", "WM_SIZE", "WM_KEYDOWN", "WM_MOUSEMOVE", "WM_DESTROY"], bridge: "window event → message → state update → repaint", lessons: 6 },
    { id: "win-process", index: "05", title: "Processos, handles e módulos", summary: "CreateProcess, OpenProcess, IDs, address spaces e módulos.", topics: ["CreateProcess", "OpenProcess", "GetProcessId", "handles", "modules"], bridge: "EXE → loader → process object → virtual address space", lessons: 5 },
    { id: "win-threads", index: "06", title: "Threads e sincronização", summary: "Threads, waits, mutex, semaphore, event e critical section.", topics: ["CreateThread", "WaitForSingleObject", "mutex", "event / semaphore", "CriticalSection"], bridge: "user thread → kernel scheduler → core → shared memory", lessons: 6 },
    { id: "win-memory", index: "07", title: "Memória virtual e heaps", summary: "Reserve/commit, protection, queries e allocators de processo.", topics: ["VirtualAlloc", "VirtualProtect", "VirtualQuery", "HeapAlloc", "PAGE_*"], bridge: "VirtualAlloc → VAD/pages → protection → MMU", lessons: 6, lab: { label: "Virtual Memory Visualizer", href: "/labs/windows" } },
    { id: "win-files", index: "08", title: "Files, diretórios e I/O", summary: "CreateFile, ReadFile, WriteFile, offsets e operações de filesystem.", topics: ["CreateFile", "ReadFile", "WriteFile", "SetFilePointer", "directories"], bridge: "HANDLE → I/O manager → filesystem driver → storage", lessons: 6 },
    { id: "win-dll", index: "09", title: "DLLs e linking dinâmico", summary: "Imports, exports, LoadLibrary, GetProcAddress e search path.", topics: ["LoadLibrary", "GetProcAddress", "FreeLibrary", "import table", "DLL search path"], bridge: "import → loader → mapped DLL → resolved address", lessons: 5 },
    { id: "win-pe", index: "10", title: "Portable Executable", summary: "DOS/PE/COFF headers, optional header, sections, RVA e relocations.", topics: ["PE headers", ".text/.data/.rdata", "RVA / VA", "imports / exports", "resources / relocations"], bridge: "PE on disk → loader mapping → image in memory → entry point", lessons: 7, lab: { label: "PE Explorer", href: "/labs/windows?view=pe" } },
    { id: "win-native", index: "11", title: "Win32, Native API e syscalls", summary: "Camadas de compatibilidade, ntdll e transição user/kernel sem números fixos.", topics: ["Win32 API", "ntdll", "Native API", "syscall", "kernel"], bridge: "application → Win32 → ntdll → syscall → executive", lessons: 4 },
    { id: "win-graphics", index: "12", title: "Windows como plataforma gráfica", summary: "HWND, swapchains, Direct3D e apresentação pelo compositor.", topics: ["HWND", "DXGI", "Direct3D", "swapchain", "DWM"], bridge: "C++ → Win32 → DirectX → driver → GPU → DWM", lessons: 4, lab: { label: "Graphics Playground", href: "/labs/graphics" } }
  ]
};

const graphicsTrack: CurriculumTrack = {
  id: "graphics",
  title: "Computer Graphics e APIs gráficas",
  shortTitle: "Graphics",
  kicker: "From vertices to photons",
  description: "Renderização do primeiro triângulo ao frame explícito: matemática, shaders, OpenGL, Direct3D, Vulkan, SDL3 e arquitetura de GPU.",
  tone: "violet",
  href: "/learn/graphics",
  lessons: 78,
  labs: 31,
  projects: 12,
  level: "Intermediário",
  prerequisites: ["C++", "Memória e ponteiros", "Álgebra básica"],
  outcomes: ["Explicar cada estágio do pipeline", "Construir renderers em APIs modernas", "Diagnosticar CPU/GPU bottlenecks", "Seguir um draw call até o framebuffer"],
  modules: [
    { id: "gfx-model", index: "01", title: "CPU, driver e GPU", summary: "Graphics API, command streams, VRAM, framebuffer e apresentação.", topics: ["CPU/GPU", "driver", "VRAM", "framebuffer", "swapchain"], bridge: "application → graphics API → driver → GPU → display", lessons: 5, lab: { label: "CPU/GPU Visualizer", href: "/labs/graphics?view=cpu-gpu" } },
    { id: "gfx-pipeline", index: "02", title: "Pipeline gráfico", summary: "Vertices, primitives, rasterization, fragments e framebuffer.", topics: ["vertex", "index", "rasterization", "fragment", "draw call"], bridge: "vertex data → shaders → rasterizer → pixels", lessons: 7, lab: { label: "Pipeline Visualizer", href: "/labs/graphics?view=pipeline" } },
    { id: "gfx-math", index: "03", title: "Matemática visual para gráficos", summary: "Vetores, matrizes, transforms, câmera, projeção, clipping e quaternions.", topics: ["vectors", "matrices", "MVP", "quaternions", "perspective"], bridge: "model coordinates → world → view → clip → screen", lessons: 9, lab: { label: "3D Transform Lab", href: "/labs/graphics?view=math" } },
    { id: "gfx-shaders", index: "04", title: "Shaders e dados programáveis", summary: "GLSL, HLSL, SPIR-V, uniforms, buffers, interpolation e sampling.", topics: ["GLSL", "HLSL", "SPIR-V", "vertex/fragment", "compute"], bridge: "shader source → compiler → GPU ISA → shader cores", lessons: 8, lab: { label: "Shader Preview", href: "/labs/graphics?view=playground" } },
    { id: "gfx-opengl", index: "05", title: "OpenGL", summary: "Context, VAO/VBO/EBO, textures, depth, blending, FBO e câmera.", topics: ["OpenGL context", "VAO/VBO/EBO", "GLSL", "textures", "framebuffer"], bridge: "state calls → driver state machine → GPU commands", lessons: 10 },
    { id: "gfx-d3d11", index: "06", title: "Direct3D 11", summary: "Device, context, swapchain, render targets, buffers e shaders.", topics: ["Device", "DeviceContext", "SwapChain", "RenderTargetView", "buffers"], bridge: "immediate context → driver → command stream", lessons: 7 },
    { id: "gfx-d3d12", index: "07", title: "Direct3D 12", summary: "Queues, command lists, descriptors, PSO, root signature, fences e barriers.", topics: ["CommandQueue/List", "DescriptorHeap", "PSO", "RootSignature", "Fence/Barrier"], bridge: "explicit recording → submission → synchronization → execution", lessons: 8 },
    { id: "gfx-vulkan", index: "08", title: "Vulkan", summary: "Instance a present: devices, queues, swapchain, render pass, pipeline e descriptors.", topics: ["Instance/Device", "Queue/Swapchain", "CommandBuffer", "Descriptor", "Semaphore/Fence"], bridge: "explicit resources → command buffers → queues → presentation", lessons: 10 },
    { id: "gfx-sdl", index: "09", title: "SDL3 como camada de plataforma", summary: "Window, events, input, audio e integração OpenGL/Vulkan.", topics: ["SDL3 window", "event loop", "input", "audio", "OpenGL/Vulkan"], bridge: "portable platform API → native window/input/audio", lessons: 5 },
    { id: "gfx-gpu", index: "10", title: "GPU programming e compute", summary: "Cores, warps/wavefronts, SIMD, caches, occupancy e compute shaders.", topics: ["warp/wavefront", "SIMD", "VRAM/cache", "compute", "parallelism"], bridge: "parallel workload → dispatch → GPU lanes → memory hierarchy", lessons: 5 },
    { id: "gfx-frame", index: "11", title: "Frames, sincronização e performance", summary: "Frame time, CPU/GPU bound, VSync, buffering, barriers e profiling.", topics: ["frame time", "CPU/GPU bound", "VSync", "double/triple buffering", "profiling"], bridge: "frame events → timings → bottleneck → evidence", lessons: 4, lab: { label: "Frame Debugger", href: "/labs/graphics?view=frame" } }
  ]
};

export const curriculumTracks: readonly CurriculumTrack[] = [
  compactTracks[0]!,
  compactTracks[1]!,
  assemblyTrack,
  compactTracks[2]!,
  windowsTrack,
  compactTracks[3]!,
  compactTracks[4]!,
  compactTracks[5]!,
  graphicsTrack,
  compactTracks[6]!,
  compactTracks[7]!
] as const;

export const curriculumTotals = curriculumTracks.reduce(
  (totals, track) => ({
    lessons: totals.lessons + track.modules.reduce((count, module) => count + module.topics.length, 0),
    labs: totals.labs + track.labs,
    projects: totals.projects + track.projects,
    modules: totals.modules + track.modules.length
  }),
  { lessons: 0, labs: 0, projects: 0, modules: 0 }
);

export function getCurriculumTrack(id: string): CurriculumTrack | undefined {
  return curriculumTracks.find((track) => track.id === id);
}
