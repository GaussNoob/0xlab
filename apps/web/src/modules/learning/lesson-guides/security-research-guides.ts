import { guide, type GuideMap } from "./types";

export const securityResearchGuides: GuideMap = {
  "sres-fundamentals": guide({
    thesis: "Segurança ofensiva educacional começa no contrato da linguagem: ponteiros, buffers, lifetime, permissões e APIs do sistema são os mesmos mecanismos que programas honestos usam — a vulnerabilidade nasce quando um invariante espacial, temporal ou de confiança é violado.",
    context: [
      "C e C++ expõem endereços, tamanhos e ownership ao programador. Um array, uma string, um FILE* ou um socket não carregam automaticamente o comprimento válido nem a autorização da operação seguinte.",
      "O laboratório estuda erros nesses componentes para diagnosticá-los e preveni-los. Não há alvo de terceiros: os binários, parsers e simuladores pertencem à plataforma e correm em sandbox descartável."
    ],
    flow: ["language object", "bytes and lifetime", "OS primitive", "trust boundary", "unsafe transition", "evidence"],
    topicNotes: {
      "C memory model": "Objeto, endereço, tamanho, alinhamento e lifetime precisam coincidir. A CPU executa loads/stores; ela não conhece o tipo C. Um ponteiro válido é um intervalo vivo com permissão compatível, não um número que 'parece endereço'.",
      "unsafe APIs": "strcpy, gets, sprintf e memcpy sem comprimento derivado do destino transferem a responsabilidade do bound para o caller. O perigo não é a API existir — é o contrato de tamanho estar implícito ou errado.",
      "processes and privileges": "Processo, thread, token/uid e capabilities definem o que o código pode tocar. Least privilege reduz o impacto de um bug; um processo superuser transforma corrupção local em incidente de sistema.",
      "sockets and files": "Arquivos, sockets e pipes entregam bytes sem autenticar intenção. Qualquer parser à frente de recv/read precisa de framing, limites e um estado que sobreviva a I/O parcial.",
      "trust boundaries": "A fronteira muda quando dados cruzam rede, arquivo, IPC, plugin ou usuário. Validação e autorização pertencem ao lado que não confia no remetente; autenticar uma conexão não valida o conteúdo."
    },
    code: {
      language: "c",
      filename: "unsafe-vs-bounded.c",
      source: `enum { CAP = 8 };

void unsafe_copy(char *dst, const char *src) {
    strcpy(dst, src); /* dst não declara o limite */
}

void bounded_copy(char *dst, size_t cap, const char *src) {
    if (cap == 0) return;
    size_t n = strnlen(src, cap);
    if (n == cap) n = cap - 1;
    memcpy(dst, src, n);
    dst[n] = '\\0';
}

/* Open in Low-Level Lab: compare stack, RSP e o primeiro byte além de CAP. */`,
      explanation: "O destino precisa carregar capacidade. strnlen+memcpy+NUL explícito torna o bound visível; strcpy esconde o comprimento no conteúdo da origem."
    },
    mechanics: [
      { title: "Nomear o objeto", detail: "Identifique storage, tamanho, owner e quem pode escrever." },
      { title: "Marcar a fronteira", detail: "Separe dado confiável de input, arquivo, socket ou argumento de CLI." },
      { title: "Exigir o bound", detail: "Toda cópia, índice e alocação deriva capacidade do destino, não da origem." },
      { title: "Observar a falha", detail: "Sanitizer, debugger e visualizador mostram a primeira operação inválida, não o crash distante." }
    ],
    invariants: [
      "Cada acesso cabe no objeto vivo e alinhado.",
      "Toda API de cópia recebe capacidade do destino.",
      "Exercícios usam artefatos próprios e sandbox isolada."
    ],
    pitfalls: [
      { title: "Tratar API como maliciosa", detail: "CreateFile, recv e malloc são primitivas honestas. O abuso está no contrato, não no nome da função." },
      { title: "Estudar só o crash", detail: "O crash é um sintoma. A aula termina quando a propriedade violada e a correção estrutural estão evidentes." }
    ],
    practice: {
      prompt: "Mapeie a superfície de um CLI próprio que lê um arquivo e ecoa bytes.",
      tasks: ["Liste objetos de memória, FDs/HANDLEs e a origem de cada comprimento.", "Substitua uma cópia unbounded por uma bounded e prove com ASan.", "Abra o mesmo exemplo no Low-Level Lab e anote RSP antes/depois."],
      evidence: "Diagrama objeto→bound→fronteira, diff da correção e trace ASan do caso hostil controlado."
    }
  }),

  "sres-corruption": guide({
    thesis: "Corrupção de memória é a quebra de um invariante espacial (fora do objeto) ou temporal (objeto já morto). Exploração de terceiros não é necessária: o laboratório visualiza a região afetada, o crash, o assembly e a versão segura.",
    context: [
      "Stack overflow, heap overflow, OOB, UAF, double free, dangling pointer, integer overflow e format string alteram bytes que a operação não possui. Layout e allocator decidem o sintoma; a causa é o contrato.",
      "A sequência pedagógica é fixa: código vulnerável → visualização → crash/sanitizer → debugger → assembly → root cause → mitigação → versão segura. Mitigações elevam custo; não substituem a correção."
    ],
    flow: ["vulnerable primitive", "bounds or lifetime break", "affected region", "detector", "root cause", "secure rewrite"],
    topicNotes: {
      "stack overflow": "Um buffer automático seguido de saved frame pointer e return address. Bytes além da capacidade invadem o frame na simulação educacional. A lição mostra quais slots seriam afetados e como bounds checking impede a escrita.",
      "heap overflow": "O chunk adjacente, metadata do allocator ou outro objeto pode ser atingido. ASan quarantine e redzones tornam a primeira escrita inválida visível antes de um crash misterioso.",
      "use-after-free": "Free/delete encerra o direito de uso. O endereço numérico pode ser reutilizado; sanitizers atrasam reuse para transformar o bug em relatório em vez de corrupção silenciosa.",
      "integer overflow": "Multiplicar nmemb*size ou somar offset+len pode wrapear. O bound precisa ser checado antes da aritmética, não depois de um malloc com tamanho errado.",
      "format string": "printf(user) interpreta a origem como formato. %n e leitura de stack são classes históricas; a correção é formato constante e argumentos tipados."
    },
    code: {
      language: "c",
      filename: "stack-overflow-lab.c",
      source: `void vulnerable(const char *input) {
    char buffer[8];
    strcpy(buffer, input); /* educational defect */
}

void secure(const char *input) {
    char buffer[8];
    bounded_copy(buffer, sizeof buffer, input);
}

/* Educational stack model (x86-64):
 *   [ buffer[8] ]
 *   [ saved RBP ]
 *   [ return address ]
 * Input "AAAAAAAAAAAAAAAA" would spill past buffer in this model.
 * ASan reports the first OOB store; the fix restores the bound. */`,
      explanation: "A visualização educacional marca buffer, RBP salvo e endereço de retorno. O objetivo é ver a região e impedir a escrita — não construir payload de controle de fluxo."
    },
    mechanics: [
      { title: "Reproduzir", detail: "Input mínimo que dispara sanitizer ou crash no binário de laboratório." },
      { title: "Visualizar", detail: "Marque objeto, redzone, frame e o primeiro byte fora do range." },
      { title: "Classificar", detail: "Separe erros espaciais, temporais, inteiros derivados e de formato antes de escolher o detector." },
      { title: "Corrigir", detail: "Mude o contrato (capacidade, ownership, formato) e adicione regressão." }
    ],
    invariants: [
      "A primeira operação inválida é identificada, não só o crash final.",
      "A correção elimina a classe, não apenas aumenta o buffer.",
      "Nenhum exercício usa software de terceiros como alvo."
    ],
    pitfalls: [
      { title: "Aumentar o buffer", detail: "Margem extra desloca o limite se o comprimento continuar vindo da origem." },
      { title: "Confundir crash com exploit", detail: "Crash prova violação. Controle de RIP exigiria um payload ofensivo, que este laboratório não fornece." }
    ],
    practice: {
      prompt: "Diagnostique o overflow de 8 bytes no Security Lab e publique a versão segura.",
      tasks: ["Preencha o visualizador até invadir saved RBP e descreva o efeito no modelo.", "Capture o relatório ASan ou o crash do sandbox.", "Implemente bounded_copy e um teste que a entrada longa não altera bytes fora do objeto."],
      evidence: "Screenshot do frame, stack trace, diff da correção e teste de regressão."
    }
  }),

  "sres-mitigations": guide({
    thesis: "Mitigações modernas aumentam o custo de transformar corrupção em controle, mas não restauram bounds nem lifetime. O Secure Compiler Lab mostra o impacto de flags no binário, no assembly e no runtime.",
    context: [
      "ASLR, NX/DEP, canaries, PIE, RELRO, CFG/CFI, SafeSEH, FORTIFY e sanitizers atacam classes diferentes. Uma flag ausente no link final ou em uma dependência reduz a cobertura real.",
      "O laboratório permite ligar e desligar proteções em programas próprios para comparar disassembly, headers e o relatório do sanitizer — nunca para treinar bypass de produtos reais."
    ],
    flow: ["threat class", "mitigation", "compiler/linker flag", "binary property", "runtime effect", "residual risk"],
    topicNotes: {
      ASLR: "Randomiza bases de imagem, heap e stack quando o binário é relocável. Vazamento de endereço reduz a entropia. ASLR não impede a escrita fora do objeto.",
      "NX and DEP": "Páginas não são simultaneamente graváveis e executáveis no modelo W^X. Impedem execução trivial de dados, não corrupção de ponteiros já existentes.",
      "stack canaries": "Um valor secreto entre buffer e metadados do frame é conferido no epílogo. Overflow linear até o return address costuma ser detectado; writes precisas e leaks mudam o jogo.",
      "PIE RELRO CFG": "PIE habilita randomização da imagem; RELRO endurece GOT/relocations; CFG/CFI restringe destinos indiretos. Cada uma cobre um mecanismo distinto de desvio.",
      sanitizers: "ASan, UBSan, LSan e TSan transformam UB e corrupção em relatórios. São instrumentos de desenvolvimento e CI, não um substituto de mitigação de produção."
    },
    code: {
      language: "text",
      filename: "secure-flags.txt",
      source: `cc -O1 -fstack-protector-strong -fPIE -pie \\
   -D_FORTIFY_SOURCE=2 -Wl,-z,relro,-z,now \\
   -fsanitize=address,undefined lab.c -o lab

checksec-style (educational):
  PIE        yes
  NX         yes
  Canary     yes (strong)
  RELRO      full
  FORTIFY    2
  ASan/UBSan test build only`,
      explanation: "Inspecione o artefato: headers, symbols, mappings e o relatório do sanitizer. Uma flag de compile que some no link não protege o processo."
    },
    mechanics: [
      { title: "Classificar", detail: "Associe a mitigação à classe: execução de dados, randomização, integridade de frame, relocations, CFI, detecção em teste." },
      { title: "Compilar", detail: "Gere dois artefatos do mesmo source com conjuntos de flags diferentes." },
      { title: "Inspecionar", detail: "Compare assembly do prólogo/epílogo, DYNAMIC, sections e check de propriedades." },
      { title: "Limitar", detail: "Documente o que a mitigação não cobre e qual correção de código permanece obrigatória." }
    ],
    invariants: [
      "Toda mitigação tem uma classe-alvo e uma limitação explícita.",
      "O artefato inspecionado é o mesmo que o laboratório executa.",
      "Sanitizers pertencem ao ciclo de teste; hardening de release é verificado no binário final."
    ],
    pitfalls: [
      { title: "Mitigação como correção", detail: "Canary que dispara ainda deixa um bug. Corrija o bound." },
      { title: "Assumir cobertura total", detail: "Uma biblioteca ligada sem PIE ou com RELRO parcial enfraquece o processo inteiro." }
    ],
    practice: {
      prompt: "Compile o overflow educacional com e sem -fstack-protector-strong e ASan.",
      tasks: ["Compare o epílogo no Compiler Lab.", "Descreva o que o canary detecta e o que o ASan aponta primeiro.", "Liste residual risk se apenas ASLR estiver ativo."],
      evidence: "Dois disassemblies, propriedades do binário e um parágrafo attacker/defender/developer."
    }
  }),

  "sres-fuzzing": guide({
    thesis: "Fuzzing é um oráculo contínuo contra software próprio: gera, muta e reproduz entradas até um detector — sanitizer, timeout ou assert — apontar a primeira violação.",
    context: [
      "Mutation fuzzing altera um corpus; coverage-guided privilegia entradas que abrem edges novos. Minimização reduz o caso até o menor input que ainda falha, virando regressão.",
      "libFuzzer e AFL++ são conceitos e ferramentas para alvos da plataforma. O parser vulnerável do laboratório existe para ser quebrado e depois endurecido — não para atacar serviços externos."
    ],
    flow: ["seed corpus", "mutate", "execute harness", "coverage or crash", "minimize", "root cause and patch"],
    topicNotes: {
      "mutation fuzzing": "Bit flips, arithmetic, splicing e dictionaries exploram formatos. Sem um harness determinístico, o mesmo input não reproduz o crash.",
      "coverage-guided": "Instrumentação marca edges; entradas que descobrem caminhos novos entram no corpus. Cobertura não prova correção, só explora mais o parser.",
      corpus: "Seeds válidos, quase-válidos e casos históricos de crash. Um corpus morto (tudo rejeitado no primeiro byte) desperdiça ciclos.",
      "crash triage": "Deduplique por stack hash, classifique ASan/UBSan/timeout, minimize e anote o invariante quebrado antes de discutir 'exploitabilidade'.",
      "harness design": "LLVMFuzzerTestOneInput deve ser puro, limitado e sem rede. Limites de frame, profundidade e campos pertencem ao parser, não ao fuzzer."
    },
    code: {
      language: "cpp",
      filename: "fuzz-lab-parser.cpp",
      source: `struct Limits { size_t max_frame = 64; };

ParseResult parse_lab_frame(std::span<const uint8_t> in, Limits lim) {
    if (in.size() < 2) return ParseResult::need_more();
    uint16_t declared = (uint16_t(in[0]) << 8) | in[1];
    if (declared > lim.max_frame) return ParseResult::error("frame too large");
    if (in.size() < size_t(2) + declared) return ParseResult::need_more();
    return ParseResult::ok(in.subspan(2, declared));
}

extern "C" int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    (void)parse_lab_frame({data, size}, Limits{});
    return 0;
}`,
      explanation: "A versão inicial do laboratório omite o check de declared; o fuzzer encontra o crash, ASan aponta a leitura, o patch restaura o limite e o caso entra no corpus."
    },
    mechanics: [
      { title: "Isolar", detail: "O harness chama só o parser, com estado resetado e sem sockets, relógio ou filesystem." },
      { title: "Detectar", detail: "ASan, UBSan, asserts e timeouts funcionam como oráculos do mesmo input." },
      { title: "Minimizar", detail: "Preserve o crash com o menor input que ainda reproduz a mesma stack." },
      { title: "Regredir", detail: "O caso minimizado entra na suíte permanente e volta a falhar se o patch regredir." }
    ],
    invariants: [
      "O parser termina dentro do budget para qualquer input.",
      "Crashes são reproduzíveis sem rede e sem relógio.",
      "O alvo é sempre um programa da plataforma."
    ],
    pitfalls: [
      { title: "Fuzzar o processo inteiro primeiro", detail: "Comece na função pura; suba camadas depois." },
      { title: "Descartar timeouts", detail: "Hang é um achado de DoS algorítmico; limite profundidade e tempo." }
    ],
    practice: {
      prompt: "Fuzze o parser de 64 bytes do Security Lab até o crash e corrija.",
      tasks: ["Rode o harness simulado e capture o input minimizado.", "Explique o relatório ASan (OOB read/write).", "Aplique o limite declared <= max_frame e prove que o caso agora é rejeitado."],
      evidence: "Input hex, stack ASan, patch e teste de regressão no corpus."
    }
  }),

  "sres-binary": guide({
    thesis: "Binary security educacional ensina a ler o frame, o ponteiro de instrução e o crash como evidência de um contrato quebrado — em binários que a própria plataforma compilou.",
    context: [
      "Calling convention, prólogo, epílogo, saved RBP e endereço de retorno explicam por que um overflow de stack é visível no modelo. O laboratório mostra controle de fluxo como conceito, não como receita de hijack.",
      "Patch analysis compara v1 vulnerável e v2 corrigida em source, assembly e comportamento. O aluno identifica a correção; não produz exploit para o binário antigo."
    ],
    flow: ["source", "ABI frame", "corruption site", "crash/RIP evidence", "v1 versus v2", "secure rewrite"],
    topicNotes: {
      "stack frames": "Prólogo salva RBP e alinha RSP; locais ficam em offsets negativos. O return address está acima do frame. Visualize slots, não invente payloads.",
      "control flow": "call/ret, jumps e chamadas indiretas implementam o grafo. Corrupção de um endereço salvo pode, em tese, desviar RIP; mitigações e a política do lab param na detecção.",
      "crash analysis": "O crash report aponta o acesso inválido, não necessariamente a atribuição culpada. Combine RIP, operandos, mapa e o primeiro store OOB.",
      "patch comparison": "Diff de source, de assembly e de testes. Uma correção real muda o contrato (check, tamanho, ownership), não só constantes mágicas.",
      "secure rewrite": "Bounds, RAII, formato constante, aritmética verificada e testes hostis. A versão segura deve falhar fechado e registrar o rejeite."
    },
    code: {
      language: "asm",
      filename: "frame-model.asm",
      source: `vulnerable:
    push rbp
    mov  rbp, rsp
    sub  rsp, 16          ; buffer[8] + pad
    ; strcpy-like copy into [rbp-8]
    leave
    ret                   ; pops return address

; Educational observation:
; bytes beyond [rbp-8 .. rbp-1] collide with saved RBP / ret in this model.
; Secure rewrite keeps the store inside the object and never trains RIP hijack.`,
      explanation: "Leia o frame com a ABI do alvo (System V ou Windows x64). A evidência é o store fora do objeto; a correção é o bound."
    },
    mechanics: [
      { title: "Reconstruir o frame", detail: "Anote offsets, registradores salvos, alinhamento e o slot do endereço de retorno na ABI alvo." },
      { title: "Congelar o crash", detail: "Registre RIP, RSP, a região tocada e a instrução que fez o acesso inválido." },
      { title: "Comparar patch", detail: "Diff v1/v2 em source, assembly e testes; a correção real muda o contrato, não o nome." },
      { title: "Reescrever", detail: "Aplique bound, ownership, regressão e flags de hardening no mesmo binário de laboratório." }
    ],
    invariants: [
      "O alvo é um binário gerado pelo laboratório.",
      "A análise documenta observação versus inferência.",
      "Nenhum material ensina bypass de mitigações de produtos reais."
    ],
    pitfalls: [
      { title: "Ler RIP como prova de exploit", detail: "RIP no crash mostra onde a CPU parou. Sem payload, não há controle demonstrado — e não deve haver." },
      { title: "Patch cosmético", detail: "Renomear funções não corrige strcpy unbounded." }
    ],
    practice: {
      prompt: "Compare v1/v2 do overflow educacional no Low-Level Lab.",
      tasks: ["Anote offsets do buffer e do return slot no modelo.", "Explique o crash sem propor payload.", "Identifique a linha do patch que restaura o bound."],
      evidence: "Frame anotado, dois listings e o teste que v1 falha e v2 rejeita."
    }
  }),

  "sres-windows": guide({
    thesis: "No Windows, malware e software legítimo compartilham as mesmas APIs. A aula ensina o uso honesto, o motivo de analistas observarem essas chamadas e os artefatos que um defensor procura — sem persistência furtiva no host.",
    context: [
      "CreateProcess, VirtualAlloc, CreateFile, LoadLibrary e GetProcAddress são o sistema operacional. Um import não classifica o binário; o contexto, a sequência e o objeto alvo classificam o comportamento.",
      "Persistência (Run keys, serviços, scheduled tasks) é estudada pelos artefatos e pela remoção. Process injection é modelo A→memória→B em processos da sandbox, com payload benigno ou puramente simulado."
    ],
    flow: ["Win32 call", "ntdll / Native API", "kernel object", "observable artifact", "defender telemetry", "response"],
    topicNotes: {
      "Win32 dual use": "A mesma API serve instalador, debugger e amostra sintética. Ensine o contrato: retorno, GetLastError, ownership do HANDLE e o objeto do kernel por trás.",
      "PE security flags": "DLL characteristics registram ASLR, NX, CFG, High Entropy VA. Assinatura, sections e entropy são pistas; packed ≠ malicioso automaticamente.",
      "persistence artifacts": "Startup, serviços, tasks e registry são locais clássicos. O laboratório mostra como detectar, quais chaves/arquivos aparecem e como remover com segurança — nunca instala persistência no sistema real.",
      "process injection theory": "O modelo é processo A alterando memória de B. APIs envolvidas são descritas arquiteturalmente. Demonstrações usam processos filhos da sandbox e buffers inofensivos, com ênfase em detecção.",
      "tokens and privileges": "O token carrega identidade e privileges. Impersonation e elevation são mecanismos do SO; o lab observa SeDebugPrivilege e equivalentes como sinais, não como kit de ataque."
    },
    code: {
      language: "cpp",
      filename: "dual-use-apis.cpp",
      source: `/* Legitimate lab tool: map a PE and list imports. */
HANDLE file = CreateFileW(path, GENERIC_READ, FILE_SHARE_READ,
                          nullptr, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
if (file == INVALID_HANDLE_VALUE) return GetLastError();

/* Dual-use reminder:
 * CreateFileW also aparece em infostealers sintéticos que leem FAKE_TOKEN.
 * Mini EDR correlaciona API + path + processo pai — não o nome da API sozinho. */`,
      explanation: "Instrumente a chamada, o path e o processo. A detecção vive na sequência e no alvo, não numa blacklist ingênua de imports."
    },
    mechanics: [
      { title: "Contrato Win32", detail: "Valide retorno, GetLastError, ownership do HANDLE e o CloseHandle correspondente." },
      { title: "Objeto", detail: "Siga a chamada até o objeto de processo, arquivo, section ou chave no modelo do kernel." },
      { title: "Artefato", detail: "Registre o que permanece em disco simulado, registry educacional ou telemetria da sandbox." },
      { title: "Detecção", detail: "A regra do Mini EDR observa eventos do laboratório e explica por que não é veredito automático." }
    ],
    invariants: [
      "Nenhuma persistência é escrita no host real.",
      "Injection, se demonstrada, fica entre processos da sandbox.",
      "Imports são interpretados com contexto, nunca como veredito."
    ],
    pitfalls: [
      { title: "Blacklist de API", detail: "VirtualAlloc é alocação. O analista pergunta tamanho, proteção, conteúdo e quem escreveu." },
      { title: "Persistência como exercício de stealth", detail: "O objetivo é achar e remover artefatos, não escondê-los." }
    ],
    practice: {
      prompt: "Analise o PE sintético no Security Lab e escreva uma regra EDR para CreateFileW em path fictício.",
      tasks: ["Liste flags ASLR/NX/CFG e explique cada uma.", "Anote imports e um uso legítimo versus um uso na amostra sintética.", "Crie uma regra que dispara no path FAKE e não em notepad da sandbox."],
      evidence: "Relatório PE, tabela API→contexto e alerta do Mini EDR com timeline."
    }
  }),

  "sres-linux": guide({
    thesis: "No Linux, a cadeia C → libc → syscall → kernel deixa evidência em /proc, maps, descritores e logs. Capabilities, seccomp e artefatos de cron/systemd são lidos como contenção e investigação.",
    context: [
      "ELF e VMAs explicam o que está mapeado e com quais permissões. W^X, RELRO e PIE aparecem no binário e em /proc/self/maps.",
      "cron, systemd user units e rc files são pontos clássicos de persistência. O curso prioriza detecção, artefatos e remoção em laboratório — não a instalação furtiva no host."
    ],
    flow: ["C call", "libc wrapper", "syscall", "kernel object", "/proc evidence", "containment"],
    topicNotes: {
      "ELF and mappings": "Program headers PT_LOAD viram VMAs. Compare flags PF_R/W/X com maps. PIE aparece como base não fixa.",
      capabilities: "Capabilidades fatiam root. Um parser não precisa de CAP_NET_ADMIN. Drop e bounding set são controles verificáveis.",
      "proc evidence": "pid, exe, maps, fds, status e environ (com cuidado de secrets) contam a história do processo vivo.",
      "cron systemd artifacts": "Timers, units e crontab deixam arquivos e logs. Investigue origem, hash e comando; remova com o mesmo rigor de change control.",
      seccomp: "Filtro de syscalls reduz a superfície após o parser arriscado. Comece allowlist mínima e meça quebras esperadas."
    },
    code: {
      language: "text",
      filename: "linux-evidence.txt",
      source: `C        read(fd, buf, n)
libc     syscall wrapper, errno
kernel   fget, permission, VFS
evidence /proc/PID/fd → socket:[inode]
         /proc/PID/maps → permissions
         strace -yy    → decoded args

Containment: user namespace + seccomp + read-only rootfs (lab sandbox).`,
      explanation: "Correlacione retorno, errno, fd e maps. A sandbox da plataforma já aplica net=none, caps drop e filesystem temporário."
    },
    mechanics: [
      { title: "Identificar a syscall", detail: "Correlacione o wrapper da libc com strace/ltrace e os argumentos realmente passados ao kernel." },
      { title: "Ler /proc", detail: "Use maps, fd, exe e status do processo de laboratório como evidência, não o nome em ps." },
      { title: "Inspecionar ELF", detail: "Confira program headers, permissões de VMA, PIE e RELRO no artefato que o lab executa." },
      { title: "Conter", detail: "Aplique seccomp allowlist e drop de capabilities no perfil já isolado da sandbox." }
    ],
    invariants: [
      "Evidência vem de artefatos do processo de laboratório.",
      "Persistência não é aplicada ao sistema do aluno.",
      "seccomp é allowlist justificada, não teatro."
    ],
    pitfalls: [
      { title: "Confiar só em ps", detail: "Nome do processo é trivial de mudar; maps e exe são mais honestos." },
      { title: "seccomp depois do parser hostil", detail: "O trabalho perigoso precisa já estar no processo filtrado." }
    ],
    practice: {
      prompt: "Documente maps e fds do servidor educacional isolado.",
      tasks: ["Marque regiões RX/RW e a ausência de RWX.", "Liste fds e o peer loopback.", "Proponha três syscalls que o parser não deveria ter."],
      evidence: "Trechos de maps, strace anotado e rascunho de perfil seccomp."
    }
  }),

  "sres-network": guide({
    thesis: "Bytes de rede são um programa para o parser. Segurança vem de gramática, limites, autenticação e um peer que existe só na rede isolada da sandbox.",
    context: [
      "Ethernet, IPv4, TCP/UDP e HTTP são dissecados byte a byte a partir de capturas sintéticas da plataforma. Bugs intencionais de length e integer overflow existem para fuzzing e correção.",
      "O 'C2' do laboratório é um protocolo educacional (PING, GET_VERSION, ECHO, CALCULATE) entre agent e servidor locais. Não há controle de máquinas externas nem canais furtivos."
    ],
    flow: ["synthetic bytes", "bounded parse", "authenticated state", "isolated peer", "fuzzer", "secure redesign"],
    topicNotes: {
      "packet parsing": "Offsets e lengths são hostis. Some com checagem de overflow e compare com o tamanho do buffer capturado.",
      "protocol bugs": "declared length > buffer, integer wrap, replay e framing misturado com stream TCP são as classes do servidor vulnerável educacional.",
      "isolated lab protocol": "Agent Simulator fala só com C2 Simulator em localhost/net namespace. Comandos: PING, GET_VERSION, GET_STATUS, CALCULATE, ECHO.",
      "replay and framing": "TCP não preserva mensagens. Length-prefix, timeouts e nonces/anti-replay pertencem ao protocolo, não ao socket.",
      "secure redesign": "A versão endurecida valida, limita, loga rejeites e aplica defaults seguros. Compare com a vulnerável no mesmo harness."
    },
    code: {
      language: "c",
      filename: "lab-frame.c",
      source: `/* lab frame: [u16be length][payload]  max 64 */
int parse_frame(const uint8_t *p, size_t n, uint8_t *out, size_t out_cap) {
    if (n < 2) return -1;
    uint16_t len = (uint16_t)((p[0] << 8) | p[1]);
    if (len > 64 || len > out_cap || n < (size_t)2 + len) return -2;
    memcpy(out, p + 2, len);
    return (int)len;
}`,
      explanation: "A versão vulnerável do projeto omite len > 64. Fuzzer + ASan encontram; o patch acima é o contrato mínimo."
    },
    mechanics: [
      { title: "Dissecar", detail: "Ethernet 14, IPv4 20, TCP 20, payload N — em captura sintética." },
      { title: "Bound", detail: "Todo length, offset e count é comparado com o tamanho real do buffer capturado antes da cópia." },
      { title: "Isolar", detail: "O peer existe apenas na rede da sandbox; nenhum endereço externo é resolvido." },
      { title: "Redesenhar", detail: "A versão segura valida, limita, aplica timeout, loga rejeite e testa replay." }
    ],
    invariants: [
      "Nenhum laboratório inicia conexão externa.",
      "Parser rejeita length ilegal antes de copiar.",
      "Comandos do simulador são benignos e enumerados."
    ],
    pitfalls: [
      { title: "recv == mensagem", detail: "TCP entrega stream; acumule até o frame." },
      { title: "C2 'realista'", detail: "O objetivo é sockets e state machine, não um RAT." }
    ],
    practice: {
      prompt: "Quebre e conserte o Vulnerable Server do catálogo de projetos.",
      tasks: ["Fuzze o frame de 64 bytes.", "Mostre o crash e o patch.", "Reimplemente o Secure Server com timeout e log de rejeite."],
      evidence: "Corpus minimizado, ASan, diff e captura loopback do protocolo ECHO."
    }
  }),

  "sres-reverse": guide({
    thesis: "Engenharia reversa aplicada à segurança compara source conhecido com o binário gerado pela plataforma: funções, strings, imports, structs, vtables e o crackme educacional cujo segredo é revelado depois da análise.",
    context: [
      "O pipeline é source → compiler → binary → disassembly → decompilation hipotética → confronto com o source. O aluno pratica método, não pirataria.",
      "Ofuscação e anti-análise são ensinadas pelos indicadores que o analista reconhece e pelo que sandboxes registram. Não há manual de evasão contra ferramentas reais."
    ],
    flow: ["own source", "build artifact", "static facts", "dynamic confirmation", "explanation", "original source reveal"],
    topicNotes: {
      "source to binary": "Otimização move, inline e elimina. Confie em bytes e ABI; trate nomes stripped como hipóteses.",
      "crackme method": "Localize comparação, string, branch e a função de validação no binário próprio. Depois abra o source. O desafio é método, não um flag de CTF externo.",
      "strings and imports": "ASCII, UTF-8 e UTF-16. URLs, paths e mensagens são pistas. Imports descrevem capacidades, não culpa.",
      "obfuscation analysis": "Strip, encoding de strings, dead code e packing conceitual. O exercício é reconhecer a transformação e recuperar o fluxo, em amostras da plataforma.",
      "anti-analysis indicators": "Checagens de debugger, VM ou timing existem em malware real. Aqui o foco é o artefato observável e como o analista documenta a técnica, não como derrotar o detector."
    },
    code: {
      language: "c",
      filename: "lab-crackme.c",
      source: `static int lab_check(const char *guess) {
    const char expect[] = { 'L','A','B','-','O','K', 0 };
    return strcmp(guess, expect) == 0;
}

int main(void) {
    char guess[32];
    if (fgets(guess, sizeof guess, stdin) == NULL) return 1;
    guess[strcspn(guess, "\\n")] = 0;
    puts(lab_check(guess) ? "SUCCESS" : "INCORRECT");
}`,
      explanation: "No modo desafio o source fica oculto até o aluno apontar a comparação no disassembly. A constante LAB-OK é educacional e inútil fora do lab."
    },
    mechanics: [
      { title: "Inventariar", detail: "Colete hash, headers, strings e imports antes de formar uma hipótese de comportamento." },
      { title: "Achar o branch", detail: "Localize cmp/test/jcc da validação e anote o endereço relativo no binário próprio." },
      { title: "Confirmar", detail: "Use o debugger no executável da plataforma para ver o branch SUCCESS/INCORRECT." },
      { title: "Revelar", detail: "Confronte a hipótese com o source original, que o laboratório mostra como gabarito." }
    ],
    invariants: [
      "Somente binários gerados pela plataforma.",
      "O source é revelado após a análise, como gabarito.",
      "Anti-análise é estudada como indicador, não como evasão operacional."
    ],
    pitfalls: [
      { title: "Patcher de terceiros", detail: "Não altere software alheio. O crackme é nosso e o gabarito existe." },
      { title: "Confundir strip com segurança", detail: "Remover símbolos atrasa leitura; não corrige strcpy." }
    ],
    practice: {
      prompt: "Resolva o crackme do Security Lab e depois leia o source.",
      tasks: ["Encontre a função de comparação no disassembly.", "Identifique a string/bytes esperados.", "Explique o branch SUCCESS/INCORRECT e confira o gabarito."],
      evidence: "Endereços relativos, bytes da constante e parágrafo método versus resultado."
    }
  }),

  "sres-malware": guide({
    thesis: "Malware research na plataforma ensina arquitetura, comportamento observável, indicadores e mitigação através de simuladores benignos e amostras sintéticas — nunca um kit operacional.",
    context: [
      "Famílias (trojan, worm, ransomware, spyware, infostealer, bot, downloader, dropper, rootkit, backdoor) são apresentadas por objetivo, arquitetura típica, comportamento, detecção e mitigação.",
      "O Educational Malware Simulator só cria arquivos temporários na sandbox, fala com servidor local, altera dados fictícios e emite logs. Não toca o computador real nem credenciais reais."
    ],
    flow: ["family model", "benign simulator", "sandbox events", "timeline", "detection", "mitigation"],
    topicNotes: {
      "malware families": "Classifique por objetivo e comportamento, não por marketing. Um downloader e um dropper diferem no payload e na persistência observada.",
      "loader anatomy": "Loader → init → config → command processing → payload → cleanup. No lab, payload é ECHO/CALCULATE ou cifragem de document1.txt fictício.",
      "synthetic samples": "PE/ELF gerados pela plataforma, com strings FAKE_TOKEN, demo@example.local e imports documentados para análise estática/dinâmica.",
      "ransomware simulation": "Apenas arquivos da sandbox (document1.txt, photo1.fake). Ensina criptografia, chaves, backup e recuperação. Nunca cifra dados do usuário.",
      "infostealer simulation": "Perfil de browser artificial: username demo, FAKE_PASSWORD, FAKE_TOKEN_123. A 'exfiltração' é um POST para o endpoint local do laboratório."
    },
    code: {
      language: "text",
      filename: "simulator-charter.txt",
      source: `ALLOWED
  temp files inside sandbox
  logs and timeline events
  localhost / isolated netns
  fake secrets: demo@example.local, FAKE_TOKEN_123
  commands: PING GET_VERSION GET_STATUS CALCULATE ECHO

FORBIDDEN
  host filesystem outside workspace
  real credentials / browsers
  global keylogging
  stealth persistence on the host
  AV/EDR evasion against real products
  propagation or damage`,
      explanation: "A regra arquitetural é código: o simulador recusa caminhos fora da sandbox e não implementa os itens forbidden."
    },
    mechanics: [
      { title: "Modelar", detail: "Descreva objetivo, estágios e artefatos observáveis da família antes de ligar o simulador." },
      { title: "Simular", detail: "Gere apenas eventos benignos dentro da sandbox: logs, arquivos temporários e loopback." },
      { title: "Observar", detail: "Correlacione timeline, files, rede local e PE sem executar nada fora do laboratório." },
      { title: "Defender", detail: "Escreva regra EDR/YARA e um playbook de contenção que aponte o patch, não a evasão." }
    ],
    invariants: [
      "Dados pessoais e credenciais são sempre fictícios.",
      "Rede é isolada; filesystem é temporário.",
      "Não existe funcionalidade pronta para comprometer sistemas externos."
    ],
    pitfalls: [
      { title: "Realismo operacional", detail: "Completar um RAT 'para entender' viola o charter. Use ECHO." },
      { title: "Cifrar o home do aluno", detail: "O ransomware lab só enxerga o diretório sintético." }
    ],
    practice: {
      prompt: "Execute o Malware Behavior Simulator e escreva o relatório de análise.",
      tasks: ["Anote a timeline e classifique cada evento.", "Extraia strings e imports da amostra sintética.", "Proponha detecção e mitigação sem sugerir evasão."],
      evidence: "Timeline, hashes, regra Mini EDR e lista de dados fictícios tocados."
    }
  }),

  "sres-detection": guide({
    thesis: "Cada comportamento ofensivo estudado tem uma visão de atacante, de defensor e de desenvolvedor. Detection engineering transforma eventos do laboratório em regras, YARA, IOC conscientes de limite e código seguro.",
    context: [
      "IOCs (hash, path, mutex sintético) são frágeis. Comportamento — process create, file, registry simulado, rede local — sobrevive a troca de hash.",
      "O Mini EDR observa só processos do laboratório. O exercício Malware vs EDR ensina a escrever a regra, não a burlar produtos comerciais."
    ],
    flow: ["lab event", "telemetry", "rule", "true/false positive", "developer fix", "regression"],
    topicNotes: {
      "IOC vs behavior": "Hash é instantâneo e frágil. Path e mutex ajudam correlação. Comportamento (sequência API + alvo) generaliza melhor e ainda assim precisa de contexto.",
      YARA: "Strings, hex, conditions e metadata sobre arquivos do laboratório. Exercite falsos positivos: uma string FAKE_TOKEN em documentação não é amostra.",
      "Mini EDR": "Process, thread, file, registry simulado, network local, memória do lab. Alertas clicáveis abrem stack, API e explicação.",
      telemetry: "Quem, o quê, resultado, correlação. Sem secrets. Retenção e integridade fazem parte do desenho.",
      "secure coding pairs": "Overflow↔bounds; UAF↔RAII; format string↔formato constante; integer↔aritmética validada. Toda aula ofensiva fecha neste par."
    },
    code: {
      language: "text",
      filename: "lab.yar",
      source: `rule LabSyntheticInfostealer {
  meta:
    author = "0xlab"
    purpose = "detect lab sample only"
  strings:
    $tok = "FAKE_TOKEN_123" ascii
    $mail = "demo@example.local" ascii
  condition:
    uint16(0) == 0x5A4D and all of them
}`,
      explanation: "A regra ancora em magic PE e strings do laboratório. Documente o falso positivo se a mesma string aparecer em um README."
    },
    mechanics: [
      { title: "Coletar", detail: "Eventos do sandbox com timestamp, processo, API e alvo, sem gravar secrets reais." },
      { title: "Hipótese", detail: "Decida se o sinal é IOC frágil ou comportamento correlacionável no laboratório." },
      { title: "Regra", detail: "YARA ou Mini EDR com condição testável contra arquivos e processos da plataforma." },
      { title: "Fechar o ciclo", detail: "Patch de desenvolvedor + teste que a regra ainda faz sentido." }
    ],
    invariants: [
      "Regras são avaliadas só contra artefatos do lab.",
      "Todo alerta explica por que não é veredito automático.",
      "O par ofensivo↔defensivo está documentado para cada classe."
    ],
    pitfalls: [
      { title: "Detect-only theater", detail: "Alerta sem o fix do bound deixa o bug vivo." },
      { title: "Ensinar bypass de EDR real", detail: "Fora de escopo. O Mini EDR existe para ser acertado, não derrotado." }
    ],
    practice: {
      prompt: "Escreva a tríade attacker/defender/developer para o overflow de 8 bytes.",
      tasks: ["Atacante: onde o bound quebra no frame educacional.", "Defensor: o que ASan e o Mini EDR registram.", "Desenvolvedor: a API bounded e o teste.", "Opcional: regra YARA da amostra sintética."],
      evidence: "Tríade escrita, alerta reproduzido e patch com regressão."
    }
  })
};
