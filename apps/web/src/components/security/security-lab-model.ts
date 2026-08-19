export type SecurityLabView =
  | "corruption"
  | "compiler"
  | "fuzzing"
  | "analysis"
  | "malware"
  | "detection"
  | "challenges";

export const securityLabViews: readonly { id: SecurityLabView; label: string }[] = [
  { id: "corruption", label: "Memory Corruption" },
  { id: "compiler", label: "Compiler Mitigations" },
  { id: "fuzzing", label: "Fuzzing" },
  { id: "analysis", label: "Malware Analysis" },
  { id: "malware", label: "Behavior Simulator" },
  { id: "detection", label: "Mini EDR / YARA" },
  { id: "challenges", label: "Lab Challenges" }
];

export const BUFFER_SIZE = 8;
export const SLOT_RBP = 8;
export const SLOT_RET = 8;

export interface StackSlot {
  readonly id: string;
  readonly region: "buffer" | "saved-rbp" | "return-address";
  readonly index: number;
  readonly byte: string | null;
  readonly overwritten: boolean;
}

export interface OverflowModel {
  readonly input: string;
  readonly slots: readonly StackSlot[];
  readonly spilled: number;
  readonly rbpHit: boolean;
  readonly retHit: boolean;
  readonly asan: string | null;
}

export function simulateStackOverflow(input: string, secure: boolean): OverflowModel {
  const capacity = secure ? BUFFER_SIZE - 1 : BUFFER_SIZE;
  const copied = secure ? [...input].slice(0, Math.max(0, capacity)) : [...input];
  const slots: StackSlot[] = [];

  for (let index = 0; index < BUFFER_SIZE; index += 1) {
    const byte = copied[index] ?? null;
    slots.push({ id: `buf-${index}`, region: "buffer", index, byte, overwritten: byte !== null && index >= BUFFER_SIZE });
  }
  for (let index = 0; index < SLOT_RBP; index += 1) {
    const sourceIndex = BUFFER_SIZE + index;
    const byte = copied[sourceIndex] ?? null;
    slots.push({ id: `rbp-${index}`, region: "saved-rbp", index, byte, overwritten: byte !== null });
  }
  for (let index = 0; index < SLOT_RET; index += 1) {
    const sourceIndex = BUFFER_SIZE + SLOT_RBP + index;
    const byte = copied[sourceIndex] ?? null;
    slots.push({ id: `ret-${index}`, region: "return-address", index, byte, overwritten: byte !== null });
  }

  const spilled = Math.max(0, copied.length - BUFFER_SIZE);
  const rbpHit = copied.length > BUFFER_SIZE;
  const retHit = copied.length > BUFFER_SIZE + SLOT_RBP;
  const asan = spilled === 0
    ? null
    : `AddressSanitizer: stack-buffer-overflow\nWRITE of size ${copied.length} at lab_buffer[8]\n#0  memcpy-like copy in vulnerable\n#1  lab_main\nHINT  first illegal store is 1 byte past the object; this lab does not build a control-flow payload.`;

  return { input, slots, spilled, rbpHit, retHit, asan: secure ? null : asan };
}

export const compilerFlags = [
  { flag: "-fstack-protector-strong", covers: "canary no epílogo; overflow linear até o return address tende a ser detectado", binary: "símbolo __stack_chk_fail / cookie no frame", limit: "não corrige o bound; writes não lineares podem não tocar o canary" },
  { flag: "-fPIE -pie", covers: "imagem relocável para ASLR da base do executável", binary: "ELF ET_DYN / PE DLL characteristics DYNAMIC_BASE", limit: "vazamento de endereço reduz a entropia; o bug permanece" },
  { flag: "-D_FORTIFY_SOURCE=2", covers: "substitui algumas cópias por variantes que conhecem o tamanho do destino", binary: "chamadas *_chk quando o compilador vê o objeto", limit: "só ajuda quando o tamanho é visível em compile-time" },
  { flag: "-fsanitize=address", covers: "redzones e quarantine; primeira operação inválida vira relatório", binary: "runtime ASan ligado (build de teste)", limit: "instrumento de CI, não mitigação de release" },
  { flag: "-fsanitize=undefined", covers: "overflow signed, shift, type mismatch e outros UB", binary: "runtime UBSan", limit: "não detecta todas as classes de corrupção espacial" },
  { flag: "NX / DEP + W^X", covers: "páginas não executáveis para dados", binary: "GNU_STACK NX / PE NX_COMPAT", limit: "não impede corrupção de ponteiros já existentes" },
  { flag: "RELRO / CFG", covers: "GOT endurecido; destinos indiretos restritos quando o toolchain emite CFI/CFG", binary: "BIND_NOW / GuardFlags", limit: "não impede corrupção de dados nem todos os desvios válidos" }
] as const;

