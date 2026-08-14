export interface ReviewCardDefinition {
  readonly id: string;
  readonly topic: string;
  readonly track: string;
  readonly href: string;
  readonly prompt: string;
  readonly code?: string;
  readonly language?: string;
  readonly answer: string;
  readonly evidence: readonly string[];
}

export const reviewCards: readonly ReviewCardDefinition[] = [
  {
    id: "pointer-arithmetic",
    topic: "Pointer arithmetic",
    track: "C / Memory",
    href: "/learn/c/c-pointers/pointers",
    prompt: "Se ptr aponta para values[0] de um int[4], o que ptr + 2 representa e quais operações são válidas com values + 4?",
    code: `int values[4] = {10, 20, 30, 40};\nint *ptr = values;\nprintf("%d\\n", *(ptr + 2));`,
    language: "c",
    answer: "ptr + 2 aponta para values[2] e o dereference produz 30. values + 4 é one-past: pode participar de comparação/subtração dentro do mesmo array, mas não pode ser dereferenced.",
    evidence: ["Escala por sizeof(int)", "Faixa do mesmo array", "Estado one-past"]
  },
  {
    id: "struct-alignment",
    topic: "Struct alignment",
    track: "C / Data layout",
    href: "/learn/memory/mem-layout/alignment",
    prompt: "Por que sizeof(struct { char tag; int value; }) pode ser maior que 5 e por que serializar seus bytes brutos não cria um protocolo portátil?",
    answer: "O compilador pode inserir padding para alinhar value e ajustar o tamanho total ao alinhamento da struct. Padding, endian, larguras e representação dependem da implementação; um wire format deve codificar campos explicitamente.",
    evidence: ["offsetof medido", "padding interno/final", "wire format explícito"]
  },
  {
    id: "tcp-recv",
    topic: "TCP recv()",
    track: "Networking",
    href: "/learn/networking/net-sockets/sockets",
    prompt: "O peer enviou um frame de 100 bytes. recv(fd, buffer, 100, 0) retornou 27. Isso é erro? O que o parser deve fazer?",
    answer: "Não. TCP é stream e 27 bytes é um resultado parcial válido. O programa acumula os bytes, preserva o estado do parser e chama recv novamente até completar o framing ou observar EOF/erro/timeout.",
    evidence: ["Partial I/O", "framing incremental", "EOF separado de erro"]
  },
  {
    id: "calling-convention",
    topic: "Calling conventions",
    track: "Assembly / ABI",
    href: "/learn/assembly/asm-abi/windows-x64",
    prompt: "Ao chamar uma função x64, por que não basta saber que o primeiro argumento está em um registrador? Cite três partes adicionais do contrato ABI.",
    answer: "Também é necessário conhecer quais registradores são caller/callee-saved, alinhamento e área exigida na stack, local do retorno, tratamento de agregados/unwind e a convenção específica (Windows x64 versus System V AMD64).",
    evidence: ["Argument registers", "preserved registers", "stack alignment/space"]
  },
  {
    id: "signed-overflow",
    topic: "Signed overflow",
    track: "C / Representation",
    href: "/learn/c/c-toolchain/representacao",
    prompt: "Por que testar `if (a + b < a)` depois da soma não é uma forma geral segura de detectar overflow signed em C?",
    code: `int add(int a, int b) {\n    if (a + b < a) return 0;\n    return a + b;\n}`,
    language: "c",
    answer: "A própria soma signed fora da faixa já tem comportamento indefinido; o compilador pode otimizar assumindo que isso não acontece. Valide limites antes da operação ou use intrinsics/builtins apropriados.",
    evidence: ["Check antes da soma", "INT_MAX/INT_MIN", "regra da linguagem ≠ wrap da CPU"]
  },
  {
    id: "raii-ownership",
    topic: "RAII e ownership",
    track: "C++",
    href: "/learn/cpp/cpp-objects/smart-pointers",
    prompt: "Quando uma função deve receber `std::unique_ptr<T>` por valor e quando `T&` comunica melhor a intenção?",
    answer: "unique_ptr por valor comunica transferência de ownership para a função. T& comunica borrow não nulo durante a chamada; o caller continua owner. Use T* observador quando ausência for um estado válido e documentado.",
    evidence: ["Transferência por move", "borrow sem ownership", "nullability explícita"]
  },
  {
    id: "virtual-alloc",
    topic: "VirtualAlloc reserve/commit",
    track: "Windows / Memory",
    href: "/learn/windows/win-memory/virtualalloc",
    prompt: "Diferencie reservar 1 GiB de VA, fazer commit de uma página e tocar essa página pela primeira vez.",
    answer: "Reserve escolhe/ocupa uma faixa de endereço virtual; commit cria estado utilizável e commit charge/backing conforme o sistema; o primeiro acesso pode provocar page fault e tornar uma página física residente. Os três eventos não são sinônimos.",
    evidence: ["VA reservation", "committed state", "page fault/working set"]
  },
  {
    id: "gpu-buffer",
    topic: "Vertex buffer layout",
    track: "Graphics",
    href: "/learn/graphics/gfx-opengl/vao-vbo-ebo",
    prompt: "Em dados intercalados position(float2)+color(float3), qual é o papel de stride e offset e o que acontece se stride for 0?",
    answer: "Stride informa quantos bytes separam atributos do mesmo tipo em vertices consecutivos; offset localiza o campo no registro. Stride zero descreve atributos tightly packed e lerá posições/cores erradas para essa struct intercalada.",
    evidence: ["sizeof(Vertex)", "offsetof(field)", "shader location compatível"]
  }
] as const;

