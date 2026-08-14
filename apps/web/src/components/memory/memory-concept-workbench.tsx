"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { MemoryArchitectureScene } from "./memory-architecture-scene";
import type { BlockState, MemoryBlock, MemoryLink, MemoryRegion } from "./memory-concept-types";

export type MemoryConceptToolId = "stack-heap" | "allocator" | "bugs";


interface ConceptStep {
  readonly line: number;
  readonly label: string;
  readonly note: string;
  readonly blocks: readonly MemoryBlock[];
  readonly links?: readonly MemoryLink[];
  readonly state: Readonly<Record<string, string>>;
  readonly metrics: Readonly<Record<string, string>>;
  readonly diagnostic?: {
    readonly tone: "info" | "ok" | "warning" | "danger";
    readonly title: string;
    readonly detail: string;
  };
}

interface ConceptScenario {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly filename: string;
  readonly regionLabel: string;
  readonly stateLabel: string;
  readonly lines: readonly string[];
  readonly invariants: readonly string[];
  readonly steps: readonly ConceptStep[];
}

interface ConceptTool {
  readonly label: string;
  readonly scenarios: readonly ConceptScenario[];
}

function block(
  id: string,
  region: MemoryRegion,
  label: string,
  address: string,
  size: string,
  value: string,
  state: BlockState = "active"
): MemoryBlock {
  return { id, region, label, address, size, value, state };
}

