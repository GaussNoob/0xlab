import type { CurriculumLessonRef } from "./lesson-catalog";
import { curriculumLessons } from "./lesson-catalog";
import type { GuideCode, ModuleGuide } from "./lesson-guides";
import { lessonHref } from "./lesson-slugs";

export type StudyLayerId = "essential" | "deep-dive" | "low-level";
export type ExerciseKind = "guided" | "independent" | "debug" | "challenge";

export interface CodeLineExplanation {
  readonly line: number;
  readonly title: string;
  readonly detail: string;
  readonly effect?: string;
}

export interface LessonExample {
  readonly id: string;
  readonly level: "Primeiro contato" | "Intermediário" | "Situação real";
  readonly title: string;
  readonly purpose: string;
  readonly code?: GuideCode;
  readonly expected: string;
  readonly observations: readonly string[];
  readonly lineExplanations?: readonly CodeLineExplanation[];
}

export interface StudyLayer {
  readonly id: StudyLayerId;
  readonly label: string;
  readonly title: string;
  readonly explanation: string;
  readonly inspect: string;
  readonly caveat: string;
}

export interface StateVisualization {
  readonly title: string;
  readonly caption: string;
  readonly before: readonly string[];
  readonly operation: string;
  readonly after: readonly string[];
}

export interface MistakeStudy {
  readonly title: string;
  readonly question: string;
  readonly wrong: GuideCode;
  readonly symptom: string;
  readonly cause: string;
  readonly corrected: GuideCode;
  readonly tradeOff: string;
  readonly diagnostic?: string;
}

export interface PredictionStudy {
  readonly title: string;
  readonly prompt: string;
  readonly code: GuideCode;
  readonly answer: string;
  readonly explanation: string;
}

export interface ExerciseTest {
  readonly label: string;
  readonly requirement: string;
}

export interface LessonExercise {
  readonly id: string;
  readonly kind: ExerciseKind;
  readonly level: number;
  readonly title: string;
  readonly prompt: string;
  readonly deliverable: string;
  readonly starter?: GuideCode;
  readonly hints: readonly [string, string, string];
  readonly solution?: GuideCode;
  readonly reasoning: string;
  readonly alternatives: string;
  readonly tests: readonly ExerciseTest[];
  readonly hiddenTests: string;
}

export interface GeneratedCodeAnalysis {
  readonly title: string;
  readonly source: GuideCode;
  readonly generated: GuideCode;
  readonly observations: readonly string[];
  readonly experiment: string;
  readonly caveat: string;
}

export interface LessonConnection {
  readonly label: string;
  readonly reason: string;
  readonly href?: string;
}

export interface LessonStudy {
  readonly motivation: string;
  readonly realUses: readonly string[];
  readonly layers: readonly StudyLayer[];
  readonly examples: readonly LessonExample[];
  readonly visualization: StateVisualization;
  readonly mistakes: readonly MistakeStudy[];
  readonly prediction: PredictionStudy;
  readonly exercises: readonly LessonExercise[];
  readonly generatedCode: GeneratedCodeAnalysis;
  readonly prerequisites: readonly LessonConnection[];
  readonly connections: readonly LessonConnection[];
  readonly reviewQuestions: readonly string[];
  readonly technicalSummary: readonly string[];
}

interface DomainStudyProfile {
  readonly stakes: string;
  readonly uses: readonly string[];
  readonly internalModel: string;
  readonly observation: string;
  readonly caveat: string;
  readonly generatedLanguage: string;
  readonly generatedFilename: string;
  readonly generatedTemplate: (topic: string) => string;
}

const domainProfiles: Readonly<Record<string, DomainStudyProfile>> = {
  c: {
    stakes: "Em C, a abstração termina cedo: uma suposição errada sobre representação, lifetime ou tamanho pode virar bytes incorretos sem que a CPU saiba que o contrato da linguagem foi quebrado.",
    uses: ["bibliotecas nativas", "firmware", "parsers binários", "bancos de dados", "runtimes", "drivers e APIs de sistema"],
    internalModel: "Siga a expressão C até tipos, endereços, loads/stores e o serviço de runtime ou sistema que realmente altera o estado.",
    observation: "Compile com warnings, símbolos e sanitizers; compare valores, endereços, bytes e assembly antes e depois da menor alteração.",
    caveat: "Tamanho de tipos, layout, ABI e assembly dependem do alvo. Separe sempre regra ISO C de escolha do compilador e do sistema operacional.",
    generatedLanguage: "asm",
    generatedFilename: "possible-output.asm",
    generatedTemplate: (topic) => `; saída x86-64 aproximada para observar ${topic}\n; gere a versão real com: cc -S -masm=intel -O0 source.c\nmov     rax, QWORD PTR [rbp-8] ; carrega estado/endereço\nmov     edx, DWORD PTR [rax]  ; lê 4 bytes pelo endereço\nadd     edx, 1                ; transforma o valor\nmov     DWORD PTR [rax], edx  ; grava o novo estado`
  },
  cpp: {
    stakes: "C++ adiciona lifetimes automáticos e abstrações de alto nível, mas ownership, allocations, sincronização e código instanciado continuam existindo no executável.",
    uses: ["aplicações nativas", "engines", "browsers", "ferramentas de desenvolvimento", "sistemas de baixa latência", "renderers"],
    internalModel: "Traduza cada abstração em storage, construção, invariantes, transferência de ownership, destruição e chamadas que permanecem após otimização.",
    observation: "Instrumente constructors, destructors, allocations e moves; use sanitizers e compare -O0/-O2 antes de atribuir custo à abstração.",
    caveat: "O standard define semântica observável, não uma sequência única de instruções. Otimização pode eliminar objetos e chamadas preservando o comportamento permitido.",
    generatedLanguage: "asm",
    generatedFilename: "possible-output.asm",
    generatedTemplate: (topic) => `; forma conceitual, não promessa do standard, para ${topic}\ncall    acquire_resource\ntest    rax, rax\nje      .failure\n; uso do objeto/recurso\ncall    release_resource ; caminho de destruição/RAII\nret`
  },
  assembly: {
    stakes: "Assembly torna explícitos registradores, larguras, flags e endereços. Um único sufixo ou registrador incorreto altera o estado arquitetural e pode violar a ABI.",
    uses: ["debugging", "profiling", "boot e firmware", "criptografia", "SIMD", "engenharia reversa autorizada"],
    internalModel: "Para cada instrução, anote bytes, operandos lidos, destino escrito, largura, flags, endereço efetivo e estado de stack.",
    observation: "Faça single-step e registre RIP, RSP, RFLAGS, registradores e memória tocada. Confirme a codificação com disassembler, não por memória.",
    caveat: "ISA, sintaxe do assembler, ABI e microarquitetura são contratos diferentes. A mesma instrução arquitetural pode executar de maneiras internas distintas.",
    generatedLanguage: "text",
    generatedFilename: "instruction-trace.txt",
    generatedTemplate: (topic) => `FOCO       ${topic}\nANTES      RIP, RSP, RFLAGS e operandos registrados\nDECODE     opcode + ModR/M + SIB + displacement/immediate\nEXECUTE    reads → operação → writes\nDEPOIS     estado arquitetural comparado com a previsão`
  },
  systems: {
    stakes: "Sistemas operacionais transformam chamadas locais em transições de privilégio, objetos do kernel, scheduling, memória virtual e I/O concorrente.",
    uses: ["runtimes", "servidores", "containers", "observabilidade", "filesystems", "software de infraestrutura"],
    internalModel: "Modele processo, thread, mapa virtual, objeto do kernel e fila de I/O separadamente; registre em qual fronteira cada estado muda.",
    observation: "Correlacione retorno da API, trace de syscalls, mapas do processo, estados de thread e timestamps.",
    caveat: "Mecanismos variam entre kernels e versões. POSIX, Win32 e uma implementação interna não devem ser apresentados como o mesmo contrato.",
    generatedLanguage: "text",
    generatedFilename: "kernel-path.txt",
    generatedTemplate: (topic) => `application (${topic})\n  ↓ valida argumentos e handle/descriptor\nuser/kernel boundary\n  ↓ localiza objeto e verifica permissões\nkernel subsystem\n  ↓ executa, bloqueia ou agenda trabalho\nreturn + status observável`
  },
  windows: {
    stakes: "Win32 combina valores de retorno, sentinels diferentes, HANDLEs opacos, Unicode, thread affinity e lifetimes que precisam ser tratados como contratos explícitos.",
    uses: ["aplicações desktop", "ferramentas de sistema", "serviços", "debuggers", "loaders", "DirectX"],
    internalModel: "Comece na função Win32 documentada, valide retorno e ownership, depois siga objetos do sistema, filas, memory manager ou I/O manager.",
    observation: "Registre retorno e GetLastError no ponto correto; acompanhe HANDLEs, mensagens, regiões virtuais e eventos com debugger e ferramentas do Windows.",
    caveat: "Win32 é o contrato estável de aplicação. Native API, layout interno e números de syscall podem mudar entre builds do Windows.",
    generatedLanguage: "text",
    generatedFilename: "win32-contract.txt",
    generatedTemplate: (topic) => `CALL        ${topic}\nRETURN      validar conforme documentação da função\nERROR       ler GetLastError apenas quando o contrato indicar falha\nOWNERSHIP   identificar CloseHandle/FreeLibrary/VirtualFree equivalente\nEVIDENCE    retorno + erro + estado do objeto antes/depois`
  },
  linux: {
    stakes: "No Linux, wrappers de libc, file descriptors, syscalls e objetos do kernel formam camadas distintas; short I/O e errno fazem parte do caminho normal.",
    uses: ["servidores", "CLIs", "containers", "daemons", "ferramentas de observabilidade", "sistemas embarcados"],
    internalModel: "Siga aplicação, libc, ABI de syscall, validação do kernel e objeto referenciado pelo file descriptor.",
    observation: "Combine strace, /proc, readelf, perf e debugger; preserve argumentos, retornos, errno e timestamps.",
    caveat: "Separe POSIX, extensão Linux, wrapper de libc e ABI específica da arquitetura.",
    generatedLanguage: "shell",
    generatedFilename: "observe.sh",
    generatedTemplate: (topic) => `cc -std=c17 -Wall -Wextra -g -O0 experiment.c -o experiment\nstrace -f -yy -o trace.log ./experiment\ngrep -n '${topic}' trace.log || true\nreadelf -h -l -Ws experiment`
  },
  memory: {
    stakes: "Um endereço numérico só é utilizável quando objeto vivo, faixa, alinhamento, tipo, owner e proteção da página concordam simultaneamente.",
    uses: ["allocators", "buffers", "estruturas de dados", "caches", "parsers", "sistemas em tempo real"],
    internalModel: "Desenhe objeto, intervalo de bytes, endereço virtual, backing, owner, lifetime e linha de cache como entidades diferentes.",
    observation: "Registre alloc/free, base, tamanho, offsets, alinhamento e primeiro acesso inválido com sanitizer, debugger e visualizador.",
    caveat: "Stack/heap são políticas e regiões típicas, não propriedades do tipo do ponteiro; endereços mostrados em diagramas são ilustrativos.",
    generatedLanguage: "text",
    generatedFilename: "memory-trace.txt",
    generatedTemplate: (topic) => `OBJETO      ${topic}\nRANGE       [base, base + size)\nLIFETIME    início → acessos válidos → término\nVIRTUAL     endereço → página → permissões\nPHYSICAL    tradução/cache observada, nunca presumida`
  },
  networking: {
    stakes: "A rede entrega bytes sob fragmentação, atraso, duplicação em alguns níveis e desconexões. Um protocolo robusto não presume que uma chamada equivale a uma mensagem.",
    uses: ["serviços", "jogos", "telemetria", "bancos distribuídos", "IoT", "protocolos internos"],
    internalModel: "Separe framing da aplicação, buffers do processo, socket do kernel, segmentos/pacotes e estado do peer.",
    observation: "Correlacione retorno de send/recv, estado do parser, sequência/ACK, timeout e captura de pacotes.",
    caveat: "TCP é stream, não mensagens; uma captura e uma chamada não têm relação um-para-um. Endian e limites precisam estar no protocolo.",
    generatedLanguage: "text",
    generatedFilename: "wire-trace.txt",
    generatedTemplate: (topic) => `APPLICATION  frame(${topic}) = header | length | payload\nSEND LOOP    bytes aceitos podem ser menores que o frame\nTCP/UDP      transporte e buffers do kernel\nRECV LOOP    acumula bytes até existir um frame completo\nPARSER       valida length/type/checksum antes de usar payload`
  },
  graphics: {
    stakes: "Gráficos conectam dados CPU, uploads, recursos GPU, shaders, sincronização e apresentação; uma tela vazia é apenas o último sintoma possível.",
    uses: ["renderers", "games", "CAD", "visualização científica", "interfaces", "compute"],
    internalModel: "Liste recurso, formato, layout, binding, estágio consumidor, comando e condição de conclusão da GPU.",
    observation: "Capture o frame e confira buffers, shaders, descriptors, draw calls, barriers e tempos de CPU/GPU.",
    caveat: "API, driver e GPU são camadas diferentes. Retornar de uma função ou submit não significa que a GPU concluiu o uso do recurso.",
    generatedLanguage: "text",
    generatedFilename: "gpu-path.txt",
    generatedTemplate: (topic) => `CPU DATA    ${topic}\n  ↓ upload / mapping\nGPU RESOURCE + format/layout\n  ↓ binding / descriptor\nPIPELINE STAGE + shader\n  ↓ command submission + synchronization\nFRAMEBUFFER → PRESENT`
  },
  "reverse-engineering": {
    stakes: "Análise reversa confiável separa byte observado, instrução decodificada, hipótese de alto nível e comportamento confirmado por execução autorizada.",
    uses: ["compatibilidade", "resposta a incidentes", "debugging sem source", "auditoria de binários próprios", "formatos", "profiling"],
    internalModel: "Parta de sections, bytes, instructions, basic blocks e chamadas; trate nomes e intenção como hipóteses.",
    observation: "Preserve hash, versão, endereço relativo, trace e passos reproduzíveis em binários próprios ou expressamente autorizados.",
    caveat: "Símbolos ajudam, mas não são prova de comportamento. Otimização quebra a correspondência simples entre source e instruções.",
    generatedLanguage: "shell",
    generatedFilename: "inspect.sh",
    generatedTemplate: (topic) => `sha256sum sample\nfile sample\nreadelf -h -S -l -Ws sample\nobjdump -dr -Mintel sample > disassembly.txt\n# documente evidências relacionadas a: ${topic}`
  },
  cybersecurity: {
    stakes: "Segurança exige um invariante verificável e uma fronteira de confiança explícita; reproduzir um crash não basta para explicar causa, impacto e mitigação.",
    uses: ["threat modeling", "hardening", "parsing defensivo", "fuzzing em laboratório", "telemetria", "resposta a incidentes"],
    internalModel: "Modele asset, entrada não confiável, limite de recursos, estado validado, operação sensível e evidência da mitigação.",
    observation: "Reproduza somente em ambiente autorizado e isolado; capture a primeira violação e mantenha um teste de regressão após corrigir.",
    caveat: "Capacidade técnica não implica autorização. Os exercícios usam artefatos próprios e limites explícitos; impacto real depende do contexto.",
    generatedLanguage: "text",
    generatedFilename: "security-proof.txt",
    generatedTemplate: (topic) => `ASSET       estado protegido por ${topic}\nINPUT       bytes/ações não confiáveis\nVALIDATION  formato + faixa + autorização + limite de recurso\nOPERATION   somente sobre estado validado\nREGRESSION  caso válido + edge cases + entrada hostil controlada`
  },
  "security-research": {
    stakes: "Pesquisa de segurança em C/C++ só é honesta quando o invariante, a região de memória, o detector e a correção aparecem no mesmo experimento isolado.",
    uses: ["vulnerability research", "application security", "malware analysis", "detection engineering", "secure development", "lab CTF interno"],
    internalModel: "Siga source → bytes → frame/heap → CPU → syscall/API → evento de telemetria → patch, nomeando o que é observação e o que é hipótese.",
    observation: "Reproduza no sandbox da plataforma; capture ASan/timeline, compare v1/v2 e registre a tríade atacante/defensor/desenvolvedor.",
    caveat: "Simuladores ensinam arquitetura e detecção. Não implementam malware operacional, persistência furtiva no host nem evasão de produtos reais.",
    generatedLanguage: "c",
    generatedFilename: "lab-secure-bound.c",
    generatedTemplate: (topic) => `/* ${topic} — bound visível, destino declara capacidade */\n#include <stddef.h>\n#include <string.h>\n\nvoid lab_copy(char *dst, size_t cap, const char *src) {\n    if (cap == 0) return;\n    size_t n = strnlen(src, cap);\n    if (n == cap) n = cap - 1;\n    memcpy(dst, src, n);\n    dst[n] = 0;\n}\n`
  },
  "game-security": {
    stakes: "Game security educacional só é honesta quando o estado do jogo, o layout de memória, a ferramenta de pesquisa e o detector descrevem o mesmo processo do laboratório.",
    uses: ["game memory research", "entity/world debug", "anti-cheat design", "server-side validation", "binary analysis of lab games", "internal CTF"],
    internalModel: "Siga Game → process → memory → game state → research tool → telemetry → detection → patch do AC fictício, nomeando offsets e o build.",
    observation: "Reproduza só no Arena Lab; capture dump, cadeia de ponteiros, pacote e o evento do Mini Anti-Cheat. Compare naive vs strong.",
    caveat: "Ferramentas são RESEARCH/DEBUG contra binários próprios. Não há alvo em jogos online nem bypass de anti-cheats reais.",
    generatedLanguage: "cpp",
    generatedFilename: "lab-player-layout.cpp",
    generatedTemplate: (topic) => `/* ${topic} — layout do lab game, não de um título de terceiros */\n#include <cstddef>\n\nstruct Player {\n    float x, y, z;\n    int health;\n    int armor;\n};\n\nstatic_assert(offsetof(Player, health) == 12);\n`
  }
};