export interface FuzzCase {
  readonly id: string;
  readonly hex: string;
  readonly coverage: number;
  readonly crash: boolean;
  readonly note: string;
}

export const fuzzCorpus: readonly FuzzCase[] = [
  { id: "seed-ok", hex: "0005 48454C4C4F", coverage: 22, crash: false, note: "frame de 5 bytes HELLO — caminho feliz" },
  { id: "seed-empty", hex: "0000", coverage: 18, crash: false, note: "length zero válido" },
  { id: "mut-oversize", hex: "0080 41414141", coverage: 41, crash: true, note: "declared=128 > max_frame=64 — OOB na versão vulnerável" },
  { id: "mut-trunc", hex: "000A 4141", coverage: 27, crash: false, note: "declared 10, buffer curto — need_more" },
  { id: "min-crash", hex: "0041 00", coverage: 41, crash: true, note: "caso minimizado: length 65 dispara o mesmo ASan" }
];

export function parseLabFrame(bytes: Uint8Array, patched: boolean): { status: string; detail: string } {
  if (bytes.length < 2) return { status: "NEED_MORE", detail: "header u16be ausente" };
  const declared = (bytes[0]! << 8) | bytes[1]!;
  if (patched && declared > 64) return { status: "REJECT", detail: `declared=${declared} > max_frame=64` };
  if (bytes.length < 2 + declared) return { status: patched || declared <= 64 ? "NEED_MORE" : "CRASH", detail: `payload incompleto; declared=${declared}` };
  if (!patched && declared > 64) return { status: "CRASH", detail: `AddressSanitizer: heap-buffer-overflow READ declared=${declared} past 64-byte lab frame` };
  return { status: "OK", detail: `consumed ${2 + declared} bytes; payload ${declared} B` };
}

export const syntheticPe = {
  name: "lab-sample.exe",
  hash: "a3f1c0de000000000000lab0ffee0001",
  architecture: "x86-64",
  imageBase: "0x0000000140000000",
  entryPoint: "0x0000000140001000",
  flags: [
    { name: "ASLR", value: "yes", meaning: "IMAGE_DLLCHARACTERISTICS_DYNAMIC_BASE — bases relocáveis" },
    { name: "NX / DEP", value: "yes", meaning: "NX_COMPAT — seções de dados não executáveis" },
    { name: "CFG", value: "no", meaning: "Control Flow Guard ausente neste build educacional" },
    { name: "SafeSEH", value: "n/a", meaning: "relevante em x86; amostra é x64" },
    { name: "Signature", value: "unsigned", meaning: "laboratório não assina amostras sintéticas" }
  ],
  sections: [
    { name: ".text", entropy: "6.1", flags: "RX", note: "código; entropy moderada, sem packing" },
    { name: ".rdata", entropy: "4.4", flags: "R", note: "imports, strings FAKE_TOKEN_123" },
    { name: ".data", entropy: "3.2", flags: "RW", note: "config fictícia" }
  ],
  imports: [
    { dll: "KERNEL32.dll", name: "CreateFileW", legitimate: "abrir arquivo com path e acesso explícitos", labUse: "lê sandbox/config.fake" },
    { dll: "KERNEL32.dll", name: "ReadFile", legitimate: "I/O síncrono ou overlapped", labUse: "carrega JSON fictício" },
    { dll: "KERNEL32.dll", name: "WriteFile", legitimate: "persistir bytes próprios", labUse: "grava lab-log.txt na sandbox" },
    { dll: "KERNEL32.dll", name: "VirtualAlloc", legitimate: "reservar/commit VA do próprio processo", labUse: "buffer de frame do protocolo ECHO" },
    { dll: "KERNEL32.dll", name: "CreateThread", legitimate: "worker do próprio processo", labUse: "heartbeat PING a cada 2s simulados" },
    { dll: "WS2_32.dll", name: "connect", legitimate: "cliente TCP", labUse: "apenas 127.0.0.1:17447" }
  ],
  strings: [
    { kind: "URL", value: "http://127.0.0.1:17447/lab-c2", note: "endpoint isolado; nunca um domínio externo" },
    { kind: "Path", value: "sandbox/config.fake", note: "workspace temporário" },
    { kind: "Credential", value: "FAKE_TOKEN_123", note: "segredo artificial" },
    { kind: "Credential", value: "demo@example.local", note: "identidade fictícia" },
    { kind: "Message", value: "GET_VERSION", note: "comando benigno do protocolo educacional" }
  ]
} as const;