const stackHeapScenarios: readonly ConceptScenario[] = [
  {
    id: "stack-frame",
    label: "Frame de função",
    description: "call, prólogo, locais e retorno vistos na stack.",
    filename: "stack_frame.c",
    regionLabel: "STACK / sum()",
    stateLabel: "CPU / FRAME",
    lines: ["int sum(int a, int b) {", "  int local = a + b;", "  return local;", "}"],
    invariants: ["RSP é restaurado ao valor do caller.", "O return address nunca é tratado como dado comum.", "Locais deixam de existir quando o frame termina."],
    steps: [
      {
        line: 1, label: "call cria a fronteira", note: "A CPU empilha o endereço de retorno; a ABI já entregou os argumentos.",
        blocks: [block("ret", "stack", "return address", "0x7ffe40f8", "8 B", "main+0x2a", "changed"), block("caller", "stack", "caller frame", "0x7ffe4100", "32 B", "main()")],
        state: { RIP: "sum+0x00", RSP: "0x7ffe40f8", RBP: "0x7ffe4120", ARG_A: "10", ARG_B: "20" }, metrics: { "stack usada": "40 B", "heap usada": "0 B", frames: "2" }
      },
      {
        line: 1, label: "prólogo abre o frame", note: "RBP antigo é preservado e RSP recua para locais, spills e alinhamento.",
        blocks: [block("local", "stack", "local", "0x7ffe40e4", "4 B", "não inicializado", "padding"), block("pad", "stack", "alignment / spill", "0x7ffe40e8", "8 B", "—", "padding"), block("rbp", "stack", "saved RBP", "0x7ffe40f0", "8 B", "0x7ffe4120", "changed"), block("ret", "stack", "return address", "0x7ffe40f8", "8 B", "main+0x2a"), block("caller", "stack", "caller frame", "0x7ffe4100", "32 B", "main()")],
        state: { RIP: "sum+0x06", RSP: "0x7ffe40e0", RBP: "0x7ffe40f0", ARG_A: "10", ARG_B: "20" }, metrics: { "stack usada": "72 B", "heap usada": "0 B", alignment: "16 B" }
      },
      {
        line: 2, label: "local recebe 30", note: "A soma pode ocorrer em registrador; este build didático materializa o resultado no frame.",
        blocks: [block("local", "stack", "local", "0x7ffe40e4", "4 B", "30", "changed"), block("pad", "stack", "alignment / spill", "0x7ffe40e8", "8 B", "—", "padding"), block("rbp", "stack", "saved RBP", "0x7ffe40f0", "8 B", "0x7ffe4120"), block("ret", "stack", "return address", "0x7ffe40f8", "8 B", "main+0x2a"), block("caller", "stack", "caller frame", "0x7ffe4100", "32 B", "main()")],
        state: { RIP: "sum+0x0d", RSP: "0x7ffe40e0", RBP: "0x7ffe40f0", EAX: "30", FLAGS: "ZF=0 SF=0" }, metrics: { "stack usada": "72 B", "heap usada": "0 B", "cache lines": "2" }
      },
      {
        line: 3, label: "epílogo restaura o caller", note: "O resultado permanece em EAX; saved RBP e return address conduzem a execução de volta.",
        blocks: [block("local", "stack", "local expirado", "0x7ffe40e4", "4 B", "30", "freed"), block("rbp", "stack", "saved RBP consumido", "0x7ffe40f0", "8 B", "0x7ffe4120", "freed"), block("ret", "stack", "return consumido", "0x7ffe40f8", "8 B", "main+0x2a", "freed"), block("caller", "stack", "caller frame", "0x7ffe4100", "32 B", "main()", "changed")],
        state: { RIP: "main+0x2a", RSP: "0x7ffe4100", RBP: "0x7ffe4120", EAX: "30", LIFETIME: "sum() encerrado" }, metrics: { "stack usada": "32 B", "heap usada": "0 B", frames: "1" },
        diagnostic: { tone: "ok", title: "Frame balanceado", detail: "RSP e RBP voltaram ao contrato do caller; nenhum endereço de local escapou." }
      }
    ]
  },
  {
    id: "heap-lifetime",
    label: "Lifetime no heap",
    description: "malloc, escrita, free e ponteiro pendente.",
    filename: "heap_lifetime.c",
    regionLabel: "STACK POINTER ↔ HEAP BLOCK",
    stateLabel: "ALLOCATOR / CPU",
    lines: ["int *p = malloc(4 * sizeof *p);", "p[0] = 7;", "free(p);", "p = NULL;"],
    invariants: ["O bloco pertence ao programa até exatamente um free.", "free encerra o lifetime, não apaga todos os ponteiros.", "NULL sinaliza ausência; não recupera um bloco já liberado."],
    steps: [
      {
        line: 1, label: "allocator encontra 16 bytes", note: "malloc arredonda a requisição, escolhe uma size class e devolve o início do payload.",
        blocks: [block("p", "stack", "p", "0x7ffe50f8", "8 B", "0x55556020", "changed"), block("hdr", "metadata", "chunk header", "0x55556010", "16 B", "size=32 | used", "changed"), block("buf", "heap", "int[4] payload", "0x55556020", "16 B", "? ? ? ?", "changed")],
        links: [{ from: "p", to: "buf", label: "owns / points", state: "valid" }], state: { RAX: "0x55556020", RSP: "0x7ffe50e0", REQUEST: "16 B", CLASS: "32 B" }, metrics: { solicitado: "16 B", reservado: "32 B", overhead: "16 B" }
      },
      {
        line: 2, label: "primeiro elemento recebe 7", note: "A CPU segue p e escreve quatro bytes no payload; metadata permanece fora do range.",
        blocks: [block("p", "stack", "p", "0x7ffe50f8", "8 B", "0x55556020"), block("hdr", "metadata", "chunk header", "0x55556010", "16 B", "size=32 | used"), block("buf", "heap", "int[4] payload", "0x55556020", "16 B", "7 ? ? ?", "changed")],
        links: [{ from: "p", to: "buf", label: "valid pointer", state: "valid" }], state: { RAX: "0x55556020", STORE: "[RAX] ← 7", RANGE: "0..3 valid", OWNER: "p" }, metrics: { solicitado: "16 B", inicializado: "4 B", "live blocks": "1" }
      },
      {
        line: 3, label: "free encerra o objeto", note: "O allocator marca o chunk reutilizável. p ainda contém o endereço, mas não autoriza acesso.",
        blocks: [block("p", "stack", "p (dangling)", "0x7ffe50f8", "8 B", "0x55556020", "danger"), block("hdr", "metadata", "free-list node", "0x55556010", "16 B", "size=32 | free", "changed"), block("buf", "heap", "payload liberado", "0x55556020", "16 B", "indeterminado", "freed")],
        links: [{ from: "p", to: "buf", label: "dangling", state: "dangling" }], state: { RAX: "—", FREE_LIST: "0x55556010", LIFETIME: "encerrado", ACCESS: "proibido" }, metrics: { solicitado: "0 B live", reutilizável: "32 B", "dangling ptrs": "1" },
        diagnostic: { tone: "warning", title: "Ponteiro pendente", detail: "O endereço numérico continua em p, mas qualquer leitura/escrita por ele seria use-after-free." }
      },
      {
        line: 4, label: "p é invalidado explicitamente", note: "Atribuir NULL remove este caminho acidental, embora aliases adicionais ainda precisassem ser controlados.",
        blocks: [block("p", "stack", "p", "0x7ffe50f8", "8 B", "NULL", "changed"), block("hdr", "metadata", "free-list node", "0x55556010", "16 B", "size=32 | free"), block("buf", "heap", "bloco disponível", "0x55556020", "16 B", "reutilizável", "freed")],
        state: { RAX: "0", FREE_LIST: "0x55556010", LIFETIME: "encerrado", ACCESS: "sem alias p" }, metrics: { solicitado: "0 B live", reutilizável: "32 B", "dangling ptrs": "0 conhecidos" },
        diagnostic: { tone: "ok", title: "Owner limpo", detail: "O bloco foi liberado uma vez e o owner local não aponta mais para ele." }
      }
    ]
  },
  {
    id: "escape",
    label: "Objeto que escapa",
    description: "Por que retornar heap funciona e retornar local não.",
    filename: "factory.c",
    regionLabel: "CALLER STACK + HEAP OWNERSHIP",
    stateLabel: "LIFETIME",
    lines: ["Record *make(void) {", "  Record *r = malloc(sizeof *r);", "  r->id = 42; return r;", "}", "Record *owned = make();", "free(owned);"],
    invariants: ["O pointer local pode morrer sem destruir o heap object.", "Ownership do retorno é documentado e transferido ao caller.", "Retornar &local seria inválido após o retorno."],
    steps: [
      { line: 1, label: "make abre um frame", note: "O frame contém apenas controle e o pointer local r.", blocks: [block("ret", "stack", "return address", "0x7ffe60f8", "8 B", "main+0x40"), block("r", "stack", "r", "0x7ffe60e8", "8 B", "não inicializado", "padding")], state: { FUNCTION: "make", RSP: "0x7ffe60e0", OWNER: "a definir" }, metrics: { stack: "32 B", heap: "0 B", "live objects": "0" } },
      { line: 2, label: "Record nasce no heap", note: "r guarda o endereço, mas o objeto possui lifetime independente do frame.", blocks: [block("ret", "stack", "return address", "0x7ffe60f8", "8 B", "main+0x40"), block("r", "stack", "r", "0x7ffe60e8", "8 B", "0x55557020", "changed"), block("record", "heap", "Record", "0x55557020", "16 B", "id=?")], links: [{ from: "r", to: "record", label: "temporary owner" }], state: { FUNCTION: "make", RAX: "0x55557020", OWNER: "r / return contract" }, metrics: { stack: "32 B", heap: "16 B live", "live objects": "1" } },
      { line: 3, label: "endereço retorna em RAX", note: "O frame será removido, mas o allocation continua mapeado e vivo.", blocks: [block("r", "stack", "r expirando", "0x7ffe60e8", "8 B", "0x55557020", "freed"), block("record", "heap", "Record", "0x55557020", "16 B", "id=42", "changed")], state: { FUNCTION: "return", RAX: "0x55557020", OWNER: "transferindo" }, metrics: { stack: "frame expirando", heap: "16 B live", "live objects": "1" } },
      { line: 5, label: "caller assume ownership", note: "owned recebe o endereço retornado; nenhum endereço de objeto da stack escapou.", blocks: [block("owned", "stack", "owned", "0x7ffe6120", "8 B", "0x55557020", "changed"), block("record", "heap", "Record", "0x55557020", "16 B", "id=42")], links: [{ from: "owned", to: "record", label: "owner", state: "valid" }], state: { FUNCTION: "main", RAX: "0x55557020", OWNER: "owned" }, metrics: { stack: "caller frame", heap: "16 B live", "live objects": "1" } },
      { line: 6, label: "caller encerra lifetime", note: "free usa o mesmo allocation e conclui o contrato de ownership.", blocks: [block("owned", "stack", "owned (stale)", "0x7ffe6120", "8 B", "0x55557020", "danger"), block("record", "heap", "Record liberado", "0x55557020", "16 B", "indeterminado", "freed")], links: [{ from: "owned", to: "record", label: "invalid after free", state: "dangling" }], state: { FUNCTION: "main", OWNER: "encerrado", ACCESS: "proibido" }, metrics: { stack: "caller frame", heap: "0 B live", "live objects": "0" }, diagnostic: { tone: "ok", title: "Transferência concluída", detail: "Factory e caller concordaram sobre quem libera o objeto e em qual momento." } }
    ]
  }
];

