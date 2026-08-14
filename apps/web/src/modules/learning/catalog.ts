import type { LearningModule, ProjectDefinition, Track } from "@/domain/learning/entities";

export const tracks: readonly Track[] = [
  {
    id: "c-core",
    title: "C — da linguagem à máquina",
    shortTitle: "C Core",
    description: "Tipos, compilação, ponteiros, layout de dados e memória sem abstrações mágicas.",
    tone: "cyan",
    progress: 42,
    moduleCount: 8
  },
  {
    id: "cpp-modern",
    title: "C++ moderno e engenharia",
    shortTitle: "Modern C++",
    description: "RAII, ownership, templates, STL, concorrência e leitura de código legado.",
    tone: "violet",
    progress: 12,
    moduleCount: 9
  },
  {
    id: "systems",
    title: "Sistemas e arquitetura",
    shortTitle: "Systems",
    description: "Linux, Windows, processos, memória virtual, syscalls, PE, ELF e assembly.",
    tone: "amber",
    progress: 4,
    moduleCount: 11
  },
  {
    id: "network-security",
    title: "Redes e software seguro",
    shortTitle: "Net / Security",
    description: "Sockets, TCP/IP, HTTP e falhas de memória em laboratórios autorizados.",
    tone: "green",
    progress: 0,
    moduleCount: 10
  }
] as const;

export const cModules: readonly LearningModule[] = [
  {
    id: "c-foundations",
    index: "01",
    title: "Fundamentos e toolchain",
    description: "Do pré-processador ao linker, com tipos, controle de fluxo e organização real de projetos.",
    progress: 100,
    lessons: [
      { id: "c-types", slug: "types", title: "Tipos, bytes e representação", durationMinutes: 28, status: "completed" },
      { id: "c-control", slug: "control-flow", title: "Controle de fluxo", durationMinutes: 24, status: "completed" },
      { id: "c-functions", slug: "functions", title: "Funções e unidades de tradução", durationMinutes: 34, status: "completed" },
      { id: "c-linking", slug: "linking", title: "Pré-processamento, compilação e linking", durationMinutes: 42, status: "completed" }
    ]
  },
  {
    id: "c-data",
    index: "02",
    title: "Dados compostos",
    description: "Arrays, strings, structs, enums, unions, typedef e o layout produzido pelo compilador.",
    progress: 75,
    lessons: [
      { id: "c-arrays", slug: "arrays", title: "Arrays e strings", durationMinutes: 38, status: "completed" },
      { id: "c-structs", slug: "structs", title: "Structs, padding e alinhamento", durationMinutes: 46, status: "completed" },
      { id: "c-unions", slug: "unions", title: "Enums, unions e representação", durationMinutes: 32, status: "completed" },
      { id: "c-headers", slug: "headers", title: "Headers e APIs em C", durationMinutes: 30, status: "available" }
    ]
  },
  {
    id: "c-pointers",
    index: "03",
    title: "Ponteiros e indireção",
    description: "Endereços, dereference, aritmética, aliasing e conexões reais entre objetos na memória.",
    progress: 38,
    lessons: [
      { id: "pointer-address", slug: "address-and-indirection", title: "Endereço e indireção", durationMinutes: 36, status: "current", href: "/learn/c/c-pointers/pointers" },
      { id: "pointer-arrays", slug: "arrays", title: "Ponteiros e arrays", durationMinutes: 44, status: "available" },
      { id: "pointer-depth", slug: "pointer-to-pointer", title: "Ponteiro para ponteiro", durationMinutes: 39, status: "available" },
      { id: "pointer-functions", slug: "function-pointers", title: "Function pointers e callbacks", durationMinutes: 52, status: "locked" },
      { id: "pointer-aliasing", slug: "aliasing", title: "Const, aliasing e alinhamento", durationMinutes: 48, status: "locked" }
    ]
  },
  {
    id: "c-memory",
    index: "04",
    title: "Memória dinâmica",
    description: "Stack, heap, duração de armazenamento, allocators e classes de falhas de memória.",
    progress: 0,
    lessons: [
      { id: "memory-regions", slug: "regions", title: "Stack, heap e memória estática", durationMinutes: 45, status: "locked" },
      { id: "memory-allocation", slug: "allocation", title: "malloc, calloc e realloc", durationMinutes: 58, status: "locked" },
      { id: "memory-lifetime", slug: "lifetime", title: "Lifetime e ownership manual", durationMinutes: 54, status: "locked" },
      { id: "memory-bugs", slug: "bugs", title: "Leaks, UAF e double free", durationMinutes: 62, status: "locked" }
    ]
  },
  {
    id: "c-sqlite",
    index: "05",
    title: "SQLite em C",
    description: "Prepared statements, transações, erros e um repositório CRUD completo.",
    progress: 0,
    lessons: []
  },
  {
    id: "c-systems",
    index: "06",
    title: "POSIX e Win32",
    description: "Processos, threads, arquivos, sinais, handles e comunicação entre processos.",
    progress: 0,
    lessons: []
  },
  {
    id: "c-networking",
    index: "07",
    title: "Sockets e protocolos",
    description: "TCP, UDP e HTTP implementados a partir das primitivas do sistema operacional.",
    progress: 0,
    lessons: []
  },
  {
    id: "c-security",
    index: "08",
    title: "Debugging e segurança",
    description: "Sanitizers, undefined behavior, exploração controlada e mitigação moderna.",
    progress: 0,
    lessons: []
  }
] as const;