export const malwareTimeline = [
  { t: "00:00.000", event: "Process Start", api: "CreateProcess (lab)", detail: "lab-sample.exe PID 4242 — sandbox user, no host FS" },
  { t: "00:00.041", event: "LoadLibrary", api: "kernel32 / ws2_32", detail: "imports resolvidos pelo loader; não implica malícia" },
  { t: "00:00.082", event: "Config Read", api: "CreateFileW + ReadFile", detail: "sandbox/config.fake → interval=2s, mode=ECHO" },
  { t: "00:00.129", event: "File Created", api: "CreateFileW", detail: "sandbox/tmp/lab-agent.log" },
  { t: "00:00.210", event: "Local Connection", api: "connect 127.0.0.1:17447", detail: "C2 Simulator na netns isolada" },
  { t: "00:00.244", event: "Command", api: "PING → PONG", detail: "heartbeat educacional" },
  { t: "00:00.301", event: "Command", api: "ECHO lab", detail: "payload inofensivo ecoado" },
  { t: "00:00.331", event: "Exit", api: "ExitProcess", detail: "cleanup; nenhum artefato fora da sandbox" }
] as const;

export const c2Commands = ["PING", "GET_VERSION", "GET_STATUS", "CALCULATE", "ECHO"] as const;

export function runC2(command: string): string {
  if (command === "PING") return "PONG";
  if (command === "GET_VERSION") return "lab-agent/0.1 (educational)";
  if (command === "GET_STATUS") return "isolated=true net=loopback files=sandbox-only";
  if (command === "CALCULATE") return "4";
  if (command === "ECHO") return "lab-ok";
  return "REJECT unknown command — allowlist only";
}

export const fakeFiles = [
  { name: "document1.txt", state: "plain", note: "conteúdo: 'meeting notes (synthetic)'" },
  { name: "photo1.fake", state: "plain", note: "bytes placeholder; não é mídia real" },
  { name: "database.fake", state: "plain", note: "tabela demo_users com senhas FAKE_*" }
] as const;

export const fakeBrowserProfile = {
  username: "demo",
  token: "FAKE_TOKEN_123",
  password: "FAKE_PASSWORD",
  email: "demo@example.local"
} as const;

export const edrRules = [
  { id: "R1", name: "Local C2 allowlist", when: "connect dest != 127.0.0.1", action: "would-block (lab never attempts this)" },
  { id: "R2", name: "Fake secret touch", when: "ReadFile path contains config.fake AND string FAKE_TOKEN", action: "alert + timeline" },
  { id: "R3", name: "Sandbox write", when: "CreateFileW under sandbox/tmp", action: "informational" },
  { id: "R4", name: "API dual-use", when: "VirtualAlloc in lab-sample", action: "context only — not a verdict" }
] as const;

export const yaraRule = `rule LabSyntheticInfostealer {
  meta:
    author = "0xlab"
    purpose = "lab sample only"
  strings:
    $tok = "FAKE_TOKEN_123" ascii
    $mail = "demo@example.local" ascii
  condition:
    uint16(0) == 0x5A4D and all of them
}`;

export const challenges = [
  {
    id: "debug-frame",
    title: "The program crashes when receiving a packet larger than 64 bytes.",
    kind: "Debugging",
    prompt: "Encontre o bug no parser length-prefixed, reproduza o crash e aplique o patch.",
    reveal: "declared era usado sem comparar com max_frame=64. A correção rejeita length > 64 antes de qualquer cópia. Não há payload de exploit — só o bound."
  },
  {
    id: "re-success",
    title: "Descubra qual entrada faz o programa retornar SUCCESS.",
    kind: "Reverse engineering",
    prompt: "No crackme da plataforma, localize a função de comparação, a constante e o branch.",
    reveal: "lab_check compara com \"LAB-OK\". Gabarito intencional após a análise; inútil fora do laboratório."
  },
  {
    id: "patch-diff",
    title: "Compare v1 vulnerável e v2 patched.",
    kind: "Patch analysis",
    prompt: "Identifique a linha que restaura o bound e o teste de regressão que v1 falha e v2 rejeita.",
    reveal: "v2 introduz bounded_copy(dst, cap, src) e um teste com 32 A que não altera bytes além do objeto."
  }
] as const;

export const charter = [
  "Disposable sandbox: sem acesso ao host, FS temporário, rede externa bloqueada, CPU/RAM/timeout limitados, usuário sem privilégios.",
  "Dados fictícios apenas: demo@example.local, FAKE_PASSWORD, FAKE_TOKEN_123.",
  "Malware modules ensinam architecture, behavior, analysis, detection e mitigation — nunca comprometimento externo, credenciais reais, keylog global, persistência furtiva, evasão de AV/EDR, RAT ou dano."
] as const;