const allocatorScenarios: readonly ConceptScenario[] = [
  {
    id: "bump",
    label: "Bump allocator",
    description: "Alinhamento, cursor e reset de uma arena.",
    filename: "arena.cpp",
    regionLabel: "ARENA / 128 BYTES",
    stateLabel: "ALLOCATOR STATE",
    lines: ["Arena arena{buffer, 128};", "void *a = arena.alloc(24, 8);", "void *b = arena.alloc(32, 16);", "arena.reset();"],
    invariants: ["cursor alinhado + size nunca excede capacity.", "Blocos não se sobrepõem.", "reset só ocorre quando nenhum objeto da arena está vivo."],
    steps: [
      { line: 1, label: "arena começa vazia", note: "Uma região contígua foi obtida; used aponta ao primeiro byte ainda livre.", blocks: [block("free", "heap", "free span", "arena+0", "128 B", "available", "freed")], state: { BASE: "0x60000000", USED: "0", CAPACITY: "128", NEXT: "arena+0" }, metrics: { usado: "0 B", livre: "128 B", desperdício: "0 B" } },
      { line: 2, label: "a consome 24 bytes", note: "arena+0 já satisfaz alinhamento de 8; o cursor avança sem syscall ou busca em lista.", blocks: [block("a", "heap", "a", "arena+0", "24 B", "allocated", "changed"), block("free", "heap", "free span", "arena+24", "104 B", "available", "freed")], state: { BASE: "0x60000000", USED: "24", ALIGN: "8", NEXT: "arena+24" }, metrics: { usado: "24 B", livre: "104 B", padding: "0 B" } },
      { line: 3, label: "cursor alinhado para b", note: "O próximo múltiplo de 16 é arena+32; oito bytes viram padding e b ocupa 32 bytes.", blocks: [block("a", "heap", "a", "arena+0", "24 B", "allocated"), block("pad", "metadata", "alignment padding", "arena+24", "8 B", "unused", "padding"), block("b", "heap", "b", "arena+32", "32 B", "allocated", "changed"), block("free", "heap", "free span", "arena+64", "64 B", "available", "freed")], state: { USED: "64", ALIGN: "16", ALIGNED_CURSOR: "32", NEXT: "arena+64" }, metrics: { usado: "56 B payload", livre: "64 B", padding: "8 B" } },
      { line: 4, label: "reset invalida tudo", note: "O cursor volta à base em O(1); a e b deixam de designar objetos vivos.", blocks: [block("old-a", "heap", "a expirado", "arena+0", "24 B", "invalid", "freed"), block("old-b", "heap", "b expirado", "arena+32", "32 B", "invalid", "freed"), block("free", "heap", "free span", "arena+0", "128 B", "available", "changed")], state: { USED: "0", NEXT: "arena+0", GENERATION: "2", ACCESS_OLD: "proibido" }, metrics: { usado: "0 B", livre: "128 B", reset: "O(1)" }, diagnostic: { tone: "ok", title: "Arena reciclada", detail: "Reset em lote é rápido porque não percorre objetos, mas exige lifetime coletivo." } }
    ]
  },
  {
    id: "free-list",
    label: "Free list e coalescing",
    description: "Liberação, reutilização e fusão de vizinhos.",
    filename: "free_list.cpp",
    regionLabel: "HEAP CHUNKS / FREE LIST",
    stateLabel: "BINS / LINKS",
    lines: ["A = alloc(24); B = alloc(24); C = alloc(24);", "free(B);", "D = alloc(16);", "free(A); free(D);", "coalesce();"],
    invariants: ["Cada chunk está exatamente em um estado: used ou free.", "Free-list links apontam apenas para chunks livres válidos.", "Coalescing só combina intervalos fisicamente adjacentes."],
    steps: [
      { line: 1, label: "três chunks ocupados", note: "Headers guardam size/state; os payloads são contíguos na arena.", blocks: [block("a", "heap", "A", "0x61000010", "24 B", "used"), block("b", "heap", "B", "0x61000030", "24 B", "used"), block("c", "heap", "C", "0x61000050", "24 B", "used"), block("tail", "heap", "tail free", "0x61000070", "32 B", "free", "freed")], state: { FREE_HEAD: "tail", BIN_32: "tail", CHUNKS: "4" }, metrics: { payload: "72 B", livre: "32 B", headers: "32 B" } },
      { line: 2, label: "B entra na free list", note: "O payload de B pode virar links internos; pointers externos para B agora são inválidos.", blocks: [block("a", "heap", "A", "0x61000010", "24 B", "used"), block("b", "heap", "B / free node", "0x61000030", "24 B", "next=tail", "changed"), block("c", "heap", "C", "0x61000050", "24 B", "used"), block("tail", "heap", "tail free", "0x61000070", "32 B", "next=NULL", "freed")], links: [{ from: "b", to: "tail", label: "free next" }], state: { FREE_HEAD: "B", BIN_24: "B", BIN_32: "tail" }, metrics: { payload: "48 B live", livre: "56 B", "free chunks": "2" } },
      { line: 3, label: "D reutiliza B", note: "First-fit encontra B. O chunk de 24 B atende 16 B; oito bytes ficam como fragmentação interna.", blocks: [block("a", "heap", "A", "0x61000010", "24 B", "used"), block("d", "heap", "D", "0x61000030", "24 B class", "16 B payload", "changed"), block("c", "heap", "C", "0x61000050", "24 B", "used"), block("tail", "heap", "tail free", "0x61000070", "32 B", "free", "freed")], state: { FREE_HEAD: "tail", REQUEST: "16 B", SELECTED: "B class 24" }, metrics: { payload: "64 B live", livre: "32 B", "frag. interna": "8 B" } },
      { line: 4, label: "A e D ficam livres", note: "Os dois chunks livres são vizinhos e podem ser fundidos; C ainda interrompe o tail.", blocks: [block("a", "heap", "A free", "0x61000010", "24 B", "next=D", "freed"), block("d", "heap", "D free", "0x61000030", "24 B", "next=tail", "freed"), block("c", "heap", "C", "0x61000050", "24 B", "used"), block("tail", "heap", "tail free", "0x61000070", "32 B", "next=NULL", "freed")], links: [{ from: "a", to: "d", label: "adjacent free" }, { from: "d", to: "tail", label: "list next" }], state: { FREE_HEAD: "A", ADJACENT: "A + D", COALESCE: "pending" }, metrics: { payload: "24 B live", livre: "80 B", "free chunks": "3" } },
      { line: 5, label: "coalescing forma 48 bytes", note: "A+D vira um único intervalo; o tail continua separado por C.", blocks: [block("ad", "heap", "A+D free", "0x61000010", "48 B", "next=tail", "changed"), block("c", "heap", "C", "0x61000050", "24 B", "used"), block("tail", "heap", "tail free", "0x61000070", "32 B", "next=NULL", "freed")], links: [{ from: "ad", to: "tail", label: "free next" }], state: { FREE_HEAD: "A+D", LARGEST_FREE: "48 B", COALESCE: "complete" }, metrics: { payload: "24 B live", livre: "80 B", "free chunks": "2" }, diagnostic: { tone: "ok", title: "Lista consistente", detail: "A fusão reduziu metadata e aumentou o maior bloco disponível sem mover C." } }
    ]
  },
  {
    id: "fragmentation",
    label: "Fragmentação",
    description: "Espaço total suficiente, intervalo contínuo insuficiente.",
    filename: "fragmentation.cpp",
    regionLabel: "ARENA / FRAGMENTATION MAP",
    stateLabel: "ALLOCATION DECISION",
    lines: ["A=alloc(24); B=alloc(24); C=alloc(24); D=alloc(24);", "free(B); free(D);", "E = alloc(40);", "report_fragmentation();"],
    invariants: ["Total free não implica largest free suficiente.", "Fragmentação interna e externa são medidas separadas.", "Um allocator nunca sobrepõe live blocks para satisfazer uma requisição."],
    steps: [
      { line: 1, label: "arena quase cheia", note: "Quatro chunks de 24 B alternam payload e headers dentro de 128 B.", blocks: [block("a", "heap", "A", "arena+0", "24 B", "used"), block("b", "heap", "B", "arena+24", "24 B", "used"), block("c", "heap", "C", "arena+48", "24 B", "used"), block("d", "heap", "D", "arena+72", "24 B", "used"), block("tail", "heap", "tail", "arena+96", "32 B", "free", "freed")], state: { TOTAL: "128 B", LIVE: "96 B", LARGEST_FREE: "32 B" }, metrics: { livre: "32 B", "frag. externa": "0 B", ocupação: "75%" } },
      { line: 2, label: "buracos não adjacentes", note: "B e D são liberados. Há 80 B livres no total, porém C separa os intervalos.", blocks: [block("a", "heap", "A", "arena+0", "24 B", "used"), block("b", "heap", "B free", "arena+24", "24 B", "free", "freed"), block("c", "heap", "C", "arena+48", "24 B", "used"), block("dt", "heap", "D+tail free", "arena+72", "56 B", "free", "changed")], state: { TOTAL_FREE: "80 B", LARGEST_FREE: "56 B", LIVE: "48 B" }, metrics: { livre: "80 B", "free spans": "2", ocupação: "37.5%" } },
      { line: 3, label: "E de 64 B class falha", note: "A requisição de 40 B arredonda para a classe de 64 B; nenhum intervalo contínuo comporta.", blocks: [block("a", "heap", "A", "arena+0", "24 B", "used"), block("b", "heap", "B free", "arena+24", "24 B", "too small", "freed"), block("c", "heap", "C", "arena+48", "24 B", "used"), block("dt", "heap", "D+tail free", "arena+72", "56 B", "too small", "danger")], state: { REQUEST: "40 B", SIZE_CLASS: "64 B", RESULT: "nullptr", REASON: "largest < class" }, metrics: { "total free": "80 B", "largest free": "56 B", déficit: "8 B contiguous" }, diagnostic: { tone: "warning", title: "Fragmentação externa", detail: "Há bytes livres suficientes somados, mas não uma faixa contínua de 64 B sem mover um objeto vivo." } },
      { line: 4, label: "relatório separa as causas", note: "A solução pode ser outra size class, arena maior, compactação com handles ou mudança no padrão de lifetime.", blocks: [block("a", "heap", "A", "arena+0", "24 B", "used"), block("b", "heap", "free span #1", "arena+24", "24 B", "30% of free", "freed"), block("c", "heap", "C", "arena+48", "24 B", "used"), block("dt", "heap", "free span #2", "arena+72", "56 B", "70% of free", "freed")], state: { EXTERNAL_FRAGMENTATION: "30%", POLICY: "measure before change", RESULT: "request rejected safely" }, metrics: { "total free": "80 B", "largest free": "56 B", "live blocks": "2" } }
    ]
  }
];