export const projects: readonly ProjectDefinition[] = [
  {
    id: "c-calculator",
    title: "Calculadora com parser de expressões",
    level: "Fundamental",
    description: "Evolua de quatro operações para tokens, precedência, parênteses, divisão por zero e mensagens de erro com posição.",
    skills: ["C17", "functions", "parsing"],
    estimatedHours: 5,
    platform: "Cross-platform"
  },
  {
    id: "c-arguments",
    title: "Parser de argumentos CLI",
    level: "Fundamental",
    description: "Interprete flags curtas/longas, valores, --, help e erros; preserve argc/argv e produza uma API testável.",
    skills: ["argc/argv", "strings", "state machine"],
    estimatedHours: 5,
    platform: "Cross-platform"
  },
  {
    id: "c-file-reader",
    title: "Leitor de arquivos robusto",
    level: "Fundamental",
    description: "Leia texto e binário em chunks, trate short read, EOF, erros e arquivos grandes sem presumir que cabem na memória.",
    skills: ["file I/O", "buffers", "error handling"],
    estimatedHours: 5,
    platform: "Cross-platform"
  },
  {
    id: "c-contacts",
    title: "Agenda de contatos persistente",
    level: "Fundamental",
    description: "Modele contatos, busca e atualização; grave de forma temporária+rename, valide campos e recupere arquivo corrompido.",
    skills: ["structs", "files", "validation"],
    estimatedHours: 9,
    platform: "Cross-platform"
  },
  {
    id: "c-dynamic-list",
    title: "Lista dinâmica de inteiros",
    level: "Fundamental",
    description: "Implemente reserve, push, insert, remove e destroy com overflow checks, realloc transacional e testes de falha de alocação.",
    skills: ["pointers", "realloc", "invariants"],
    estimatedHours: 8,
    platform: "Cross-platform"
  },
  {
    id: "c-dynamic-string",
    title: "String dinâmica",
    level: "Intermediário",
    description: "Mantenha length/capacity/terminador, implemente append/format e trate aliasing, crescimento e falha sem perder o buffer antigo.",
    skills: ["strings", "ownership", "realloc"],
    estimatedHours: 10,
    platform: "Cross-platform"
  },
  {
    id: "c-linked-list",
    title: "Linked list instrumentada",
    level: "Intermediário",
    description: "Construa lista simples e dupla, visualize links, trate remoção nas extremidades e compare localidade com array dinâmico.",
    skills: ["pointers", "nodes", "complexity"],
    estimatedHours: 9,
    platform: "Cross-platform"
  },
  {
    id: "c-stack-queue",
    title: "Stack e queue com testes",
    level: "Intermediário",
    description: "Implemente LIFO e ring buffer FIFO, defina comportamento cheio/vazio e valide wrap-around com testes de propriedade.",
    skills: ["data structures", "ring buffer", "tests"],
    estimatedHours: 9,
    platform: "Cross-platform"
  },
  {
    id: "c-hash-table",
    title: "Hash table de strings",
    level: "Intermediário",
    description: "Implemente hash, buckets, colisões, resize e ownership de chaves; meça load factor sem confundir benchmark com regra universal.",
    skills: ["hashing", "pointers", "amortized cost"],
    estimatedHours: 14,
    platform: "Cross-platform"
  },
  {
    id: "c-csv-parser",
    title: "Parser CSV incremental",
    level: "Intermediário",
    description: "Reconheça delimitadores, campos quoted, aspas escapadas e linhas parciais em uma state machine com limites configuráveis.",
    skills: ["parsing", "state machine", "streaming"],
    estimatedHours: 12,
    platform: "Cross-platform"
  },
  {
    id: "c-binary-parser",
    title: "Parser de formato binário próprio",
    level: "Intermediário",
    description: "Defina magic/version/length/checksum, serialize em endian explícito e rejeite offsets ou tamanhos fora do arquivo.",
    skills: ["binary", "endian", "bounds checking"],
    estimatedHours: 12,
    platform: "Cross-platform"
  },
  {
    id: "c-logger",
    title: "Logger C com rotação",
    level: "Intermediário",
    description: "Implemente níveis, timestamps, formatação limitada, escrita concorrente e rotação sem perder o erro original da aplicação.",
    skills: ["variadic functions", "files", "threads"],
    estimatedHours: 12,
    platform: "Cross-platform"
  },
  {
    id: "c-sqlite-crud",
    title: "CRUD SQLite em C",
    level: "Intermediário",
    description: "Construa schema versionado, prepared statements, bind/step/reset, transactions e índices para uma agenda persistente.",
    skills: ["SQLite C API", "transactions", "migrations"],
    estimatedHours: 16,
    platform: "Cross-platform"
  },
  {
    id: "c-http-client",
    title: "HTTP/1.1 client em C",
    level: "Avançado",
    description: "Resolva DNS, conecte TCP, envie request, parseie status/headers/body e trate Content-Length, chunked, timeout e limites.",
    skills: ["sockets", "HTTP", "incremental parsing"],
    estimatedHours: 18,
    platform: "Cross-platform"
  },
  {
    id: "c-mini-shell",
    title: "Mini shell POSIX",
    level: "Avançado",
    description: "Implemente tokenizer, fork/exec, pipes, redirection, status, sinais e built-ins sem tentar reproduzir toda a gramática de um shell real.",
    skills: ["fork/exec", "pipes", "signals"],
    estimatedHours: 24,
    platform: "Linux"
  },
  {
    id: "c-text-editor",
    title: "Editor de texto terminal",
    level: "Avançado",
    description: "Modele buffer editável, cursor, viewport, input raw e save atômico; adicione undo simples com comandos reversíveis.",
    skills: ["terminal I/O", "dynamic string", "state"],
    estimatedHours: 28,
    platform: "Linux"
  },
  {
    id: "protocol-lab",
    title: "Protocolo Length / Type / Payload / Checksum",
    level: "Intermediário",
    description: "Evolua de LOGIN|user|pass para frames binários versionados, parsing incremental, endian, checksum e rejeição determinística.",
    skills: ["framing", "serialization", "validation"],
    estimatedHours: 14,
    platform: "Cross-platform"
  },
  {
    id: "tcp-echo-pair",
    title: "TCP client/server e echo",
    level: "Fundamental",
    description: "Construa os dois lados, registre estados de connect/listen/accept e trate partial send/recv, EOF e reconexão.",
    skills: ["TCP", "sockets", "debugging"],
    estimatedHours: 10,
    platform: "Cross-platform"
  },
  {
    id: "tcp-file-transfer",
    title: "Transferência de arquivos com retomada",
    level: "Avançado",
    description: "Envie metadata e chunks com hash, limite, ACK e retomada por offset; valide nome, tamanho e escrita temporária no receptor.",
    skills: ["protocols", "files", "integrity"],
    estimatedHours: 22,
    platform: "Cross-platform"
  },
  {
    id: "cpp-cli",
    title: "CLI modular em C++",
    level: "Fundamental",
    description: "Separe parsing, commands, domínio e I/O; use RAII, std::expected-like results e testes sem depender do terminal real.",
    skills: ["C++23", "RAII", "architecture"],
    estimatedHours: 9,
    platform: "Cross-platform"
  },
  {
    id: "cpp-filesystem-indexer",
    title: "Indexador de filesystem",
    level: "Intermediário",
    description: "Percorra diretórios, trate symlinks, permissões e erros por entrada; gere índice consultável sem loops ou paths inválidos.",
    skills: ["std::filesystem", "errors", "search"],
    estimatedHours: 12,
    platform: "Cross-platform"
  },
  {
    id: "cpp-oo-logger",
    title: "Logger orientado a objetos",
    level: "Intermediário",
    description: "Modele sinks, formatter, níveis e rotação com ownership explícito; teste concorrência e falha do destino sem exceptions no destructor.",
    skills: ["interfaces", "RAII", "concurrency"],
    estimatedHours: 13,
    platform: "Cross-platform"
  },
  {
    id: "cpp-event-system",
    title: "Event system com lifetime seguro",
    level: "Intermediário",
    description: "Implemente subscribe/unsubscribe, tokens RAII, dispatch reentrante e fila; evite callbacks dangling e ciclos de shared_ptr.",
    skills: ["callbacks", "RAII tokens", "lifetime"],
    estimatedHours: 14,
    platform: "Cross-platform"
  },
  {
    id: "cpp-resource-manager",
    title: "Resource manager assíncrono",
    level: "Avançado",
    description: "Carregue assets por IDs, cacheie ownership, deduplicate requests e coordene estados loading/ready/failed com shutdown limpo.",
    skills: ["ownership", "cache", "async I/O"],
    estimatedHours: 24,
    platform: "Cross-platform"
  },
  {
    id: "cpp-thread-pool",
    title: "Thread pool com shutdown verificável",
    level: "Avançado",
    description: "Construa workers, bounded queue, futures e cancelamento cooperativo; prove que shutdown não perde tasks nem deadlocka.",
    skills: ["threads", "condition_variable", "futures"],
    estimatedHours: 20,
    platform: "Cross-platform"
  },
  {
    id: "cpp-task-queue",
    title: "Task queue com prioridades",
    level: "Avançado",
    description: "Implemente prioridades, backpressure, fairness e métricas; compare mutex/condition variable antes de considerar atomics complexos.",
    skills: ["queues", "synchronization", "profiling"],
    estimatedHours: 18,
    platform: "Cross-platform"
  },
  {
    id: "cpp-http-client",
    title: "HTTP client com RAII",
    level: "Avançado",
    description: "Modele socket, request, response e timeout como lifetimes; faça parsing incremental e imponha limites a headers/body.",
    skills: ["RAII", "networking", "HTTP"],
    estimatedHours: 20,
    platform: "Cross-platform"
  },
  {
    id: "cpp-tcp-server",
    title: "TCP server concorrente em C++",
    level: "Avançado",
    description: "Use wrappers RAII para sockets, bounded task queue e protocolo framed; coordene disconnect, timeout e shutdown sem handles dangling.",
    skills: ["sockets", "RAII", "thread pool"],
    estimatedHours: 24,
    platform: "Cross-platform"
  },
  {
    id: "cpp-sqlite-repository",
    title: "SQLite repository em C++",
    level: "Intermediário",
    description: "Encapsule connection/statements em RAII, modele migrations e transactions e teste rollback, constraints e consultas indexadas.",
    skills: ["SQLite", "RAII", "repository"],
    estimatedHours: 18,
    platform: "Cross-platform"
  },
  {
    id: "cpp-plugin-system",
    title: "Plugin system versionado",
    level: "Avançado",
    description: "Defina ABI C estável, version negotiation, ownership de handles e unload seguro usando DLL/.so produzidos pelo próprio projeto.",
    skills: ["dynamic linking", "ABI", "plugins"],
    estimatedHours: 24,
    platform: "Cross-platform"
  },
  {
    id: "cpp-memory-pool",
    title: "Memory pool tipado",
    level: "Avançado",
    description: "Implemente slots alinhados, free list, placement construction/destruction e detecção de double free em build de diagnóstico.",
    skills: ["allocators", "alignment", "object lifetime"],
    estimatedHours: 24,
    platform: "Cross-platform"
  },
  {
    id: "cpp-ecs",
    title: "ECS simplificado",
    level: "Avançado",
    description: "Separe entity IDs, sparse sets e component storage; meça iteração contígua e trate invalidation sem prometer uma engine completa.",
    skills: ["data-oriented design", "templates", "cache"],
    estimatedHours: 30,
    platform: "Cross-platform"
  },
  {
    id: "cpp-game-loop",
    title: "Game loop observável",
    level: "Intermediário",
    description: "Separe eventos, fixed update, render e present; registre frame pacing e evite acoplar simulação diretamente ao FPS.",
    skills: ["SDL3", "timing", "profiling"],
    estimatedHours: 14,
    platform: "Cross-platform"
  },
  {
    id: "cpp-basic-renderer",
    title: "Renderer 2D básico",
    level: "Intermediário",
    description: "Integre janela, buffers, shaders, textura, transforms e batching; capture frames e mantenha ownership de recursos em ordem explícita.",
    skills: ["C++", "OpenGL", "render loop"],
    estimatedHours: 24,
    platform: "Cross-platform"
  },
  {
    id: "cpp-serialization",
    title: "Sistema de serialização versionado",
    level: "Avançado",
    description: "Defina schema/version, encode/decode bounded, migração e testes round-trip/corruption sem serializar layout bruto de objetos.",
    skills: ["serialization", "versioning", "parsing"],
    estimatedHours: 22,
    platform: "Cross-platform"
  },
  {
    id: "hex-viewer",
    title: "Hexadecimal viewer",
    level: "Fundamental",
    description: "Leia um arquivo em blocos, renderize offsets, bytes e uma coluna ASCII segura.",
    skills: ["file I/O", "arrays", "formatting"],
    estimatedHours: 3,
    platform: "Cross-platform"
  },
  {
    id: "sqlite-inventory",
    title: "Inventário com SQLite",
    level: "Intermediário",
    description: "CRUD transacional com prepared statements e uma camada de repository em C++.",
    skills: ["SQLite", "RAII", "repository"],
    estimatedHours: 8,
    platform: "Cross-platform"
  },
  {
    id: "tcp-chat",
    title: "Chat TCP concorrente",
    level: "Intermediário",
    description: "Protocolo de mensagens, múltiplos clientes e encerramento coordenado.",
    skills: ["sockets", "threads", "protocols"],
    estimatedHours: 10,
    platform: "Linux"
  },
  {
    id: "elf-inspector",
    title: "ELF inspector",
    level: "Avançado",
    description: "Faça parsing seguro de headers, seções, símbolos e imports sem executar o binário.",
    skills: ["ELF", "binary parsing", "bounds checking"],
    estimatedHours: 18,
    platform: "Linux"
  },
  {
    id: "allocator",
    title: "Allocator educacional",
    level: "Avançado",
    description: "Implemente arena allocation, free list, alinhamento e métricas de fragmentação.",
    skills: ["memory", "alignment", "data structures"],
    estimatedHours: 22,
    platform: "Cross-platform"
  },
  {
    id: "pe-parser",
    title: "PE parser",
    level: "Avançado",
    description: "Inspecione DOS header, NT headers, sections e import table de binários próprios.",
    skills: ["PE", "Win32", "reverse engineering"],
    estimatedHours: 20,
    platform: "Windows"
  },
  {
    id: "assembly-cpp-bridge",
    title: "C++ ↔ Assembly bridge",
    level: "Intermediário",
    description: "Implemente funções NASM/GAS chamadas por C++ e valide parâmetros, retorno, alinhamento e registradores preservados.",
    skills: ["Assembly", "ABI", "linking"],
    estimatedHours: 8,
    platform: "Cross-platform"
  },
  {
    id: "opcode-vm",
    title: "VM e opcode explorer",
    level: "Avançado",
    description: "Defina uma ISA pequena, codifique opcodes e execute bytecode com trace de registradores, flags e memória.",
    skills: ["opcodes", "VM", "disassembly"],
    estimatedHours: 18,
    platform: "Cross-platform"
  },
  {
    id: "cpu-emulator",
    title: "CPU emulator simplificado",
    level: "Avançado",
    description: "Modele fetch, decode e execute, incluindo ALU, instruction pointer, stack e branches condicionais.",
    skills: ["CPU", "instruction set", "testing"],
    estimatedHours: 28,
    platform: "Cross-platform"
  },
  {
    id: "educational-debugger",
    title: "Debugger educacional",
    level: "Avançado",
    description: "Controle um processo próprio, implemente breakpoints e apresente registradores, stack e mapa de memória.",
    skills: ["ptrace", "registers", "process control"],
    estimatedHours: 24,
    platform: "Linux"
  },
  {
    id: "memory-viewer",
    title: "Virtual memory viewer",
    level: "Intermediário",
    description: "Use VirtualQuery no próprio processo para exibir regions, states, protections e módulos carregados.",
    skills: ["VirtualQuery", "pages", "Win32"],
    estimatedHours: 14,
    platform: "Windows"
  },
  {
    id: "process-explorer",
    title: "Task manager educacional",
    level: "Avançado",
    description: "Liste processos, threads, módulos e métricas públicas sem interferir em processos de terceiros.",
    skills: ["process API", "threads", "handles"],
    estimatedHours: 22,
    platform: "Windows"
  },
  {
    id: "win32-workbench",
    title: "Aplicação Win32 completa",
    level: "Intermediário",
    description: "Construa message loop, menus, controles, editor de texto e monitor de eventos usando Win32 puro.",
    skills: ["WndProc", "controls", "file API"],
    estimatedHours: 16,
    platform: "Windows"
  },
  {
    id: "win32-file-explorer",
    title: "File explorer nativo",
    level: "Intermediário",
    description: "Navegue diretórios, leia metadados e conecte seleção de arquivos a um visualizador hexadecimal seguro.",
    skills: ["CreateFile", "directories", "binary viewer"],
    estimatedHours: 18,
    platform: "Windows"
  },
  {
    id: "runtime-dll",
    title: "DLL e runtime linking",
    level: "Intermediário",
    description: "Crie uma DLL própria, exporte uma API versionada e carregue-a com LoadLibrary e GetProcAddress.",
    skills: ["DLL", "exports", "LoadLibrary"],
    estimatedHours: 10,
    platform: "Windows"
  },
  {
    id: "opengl-renderer",
    title: "Renderer OpenGL",
    level: "Intermediário",
    description: "Renderize meshes texturizadas com VAO/VBO/EBO, câmera, iluminação, depth test e framebuffer.",
    skills: ["OpenGL", "GLSL", "camera"],
    estimatedHours: 24,
    platform: "Cross-platform"
  },
  {
    id: "d3d11-renderer",
    title: "Renderer Direct3D 11",
    level: "Avançado",
    description: "Conecte Win32, DXGI, device context, swapchain, buffers e HLSL em um renderer observável.",
    skills: ["Direct3D 11", "HLSL", "DXGI"],
    estimatedHours: 28,
    platform: "Windows"
  },
  {
    id: "d3d12-renderer",
    title: "Renderer Direct3D 12",
    level: "Avançado",
    description: "Implemente command lists, descriptor heaps, PSO, root signature, barriers e fences explicitamente.",
    skills: ["Direct3D 12", "barriers", "fences"],
    estimatedHours: 42,
    platform: "Windows"
  },
  {
    id: "vulkan-renderer",
    title: "Renderer Vulkan",
    level: "Avançado",
    description: "Crie device, swapchain, pipeline, descriptors e command buffers com validation layers habilitadas.",
    skills: ["Vulkan", "SPIR-V", "synchronization"],
    estimatedHours: 45,
    platform: "Cross-platform"
  },
  {
    id: "model-viewer",
    title: "Visualizador de modelos 3D",
    level: "Avançado",
    description: "Carregue um formato documentado, inspecione meshes e materials e ofereça câmera, iluminação e overlays técnicos.",
    skills: ["model loading", "materials", "GPU buffers"],
    estimatedHours: 32,
    platform: "Cross-platform"
  },
  {
    id: "minimal-engine",
    title: "Engine gráfica mínima",
    level: "Avançado",
    description: "Integre plataforma SDL3, renderer, assets, scene graph, profiling e um frame debugger próprio.",
    skills: ["SDL3", "renderer architecture", "profiling"],
    estimatedHours: 70,
    platform: "Cross-platform"
  }
] as const;

export const learningStats = {
  completedLessons: 11,
  totalLessons: 293,
  completedExercises: 27,
  studyMinutes: 1_126,
  streakDays: 6,
  weeklyMinutes: [38, 52, 0, 76, 64, 91, 44]
} as const;