const fallbackProfile: DomainStudyProfile = domainProfiles.systems!;

function explainLine(line: string, language: string, topic: string): Omit<CodeLineExplanation, "line"> {
  const trimmed = line.trim();
  if (!trimmed) return { title: "Separação visual", detail: "A linha vazia não altera o programa; ela separa responsabilidades para tornar o trace legível." };
  if (/^#include/.test(trimmed)) return { title: "Contrato de declaração", detail: "O header introduz tipos, macros e protótipos usados abaixo; a implementação será resolvida em compilação ou linkedição." };
  if (/^#(define|if|else|endif)/.test(trimmed)) return { title: "Pré-processamento", detail: "Esta diretiva é resolvida antes do parser da linguagem e pode mudar a unidade de tradução entregue ao compilador." };
  if (/\b(malloc|calloc|realloc|new)\b/.test(trimmed)) return { title: "Aquisição de storage", detail: "A operação pede armazenamento, mas ainda exige validação de falha, ownership e uma liberação correspondente." };
  if (/\b(free|delete|CloseHandle|FreeLibrary|VirtualFree)\b/.test(trimmed)) return { title: "Fim de ownership", detail: "Esta chamada encerra o direito de uso do recurso. Valores que ainda guardam o endereço/handle não prolongam seu lifetime." };
  if (/^if\b|\bif\s*\(/.test(trimmed)) return { title: "Validação antes da transição", detail: "O branch impede que a operação seguinte execute quando a precondição falha. Observe também o caminho de erro e a limpeza já necessária." };
  if (/^(for|while)\b/.test(trimmed)) return { title: "Loop e invariante", detail: "Cada iteração deve preservar limites, progresso e lifetime. No debugger, compare contador e faixa antes do acesso." };
  if (/\breturn\b/.test(trimmed)) return { title: "Fronteira de retorno", detail: "O valor segue a ABI e o scope começa a ser desmontado; objetos automáticos e recursos RAII encerram seu lifetime aqui." };
  if (language === "asm" && /^mov\b/i.test(trimmed)) return { title: "Transferência explícita", detail: "MOV copia a origem para o destino na largura indicada. Em x86, gravar um registrador de 32 bits zera a metade superior do registrador de 64 bits." };
  if (language === "asm" && /^lea\b/i.test(trimmed)) return { title: "Cálculo de endereço", detail: "LEA calcula a expressão de endereço sem acessar a memória apontada; flags não são alteradas." };
  if (language === "asm" && /^(cmp|test)\b/i.test(trimmed)) return { title: "Produção de flags", detail: "A instrução calcula uma comparação sem manter o resultado e atualiza flags consumidas por saltos ou setcc." };
  if (language === "asm" && /^j[a-z]+\b/i.test(trimmed)) return { title: "Controle dependente de flags", detail: "O salto decide o próximo RIP a partir das flags relevantes; registre a condição antes de avançar." };
  if (language === "asm" && /^(call|ret)\b/i.test(trimmed)) return { title: "Fronteira de função", detail: "CALL/RET cooperam com a calling convention, a stack e os registradores preservados pela ABI." };
  if (language === "shell" && /\b(cc|gcc|clang|cl|nasm)\b/.test(trimmed)) return { title: "Construção reproduzível", detail: "O comando fixa compilador, alvo e flags; preserve essa linha junto da evidência porque otimização e ABI alteram o artefato." };
  if (language === "shell" && /\b(objdump|readelf|nm|strace|perf)\b/.test(trimmed)) return { title: "Coleta de evidência", detail: "A ferramenta inspeciona uma fronteira concreta. Relacione o trecho observado ao source e à execução, sem inferir além do que ela mede." };
  if (/^[{}]?[);,]?$/.test(trimmed) || trimmed === "}" || trimmed === "};") return { title: "Fim de scope/declaração", detail: "O delimitador fecha a estrutura sintática; em C++ também pode disparar destruição de objetos automáticos ao sair do scope." };
  return {
    title: `Passo observável de ${topic}`,
    detail: "Identifique os dados lidos, o estado escrito e a precondição desta linha. Depois avance uma única instrução/operação e compare com a previsão."
  };
}

export function buildLineExplanations(code: GuideCode, topic: string): readonly CodeLineExplanation[] {
  return code.source.trim().split("\n").map((line, index) => ({
    line: index + 1,
    ...explainLine(line, code.language, topic)
  }));
}

function conceptTrace(lesson: CurriculumLessonRef, guide: ModuleGuide): GuideCode {
  const focus = guide.flow[Math.min(1, guide.flow.length - 1)]!;
  const result = guide.flow[guide.flow.length - 1]!;
  return {
    language: "text",
    filename: `${lesson.slug}-state.txt`,
    source: `ENTRADA     ${guide.flow[0]}\nFOCO        ${lesson.topic}\nESTADO      ${focus}\nOPERAÇÃO    ${guide.mechanics[0]!.title}\nRESULTADO   ${result}\nEVIDÊNCIA   ${guide.practice.evidence}`,
    explanation: `Este modelo reduz ${lesson.topic} a uma transformação observável. Ele não substitui o código; serve para decidir o que medir antes de executar.`
  };
}

function genericMistake(lesson: CurriculumLessonRef, guide: ModuleGuide): MistakeStudy {
  const pitfall = guide.pitfalls[Math.max(0, lesson.module.topics.indexOf(lesson.topic)) % guide.pitfalls.length]!;
  return {
    title: pitfall.title,
    question: `Qual contrato de ${lesson.topic} foi omitido antes da operação?`,
    wrong: {
      language: "text",
      filename: "problematic-reasoning.txt",
      source: `entrada recebida\n→ estado presumido como válido\n→ ${lesson.topic} executado sem verificar o invariante\n→ resultado usado como se a operação fosse completa`,
      explanation: "O problema aparece antes do sintoma: o programa atravessa uma fronteira sem tornar explícita a precondição."
    },
    symptom: pitfall.detail,
    cause: `A implementação confunde um resultado plausível com prova de que o contrato de ${lesson.topic} foi satisfeito.`,
    corrected: {
      language: "text",
      filename: "corrected-reasoning.txt",
      source: `validar entrada, faixa, lifetime e ownership\n→ executar a menor operação de ${lesson.topic}\n→ conferir retorno/flags/estado\n→ tratar resultado parcial e erro\n→ registrar evidência antes de continuar`,
      explanation: "A correção transforma suposições em checks e mantém a primeira divergência observável."
    },
    tradeOff: "Checks e instrumentação têm custo, mas durante o aprendizado separam causa de coincidência. Em produção, mantenha as validações exigidas pelo contrato e meça o restante."
  };
}

function exerciseTests(topic: string, invariant: string): readonly ExerciseTest[] {
  return [
    { label: "Caso nominal", requirement: `A implementação demonstra ${topic} com entrada válida e saída verificável.` },
    { label: "Fronteira", requirement: `O caso no limite preserva: ${invariant}` },
    { label: "Falha", requirement: "Entrada inválida ou falha da API segue um caminho explícito sem vazar recursos nem reutilizar estado inválido." }
  ];
}

function genericExercises(lesson: CurriculumLessonRef, guide: ModuleGuide): readonly LessonExercise[] {
  const topicIndex = Math.max(0, lesson.module.topics.indexOf(lesson.topic));
  const invariant = guide.invariants[topicIndex % guide.invariants.length]!;
  const pitfall = guide.pitfalls[topicIndex % guide.pitfalls.length]!;
  const tests = exerciseTests(lesson.topic, invariant);
  return [
    {
      id: `${lesson.track.id}:${lesson.module.id}:${lesson.slug}:guided`,
      kind: "guided",
      level: 2,
      title: `Instrumente ${lesson.topic}`,
      prompt: guide.practice.tasks[0]!,
      deliverable: `Uma execução reproduzível com estado anterior, estado posterior e uma frase ligando a mudança a ${lesson.topic}.`,
      starter: guide.code,
      hints: [
        `Comece registrando ${guide.flow[0]} e ${guide.flow[1] ?? guide.flow[0]} antes de alterar o programa.`,
        `Use como invariante: ${invariant}`,
        `A evidência esperada é: ${guide.practice.evidence}`
      ],
      solution: guide.code,
      reasoning: `A solução de referência mantém o artefato pequeno e observa a fronteira “${lesson.module.bridge}”. O objetivo não é copiar o source, mas reproduzir a cadeia de estado.`,
      alternatives: "Você pode trocar a ferramenta de observação, desde que preserve o mesmo contrato e apresente evidência equivalente.",
      tests,
      hiddenTests: "Os testes ocultos variam valores, executam o caso de fronteira e provocam uma falha de recurso/entrada sem revelar antecipadamente os dados."
    },
    {
      id: `${lesson.track.id}:${lesson.module.id}:${lesson.slug}:independent`,
      kind: "independent",
      level: 4,
      title: "Reconstrua o experimento sem o roteiro",
      prompt: guide.practice.tasks[1]!,
      deliverable: "Código ou runbook próprio, resultado esperado escrito antes da execução e comparação entre previsão e observação.",
      hints: [
        `Desenhe primeiro: ${guide.flow.join(" → ")}.`,
        `Isole o mecanismo “${guide.mechanics[topicIndex % guide.mechanics.length]!.title}” e controle as demais variáveis.`,
        `Se o resultado surpreender, investigue “${pitfall.title}”: ${pitfall.detail}`
      ],
      reasoning: "Uma solução correta declara precondições, mede a transição mínima e trata o caminho de falha; detalhes de implementação podem variar.",
      alternatives: "Compare pelo menos duas abordagens e escolha com base em ownership, portabilidade, observabilidade ou custo — não apenas em tamanho do código.",
      tests,
      hiddenTests: "Casos ocultos alteram ordem, tamanho, retorno parcial ou estado inicial para detectar soluções ajustadas apenas ao exemplo público."
    },
    {
      id: `${lesson.track.id}:${lesson.module.id}:${lesson.slug}:challenge`,
      kind: "challenge",
      level: 6,
      title: `Mini projeto · ${guide.practice.prompt}`,
      prompt: guide.practice.tasks[2]!,
      deliverable: `${guide.practice.evidence} Inclua README curto, comandos de build, edge cases e um post-mortem do primeiro bug encontrado.`,
      hints: [
        "Defina primeiro a interface, o owner de cada recurso e os estados válidos; só depois escreva a implementação.",
        `Use estes contratos como assertions/revisão: ${guide.invariants.join(" | ")}`,
        `Instrumente cada passagem: ${guide.flow.join(" → ")}. Corrija a primeira divergência, não o último sintoma.`
      ],
      reasoning: "O desafio integra mecanismo, observação e recuperação de erro. Uma entrega forte explica por que os invariantes continuam verdadeiros em todos os caminhos.",
      alternatives: "Uma implementação menor pode ser preferível se declarar limites. Uma implementação otimizada só é melhor quando perfil e testes preservam a correção.",
      tests,
      hiddenTests: "A avaliação cobre caso vazio, limite de tamanho, falha intermediária, repetição/cleanup e comportamento documentado para entrada inválida."
    }
  ];
}

function findRelatedLessons(lesson: CurriculumLessonRef): readonly LessonConnection[] {
  const tokens = new Set(
    `${lesson.topic} ${lesson.module.title}`
      .toLowerCase()
      .split(/[^a-z0-9+#*]+/)
      .filter((token) => token.length >= 3)
  );
  const candidates = curriculumLessons
    .filter((candidate) => candidate !== lesson && candidate.module.id !== lesson.module.id)
    .map((candidate) => {
      const haystack = `${candidate.topic} ${candidate.module.title}`.toLowerCase();
      const score = [...tokens].reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
      return { candidate, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);

  if (candidates.length >= 3) {
    return candidates.map(({ candidate }) => ({
      label: `${candidate.track.shortTitle} · ${candidate.topic}`,
      reason: `Reveja ${lesson.topic} por outra camada: ${candidate.module.bridge}.`,
      href: lessonHref(candidate.track, candidate.module, candidate.topic)
    }));
  }

  return lesson.track.modules
    .filter((module) => module.id !== lesson.module.id)
    .slice(0, 4)
    .map((module) => ({
      label: `${lesson.track.shortTitle} · ${module.title}`,
      reason: module.bridge,
      href: `/learn/${lesson.track.id}/${module.id}`
    }));
}

function buildPrerequisites(lesson: CurriculumLessonRef): readonly LessonConnection[] {
  const moduleIndex = lesson.track.modules.findIndex((module) => module.id === lesson.module.id);
  const topicIndex = lesson.module.topics.indexOf(lesson.topic);
  const links: LessonConnection[] = lesson.track.prerequisites.map((label) => ({
    label,
    reason: "Conhecimento esperado antes de iniciar esta trilha."
  }));

  if (topicIndex > 0) {
    const topic = lesson.module.topics[topicIndex - 1]!;
    links.push({
      label: topic,
      reason: "A aula anterior estabelece o estado usado neste experimento.",
      href: lessonHref(lesson.track, lesson.module, topic)
    });
  } else if (moduleIndex > 0) {
    const module = lesson.track.modules[moduleIndex - 1]!;
    const topic = module.topics[module.topics.length - 1]!;
    links.push({
      label: `${module.title} · ${topic}`,
      reason: `Prepara a ponte: ${lesson.module.bridge}.`,
      href: lessonHref(lesson.track, module, topic)
    });
  }
  return links.slice(-4);
}

function genericStudy(lesson: CurriculumLessonRef, guide: ModuleGuide): LessonStudy {
  const profile = domainProfiles[lesson.track.id] ?? fallbackProfile;
  const topicIndex = Math.max(0, lesson.module.topics.indexOf(lesson.topic));
  const focus = guide.mechanics[topicIndex % guide.mechanics.length]!;
  const next = guide.mechanics[(topicIndex + 1) % guide.mechanics.length]!;
  const invariant = guide.invariants[topicIndex % guide.invariants.length]!;
  const pitfall = guide.pitfalls[topicIndex % guide.pitfalls.length]!;
  const trace = conceptTrace(lesson, guide);
  const generated: GuideCode = {
    language: profile.generatedLanguage,
    filename: profile.generatedFilename,
    source: profile.generatedTemplate(lesson.topic),
    explanation: profile.internalModel
  };

  return {
    motivation: `${profile.stakes} Nesta aula, “${lesson.topic}” deixa de ser um termo de referência e vira uma sequência de estados que você poderá prever, executar, quebrar e explicar.`,
    realUses: profile.uses,
    layers: [
      {
        id: "essential",
        label: "Essential",
        title: `Usar ${lesson.topic} sem esconder o contrato`,
        explanation: guide.topicNotes[lesson.topic]!,
        inspect: `Isole a passagem ${guide.flow[0]} → ${guide.flow[1] ?? guide.flow[0]} e confirme o resultado antes de combinar mais camadas.`,
        caveat: invariant
      },
      {
        id: "deep-dive",
        label: "Deep Dive",
        title: `${focus.title}: mecanismo e invariantes`,
        explanation: `${focus.detail} Em seguida, conecte com ${next.title.toLowerCase()}: ${next.detail}`,
        inspect: profile.observation,
        caveat: `${pitfall.title}: ${pitfall.detail}`
      },
      {
        id: "low-level",
        label: "Low-Level",
        title: `Atravesse a ponte ${lesson.module.bridge}`,
        explanation: profile.internalModel,
        inspect: `Registre a cadeia completa: ${guide.flow.join(" → ")}.`,
        caveat: profile.caveat
      }
    ],
    examples: [
      {
        id: "minimal-state",
        level: "Primeiro contato",
        title: `Reduza ${lesson.topic} a uma mudança de estado`,
        purpose: "Antes de lidar com uma API inteira, nomeie entrada, estado, operação, resultado e evidência.",
        code: trace,
        expected: `Você consegue apontar exatamente onde ${lesson.topic} entra na cadeia e qual observação prova que a etapa ocorreu.`,
        observations: [guide.topicNotes[lesson.topic]!, invariant]
      },
      {
        id: "module-artifact",
        level: "Intermediário",
        title: `Inspecione ${lesson.topic} em um artefato executável`,
        purpose: `O exemplo do módulo contém o contexto necessário para observar ${lesson.topic} sem tratá-lo como uma linha isolada.`,
        code: guide.code,
        expected: guide.code.explanation,
        observations: [
          `Marque a linha em que ${focus.title.toLowerCase()} altera o estado.`,
          `Anote qual invariante protege a execução: ${invariant}`,
          `Repita mudando uma única entrada e explique a diferença antes de executar.`
        ],
        lineExplanations: buildLineExplanations(guide.code, lesson.topic)
      },
      {
        id: "real-scenario",
        level: "Situação real",
        title: guide.practice.prompt,
        purpose: `Aplique ${lesson.topic} em um fluxo que precisa sobreviver a falha, limite e observação externa.`,
        expected: guide.practice.evidence,
        observations: guide.practice.tasks
      }
    ],
    visualization: {
      title: `Estado de ${lesson.topic} antes e depois`,
      caption: "Os rótulos representam responsabilidades; endereços, tempos e layouts concretos devem ser medidos no ambiente do experimento.",
      before: [guide.flow[0]!, `precondição · ${invariant}`, "evidência ainda não coletada"],
      operation: `${focus.title} · ${lesson.topic}`,
      after: [guide.flow[guide.flow.length - 1]!, `estado validado após ${lesson.topic}`, guide.practice.evidence]
    },
    mistakes: [genericMistake(lesson, guide)],
    prediction: {
      title: "Preveja antes de executar",
      prompt: `Sem rodar o artefato, descreva qual estado muda primeiro ao observar ${lesson.topic}, qual estado deve permanecer igual e qual evidência diferenciaria sucesso aparente de sucesso real.`,
      code: guide.code,
      answer: `A primeira transição relevante é ${guide.flow[0]} → ${guide.flow[1] ?? guide.flow[0]}. O invariante que não pode ser perdido é: ${invariant}`,
      explanation: `Depois siga ${guide.flow.join(" → ")}. Se a previsão divergir, investigue primeiro ${pitfall.title.toLowerCase()}, preservando o trace da primeira mudança inesperada.`
    },
    exercises: genericExercises(lesson, guide),
    generatedCode: {
      title: `O que procurar abaixo de ${lesson.topic}`,
      source: guide.code,
      generated,
      observations: [
        `Separe a semântica documentada de ${lesson.topic} da forma concreta emitida neste build.`,
        `Localize ${focus.title.toLowerCase()} e registre reads, writes, largura e ownership.`,
        `Compare o artefato com o caminho ${lesson.module.bridge}.`
      ],
      experiment: "Gere duas versões equivalentes (-O0 e -O2 quando houver compilação), compare o diff e explique quais diferenças preservam a mesma semântica.",
      caveat: profile.caveat
    },
    prerequisites: buildPrerequisites(lesson),
    connections: findRelatedLessons(lesson),
    reviewQuestions: [
      `Defina ${lesson.topic} em termos de entrada, estado e saída, sem repetir apenas o nome da abstração.`,
      `Qual invariante precisa ser verdadeiro antes e depois? ${invariant}`,
      `Como ${focus.title.toLowerCase()} aparece na execução?`,
      `Por que “${pitfall.title}” pode passar em um caso simples?`,
      `Que evidência reproduzível conecta ${lesson.topic} a ${lesson.module.bridge}?`
    ],
    technicalSummary: [
      guide.topicNotes[lesson.topic]!,
      `${focus.title}: ${focus.detail}`,
      invariant,
      profile.caveat,
      `Próxima aplicação: ${guide.practice.prompt}`
    ]
  };
}

const pointerExamples: readonly LessonExample[] = [
  {
    id: "pointer-address",
    level: "Primeiro contato",
    title: "1 · O ponteiro guarda onde o valor está",
    purpose: "Separe o inteiro, o endereço do inteiro e o objeto ponteiro que armazena esse endereço.",
    code: {
      language: "c",
      filename: "01_address.c",
      source: `#include <stdio.h>\n\nint main(void) {\n    int value = 10;\n    int *ptr = &value;\n\n    printf("value=%d\\n", value);\n    printf("&value=%p ptr=%p\\n", (void *)&value, (void *)ptr);\n    printf("*ptr=%d\\n", *ptr);\n    return 0;\n}`,
      explanation: "value e ptr são dois objetos distintos. ptr não contém 10: contém o endereço no qual o inteiro 10 pode ser encontrado. %p exige void*."
    },
    expected: "value=10; os dois endereços impressos são iguais dentro da mesma execução; *ptr=10.",
    observations: ["Os endereços reais variam com ASLR e layout do frame.", "sizeof ptr segue a arquitetura; sizeof *ptr mede o int apontado."],
    lineExplanations: [
      { line: 4, title: "Crie o objeto alvo", detail: "O compilador providencia storage alinhado para um int e inicializa sua representação com o valor 10.", effect: "No modelo didático little-endian de 4 bytes: 0A 00 00 00." },
      { line: 5, title: "Declare e inicialize o ponteiro", detail: "int* define o tipo, ptr nomeia o novo objeto, = inicializa e &value produz o endereço do primeiro byte de value.", effect: "ptr passa a conter um endereço; value continua contendo 10." },
      { line: 9, title: "Faça dereference", detail: "*ptr designa o int localizado no endereço guardado em ptr. printf lê esse int para formar o argumento.", effect: "É um load indireto; não altera value nem ptr." }
    ]
  },
  {
    id: "pointer-write",
    level: "Primeiro contato",
    title: "2 · Modifique o alvo por indireção",
    purpose: "Observe que uma store feita por *ptr altera value, enquanto o endereço guardado em ptr não muda.",
    code: {
      language: "c",
      filename: "02_indirect_write.c",
      source: `#include <stdio.h>\n\nint main(void) {\n    int value = 10;\n    int *ptr = &value;\n    *ptr = 50;\n    printf("value=%d *ptr=%d\\n", value, *ptr);\n    return 0;\n}`,
      explanation: "*ptr é uma lvalue que designa value. A atribuição escreve nos bytes de value; ptr continua guardando o mesmo endereço."
    },
    expected: "value=50 *ptr=50",
    observations: ["Desenhe o mapa antes de executar: ptr ─► value=10.", "Depois da linha 6: ptr ─► value=50."]
  },
  {
    id: "pointer-parameter",
    level: "Intermediário",
    title: "3 · Permita que uma função altere estado do chamador",
    purpose: "C passa argumentos por valor. Passar uma cópia do endereço ainda permite alcançar o mesmo objeto do chamador.",
    code: {
      language: "c",
      filename: "03_parameter.c",
      source: `#include <stdio.h>\n\nstatic void increment(int *value) {\n    if (value != NULL) {\n        (*value)++;\n    }\n}\n\nint main(void) {\n    int score = 41;\n    increment(&score);\n    printf("score=%d\\n", score);\n    return 0;\n}`,
      explanation: "increment recebe uma cópia de &score. O check torna explícito que dereference só ocorre para um ponteiro não nulo; lifetime e alinhamento também precisam ser válidos."
    },
    expected: "score=42",
    observations: ["O parâmetro value é local à função; o int score pertence ao frame de main.", "Os parênteses em (*value)++ deixam claro que incrementamos o alvo, não o endereço."],
    lineExplanations: [
      { line: 3, title: "Contrato da função", detail: "int *value recebe um endereço de int por valor. A função não assume ownership e não deve chamar free.", effect: "Na ABI, o endereço costuma chegar em um registrador de argumento." },
      { line: 4, title: "Validação parcial", detail: "O check exclui NULL, mas não prova sozinho lifetime, alinhamento ou que o endereço realmente aponta para um int.", effect: "Somente o caminho não nulo chega ao dereference." },
      { line: 5, title: "Read-modify-write", detail: "Carrega o int apontado, soma 1 e grava no mesmo endereço. Os parênteses aplicam ++ ao objeto designado por *value.", effect: "score muda de 41 para 42." },
      { line: 11, title: "Forme o endereço no caller", detail: "&score produz int*. A cópia desse endereço atravessa a chamada; o objeto score continua no frame de main.", effect: "Caller e callee passam a ter caminhos para o mesmo int durante a chamada." }
    ]
  },
  {
    id: "pointer-array",
    level: "Intermediário",
    title: "4 · Percorra um array com endereço base e escala",
    purpose: "Conecte values[i] a *(values + i) e veja por que somar 1 avança sizeof(int), não um byte.",
    code: {
      language: "c",
      filename: "04_array.c",
      source: `#include <stdio.h>\n\nint main(void) {\n    int values[] = {10, 20, 30};\n    int *ptr = values;\n\n    for (size_t i = 0; i < 3; ++i) {\n        printf("%zu: %d == %d\\n", i, values[i], *(ptr + i));\n    }\n    return 0;\n}`,
      explanation: "Na inicialização de ptr, values converte para &values[0]. A aritmética permanece válida dentro do mesmo array, inclusive one-past apenas para comparação."
    },
    expected: "Três linhas mostram pares iguais: 10, 20 e 30.",
    observations: ["Se int tem 4 bytes, ptr+1 costuma ter endereço numérico base+4.", "Nunca faça dereference de ptr+3: esse é o ponteiro one-past."]
  },
  {
    id: "pointer-dynamic",
    level: "Situação real",
    title: "5 · Dê ao objeto lifetime dinâmico e owner explícito",
    purpose: "Use malloc para obter storage quando o lifetime ou tamanho não cabe em um escopo automático fixo.",
    code: {
      language: "c",
      filename: "05_heap.c",
      source: `#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    int *value = malloc(sizeof *value);\n    if (value == NULL) {\n        return EXIT_FAILURE;\n    }\n\n    *value = 100;\n    printf("%d\\n", *value);\n    free(value);\n    value = NULL;\n    return EXIT_SUCCESS;\n}`,
      explanation: "malloc entrega storage alinhado ou NULL. value é o owner neste programa; free encerra o lifetime do bloco. Zerar a cópia local ajuda a evitar reuso, mas não corrige aliases dangling."
    },
    expected: "100 e encerramento sem relatório de leak no AddressSanitizer/LeakSanitizer.",
    observations: ["Use sizeof *value para manter tipo e tamanho acoplados.", "Depois de free, o endereço antigo não pode ser dereferenced mesmo que os bytes pareçam intactos."]
  },
  {
    id: "pointer-struct",
    level: "Situação real",
    title: "6 · Acesse estado composto por um ponteiro",
    purpose: "Mostre que ptr->health é uma forma legível de (*ptr).health e preserve invariantes de uma entidade real.",
    code: {
      language: "c",
      filename: "06_struct.c",
      source: `#include <stdio.h>\n\ntypedef struct {\n    int health;\n    int armor;\n} Player;\n\nstatic void apply_damage(Player *player, int damage) {\n    if (player == NULL || damage < 0) return;\n    int absorbed = damage < player->armor ? damage : player->armor;\n    player->armor -= absorbed;\n    player->health -= damage - absorbed;\n    if (player->health < 0) player->health = 0;\n}\n\nint main(void) {\n    Player player = {.health = 100, .armor = 25};\n    apply_damage(&player, 40);\n    printf("health=%d armor=%d\\n", player.health, player.armor);\n}`,
      explanation: "O ponteiro permite modificar a struct sem copiá-la. A função valida entrada e preserva health >= 0 e armor >= 0."
    },
    expected: "health=85 armor=0",
    observations: ["player->health equivale a (*player).health.", "O endereço do campo inclui o offset decidido pelo layout da struct."]
  }
];

function pointerStudy(base: LessonStudy): LessonStudy {
  return {
    ...base,
    motivation: "Um ponteiro é uma variável cujo valor representa um endereço. Isso permite compartilhar e percorrer dados sem copiá-los, modelar estruturas, conversar com APIs e controlar lifetime dinâmico — mas a CPU não distingue um endereço válido de um número acidental. Por isso, endereço, tipo, faixa, alinhamento, lifetime e ownership precisam ser raciocinados juntos.",
    realUses: ["listas, árvores e hash tables", "buffers e parsers", "sockets e APIs do sistema", "drivers e embarcados", "allocators e arenas", "renderização e recursos GPU", "bibliotecas C", "debuggers e engenharia reversa autorizada"],
    examples: pointerExamples,
    visualization: {
      title: "Dois objetos, um endereço que cria a ligação",
      caption: "0x1000 e 0x2000 são endereços ilustrativos. Em uma execução real, ASLR, ABI e o compilador determinam o layout.",
      before: ["value @ 0x1000 · bytes 0A 00 00 00 · int 10", "ptr @ 0x2000 · bytes 00 10 00 00… · int* 0x1000", "ptr ─────────► value=10"],
      operation: "*ptr = 20 · load do endereço, store de 4 bytes no alvo",
      after: ["value @ 0x1000 · bytes 14 00 00 00 · int 20", "ptr @ 0x2000 · continua int* 0x1000", "ptr ─────────► value=20"]
    },
    mistakes: [
      {
        title: "Wild pointer: escrever antes de apontar",
        question: "Qual objeto *ptr designa nesta execução?",
        wrong: { language: "c", filename: "wild_pointer.c", source: `int main(void) {\n    int *ptr;\n    *ptr = 10;\n}`, explanation: "ptr tem valor indeterminado. Avaliá-lo e fazer dereference produz comportamento indefinido; o programa não tem um int válido como alvo." },
        symptom: "Pode falhar com segmentation fault/access violation, corromper outro estado ou parecer funcionar. Nenhum resultado é garantido.",
        cause: "Declarar int* reserva apenas o objeto ponteiro; não cria automaticamente um int nem inicializa o endereço.",
        corrected: { language: "c", filename: "initialized_pointer.c", source: `int main(void) {\n    int value = 0;\n    int *ptr = &value;\n    *ptr = 10;\n    return value == 10 ? 0 : 1;\n}`, explanation: "Agora ptr recebe o endereço de um int vivo e alinhado antes do store indireto." },
        tradeOff: "Inicializar com NULL evita um wild pointer, mas NULL ainda não pode ser dereferenced. Inicialize com o endereço de um objeto válido quando precisar acessar o alvo.",
        diagnostic: "Compiladores podem avisar que ptr é usado sem inicialização; AddressSanitizer pode capturar o acesso, mas ausência de aviso não torna o programa correto."
      },
      {
        title: "Dangling pointer: retornar endereço de variável local",
        question: "Por que os bytes ainda visíveis não mantêm o objeto vivo?",
        wrong: { language: "c", filename: "dangling.c", source: `static int *create_value(void) {\n    int value = 10;\n    return &value;\n}`, explanation: "O lifetime de value termina ao retornar. O endereço pode continuar numericamente igual, mas não existe mais um int válido para acessar por ele." },
        symptom: "O caller recebe um ponteiro dangling; otimização, outra chamada ou alteração da stack torna o resultado imprevisível.",
        cause: "Storage automático pertence ao bloco/frame. O valor do endereço sobrevive como bits, mas o objeto apontado não.",
        corrected: { language: "c", filename: "caller_owned.c", source: `static int create_value(int *out) {\n    if (out == NULL) return 0;\n    *out = 10;\n    return 1;\n}\n\nint main(void) {\n    int value;\n    return create_value(&value) && value == 10 ? 0 : 1;\n}`, explanation: "O caller fornece storage cujo lifetime cobre o uso. Alternativas: retornar o int por valor ou alocar dinamicamente com ownership documentado." },
        tradeOff: "Retornar por valor é normalmente a solução mais simples. Out-parameter é útil para múltiplas saídas/status; malloc é adequado apenas quando lifetime/tamanho realmente exigem alocação dinâmica."
      }
    ],
    prediction: {
      title: "Qual será o output?",
      prompt: "Escreva sua previsão para x e para o valor armazenado em ptr. Só depois revele a explicação.",
      code: { language: "c", filename: "predict.c", source: `#include <stdio.h>\n\nint main(void) {\n    int x = 5;\n    int *ptr = &x;\n    *ptr *= 2;\n    printf("x=%d\\n", x);\n}`, explanation: "Não execute antes de prever. Desenhe ptr ─► x e aplique a operação ao objeto designado por *ptr." },
      answer: "x=10. ptr continua armazenando o endereço de x.",
      explanation: "*ptr designa o mesmo objeto que x. A expressão é um read-modify-write: lê 5 pelo endereço, multiplica por 2 e grava 10 no mesmo int. Ela não multiplica o endereço."
    },
    exercises: [
      {
        id: "c:c-pointers:pointers:guided",
        kind: "guided",
        level: 2,
        title: "Trace uma escrita indireta byte a byte",
        prompt: "Complete um programa que recebe int* em increment, valida NULL, incrementa o alvo e imprime valor/endereço antes e depois.",
        deliverable: "Código executável, previsão escrita, dois snapshots do debugger (locals e memory view) e explicação do read-modify-write.",
        starter: { language: "c", filename: "increment.c", source: `#include <stdio.h>\n\nstatic int increment(int *value) {\n    /* valide value */\n    /* incremente o alvo */\n    return 1;\n}\n\nint main(void) {\n    int x = 9;\n    if (!increment(&x)) return 1;\n    printf("%d\\n", x);\n}`, explanation: "Implemente as duas linhas sem mudar a interface." },
        hints: ["NULL precisa ser rejeitado antes de qualquer dereference.", "A expressão que designa o alvo é *value.", "Use if (value == NULL) return 0; e depois (*value)++;."],
        solution: { language: "c", filename: "increment_solution.c", source: `#include <stdio.h>\n\nstatic int increment(int *value) {\n    if (value == NULL) return 0;\n    (*value)++;\n    return 1;\n}\n\nint main(void) {\n    int x = 9;\n    if (!increment(&x)) return 1;\n    printf("%d\\n", x);\n}`, explanation: "A função não toma ownership; ela valida a ausência de alvo, modifica o int do caller e reporta sucesso." },
        reasoning: "Passar &x cria acesso compartilhado durante a chamada. O caller mantém ownership e o callee apenas empresta o endereço.",
        alternatives: "Para essa operação, retornar x + 1 por valor elimina a mutação. O ponteiro faz sentido quando a API precisa alterar storage fornecido pelo caller ou produzir múltiplos resultados.",
        tests: [{ label: "Valor", requirement: "increment(&x) transforma 9 em 10." }, { label: "Nulo", requirement: "increment(NULL) retorna 0 sem acesso inválido." }, { label: "Negativo", requirement: "increment sobre -1 produz 0." }],
        hiddenTests: "Inclui INT_MAX apenas para verificar se você documentou/evitou signed overflow; o requisito não permite executá-lo silenciosamente."
      },
      {
        id: "c:c-pointers:pointers:debug",
        kind: "debug",
        level: 3,
        title: "Diagnostique um endereço local retornado",
        prompt: "Identifique, explique, corrija e execute create_value. Compare retorno por valor, out-parameter e malloc.",
        deliverable: "Relatório do warning/sanitizer, correção escolhida, trade-off e inspeção do call stack antes/depois do retorno.",
        starter: { language: "c", filename: "broken.c", source: `int *create_value(void) {\n    int x = 10;\n    return &x;\n}`, explanation: "O defeito é de lifetime, não apenas de sintaxe." },
        hints: ["Pergunte a qual scope x pertence.", "O endereço pode sobreviver como número sem manter o objeto vivo.", "Prefira return 10; se só precisa devolver um int; use out-parameter quando a interface exige status separado."],
        solution: { language: "c", filename: "return_by_value.c", source: `static int create_value(void) {\n    return 10;\n}\n\nint main(void) {\n    int value = create_value();\n    return value == 10 ? 0 : 1;\n}`, explanation: "Retornar o pequeno valor é simples, seguro e normalmente mantido em registrador pela ABI." },
        reasoning: "A correção remove a dependência do frame encerrado. Retornar por valor não implica necessariamente cópia na memória.",
        alternatives: "Out-parameter mantém storage no caller; malloc estende lifetime, mas adiciona falha e obrigação de free. static muda compartilhamento/reentrância e raramente é a melhor resposta.",
        tests: [{ label: "Retorno", requirement: "O valor 10 permanece válido após create_value retornar." }, { label: "Sanitizer", requirement: "Nenhum stack-use-after-return." }, { label: "Ownership", requirement: "A interface documenta quem possui qualquer storage dinâmico, se usado." }],
        hiddenTests: "Chamadas repetidas e funções intermediárias pressionam a stack para expor soluções ainda dependentes de endereço local."
      },
      {
        id: "c:c-pointers:pointers:independent",
        kind: "independent",
        level: 4,
        title: "Implemente swap e reverse do zero",
        prompt: "Sem copiar o exemplo, implemente swap_int(int*, int*) e reverse(int*, size_t). Documente o comportamento para NULL, array vazio e aliases iguais.",
        deliverable: "Implementação própria, testes públicos, desenho de cada troca e uma decisão documentada sobre como tratar parâmetros inválidos.",
        starter: { language: "c", filename: "reverse.c", source: `#include <stddef.h>\n\nstatic int swap_int(int *left, int *right) {\n    /* sua implementação */\n}\n\nstatic int reverse(int *values, size_t count) {\n    /* sua implementação */\n}`, explanation: "Defina primeiro o contrato. Um array vazio pode ser representado por values == NULL quando count == 0, desde que nenhum dereference ocorra." },
        hints: ["swap precisa de um temporário porque a primeira store destruiria um dos valores antigos.", "Em reverse, troque i com count - 1 - i apenas enquanto i < count / 2.", "Valide (!values && count != 0); para aliases iguais, swap pode retornar sucesso sem alterar nada."],
        solution: { language: "c", filename: "reverse_solution.c", source: `#include <stddef.h>\n\nstatic int swap_int(int *left, int *right) {\n    if (left == NULL || right == NULL) return 0;\n    int temporary = *left;\n    *left = *right;\n    *right = temporary;\n    return 1;\n}\n\nstatic int reverse(int *values, size_t count) {\n    if (values == NULL && count != 0) return 0;\n    for (size_t i = 0; i < count / 2; ++i) {\n        if (!swap_int(&values[i], &values[count - 1 - i])) return 0;\n    }\n    return 1;\n}`, explanation: "Cada &values[i] permanece dentro do array e count / 2 evita trocar o elemento central consigo mesmo em comprimentos ímpares." },
        reasoning: "A solução separa validação do range e operação elementar. count controla a faixa; o ponteiro sozinho não carrega o comprimento.",
        alternatives: "Uma API pode exigir ponteiro não nulo mesmo para count zero, ou aceitar o par NULL/0. Ambas são defensáveis quando o contrato é explícito e testado.",
        tests: [{ label: "Par", requirement: "{1,2,3,4} vira {4,3,2,1}." }, { label: "Ímpar", requirement: "{1,2,3} preserva o elemento central." }, { label: "Vazio", requirement: "reverse(NULL, 0) não dereference e retorna sucesso." }, { label: "Inválido", requirement: "reverse(NULL, 2) retorna falha." }],
        hiddenTests: "Inclui um elemento, valores repetidos, aliases de swap iguais e arrays grandes para detectar underflow no índice final."
      },
      {
        id: "c:c-pointers:pointers:challenge",
        kind: "challenge",
        level: 6,
        title: "Mini projeto · Dynamic Integer List",
        prompt: "Implemente lista dinâmica com init, reserve, push, get, remove e destroy; trate overflow antes de realloc e nunca perca o bloco antigo em falha.",
        deliverable: "Biblioteca .h/.c, testes, build com ASan/UBSan, diagrama de size/capacity e experimento comparando crescimento 1,5x e 2x.",
        hints: ["Mantenha 0 <= size <= capacity e data == NULL quando capacity == 0.", "Atribua realloc a um temporário; só faça commit do ponteiro após sucesso.", "Valide requested > SIZE_MAX / sizeof *data antes de multiplicar."],
        reasoning: "O projeto combina pointer arithmetic, ownership, lifetime, overflow e política de crescimento em uma abstração pequena com invariantes mensuráveis.",
        alternatives: "Crescimento 2x reduz a frequência de realocações; 1,5x pode reduzir memória ociosa. O melhor fator depende do workload e deve ser medido sem universalizar um microbenchmark.",
        tests: [{ label: "Crescimento", requirement: "Push além da capacidade preserva todos os valores." }, { label: "Falha", requirement: "Falha simulada de realloc mantém bloco e estado antigos." }, { label: "Limites", requirement: "Get/remove rejeitam índice >= size." }, { label: "Cleanup", requirement: "Destroy pode ser chamado em lista vazia e zera o estado." }],
        hiddenTests: "Cobrem zero elementos, muitos crescimentos, remoção nas extremidades, overflow aritmético e allocator que falha em pontos diferentes."
      }
    ],
    generatedCode: {
      title: "De int* a endereço efetivo, load e store",
      source: pointerExamples[1]!.code!,
      generated: { language: "asm", filename: "possible-gcc-x86-64-O0.asm", source: `; forma aproximada para *ptr = 50;\nlea     rax, [rbp-12]        ; calcula &value, sem ler value\nmov     QWORD PTR [rbp-8], rax ; ptr = &value\nmov     rax, QWORD PTR [rbp-8] ; carrega o endereço guardado\nmov     DWORD PTR [rax], 50    ; store de 4 bytes no alvo`, explanation: "O tipo int* desaparece como nome, mas influencia largura e endereço efetivo escolhidos pelo compilador." },
      observations: ["LEA calcula &value; ela não faz dereference.", "O primeiro MOV armazena o endereço no objeto ptr.", "O segundo MOV carrega esse endereço para RAX.", "DWORD PTR [rax] seleciona quatro bytes no endereço do alvo."],
      experiment: "Compile com gcc e clang usando -S -masm=intel em -O0 e -O2. Em -O2, o compilador pode provar o resultado e eliminar completamente ptr; isso não significa que ponteiros deixaram de ter a semântica estudada.",
      caveat: "Offsets, registradores e instruções são ilustrativos. ABI, arquitetura, compilador, flags e contexto alteram a saída; valide sempre no artefato real."
    },
    reviewQuestions: [
      "Qual é a diferença entre o endereço armazenado em ptr e o valor produzido por *ptr?",
      "Por que inicializar ptr com NULL evita um wild pointer, mas não autoriza dereference?",
      "Quais quatro condições além de não-null precisam ser consideradas antes de acessar um alvo?",
      "Por que ptr + 1 normalmente avança sizeof *ptr bytes?",
      "O que termina em free: os bits do ponteiro, o storage alocado, o lifetime do objeto ou todos eles?",
      "Como call/ABI costuma transportar um int* e como um store indireto aparece no assembly?"
    ],
    technicalSummary: [
      "T* é um objeto que armazena um endereço capaz de localizar T; ele não armazena automaticamente o valor de T.",
      "&obj forma o endereço; *ptr designa o alvo; ptr->field equivale a (*ptr).field.",
      "Dereference exige endereço válido, objeto vivo, tipo/faixa compatíveis, alinhamento e permissão de acesso.",
      "Aritmética de ponteiros é definida dentro do mesmo array e escala pelo tamanho do tipo apontado.",
      "Ownership determina quem encerra lifetime; aliases não prolongam o objeto e podem ficar dangling.",
      "Na máquina, a abstração vira cálculo/transporte de endereço e loads/stores com larguras concretas."
    ]
  };
}

function smartPointerStudy(base: LessonStudy): LessonStudy {
  const manual: GuideCode = {
    language: "cpp",
    filename: "01_manual_ownership.cpp",
    source: `#include <cstdio>\n\nstruct File {\n    explicit File(const char *path) : handle(std::fopen(path, "rb")) {}\n    std::FILE *handle;\n};\n\nint read_header(const char *path) {\n    File *file = new File(path);\n    if (file->handle == nullptr) {\n        delete file;\n        return 0;\n    }\n    // cada novo return/exception precisa lembrar do delete\n    delete file;\n    return 1;\n}`,
    explanation: "O código pode ser tornado correto, mas ownership está espalhado pelo control flow. Cada saída adicionada precisa liberar exatamente uma vez."
  };
  const unique: GuideCode = {
    language: "cpp",
    filename: "02_unique_ptr.cpp",
    source: `#include <cstdio>\n#include <memory>\n\nstruct FileCloser {\n    void operator()(std::FILE *file) const noexcept {\n        if (file != nullptr) std::fclose(file);\n    }\n};\nusing UniqueFile = std::unique_ptr<std::FILE, FileCloser>;\n\nint read_header(const char *path) {\n    UniqueFile file{std::fopen(path, "rb")};\n    if (!file) return 0;\n    unsigned char header[4]{};\n    return std::fread(header, 1, sizeof header, file.get()) == sizeof header;\n}`,
    explanation: "unique_ptr modela exatamente um owner e o deleter traduz fim de scope para fclose. Returns antecipados e exceptions percorrem o destructor."
  };
  const borrowed: GuideCode = {
    language: "cpp",
    filename: "03_borrowing.cpp",
    source: `#include <memory>\n#include <string_view>\n\nstruct Texture {\n    void set_label(std::string_view label);\n};\n\nvoid label(Texture& texture) {\n    texture.set_label("player");\n}\n\nint main() {\n    auto owner = std::make_unique<Texture>();\n    label(*owner); // referência emprestada; ownership não muda\n}`,
    explanation: "Nem toda função precisa receber unique_ptr. Texture& expressa uso temporário não nulo; o owner continua em main."
  };
  const shared: GuideCode = {
    language: "cpp",
    filename: "04_shared_and_weak.cpp",
    source: `#include <memory>\n\nstruct Session;\nstruct Observer { std::weak_ptr<Session> session; };\nstruct Session { std::shared_ptr<Observer> observer; };\n\nvoid notify(const std::weak_ptr<Session>& weak) {\n    if (auto session = weak.lock()) {\n        // shared temporário mantém Session viva neste bloco\n    }\n}`,
    explanation: "shared_ptr representa ownership compartilhado no control block; weak_ptr observa sem aumentar a contagem forte e permite detectar expiração."
  };
  return {
    ...base,
    motivation: "std::unique_ptr não é apenas uma forma moderna de escrever delete. Ele muda o modelo: ownership exclusivo passa a fazer parte do tipo, destruição segue o control flow por RAII e transferências precisam usar move. shared_ptr resolve outro problema — vários owners reais — com control block, contadores e risco de ciclos; por isso não é substituto automático de unique_ptr.",
    realUses: ["arquivos e sockets", "recursos de GPU", "árvores e ownership de nós", "plugins", "objetos de UI", "handles nativos", "injeção de dependências", "tarefas assíncronas"],
    examples: [
      { id: "manual", level: "Primeiro contato", title: "1 · Ownership manual com new/delete", purpose: "Torne visível a obrigação que a versão RAII eliminará do control flow.", code: manual, expected: "Todo caminho precisa executar exatamente um delete; adicionar uma saída sem cleanup cria leak.", observations: ["Marque quem é o owner após new.", "Conte quantos caminhos de saída exigem cleanup."] },
      { id: "unique", level: "Intermediário", title: "2 · unique_ptr e deleter específico do recurso", purpose: "Vincule ownership e cleanup ao lifetime do objeto C++.", code: unique, expected: "fclose ocorre uma vez tanto no sucesso quanto no return antecipado, sem delete/fclose explícito no corpo.", observations: ["O deleter faz parte do tipo de UniqueFile.", "get() empresta FILE* para fread sem transferir ownership."], lineExplanations: [
        { line: 4, title: "Política de destruição", detail: "O functor descreve como encerrar o recurso C FILE*. noexcept evita que cleanup lance durante unwinding." },
        { line: 9, title: "Ownership no tipo", detail: "unique_ptr contém o ponteiro e invoca FileCloser ao ser destruído; cópia é desabilitada." },
        { line: 12, title: "Aquisição imediatamente guardada", detail: "O resultado de fopen entra diretamente no owner. Não existe janela intermediária em que um return esquece o recurso." },
        { line: 15, title: "Borrow explícito", detail: "get() expõe o ponteiro sem liberar nem transferir ownership. O FILE* só é válido enquanto file estiver vivo." }
      ] },
      { id: "borrow", level: "Intermediário", title: "3 · Passe acesso, não ownership", purpose: "Escolha parâmetro pela semântica: referência para borrow, unique_ptr para transferência.", code: borrowed, expected: "label usa Texture durante a chamada; owner continua sendo o único responsável pela destruição.", observations: ["*owner produz Texture& sem mover o smart pointer.", "Se null fosse estado válido, use Texture* observador e valide explicitamente."] },
      { id: "shared", level: "Situação real", title: "4 · shared_ptr somente para owners realmente compartilhados", purpose: "Mostre control block, lock de weak_ptr e prevenção de ciclos.", code: shared, expected: "notify só usa Session se ainda existir; weak_ptr não impede destruição quando o último shared_ptr desaparece.", observations: ["lock faz incremento atômico condicional da contagem forte.", "shared_ptr costuma custar control block e operações atômicas; meça quando performance for relevante."] }
    ],
    mistakes: [{
      title: "Ciclo de shared_ptr mantém objetos inalcançáveis vivos",
      question: "Se nenhum código externo possui os objetos, por que os destructors não executam?",
      wrong: { language: "cpp", filename: "shared_cycle.cpp", source: `#include <memory>\nstruct B;\nstruct A { std::shared_ptr<B> b; };\nstruct B { std::shared_ptr<A> a; };\n\nint main() {\n    auto a = std::make_shared<A>();\n    auto b = std::make_shared<B>();\n    a->b = b;\n    b->a = a;\n}`, explanation: "A e B mantêm contagens fortes um do outro. Sair de main remove owners externos, mas o ciclo preserva use_count > 0." },
      symptom: "Destructors não executam e recursos pertencentes aos objetos permanecem vivos até o fim do processo.",
      cause: "Reference counting local não detecta ciclos. Pelo menos uma aresta que não representa ownership precisa ser observadora.",
      corrected: { language: "cpp", filename: "weak_edge.cpp", source: `#include <memory>\nstruct B;\nstruct A { std::shared_ptr<B> b; };\nstruct B { std::weak_ptr<A> a; };\n\nint main() {\n    auto a = std::make_shared<A>();\n    auto b = std::make_shared<B>();\n    a->b = b;\n    b->a = a;\n}`, explanation: "B observa A sem prolongar seu lifetime. A direção de ownership precisa refletir a arquitetura real, não ser escolhida apenas para eliminar o leak." },
      tradeOff: "weak_ptr exige lock e tratamento de expiração. Outra solução é redesenhar a relação com owner único e referências/IDs não proprietários, frequentemente mais simples."
    }],
    prediction: {
      title: "O que existe depois do move?",
      prompt: "Preveja quais ponteiros estão nulos, quem possui o int e qual linha faria o objeto ser destruído.",
      code: { language: "cpp", filename: "predict_move.cpp", source: `#include <memory>\n\nint main() {\n    auto first = std::make_unique<int>(10);\n    auto second = std::move(first);\n    *second += 5;\n}`, explanation: "std::move habilita o move constructor; a operação concreta de unique_ptr transfere o ponteiro e zera a origem." },
      answer: "second possui o int 15; first fica vazio (first.get() == nullptr).",
      explanation: "O objeto int não foi movido nem copiado: seu endereço é transferido entre owners. Ao sair do scope, second destrói o int; first é destruído com estado vazio."
    },
    generatedCode: {
      title: "RAII vira cleanup em todos os caminhos",
      source: unique,
      generated: { language: "asm", filename: "conceptual-cleanup.asm", source: `call    fopen\ntest    rax, rax\nje      .return_false\n; fread(handle)\ncall    fread\n; caminho comum de destruição inserido pelo compilador\nmov     rdi, rbx\ncall    fclose\nret`, explanation: "O compilador materializa a semântica do destructor onde necessário. Otimização pode reorganizar ou inlinear as chamadas." },
      observations: ["Procure o cleanup no sucesso e em cada saída após a aquisição.", "Verifique se move elimina a destruição pelo owner antigo.", "Compare tamanho de unique_ptr com deleter vazio e deleter stateful."],
      experiment: "Adicione um return e uma exception depois da aquisição, instrumente o deleter e compare -O0/-O2. Em seguida, repita manualmente e conte caminhos de cleanup.",
      caveat: "A ordem de destruição é regra da linguagem; a forma exata das instruções, inline e exception tables depende do ABI, compilador e flags."
    },
    technicalSummary: [
      "unique_ptr representa ownership exclusivo, não pode ser copiado e transfere ownership por move.",
      "make_unique reduz repetição e evita janelas de ownership em expressões mais complexas.",
      "Passe T&/T* para borrow; passe unique_ptr<T> por valor somente quando a função recebe ownership.",
      "shared_ptr representa múltiplos owners reais e adiciona control block/contagem; weak_ptr observa e quebra ciclos.",
      "RAII funciona para qualquer recurso com acquire/release, não apenas memória alocada por new.",
      "Smart pointer não corrige arquitetura de lifetime ambígua: a direção de ownership precisa ser projetada."
    ]
  };
}

function movLeaStudy(base: LessonStudy): LessonStudy {
  const immediate: GuideCode = {
    language: "asm",
    filename: "01_mov_immediate.asm",
    source: `bits 64\nmov eax, 10 ; B8 0A 00 00 00`,
    explanation: "Destino é EAX, origem é immediate 10, largura é 32 bits. Escrever EAX zera RAX[63:32]; MOV não altera flags."
  };
  const partial: GuideCode = {
    language: "asm",
    filename: "02_subregisters.asm",
    source: `mov rax, 0x1122334455667788\nmov ax,  0xFFFF\n; RAX = 0x112233445566FFFF\nmov eax, 1\n; RAX = 0x0000000000000001`,
    explanation: "Writes de 16 bits preservam os bits superiores; writes de 32 bits zeram a metade superior. Essa diferença é parte da ISA x86-64."
  };
  const address: GuideCode = {
    language: "asm",
    filename: "03_mov_vs_lea.asm",
    source: `; RDI = base de int32_t, RCX = índice\nlea rax, [rdi + rcx*4] ; calcula endereço, não lê memória\nmov edx, [rdi + rcx*4] ; lê 4 bytes nesse endereço\nmov [rax], edx         ; grava 4 bytes pelo endereço calculado`,
    explanation: "A mesma fórmula de endereço pode ser usada por LEA como aritmética ou por MOV como memory operand. O colchete não implica acesso quando pertence a LEA."
  };
  return {
    ...base,
    motivation: "MOV parece simples porque o nome sugere 'mover', mas o aprendizado começa ao perguntar quatro coisas: qual é o destino, qual é a origem, qual é a largura e que estado arquitetural muda. LEA usa a unidade de cálculo de endereços sem dereference. Distinguir as duas operações conecta variáveis, ponteiros, arrays e código de máquina.",
    realUses: ["carregar constantes", "passar argumentos pela ABI", "ler e gravar structs", "pointer arithmetic", "prólogos/epílogos", "compilação de C", "debugging", "decodificação de machine code"],
    examples: [
      { id: "mov-immediate", level: "Primeiro contato", title: "1 · mov eax, 10", purpose: "Leia destino, origem, largura, codificação e efeito colateral em RAX.", code: immediate, expected: "RAX termina em 10 (0xA); RFLAGS permanece inalterado.", observations: ["B8+rd codifica MOV r32, imm32; 0A 00 00 00 está em little-endian.", "No debugger, compare RAX inteiro antes/depois, não apenas EAX."] , lineExplanations: [{ line: 2, title: "MOV r32, imm32", detail: "B8 seleciona EAX e os quatro bytes seguintes codificam 10. A escrita de EAX zera os 32 bits superiores de RAX.", effect: "RAX=0x000000000000000A; flags não mudam." }] },
      { id: "subregister", level: "Intermediário", title: "2 · Escritas parciais não são todas iguais", purpose: "Compare AX e EAX para evitar resíduos inesperados nos bits superiores.", code: partial, expected: "Depois de AX, RAX preserva 0x112233445566; depois de EAX, RAX vira exatamente 1.", observations: ["AL/AX não limpam automaticamente o restante de RAX.", "Escrever EAX é uma forma comum de produzir valor zero-extended sem dependência dos bits antigos."] },
      { id: "lea-address", level: "Situação real", title: "3 · Array: endereço calculado versus conteúdo carregado", purpose: "Conecte &values[i] a LEA e values[i] a um MOV com memory operand.", code: address, expected: "RAX recebe base+i*4; EDX recebe o int32_t armazenado nesse endereço; o terceiro MOV escreve pelo endereço.", observations: ["A escala válida no addressing mode é 1, 2, 4 ou 8.", "LEA não acessa página nem altera flags; MOV com [endereço] pode faultar."] }
    ],
    mistakes: [{
      title: "Confundir endereço com conteúdo",
      question: "Qual linha acessa a memória e qual apenas calcula um número?",
      wrong: { language: "asm", filename: "wrong_address.asm", source: `; intenção: obter &values[i]\nmov rax, [rdi + rcx*4]`, explanation: "MOV lê oito bytes da memória (pela largura de RAX). Ele não retorna o endereço efetivo e ainda usa largura incompatível com int32_t." },
      symptom: "RAX recebe dados do array/bytes adjacentes em vez do endereço; o valor pode parecer um endereço e causar falha em uso posterior.",
      cause: "Colchetes em memory operand pedem dereference. O destino RAX determina um load de 64 bits nesta sintaxe Intel.",
      corrected: { language: "asm", filename: "correct_address.asm", source: `; &values[i]\nlea rax, [rdi + rcx*4]\n; values[i]\nmov edx, [rdi + rcx*4]`, explanation: "LEA retorna o endereço; MOV EDX lê exatamente quatro bytes do int32_t." },
      tradeOff: "LEA também pode fazer aritmética sem memória, mas não é universalmente mais rápido que ADD; escolha pela semântica e meça em microarquitetura relevante."
    }],
    prediction: {
      title: "Preveja registradores e flags",
      prompt: "Partindo do estado indicado, escreva RAX final e diga se ZF muda. Não execute antes de decompor as larguras.",
      code: { language: "asm", filename: "predict.asm", source: `; RAX = 0xFFFFFFFFFFFFFFFF, ZF = 1\nmov ax, 0\nmov eax, 10`, explanation: "A primeira escrita modifica só 16 bits; a segunda escreve 32 e zera a metade superior. MOV não toca flags." },
      answer: "RAX=0x000000000000000A e ZF continua 1, porque MOV não modifica as flags.",
      explanation: "mov ax,0 produz inicialmente 0xFFFFFFFFFFFF0000. Depois mov eax,10 substitui os 32 bits baixos e, pela regra x86-64, zera os altos. Nenhum MOV altera ZF."
    },
    generatedCode: {
      title: "Opcode, immediate e estado no debugger",
      source: immediate,
      generated: { language: "text", filename: "decode.txt", source: `VA/RIP       0x401000\nBYTES        B8 0A 00 00 00\nOPCODE       B8+rd · MOV r32, imm32 · rd=EAX\nOPERANDS     dst=EAX · src=0x0000000A\nWRITE        EAX=10 and implicit RAX[63:32]=0\nFLAGS        unchanged\nNEXT RIP     0x401005`, explanation: "A instrução ocupa cinco bytes neste encoding. Outros encodings de MOV usam REX, ModR/M, displacement ou immediate de tamanhos diferentes." },
      observations: ["O debugger mostra mnemonic derivado dos bytes, não armazena o texto source no fluxo de instruções.", "RIP avança pelo comprimento decodificado de cinco bytes.", "Confirme flags antes/depois; não presuma que qualquer instrução que escreve zero define ZF."],
      experiment: "Monte com NASM, inspecione com ndisasm/objdump e altere EAX para RAX, AX e AL. Compare prefixos, tamanhos e efeitos em bits superiores.",
      caveat: "A codificação B8 0A 00 00 00 vale para este operando/forma. Endereço, assembler, formato do objeto e escolha de encoding podem mudar."
    },
    technicalSummary: [
      "MOV copia origem para destino; não existe memory-to-memory MOV geral e flags não são alteradas.",
      "A largura vem dos operandos/sintaxe; escrever EAX zera RAX[63:32], enquanto AX/AL preservam os bits superiores.",
      "LEA calcula um endereço efetivo sem acessar a memória e sem alterar flags.",
      "[base + index*scale + displacement] é uma fórmula de endereço; com MOV ocorre load/store, com LEA apenas o cálculo.",
      "Machine code combina opcode e, conforme a forma, REX, ModR/M, SIB, displacement e immediate.",
      "A confirmação correta usa bytes, disassembly e single-step com snapshot de registradores/flags."
    ]
  };
}

function tcpSocketStudy(base: LessonStudy): LessonStudy {
  const firstSocket: GuideCode = {
    language: "c",
    filename: "01_first_socket.c",
    source: `#include <errno.h>\n#include <stdio.h>\n#include <sys/socket.h>\n#include <unistd.h>\n\nint main(void) {\n    int socket_fd = socket(AF_INET, SOCK_STREAM, 0);\n    if (socket_fd == -1) {\n        perror("socket");\n        return 1;\n    }\n    printf("socket fd=%d\\n", socket_fd);\n    if (close(socket_fd) == -1) {\n        perror("close");\n        return 2;\n    }\n}`,
    explanation: "socket cria um endpoint TCP no kernel e devolve um file descriptor do processo. Ainda não existe conexão; close encerra o owner local."
  };
  const sendAll: GuideCode = {
    language: "c",
    filename: "02_send_all.c",
    source: `#include <errno.h>\n#include <stddef.h>\n#include <sys/socket.h>\n\nint send_all(int fd, const void *data, size_t size) {\n    const unsigned char *cursor = data;\n    while (size > 0) {\n        ssize_t sent = send(fd, cursor, size, 0);\n        if (sent > 0) {\n            cursor += (size_t)sent;\n            size -= (size_t)sent;\n        } else if (sent == -1 && errno == EINTR) {\n            continue;\n        } else {\n            return 0;\n        }\n    }\n    return 1;\n}`,
    explanation: "send confirma quantos bytes aceitou no buffer do kernel, não quantos chegaram ao peer. O loop preserva cursor+size como faixa restante."
  };
  const framed: GuideCode = {
    language: "c",
    filename: "03_length_prefix.c",
    source: `#include <arpa/inet.h>\n#include <stdint.h>\n#include <string.h>\n\n#define MAX_PAYLOAD 4096u\n\nint encode_frame(unsigned char *out, size_t capacity,\n                 uint8_t type, const void *payload, uint32_t length) {\n    if (length > MAX_PAYLOAD || capacity < 5u + length) return 0;\n    uint32_t network_length = htonl(length);\n    memcpy(out, &network_length, sizeof network_length);\n    out[4] = type;\n    memcpy(out + 5, payload, length);\n    return 1;\n}`,
    explanation: "O frame é length(4, network order) | type(1) | payload. memcpy evita alinhamento/aliasing indevidos e length é validado antes da soma/uso."
  };
  const parser: GuideCode = {
    language: "c",
    filename: "04_incremental_parser.c",
    source: `enum ParseResult { NEED_MORE, FRAME_READY, INVALID };\n\nenum ParseResult parse(const unsigned char *buffer, size_t used,\n                       uint8_t *type, uint32_t *length) {\n    if (used < 5) return NEED_MORE;\n    uint32_t encoded = 0;\n    memcpy(&encoded, buffer, sizeof encoded);\n    *length = ntohl(encoded);\n    if (*length > MAX_PAYLOAD) return INVALID;\n    if (used < 5u + *length) return NEED_MORE;\n    *type = buffer[4];\n    return FRAME_READY;\n}`,
    explanation: "O parser representa explicitamente estado incompleto. TCP pode entregar qualquer prefixo; apenas depois do header e payload completos existe uma mensagem."
  };
  return {
    ...base,
    motivation: "Um socket TCP expõe um stream bidirecional de bytes, não uma fila de mensagens. socket/connect/accept estabelecem endpoints e conexão; send/recv movem quantidades parciais entre buffers; framing e parsing pertencem ao protocolo da aplicação. Ensinar apenas uma chamada feliz cria servidores que quebram sob fragmentação, desconexão ou input hostil.",
    realUses: ["serviços HTTP", "chat", "transferência de arquivos", "protocolos de jogos", "telemetria", "bancos de dados", "RPC", "sistemas distribuídos"],
    examples: [
      { id: "first-socket", level: "Primeiro contato", title: "1 · Crie e feche o primeiro endpoint", purpose: "Separe criação do objeto socket de conexão, envio e recebimento.", code: firstSocket, expected: "Um descriptor não negativo é impresso e fechado; strace mostra socket(...) e close(...).", observations: ["O número do fd só tem significado no processo atual.", "Falha é -1; errno só é lido depois desse retorno."] },
      { id: "send-all", level: "Intermediário", title: "2 · Trate partial send e EINTR", purpose: "Transforme uma operação desejada de N bytes em várias chamadas observáveis.", code: sendAll, expected: "Sucesso apenas quando size chega a zero; qualquer falha real retorna 0 sem fingir que o frame inteiro foi aceito.", observations: ["cursor avança exatamente sent bytes.", "sent positivo menor que size é resultado válido, não erro."], lineExplanations: [
        { line: 6, title: "Faixa restante", detail: "cursor aponta para o primeiro byte ainda não aceito; size conta quantos faltam. Juntos formam o invariante do loop." },
        { line: 8, title: "Pedido, não garantia", detail: "send pode aceitar de 1 a size bytes; o retorno mede cópia/aceite local, não entrega remota." },
        { line: 10, title: "Commit parcial", detail: "O cursor avança pelo número realmente aceito, preservando bytes ainda pendentes." },
        { line: 13, title: "Interrupção transitória", detail: "EINTR permite repetir sem consumir bytes. Outros erros encerram o protocolo conforme política do caller." }
      ] },
      { id: "frame", level: "Intermediário", title: "3 · Construa Length + Type + Payload", purpose: "Crie limites de mensagem sobre o stream e normalize endian.", code: framed, expected: "O buffer começa com length big-endian, depois type e exatamente length bytes de payload.", observations: ["O receptor valida MAX_PAYLOAD antes de reservar/copiar.", "Nunca serialize struct C bruta como wire format: padding e endian não são contrato portátil."] },
      { id: "parser", level: "Situação real", title: "4 · Faça parsing incremental", purpose: "Modele header incompleto, payload incompleto, frame pronto e pacote inválido.", code: parser, expected: "Qualquer prefixo menor que o frame retorna NEED_MORE sem ler fora da faixa; tamanho excessivo retorna INVALID.", observations: ["Dois frames podem chegar em um único recv e um frame pode exigir muitos recv.", "Depois de FRAME_READY, preserve bytes excedentes para o próximo frame."] }
    ],
    visualization: {
      title: "Uma mensagem da aplicação atravessa várias filas e pode chegar fragmentada",
      caption: "As divisões abaixo são conceituais. Chamadas, segmentos e pacotes não possuem relação um-para-um.",
      before: ["client buffer · frame 9 bytes", "send(fd, frame, 9) pode retornar 4", "5 bytes ainda pertencem à aplicação"],
      operation: "TCP stream · buffers do kernel · segmentos · ACK · recv parcial",
      after: ["server buffer recebe 2 + 7 bytes em chamadas distintas", "parser acumula header + payload", "somente então existe um frame TYPE/PAYLOAD"]
    },
    mistakes: [{
      title: "Uma chamada recv não equivale a uma mensagem",
      question: "O que acontece se o header chegar em 2 bytes e o payload junto do próximo frame?",
      wrong: { language: "c", filename: "wrong_recv.c", source: `char message[1024];\nssize_t n = recv(fd, message, sizeof message, 0);\nif (n > 0) handle_message(message, (size_t)n);`, explanation: "O código entrega qualquer chunk como mensagem completa e ignora framing, múltiplos frames, EOF, erro e limites semânticos." },
      symptom: "Funciona em localhost/casos pequenos, mas quebra sob fragmentação, coalescência, atraso ou payload maior que o buffer.",
      cause: "TCP preserva ordem dos bytes, não as fronteiras das chamadas send feitas pelo peer.",
      corrected: { language: "c", filename: "receive_state_machine.c", source: `for (;;) {\n    ssize_t n = recv(fd, buffer + used, capacity - used, 0);\n    if (n > 0) {\n        used += (size_t)n;\n        consume_complete_frames(buffer, &used);\n    } else if (n == 0) {\n        break; /* orderly shutdown */\n    } else if (errno != EINTR) {\n        return CONNECTION_ERROR;\n    }\n}`, explanation: "O acumulador preserva prefixos incompletos e o parser consome zero ou mais frames completos por iteração." },
      tradeOff: "Buffer linear com memmove é simples; ring buffer reduz cópias, mas aumenta complexidade de índices. Comece correto, meça e só então troque a estrutura."
    }],
    prediction: {
      title: "Quantas mensagens o servidor recebeu?",
      prompt: "O client chama send duas vezes; o servidor recebe 3, 8 e 7 bytes. Preveja quantos frames completos o parser produz após cada recv.",
      code: { language: "text", filename: "stream.txt", source: `client: send([len=5,type=1,"HELLO"], 10)\nclient: send([len=3,type=2,"BYE"],   8)\nserver recv sizes: 3 → 8 → 7 bytes`, explanation: "Cada frame usa header de 5 bytes. O stream total tem 18 bytes, mas os chunks do recv cortam as fronteiras arbitrariamente." },
      answer: "Após 3 bytes: 0 frames. Após mais 8 (11 acumulados): 1 frame e 1 byte restante. Após mais 7: o segundo frame fica completo.",
      explanation: "O primeiro frame ocupa 10 bytes. O segundo começa no byte 11 do stream e ocupa 8; o parser deve preservar o byte excedente entre chamadas."
    },
    generatedCode: {
      title: "Da chamada ao byte validado pelo parser",
      source: framed,
      generated: { language: "text", filename: "tcp-layers.txt", source: `APP FRAME       00 00 00 05 | 01 | 48 45 4C 4C 4F\nSEND LOOP       aceita prefixos até completar 10 bytes\nKERNEL SOCKET   copia/queue, aplica flow e congestion control\nTCP SEGMENTS    sequence numbers preservam ordem; boundaries variam\nRECV BUFFER     entrega qualquer quantidade disponível\nPARSER          length=5, type=1, payload="HELLO" após validação`, explanation: "Framing é propriedade da aplicação. TCP transporta o stream e não interpreta Length, Type ou Payload." },
      observations: ["Correlacione retorno de send/recv com offsets no buffer.", "Na captura, use sequence/ACK para localizar bytes, não para inferir chamadas.", "Meça timeout e estado do parser quando o peer desconecta no meio do frame."],
      experiment: "Force recv de 1–3 bytes por iteração, envie dois frames juntos, desconecte no meio do payload e injete length acima do limite. O parser deve permanecer determinístico.",
      caveat: "Tamanho de segmentos, coalescing, delayed ACK e comportamento de buffering variam. Nunca codifique uma suposição observada em localhost como contrato TCP."
    },
    technicalSummary: [
      "socket cria um endpoint; connect/accept estabelecem uma conexão TCP com estado em ambos os hosts.",
      "TCP preserva ordem e confiabilidade do stream, não fronteiras de mensagens nem correspondência entre send e recv.",
      "send/recv podem transferir parcialmente; loops mantêm cursor, bytes restantes e tratamento de EINTR/EOF/erro.",
      "Protocolos precisam de framing, limites, endian, validação e estado incremental antes de interpretar payload.",
      "Length-prefix permite payload binário, mas length não confiável deve ser limitado antes de alocação ou soma.",
      "Teste fragmentação, coalescência, disconnect parcial, timeout e múltiplos frames em uma leitura."
    ]
  };
}

function virtualAllocStudy(base: LessonStudy): LessonStudy {
  const reserve: GuideCode = {
    language: "cpp",
    filename: "01_reserve_commit.cpp",
    source: `#include <Windows.h>\n#include <cstdio>\n\nint main() {\n    SYSTEM_INFO system{};\n    GetSystemInfo(&system);\n    SIZE_T size = static_cast<SIZE_T>(system.dwPageSize) * 8;\n\n    void* base = VirtualAlloc(nullptr, size, MEM_RESERVE, PAGE_NOACCESS);\n    if (!base) { std::printf("reserve error=%lu\\n", GetLastError()); return 1; }\n\n    void* page = VirtualAlloc(base, system.dwPageSize, MEM_COMMIT, PAGE_READWRITE);\n    if (!page) { VirtualFree(base, 0, MEM_RELEASE); return 2; }\n    static_cast<int*>(page)[0] = 42;\n\n    VirtualFree(base, 0, MEM_RELEASE);\n}`,
    explanation: "Reserve escolhe uma faixa de VA; commit torna a primeira página acessível com backing conforme a política do sistema. MEM_RELEASE usa a base original e size zero."
  };
  const protect: GuideCode = {
    language: "cpp",
    filename: "02_protection.cpp",
    source: `DWORD previous = 0;\nif (!VirtualProtect(page, page_size, PAGE_READONLY, &previous)) {\n    std::printf("protect error=%lu\\n", GetLastError());\n    return 1;\n}\nstd::printf("old=0x%lx value=%d\\n", previous, *static_cast<int*>(page));\n// escrever aqui provocaria access violation; não faça fora do laboratório`,
    explanation: "VirtualProtect troca a permissão efetiva das páginas comprometidas e devolve a proteção anterior. Leitura permanece válida; store não."
  };
  const query: GuideCode = {
    language: "cpp",
    filename: "03_query.cpp",
    source: `MEMORY_BASIC_INFORMATION info{};\nSIZE_T bytes = VirtualQuery(page, &info, sizeof info);\nif (bytes == sizeof info) {\n    std::printf("base=%p size=%zu state=0x%lx protect=0x%lx type=0x%lx\\n",\n        info.BaseAddress, static_cast<size_t>(info.RegionSize),\n        info.State, info.Protect, info.Type);\n}`,
    explanation: "VirtualQuery agrupa páginas consecutivas com atributos iguais. RegionSize pode ser diferente do tamanho pedido após mudanças de estado/proteção."
  };
  return {
    ...base,
    motivation: "VirtualAlloc separa três decisões frequentemente confundidas: reservar um intervalo de endereços virtuais, comprometer páginas utilizáveis e escolher proteção. Essa separação sustenta arenas, stacks, heaps, loaders e grandes buffers esparsos. O laboratório altera apenas memória do próprio processo e reduz permissões para estudar o contrato com segurança.",
    realUses: ["arenas e memory pools", "stacks de threads", "JITs controlados", "loaders", "grandes buffers esparsos", "guard pages", "memory-mapped runtimes", "diagnóstico de regiões"],
    examples: [
      { id: "reserve", level: "Primeiro contato", title: "1 · Reserve oito páginas e commit apenas uma", purpose: "Observe que faixa virtual, página comprometida e RAM residente não são sinônimos.", code: reserve, expected: "A primeira página aceita o store 42; as outras sete continuam reservadas/PAGE_NOACCESS; toda a reserva é liberada.", observations: ["Use VirtualQuery antes/depois do commit para ver a divisão em regiões.", "Endereço base e page size são medidos, nunca fixados no material."] },
      { id: "protect", level: "Intermediário", title: "2 · Reduza RW para read-only", purpose: "Conecte política de proteção ao check da MMU e a uma access violation controlada.", code: protect, expected: "VirtualProtect retorna não zero, previous descreve PAGE_READWRITE e a leitura de 42 funciona.", observations: ["A proteção opera em páginas e o endereço/tamanho são ajustados ao intervalo afetado.", "Use GetLastError somente se VirtualProtect retornar zero."] },
      { id: "query", level: "Situação real", title: "3 · Inspecione o mapa em vez de presumir", purpose: "Leia base, tamanho, state, protection e type da região real.", code: query, expected: "MEMORY_BASIC_INFORMATION descreve uma região contígua com atributos uniformes contendo page.", observations: ["BaseAddress pode anteceder o ponteiro consultado.", "RegionSize termina quando qualquer atributo relevante muda."] }
    ],
    mistakes: [{
      title: "MEM_RELEASE com endereço/tamanho incorretos",
      question: "Qual valor identifica a reserva inteira e por que o size precisa ser zero?",
      wrong: { language: "cpp", filename: "wrong_release.cpp", source: `void* middle = static_cast<unsigned char*>(base) + page_size;\nVirtualFree(middle, page_size, MEM_RELEASE);`, explanation: "MEM_RELEASE exige o endereço base devolvido por MEM_RESERVE e dwSize igual a zero." },
      symptom: "VirtualFree falha e a reserva continua pertencendo ao processo; ignorar o retorno transforma isso em leak de VA.",
      cause: "Decommit parcial e release da reserva inteira são operações diferentes com contratos diferentes.",
      corrected: { language: "cpp", filename: "correct_release.cpp", source: `if (!VirtualFree(base, 0, MEM_RELEASE)) {\n    std::printf("release error=%lu\\n", GetLastError());\n    return 1;\n}`, explanation: "A base original identifica a reserva; zero significa liberar a região reservada completa." },
      tradeOff: "Use MEM_DECOMMIT com subrange alinhado quando quiser manter a faixa reservada para reutilização; use MEM_RELEASE quando o allocator encerra a reserva."
    }],
    prediction: {
      title: "Qual acesso é válido em cada estado?",
      prompt: "Preveja o resultado de leitura e escrita depois de reserve, depois de commit RW e depois de VirtualProtect R.",
      code: { language: "text", filename: "states.txt", source: `A · MEM_RESERVE + PAGE_NOACCESS\nB · MEM_COMMIT  + PAGE_READWRITE\nC · MEM_COMMIT  + PAGE_READONLY`, explanation: "Considere acesso da própria thread e ausência de races; diferencie validade arquitetural de valor inicial lógico." },
      answer: "A: nem leitura nem escrita. B: ambas. C: leitura sim, escrita provoca access violation.",
      explanation: "Reserve apenas ocupa VA. Commit cria páginas utilizáveis com a proteção pedida; VirtualProtect altera o check de acesso. Páginas committed inicialmente são zero-filled no primeiro uso conforme contrato do Windows."
    },
    generatedCode: {
      title: "Da VAD à tradução e proteção da página",
      source: reserve,
      generated: { language: "text", filename: "virtual-memory-path.txt", source: `VirtualAlloc(MEM_RESERVE)\n  → memory manager escolhe VA livre e registra a região/VAD\nVirtualAlloc(MEM_COMMIT)\n  → estado committed + backing sob demanda\nstore [virtual address]\n  → TLB/page-table walk → permission check → possível page fault\nVirtualProtect(PAGE_READONLY)\n  → atualiza proteção, invalida traduções necessárias\nVirtualFree(MEM_RELEASE)\n  → remove reserva inteira`, explanation: "Detalhes internos variam por versão; a API documentada é o contrato estável."
      },
      observations: ["Separe retorno da API, estado reportado por VirtualQuery e residência física.", "Observe page faults ao tocar uma página por vez.", "Confirme que uma redução de permissão altera o acesso, não o valor armazenado."],
      experiment: "Reserve 64 MiB, faça commit de uma página a cada 1 MiB e registre VirtualQuery, working set e page faults. Não conclua que reserve consome RAM pelo tamanho do VA.",
      caveat: "VAD, PTE, commit charge e working set são conceitos relacionados, mas não idênticos; implementação interna e ferramentas variam por versão do Windows."
    },
    technicalSummary: [
      "MEM_RESERVE seleciona VA; MEM_COMMIT torna páginas utilizáveis; tocar a página e torná-la residente é outro evento.",
      "Proteções são aplicadas por página e verificadas na tradução/acesso; PAGE_NOACCESS, RW e R expressam contratos diferentes.",
      "VirtualQuery descreve regiões contíguas de atributos iguais e deve ser usado para observar o estado real.",
      "VirtualProtect reporta proteção anterior e seu retorno deve ser validado antes de GetLastError.",
      "MEM_DECOMMIT preserva reserva; MEM_RELEASE exige base original e size zero para encerrar toda a região.",
      "Alterações executáveis/WX têm implicações de segurança e devem permanecer em laboratórios controlados com política mínima de permissões."
    ]
  };
}

function gpuBufferStudy(base: LessonStudy): LessonStudy {
  const cpuData: GuideCode = {
    language: "cpp",
    filename: "01_vertex_data.cpp",
    source: `struct Vertex {\n    float position[2];\n    float color[3];\n};\n\nconst Vertex vertices[] = {\n    {{ 0.0f,  0.7f}, {1.0f, 0.2f, 0.2f}},\n    {{-0.7f, -0.6f}, {0.2f, 1.0f, 0.3f}},\n    {{ 0.7f, -0.6f}, {0.2f, 0.4f, 1.0f}}\n};`,
    explanation: "A CPU possui três registros Vertex contíguos. O layout C++ precisa ser convertido em uma descrição explícita para o input assembler da GPU."
  };
  const upload: GuideCode = {
    language: "cpp",
    filename: "02_upload.cpp",
    source: `GLuint vao = 0;\nGLuint vbo = 0;\nglGenVertexArrays(1, &vao);\nglGenBuffers(1, &vbo);\n\nglBindVertexArray(vao);\nglBindBuffer(GL_ARRAY_BUFFER, vbo);\nglBufferData(GL_ARRAY_BUFFER, sizeof vertices, vertices, GL_STATIC_DRAW);`,
    explanation: "VBO nomeia storage gerenciado pela implementação e glBufferData fornece tamanho, bytes iniciais e hint de uso. O VAO registra bindings de atributos."
  };
  const layout: GuideCode = {
    language: "cpp",
    filename: "03_layout.cpp",
    source: `static_assert(sizeof(Vertex) == 5 * sizeof(float));\n\nglVertexAttribPointer(\n    0, 2, GL_FLOAT, GL_FALSE, sizeof(Vertex),\n    reinterpret_cast<void*>(offsetof(Vertex, position)));\nglEnableVertexAttribArray(0);\n\nglVertexAttribPointer(\n    1, 3, GL_FLOAT, GL_FALSE, sizeof(Vertex),\n    reinterpret_cast<void*>(offsetof(Vertex, color)));\nglEnableVertexAttribArray(1);`,
    explanation: "Cada atributo define location, componentes, tipo, normalização, stride e offset. offsetof evita duplicar manualmente o layout da struct."
  };
  const draw: GuideCode = {
    language: "cpp",
    filename: "04_draw.cpp",
    source: `glUseProgram(program);\nglBindVertexArray(vao);\nglDrawArrays(GL_TRIANGLES, 0, 3);\n\nGLenum error = glGetError();\nif (error != GL_NO_ERROR) {\n    std::fprintf(stderr, "OpenGL error: 0x%x\\n", error);\n}`, 
    explanation: "O draw consome três registros segundo o VAO e o vertex shader ativo. Debug callback é preferível a polling isolado em aplicações maiores."
  };
  return {
    ...base,
    motivation: "Um vertex buffer existe porque dados produzidos na CPU precisam chegar a storage que a GPU pode consumir com formato, stride e offsets conhecidos. O VBO contém bytes; o VAO descreve como interpretá-los; o shader declara locations/tipos; a draw call conecta contagem e topologia. Pular qualquer elo transforma a tela vazia em um mistério.",
    realUses: ["meshes", "UI batching", "partículas", "terreno", "debug drawing", "instancing", "animação", "uploads de geometria dinâmica"],
    examples: [
      { id: "cpu-data", level: "Primeiro contato", title: "1 · Comece pelos registros na memória da CPU", purpose: "Calcule sizeof, offsets e bytes antes de criar qualquer objeto OpenGL.", code: cpuData, expected: "Três vertices; cada registro contém 2 floats de posição e 3 de cor, normalmente 20 bytes neste layout validado.", observations: ["Use sizeof/offsetof em vez de presumir ausência de padding.", "Os valores ainda não são visíveis pela GPU até o upload/binding apropriado."] },
      { id: "upload", level: "Intermediário", title: "2 · Faça upload para um VBO", purpose: "Separe nome do objeto, binding, alocação e cópia inicial.", code: upload, expected: "VBO possui storage suficiente para vertices e o VAO corrente está pronto para registrar a descrição dos atributos.", observations: ["GL_STATIC_DRAW é hint, não permissão imutável.", "O contexto OpenGL precisa estar current na thread antes dessas chamadas."] },
      { id: "layout", level: "Intermediário", title: "3 · Ensine o input assembler a ler os bytes", purpose: "Ligue a struct C++ às locations do vertex shader sem números mágicos de offset.", code: layout, expected: "Location 0 lê vec2 position; location 1 lê vec3 color; ambos avançam sizeof(Vertex) por registro.", observations: ["O offset é convertido em ponteiro por convenção histórica da API, não é um endereço CPU quando VBO está bound.", "O shader deve declarar tipos/locations compatíveis."] },
      { id: "draw", level: "Situação real", title: "4 · Consuma três registros e diagnostique o frame", purpose: "Conecte program, VAO, topologia, first e count à draw call observável.", code: draw, expected: "Um triângulo é rasterizado se framebuffer, viewport, shaders e estado restante também forem válidos.", observations: ["Capture o frame e inspecione o vertex input real.", "glDrawArrays retorna antes de a GPU necessariamente concluir o trabalho."] }
    ],
    visualization: {
      title: "Por que o vertex buffer existe",
      caption: "A API pode copiar ou gerenciar o storage de forma específica do driver; a cadeia descreve responsabilidades observáveis.",
      before: ["CPU memory · Vertex vertices[3]", "stride=sizeof(Vertex) · offsets medidos", "bytes ainda não associados ao pipeline"],
      operation: "glBufferData upload → VBO → VAO attribute format → vertex fetch",
      after: ["vertex shader recebe position/color por invocation", "rasterizer gera fragments do triângulo", "framebuffer recebe pixels após fragment shader/tests"]
    },
    mistakes: [{
      title: "Stride zero com dados intercalados",
      question: "Onde a GPU procurará a cor do segundo vértice?",
      wrong: { language: "cpp", filename: "wrong_stride.cpp", source: `// Vertex = position[2] + color[3], intercalados\nglVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 0,\n                      reinterpret_cast<void*>(2 * sizeof(float)));`, explanation: "Stride zero significa atributos tightly packed como uma sequência apenas de vec3. Os registros reais têm cinco floats." },
      symptom: "Cores ficam embaralhadas ou posições começam a ser lidas como cor; o draw pode continuar sem erro de API.",
      cause: "O input assembler avança 3*sizeof(float) em vez de sizeof(Vertex) entre cores consecutivas.",
      corrected: { language: "cpp", filename: "correct_stride.cpp", source: `glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, sizeof(Vertex),\n    reinterpret_cast<void*>(offsetof(Vertex, color)));`, explanation: "Stride percorre o registro inteiro e offset localiza o campo color dentro dele." },
      tradeOff: "Interleaving favorece fetch conjunto de atributos usados; buffers separados facilitam atualização seletiva. Escolha pelo uso e confirme no profiler/frame capture."
    }],
    prediction: {
      title: "Qual float chega em cada location?",
      prompt: "Para o segundo Vertex, escreva os valores lidos por location 0 e 1 usando stride 20 e offsets 0/8.",
      code: cpuData,
      answer: "location 0 recebe (-0.7, -0.6); location 1 recebe (0.2, 1.0, 0.3).",
      explanation: "O segundo registro começa 20 bytes após o primeiro. Position começa no offset 0; color, depois de dois floats, no offset 8."
    },
    generatedCode: {
      title: "Do array CPU ao fetch do vertex shader",
      source: layout,
      generated: { language: "text", filename: "vertex-fetch.txt", source: `CPU Vertex[3] (60 bytes)\n  ↓ glBufferData target=ARRAY_BUFFER\nGPU/driver buffer storage (VBO)\n  ↓ VAO: loc0 {float2,stride20,offset0}\n  ↓ VAO: loc1 {float3,stride20,offset8}\nglDrawArrays first=0 count=3\n  ↓ vertex fetch → shader invocations 0..2\nclip positions + interpolated colors → fragments`, explanation: "O VAO não contém necessariamente os vertex bytes; ele registra a configuração que permite buscá-los dos buffers vinculados." },
      observations: ["Inspecione buffer bytes e attribute formats no frame debugger.", "Compare shader input declarado com locations habilitadas.", "Verifique viewport, clipping e framebuffer se o fetch estiver correto mas a tela continuar vazia."],
      experiment: "Troque stride por 0, capture o frame e compare a interpretação. Depois restaure sizeof(Vertex), adicione um EBO e prove como índices reutilizam vertices.",
      caveat: "Placement físico em VRAM, cópias internas e ISA da GPU são decisões do driver/hardware. A API garante comportamento, não um endereço VRAM observável estável."
    },
    technicalSummary: [
      "VBO fornece storage de bytes; VAO registra bindings e formatos de atributos; nenhum deles entende sua struct C++ por conta própria.",
      "Stride avança entre registros; offset localiza o campo; component count/type descrevem a conversão para o shader.",
      "Use sizeof e offsetof para manter layout do source e descrição da API consistentes.",
      "Vertex shader locations precisam concordar com atributos habilitados e formatos do VAO.",
      "Draw call conecta topologia, first/count e estado atual; conclusão da chamada não implica conclusão da GPU.",
      "Frame capture transforma tela vazia em evidência de buffer, pipeline, shader, draw e framebuffer."
    ]
  };
}

function vulkanBootstrapStudy(base: LessonStudy): LessonStudy {
  const instance: GuideCode = {
    language: "cpp",
    filename: "01_instance.cpp",
    source: `VkApplicationInfo app{VK_STRUCTURE_TYPE_APPLICATION_INFO};\napp.pApplicationName = "0xLAB triangle";\napp.apiVersion = VK_API_VERSION_1_3;\n\nVkInstanceCreateInfo create{VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO};\ncreate.pApplicationInfo = &app;\ncreate.enabledExtensionCount = static_cast<uint32_t>(extensions.size());\ncreate.ppEnabledExtensionNames = extensions.data();\ncreate.enabledLayerCount = static_cast<uint32_t>(layers.size());\ncreate.ppEnabledLayerNames = layers.data();\n\nVK_CHECK(vkCreateInstance(&create, nullptr, &instance));`,
    explanation: "Instance estabelece a conexão com o loader e habilita extensões/layers globais. Liste e valide disponibilidade antes de pedir nomes."
  };
  const physical: GuideCode = {
    language: "cpp",
    filename: "02_physical_device.cpp",
    source: `uint32_t count = 0;\nVK_CHECK(vkEnumeratePhysicalDevices(instance, &count, nullptr));\nstd::vector<VkPhysicalDevice> devices(count);\nVK_CHECK(vkEnumeratePhysicalDevices(instance, &count, devices.data()));\n\nfor (VkPhysicalDevice device : devices) {\n    VkPhysicalDeviceProperties properties{};\n    vkGetPhysicalDeviceProperties(device, &properties);\n    // filtre queues, extensões, features, formats e present support\n}`,
    explanation: "VkPhysicalDevice descreve hardware/driver disponível. Seleção correta valida requisitos da aplicação; escolher devices[0] sem checks só desloca a falha."
  };
  const logical: GuideCode = {
    language: "cpp",
    filename: "03_logical_device.cpp",
    source: `float priority = 1.0f;\nVkDeviceQueueCreateInfo queue{VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO};\nqueue.queueFamilyIndex = graphics_family;\nqueue.queueCount = 1;\nqueue.pQueuePriorities = &priority;\n\nVkDeviceCreateInfo create{VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO};\ncreate.queueCreateInfoCount = 1;\ncreate.pQueueCreateInfos = &queue;\ncreate.enabledExtensionCount = static_cast<uint32_t>(device_extensions.size());\ncreate.ppEnabledExtensionNames = device_extensions.data();\n\nVK_CHECK(vkCreateDevice(physical_device, &create, nullptr, &device));\nvkGetDeviceQueue(device, graphics_family, 0, &graphics_queue);`,
    explanation: "VkDevice habilita queues, extensões e features específicas. A queue obtida será a fronteira de submission para command buffers."
  };
  return {
    ...base,
    motivation: "Vulkan não deve começar com 500 linhas. A progressão correta separa loader/instance, surface, physical device, queue families, logical device, swapchain, images/views, render pass ou dynamic rendering, pipeline, command buffers e sincronização. Nesta aula, cada objeto existe porque estabelece um contrato usado pelo próximo — e validation layers ficam ligadas desde o primeiro passo.",
    realUses: ["renderers multiplataforma", "engines", "visualização", "compute", "emuladores", "mobile", "ferramentas de conteúdo", "backends gráficos"],
    examples: [
      { id: "instance", level: "Primeiro contato", title: "1 · Crie apenas a instance", purpose: "Valide layers/extensions e prove comunicação com loader antes de tocar GPU ou swapchain.", code: instance, expected: "vkCreateInstance retorna VK_SUCCESS e o debug messenger relata validação sem erros.", observations: ["Instance extensions vêm da plataforma/window system.", "VK_LAYER_KHRONOS_validation é ferramenta de desenvolvimento, não dependência presumida de produção."] },
      { id: "physical", level: "Intermediário", title: "2 · Enumere e avalie physical devices", purpose: "Escolha por requisitos verificáveis, não por posição na lista.", code: physical, expected: "Cada device é descrito; somente candidatos com queues, extensions, features e surface support necessários permanecem.", observations: ["Enumeration usa padrão count → allocate → fill e pode exigir retry em mudanças concorrentes.", "Propriedade disponível não significa feature habilitada no logical device."] },
      { id: "logical", level: "Situação real", title: "3 · Crie logical device e obtenha a queue", purpose: "Materialize exatamente as capacidades que o renderer usará.", code: logical, expected: "VkDevice e VkQueue válidos; queue family suporta os comandos planejados e extensões pedidas estavam disponíveis.", observations: ["Queues da mesma family compartilham capacidades definidas por flags.", "vkGetDeviceQueue não cria uma nova queue; obtém handle para uma solicitada na criação."] }
    ],
    visualization: {
      title: "Bootstrap em objetos pequenos e dependências explícitas",
      caption: "Cada seta representa uma precondição validada. Surface/swapchain entram depois do device selection e serão aprofundadas em aulas próprias.",
      before: ["loader + lista de layers/extensions", "requisitos: graphics/present + features", "nenhum comando pode ser submetido"],
      operation: "Instance → PhysicalDevice selection → Device → Queue",
      after: ["capabilities habilitadas explicitamente", "queue handle com family/index conhecidos", "base pronta para swapchain e command buffers"]
    },
    mistakes: [{
      title: "Destruir instance antes dos objetos filhos",
      question: "Qual árvore de lifetime ainda depende da instance/device?",
      wrong: { language: "cpp", filename: "wrong_order.cpp", source: `vkDestroyInstance(instance, nullptr);\nvkDestroyDevice(device, nullptr);`, explanation: "Device foi criado a partir de um physical device da instance e precisa ser destruído antes do pai; trabalho da GPU também deve ter terminado." },
      symptom: "Validation layer reporta lifetime violation; sem validação, o comportamento é inválido e pode falhar dentro do driver.",
      cause: "Handles Vulkan têm relações de parent/child e alguns recursos ainda podem estar em uso assíncrono pela GPU.",
      corrected: { language: "cpp", filename: "correct_order.cpp", source: `VK_CHECK(vkDeviceWaitIdle(device)); // simples no shutdown\nvkDestroyDevice(device, nullptr);\nvkDestroyDebugUtilsMessengerEXT(instance, messenger, nullptr);\nvkDestroyInstance(instance, nullptr);`, explanation: "Shutdown destrói dependências em ordem inversa. Em runtime, fences substituem deviceWaitIdle global para evitar stall excessivo." },
      tradeOff: "vkDeviceWaitIdle simplifica encerramento, mas é pesado no frame loop. Lifetime por frame/fences permite liberar quando a GPU realmente terminou."
    }],
    prediction: {
      title: "Disponível, habilitado ou apenas enumerado?",
      prompt: "Uma GPU anuncia uma feature, mas VkDeviceCreateInfo não a habilita. Preveja se um comando que exige a feature é válido.",
      code: { language: "text", filename: "feature-contract.txt", source: `physical device: feature X = VK_TRUE\nlogical device create: feature X omitted/false\ncommand uses feature X`, explanation: "Availability e enablement são etapas distintas no contrato Vulkan." },
      answer: "O comando é inválido: disponibilidade no physical device não habilita a feature no VkDevice.",
      explanation: "A aplicação consulta suporte e depois inclui a feature na cadeia de criação apropriada. Validation layers devem apontar a VUID associada ao uso sem enablement."
    },
    generatedCode: {
      title: "Objetos, validação e dispatch até a queue",
      source: logical,
      generated: { language: "text", filename: "vulkan-bootstrap.txt", source: `app → Vulkan loader\n  instance {extensions, layers, debug messenger}\n    physical device {properties, features, memory, queue families}\n      logical device {enabled features/extensions}\n        queue family[index] → VkQueue\n          later: command buffers → submit → fence/semaphore`, explanation: "Handles despacháveis permitem ao loader/driver encaminhar chamadas. A API não promete que cada handle seja um ponteiro simples." },
      observations: ["Mantenha validation layer ativa e trate cada VUID como contrato específico.", "Registre nomes/versões de loader, driver, device e extensions para reproduzir.", "Desenhe a ordem inversa de destruição antes de adicionar o próximo objeto."] ,
      experiment: "Remova deliberadamente uma extensão requerida e observe vkCreateInstance/vkCreateDevice falhar de forma controlada. Depois tente uma feature não habilitada com validation layer.",
      caveat: "Versões, extensões, features e caminhos de apresentação variam por plataforma/driver. Consulte capacidades em runtime e não trate um device local como padrão universal."
    },
    technicalSummary: [
      "VkInstance conecta aplicação, loader, extensões globais e validation layers; ainda não representa uma GPU lógica.",
      "VkPhysicalDevice é enumerado e avaliado por propriedades, features, memória, queue families, extensions e surface support.",
      "VkDevice habilita apenas as capacidades pedidas e disponíveis; disponibilidade não implica enablement.",
      "VkQueue é obtida de family/index solicitados na criação e recebe submissions posteriormente.",
      "Objetos Vulkan seguem dependências de lifetime e são destruídos em ordem inversa após conclusão do uso pela GPU.",
      "Validation layers, VUIDs e logging do ambiente são parte da metodologia desde o primeiro objeto."
    ]
  };
}

export function getLessonStudy(lesson: CurriculumLessonRef, guide: ModuleGuide): LessonStudy {
  const base = genericStudy(lesson, guide);
  if (lesson.module.id === "c-pointers" && lesson.topic === "pointers") return pointerStudy(base);
  if (lesson.module.id === "cpp-objects" && lesson.topic === "smart pointers") return smartPointerStudy(base);
  if (lesson.module.id === "asm-flags" && lesson.topic === "mov / lea") return movLeaStudy(base);
  if ((lesson.module.id === "net-sockets" && lesson.topic === "sockets") || (lesson.module.id === "net-model" && lesson.topic === "TCP")) return tcpSocketStudy(base);
  if (lesson.module.id === "win-memory" && lesson.topic === "VirtualAlloc") return virtualAllocStudy(base);
  if (lesson.module.id === "gfx-opengl" && lesson.topic === "VAO/VBO/EBO") return gpuBufferStudy(base);
  if (lesson.module.id === "gfx-vulkan" && lesson.topic === "Instance/Device") return vulkanBootstrapStudy(base);
  return base;
}