const bugScenarios: readonly ConceptScenario[] = [
  {
    id: "overflow",
    label: "Overflow de array",
    description: "Uma escrita além do objeto alcança o vizinho.",
    filename: "overflow.c",
    regionLabel: "STACK / OBJECT BOUNDS",
    stateLabel: "SANITIZER / CPU",
    lines: ["int values[3] = {1, 2, 3};", "int guard = 0x12345678;", "for (int i=0; i<=3; ++i)", "  values[i] = 0;"],
    invariants: ["Índice válido satisfaz 0 ≤ i < 3.", "O range inteiro da store pertence a values.", "Um crash não é requisito para existir corrupção."],
    steps: [
      { line: 1, label: "objetos vizinhos", note: "O layout didático coloca values e guard próximos; o compilador real pode ordenar de outro modo.", blocks: [block("v", "stack", "values[3]", "0x7ffe7000", "12 B", "1, 2, 3"), block("guard", "stack", "guard", "0x7ffe700c", "4 B", "0x12345678")], state: { I: "—", VALID_RANGE: "0..2", STORE_WIDTH: "4 B" }, metrics: { writes: "0", "out-of-bounds": "0", corrupted: "0 B" } },
      { line: 4, label: "i=0..2 permanecem dentro", note: "Cada store de quatro bytes começa e termina dentro do array.", blocks: [block("v", "stack", "values[3]", "0x7ffe7000", "12 B", "0, 0, 0", "changed"), block("guard", "stack", "guard", "0x7ffe700c", "4 B", "0x12345678")], state: { I: "2", CHECK: "i <= 3 (bug)", NEXT: "i=3", BOUNDS: "ainda válido" }, metrics: { writes: "3", "out-of-bounds": "0", corrupted: "0 B" } },
      { line: 3, label: "condição aceita i=3", note: "O operador <= permite uma iteração a mais. values[3] começa exatamente após o array.", blocks: [block("v", "stack", "values[3]", "0x7ffe7000", "12 B", "0, 0, 0"), block("target", "metadata", "computed target", "0x7ffe700c", "4 B", "aliases guard", "danger"), block("guard", "stack", "guard", "0x7ffe700c", "4 B", "0x12345678")], links: [{ from: "target", to: "guard", label: "same address", state: "dangling" }], state: { I: "3", ADDRESS: "base + 3*4", BOUNDS: "violated", STORE: "pending" }, metrics: { writes: "3", "out-of-bounds": "1 pending", corrupted: "0 B" }, diagnostic: { tone: "warning", title: "Primeira violação", detail: "A aritmética do endereço já saiu do objeto antes mesmo da store ocorrer." } },
      { line: 4, label: "guard é corrompido", note: "A CPU conhece apenas endereço e largura; sem instrumentação, ela não sabe que o objeto lógico terminou.", blocks: [block("v", "stack", "values[3]", "0x7ffe7000", "12 B", "0, 0, 0"), block("guard", "stack", "guard CORRUPTED", "0x7ffe700c", "4 B", "0x00000000", "danger")], state: { I: "3", ADDRESS: "0x7ffe700c", ASAN: "stack-buffer-overflow", FIX: "i < 3" }, metrics: { writes: "4", "out-of-bounds": "1", corrupted: "4 B" }, diagnostic: { tone: "danger", title: "Stack buffer overflow", detail: "A quarta store alterou outro objeto. A correção é restaurar o limite, não aumentar arbitrariamente o array." } }
    ]
  },
  {
    id: "use-after-free",
    label: "Use-after-free",
    description: "Um endereço antigo passa a representar outro objeto.",
    filename: "uaf.c",
    regionLabel: "HEAP / TEMPORAL SAFETY",
    stateLabel: "ALLOCATOR / ASAN",
    lines: ["Node *stale = malloc(sizeof *stale);", "free(stale);", "User *user = malloc(sizeof *user);", "stale->value = 99;"],
    invariants: ["free encerra todas as permissões de acesso ao objeto.", "Reutilização do mesmo endereço não revive o tipo antigo.", "Ownership precisa invalidar ou controlar aliases."],
    steps: [
      { line: 1, label: "Node está vivo", note: "stale é um nome infeliz somente depois do free; neste ponto ele é um pointer válido.", blocks: [block("stale", "stack", "stale", "0x7ffe8008", "8 B", "0x62000020"), block("node", "heap", "Node", "0x62000020", "16 B", "value=1")], links: [{ from: "stale", to: "node", label: "valid" }], state: { OWNER: "stale", CHUNK: "used", TYPE: "Node" }, metrics: { "live blocks": "1", quarantine: "0", aliases: "1" } },
      { line: 2, label: "Node entra em quarantine/free", note: "O pointer local não é automaticamente modificado e vira dangling.", blocks: [block("stale", "stack", "stale (dangling)", "0x7ffe8008", "8 B", "0x62000020", "danger"), block("node", "heap", "freed Node", "0x62000020", "16 B", "poisoned", "freed")], links: [{ from: "stale", to: "node", label: "dangling", state: "dangling" }], state: { OWNER: "none", CHUNK: "free/quarantine", ACCESS: "forbidden" }, metrics: { "live blocks": "0", quarantine: "16 B", aliases: "1 dangling" }, diagnostic: { tone: "warning", title: "Temporal boundary", detail: "O bug nasce aqui: qualquer uso futuro de stale viola lifetime, mesmo que os bytes ainda pareçam intactos." } },
      { line: 3, label: "allocator reutiliza o endereço", note: "Sem quarantine neste modelo, a mesma size class satisfaz User no endereço antigo.", blocks: [block("stale", "stack", "stale (dangling)", "0x7ffe8008", "8 B", "0x62000020", "danger"), block("userptr", "stack", "user", "0x7ffe8010", "8 B", "0x62000020", "changed"), block("user", "heap", "User", "0x62000020", "16 B", "role=guest")], links: [{ from: "stale", to: "user", label: "wrong type", state: "dangling" }, { from: "userptr", to: "user", label: "valid" }], state: { OWNER: "user", CHUNK: "used", TYPE: "User", STALE_TYPE: "Node" }, metrics: { "live blocks": "1", reused: "1", "dangling aliases": "1" } },
      { line: 4, label: "stale escreve no User", note: "A store segue o endereço correto fisicamente, mas o objeto e o tipo autorizados são outros.", blocks: [block("stale", "stack", "stale", "0x7ffe8008", "8 B", "0x62000020", "danger"), block("userptr", "stack", "user", "0x7ffe8010", "8 B", "0x62000020"), block("user", "heap", "User CORRUPTED", "0x62000020", "16 B", "role/fields overwritten", "danger")], state: { STORE: "[stale] ← 99", ASAN: "heap-use-after-free", VICTIM: "User" }, metrics: { "invalid writes": "1", corrupted: "4 B", "live blocks": "1 damaged" }, diagnostic: { tone: "danger", title: "Heap use-after-free", detail: "O mesmo endereço agora pertence a User. A escrita antiga corrompeu um objeto novo e semanticamente diferente." } }
    ]
  },
  {
    id: "double-free",
    label: "Double free",
    description: "O mesmo allocation é devolvido duas vezes.",
    filename: "double_free.c",
    regionLabel: "HEAP / OWNERSHIP VIOLATION",
    stateLabel: "ALLOCATOR GUARD",
    lines: ["char *data = malloc(64);", "free(data);", "cleanup(data); // calls free again", "data = NULL;"],
    invariants: ["Cada allocation possui exatamente um owner responsável pelo release.", "Release acontece no máximo uma vez.", "Cleanup repetível exige estado que registre ausência."],
    steps: [
      { line: 1, label: "allocation tem um owner", note: "data referencia um chunk used de 64 bytes.", blocks: [block("data", "stack", "data", "0x7ffe9008", "8 B", "0x63000020"), block("chunk", "heap", "64-byte chunk", "0x63000020", "64 B", "used")], links: [{ from: "data", to: "chunk", label: "owner" }], state: { OWNER: "data", CHUNK: "used", FREE_COUNT: "0" }, metrics: { live: "64 B", free: "0 B", releases: "0" } },
      { line: 2, label: "primeiro free é válido", note: "O chunk sai do conjunto live e entra na estrutura de blocos disponíveis.", blocks: [block("data", "stack", "data (stale)", "0x7ffe9008", "8 B", "0x63000020", "danger"), block("chunk", "heap", "free-list chunk", "0x63000020", "64 B", "free", "freed")], links: [{ from: "data", to: "chunk", label: "stale", state: "dangling" }], state: { OWNER: "none", CHUNK: "free", FREE_COUNT: "1" }, metrics: { live: "0 B", free: "64 B", releases: "1" } },
      { line: 3, label: "segundo free é rejeitado", note: "Um allocator instrumentado detecta que o chunk já está livre e interrompe antes de corromper a lista.", blocks: [block("data", "stack", "data (stale)", "0x7ffe9008", "8 B", "0x63000020", "danger"), block("chunk", "heap", "already free", "0x63000020", "64 B", "duplicate release", "danger")], state: { OWNER: "none", CHUNK: "already free", FREE_COUNT: "2 attempted", ACTION: "abort / report" }, metrics: { live: "0 B", free: "64 B", "invalid releases": "1" }, diagnostic: { tone: "danger", title: "Double free detectado", detail: "Sem defesa, inserir o mesmo chunk novamente quebraria invariantes da free list. Ownership único evita a causa." } },
      { line: 4, label: "cleanup idempotente usa estado", note: "Invalidar o owner logo após o primeiro release permite que cleanup(NULL) não repita a devolução.", blocks: [block("data", "stack", "data", "0x7ffe9008", "8 B", "NULL", "changed"), block("chunk", "heap", "free-list chunk", "0x63000020", "64 B", "free", "freed")], state: { OWNER: "none", CHUNK: "free", FREE_COUNT: "1", CLEANUP: "idempotent" }, metrics: { live: "0 B", free: "64 B", "invalid releases": "0 after fix" }, diagnostic: { tone: "ok", title: "Contrato corrigido", detail: "RAII ou unique ownership torna o release único por construção; NULL é apenas a versão C local dessa política." } }
    ]
  },
  {
    id: "leak",
    label: "Memory leak",
    description: "Blocos vivos ficam inalcançáveis sem release.",
    filename: "leak.c",
    regionLabel: "HEAP / REACHABILITY",
    stateLabel: "LEAK DETECTOR",
    lines: ["for (int i=0; i<3; ++i) {", "  char *buffer = malloc(32);", "  use(buffer);", "} // pointer expires, block does not"],
    invariants: ["Todo allocation alcança um release em todos os paths.", "Perder o último pointer não libera o bloco.", "Crescimento é medido por live bytes ao longo do tempo."],
    steps: [
      { line: 2, label: "primeiro bloco alcançável", note: "buffer vive na iteração e aponta para um allocation de 32 B.", blocks: [block("p1", "stack", "buffer", "0x7ffea008", "8 B", "0x64000020"), block("b1", "heap", "block #1", "0x64000020", "32 B", "live")], links: [{ from: "p1", to: "b1", label: "reachable" }], state: { ITERATION: "0", LIVE_BLOCKS: "1", REACHABLE: "1" }, metrics: { "live bytes": "32 B", leaked: "0 B", allocations: "1" } },
      { line: 4, label: "primeiro pointer expira", note: "O bloco continua used no allocator, mas nenhuma raiz do programa consegue encontrá-lo.", blocks: [block("b1", "heap", "block #1 unreachable", "0x64000020", "32 B", "lost", "unreachable")], state: { ITERATION: "0 complete", LIVE_BLOCKS: "1", REACHABLE: "0" }, metrics: { "live bytes": "32 B", "definitely lost": "32 B", allocations: "1" }, diagnostic: { tone: "warning", title: "Primeiro leak", detail: "Lifetime do pointer e do heap allocation são independentes; sair do scope não chama free em C." } },
      { line: 2, label: "loop repete o padrão", note: "Novos blocos são criados; os anteriores permanecem contabilizados como used e inalcançáveis.", blocks: [block("b1", "heap", "block #1", "0x64000020", "32 B", "lost", "unreachable"), block("b2", "heap", "block #2", "0x64000050", "32 B", "lost", "unreachable"), block("p3", "stack", "buffer", "0x7ffea008", "8 B", "0x64000080"), block("b3", "heap", "block #3", "0x64000080", "32 B", "live", "changed")], links: [{ from: "p3", to: "b3", label: "reachable" }], state: { ITERATION: "2", LIVE_BLOCKS: "3", REACHABLE: "1" }, metrics: { "live bytes": "96 B", "definitely lost": "64 B", allocations: "3" } },
      { line: 4, label: "detector reporta 96 bytes", note: "Ao terminar o loop, todos os pointers locais expiraram e três allocations continuam sem owner.", blocks: [block("b1", "heap", "block #1 leaked", "0x64000020", "32 B", "unreachable", "unreachable"), block("b2", "heap", "block #2 leaked", "0x64000050", "32 B", "unreachable", "unreachable"), block("b3", "heap", "block #3 leaked", "0x64000080", "32 B", "unreachable", "unreachable")], state: { ITERATION: "complete", LIVE_BLOCKS: "3", REACHABLE: "0", FIX: "free or RAII" }, metrics: { "live bytes": "96 B", "definitely lost": "96 B", allocations: "3" }, diagnostic: { tone: "danger", title: "Leak confirmado", detail: "O processo ainda referencia os chunks internamente no allocator, mas a aplicação perdeu todos os caminhos para liberá-los." } }
    ]
  }
];

