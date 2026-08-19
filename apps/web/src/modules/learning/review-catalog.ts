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
  },
  {
    id: "stack-bound",
    topic: "Stack buffer bound",
    track: "Security Research",
    href: "/learn/security-research/sres-corruption/stack-overflow",
    prompt: "Por que `char buffer[8]; strcpy(buffer, input);` é um defeito espacial mesmo quando o programa 'só crasha', e o que a versão segura precisa declarar que strcpy esconde?",
    code: `char buffer[8];\nstrcpy(buffer, input);`,
    language: "c",
    answer: "strcpy deriva o comprimento da origem e pode escrever além do objeto. O crash é um sintoma; o invariante quebrado é o bound do destino. A correção faz o destino declarar capacidade, copia no máximo cap-1 bytes e termina com NUL. ASan aponta o primeiro store ilegal; canary/ASLR não restauram o contrato.",
    evidence: ["capacidade do destino", "primeiro store OOB", "teste de regressão com entrada longa"]
  },
  {
    id: "api-dual-use",
    topic: "Win32 dual use",
    track: "Security Research",
    href: "/learn/security-research/sres-windows/win32-dual-use",
    prompt: "Por que um import de VirtualAlloc ou CreateFileW não autoriza concluir que um PE é malware, e o que o Mini EDR do laboratório deve correlacionar em vez do nome da API?",
    answer: "Essas APIs são o contrato do sistema operacional para alocação e arquivos. Software legítimo e amostras sintéticas as compartilham. Detecção no laboratório combina processo, path, destino de rede (loopback) e sequência temporal — nunca uma blacklist ingênua do nome da função.",
    evidence: ["contrato da API", "alvo/path", "timeline de eventos"]
  },
  {
    id: "player-layout",
    topic: "Player memory layout",
    track: "Game Security",
    href: "/learn/game-security/gsec-memory/player-layout",
    prompt: "No binário educacional do Arena Lab, por que health não é 'o número 100 na memória' e o que você precisa registrar junto dos offsets +0x00…+0x0C?",
    code: `struct Player { float x, y, z; int health; int armor; };`,
    language: "cpp",
    answer: "Health é um int32 em um offset de uma struct com sizeof e alinhamento definidos nesta compilação. Sem tipo, endian e hash do build, 0x64 pode ser um byte de float. Offsets mudam entre versões; o inspector mede o layout atual do processo do laboratório, nunca de um jogo online de terceiros.",
    evidence: ["offsetof(health)==12", "sizeof(Player)==20", "hash/versão do binário do lab"]
  },
  {
    id: "naive-ac",
    topic: "Fictional anti-cheat gap",
    track: "Game Security",
    href: "/learn/game-security/gsec-anticheat/fictional-ac",
    prompt: "O Mini Anti-Cheat naive aceita um teleport com health legal. Qual invariante faltou, e qual é o objetivo do exercício depois de demonstrar o miss?",
    answer: "O detector naive só olha faixa/heal de health. Deslocamento maior que vmax·dt é a fraqueza proposital. O Bypass Research Lab pede encontrar esse buraco no AC fictício e então ligar o modo strong (sanity de velocidade + correlação de input). Não há exercício contra BattlEye, EAC ou Vanguard.",
    evidence: ["teleport miss no modo naive", "SpeedHack no modo strong", "WASD legal sem falso positivo"]
  }
] as const;