const tools: Readonly<Record<MemoryConceptToolId, ConceptTool>> = {
  "stack-heap": { label: "Stack / Heap", scenarios: stackHeapScenarios },
  allocator: { label: "Allocator", scenarios: allocatorScenarios },
  bugs: { label: "Memory bugs", scenarios: bugScenarios }
};

export function MemoryConceptWorkbench({ toolId }: { readonly toolId: MemoryConceptToolId }) {
  const tool = tools[toolId];
  const [scenarioId, setScenarioId] = useState(tool.scenarios[0]!.id);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const scenario = tool.scenarios.find((item) => item.id === scenarioId) ?? tool.scenarios[0]!;
  const step = scenario.steps[stepIndex] ?? scenario.steps[0]!;

  useEffect(() => {
    setScenarioId(tool.scenarios[0]!.id);
    setStepIndex(0);
    setPlaying(false);
  }, [tool]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setStepIndex((current) => {
      if (current >= scenario.steps.length - 1) { setPlaying(false); return current; }
      return current + 1;
    }), 1_700);
    return () => window.clearInterval(timer);
  }, [playing, scenario.steps.length]);

  function selectScenario(id: string) {
    setScenarioId(id);
    setStepIndex(0);
    setPlaying(false);
  }

  return (
    <Fragment>
      <section className="memory-workbench memory-concept-workbench">
        <aside className="scenario-panel">
          <div className="scenario-heading"><span>Scenarios</span><small>{String(tool.scenarios.length).padStart(2, "0")} loaded</small></div>
          {tool.scenarios.map((item, index) => (
            <button className="scenario-button" type="button" data-active={scenario.id === item.id} onClick={() => selectScenario(item.id)} key={item.id}>
              <span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.label}</strong><small>{item.description}</small></div>
            </button>
          ))}
          <div className="scenario-source">
            <header><span>{scenario.filename}</span><small>executable model</small></header>
            {scenario.lines.map((line, index) => <div data-active={step.line === index + 1} key={`${index}-${line}`}><span>{index + 1}</span><code>{line}</code></div>)}
          </div>
        </aside>

        <div className="memory-concept-viewport memory-concept-viewport-3d">
          <header className="memory-map-header"><span>{scenario.regionLabel}</span><small>{step.label}</small></header>
          <MemoryArchitectureScene blocks={step.blocks} links={step.links ?? []} toolId={toolId} stepKey={`${scenario.id}:${stepIndex}`} />
          <div className="step-callout concept-step-callout"><span>{String(stepIndex + 1).padStart(2, "0")}</span><div><strong>{step.label}</strong><p>{step.note}</p></div></div>
        </div>

        <aside className="inspector-panel concept-inspector">
          <header><span>{tool.label}</span><small>live model</small></header>
          <section className="inspector-section concept-object-list">
            <h3>3D objects</h3>
            {step.blocks.map((item) => <div data-state={item.state} key={item.id}><i /><span><strong>{item.label}</strong><small>{item.address} · {item.size}</small></span><code>{item.value}</code></div>)}
          </section>
          <section className="inspector-section registers-list">
            <h3>{scenario.stateLabel}</h3>
            {Object.entries(step.state).map(([name, value]) => <div key={name}><span>{name}</span><code>{value}</code></div>)}
          </section>
          <section className="inspector-section concept-metrics">
            <h3>Metrics</h3>
            {Object.entries(step.metrics).map(([name, value]) => <div key={name}><span>{name}</span><strong>{value}</strong></div>)}
          </section>
          {step.diagnostic ? <section className="memory-diagnostic" data-tone={step.diagnostic.tone}><AlertTriangle size={13} /><div><strong>{step.diagnostic.title}</strong><p>{step.diagnostic.detail}</p></div></section> : null}
          <section className="inspector-section concept-invariants">
            <h3>Invariants</h3>
            {scenario.invariants.map((invariant, index) => <p key={invariant}><span>0{index + 1}</span>{invariant}</p>)}
          </section>
        </aside>
      </section>

      <footer className="memory-controls">
        <div className="memory-transport">
          <button type="button" aria-label="Reiniciar cenário" onClick={() => { setStepIndex(0); setPlaying(false); }} title="Reiniciar"><RotateCcw size={13} /></button>
          <button type="button" aria-label="Etapa anterior" onClick={() => setStepIndex((value) => Math.max(0, value - 1))} disabled={stepIndex === 0}><ChevronLeft size={14} /></button>
          <button className="memory-play" type="button" onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}{playing ? "Pause" : "Run trace"}</button>
          <button type="button" aria-label="Próxima etapa" onClick={() => setStepIndex((value) => Math.min(scenario.steps.length - 1, value + 1))} disabled={stepIndex === scenario.steps.length - 1}><ChevronRight size={14} /></button>
        </div>
        <div className="memory-scrubber">
          {scenario.steps.map((item, index) => <button type="button" aria-label={`Ir para etapa ${index + 1}: ${item.label}`} data-active={index <= stepIndex} onClick={() => { setStepIndex(index); setPlaying(false); }} key={item.label}><i /><span>{item.label}</span></button>)}
        </div>
        <span className="memory-step-count">STEP {stepIndex + 1} / {scenario.steps.length}</span>
      </footer>
    </Fragment>
  );
}
