import type { ProjectDefinition } from "@/domain/learning/entities";
import { projects } from "./catalog";
import { curriculumLessons } from "./lesson-catalog";
import type { GuideCode } from "./lesson-guides";
import { lessonHref } from "./lesson-slugs";

export interface ProjectMilestone {
  readonly index: string;
  readonly title: string;
  readonly objective: string;
  readonly build: readonly string[];
  readonly proof: string;
  readonly edgeCases: readonly string[];
}

export interface ProjectAcceptanceTest {
  readonly name: string;
  readonly setup: string;
  readonly expected: string;
}

export interface ProjectBlueprint {
  readonly project: ProjectDefinition;
  readonly brief: string;
  readonly architecture: readonly string[];
  readonly invariants: readonly string[];
  readonly milestones: readonly ProjectMilestone[];
  readonly publicTests: readonly ProjectAcceptanceTest[];
  readonly hiddenTests: string;
  readonly experiments: readonly string[];
  readonly deliverables: readonly string[];
  readonly tools: readonly string[];
  readonly starter: GuideCode;
  readonly relatedLessons: readonly { readonly label: string; readonly href: string; readonly reason: string }[];
}

interface ProjectProfile {
  readonly architecture: readonly string[];
  readonly invariants: readonly string[];
  readonly tools: readonly string[];
  readonly failure: string;
  readonly starter: (project: ProjectDefinition) => GuideCode;
}

const cStarter = (project: ProjectDefinition): GuideCode => ({
  language: "c",
  filename: "main.c",
  source: `#include <stdio.h>\n#include <stdlib.h>\n\n/* ${project.title}\n * Comece pelo menor vertical slice observável.\n * Preserve ownership, limites e erros no contrato de cada função.\n */\n\nint main(int argc, char **argv) {\n    (void)argc;\n    (void)argv;\n    puts("${project.id}: baseline executável");\n    return EXIT_SUCCESS;\n}`,
  explanation: "O starter apenas prova toolchain e entry point. O primeiro milestone substitui a mensagem por uma operação vertical completa e testada."
});

const cppStarter = (project: ProjectDefinition): GuideCode => ({
  language: "cpp",
  filename: "main.cpp",
  source: `#include <iostream>\n#include <string_view>\n\nnamespace app {\nint run(std::string_view command) {\n    std::cout << "${project.id}: " << command << '\\n';\n    return 0;\n}\n}\n\nint main(int argc, char **argv) {\n    const std::string_view command = argc > 1 ? argv[1] : "help";\n    return app::run(command);\n}`,
  explanation: "O entry point delega ao domínio testável. Recursos reais devem entrar em owners RAII assim que forem adquiridos."
});

const textStarter = (project: ProjectDefinition): GuideCode => ({
  language: "text",
  filename: "design-first.txt",
  source: `PROJECT      ${project.title}\nINPUTS       formato, limites e origem documentados\nSTATE        owners, lifetimes e invariantes desenhados\nVERTICAL     uma entrada real → uma saída real\nEVIDENCE     testes + trace + resultado reproduzível\nFAILURE      erro injetado antes do caminho feliz ser expandido`,
  explanation: "O design-first map impede que o projeto comece por dezenas de arquivos sem um caminho executável e observável."
});

const profiles: Readonly<Record<string, ProjectProfile>> = {
  network: {
    architecture: ["CLI/config", "resolver + socket owner", "transport loops", "framing/parser", "domain state", "logs + tests"],
    invariants: ["Nenhuma chamada send/recv é tratada como mensagem completa.", "Todo length, timeout e limite de recurso é validado antes de alocação/uso.", "Disconnect e shutdown encerram owners uma vez sem prender workers."],
    tools: ["Wireshark/tcpdump", "sanitizers", "netcat para smoke test", "fault/fragmentation harness"],
    failure: "fragmentação, partial I/O, timeout, peer que fecha no meio do frame ou pacote com length inválido",
    starter: cStarter
  },
  database: {
    architecture: ["CLI/domain", "repository boundary", "prepared statements", "SQLite connection", "schema + migrations", "tests + query plans"],
    invariants: ["SQL variável usa bind em prepared statement, nunca concatenação.", "Transação faz commit completo ou rollback observável.", "Statement e connection são finalizados/fechados em todos os caminhos."],
    tools: ["sqlite3 CLI", "EXPLAIN QUERY PLAN", "foreign_keys=ON", "test database temporário"],
    failure: "constraint, database busy, migration interrompida, bind inválido ou escrita que precisa de rollback",
    starter: cppStarter
  },
  graphics: {
    architecture: ["window/events", "renderer owner", "CPU scene data", "GPU resources", "command/draw", "frame capture + timings"],
    invariants: ["Recursos filhos são destruídos antes de device/context pai.", "Dados de buffer, formato, stride e shader input concordam.", "Recursos permanecem vivos até a GPU concluir o uso sinalizado."],
    tools: ["validation/debug layer", "RenderDoc ou frame debugger", "shader compiler", "CPU/GPU profiler"],
    failure: "shader inválido, resize/swapchain out-of-date, recurso destruído cedo, formato/stride errado ou device loss documentado",
    starter: cppStarter
  },
  memory: {
    architecture: ["public allocation API", "size/alignment checks", "arena/free-list state", "backing storage", "diagnostic metadata", "stress tests"],
    invariants: ["Ranges retornados são alinhados, não sobrepostos e pertencem ao allocator.", "Aritmética de tamanho é validada antes de somar/multiplicar.", "Double free, foreign pointer e exhaustion têm comportamento documentado."],
    tools: ["AddressSanitizer/UBSan", "allocation failure injection", "memory visualizer", "benchmark com metodologia"],
    failure: "overflow, exhaustion, alinhamento extremo, double free, fragmentation ou falha do backing allocator",
    starter: cStarter
  },
  binary: {
    architecture: ["bounded reader", "header validation", "offset/range conversion", "typed model", "formatted report", "corpus + fuzz tests"],
    invariants: ["Nenhum offset/tamanho é usado antes de provar que a faixa cabe no arquivo.", "Endian e largura são decodificados explicitamente.", "Input é dado não confiável e nunca é executado pelo parser."],
    tools: ["hex viewer", "readelf/objdump ou dumpbin", "sanitizers", "fuzzer/corpus próprio"],
    failure: "arquivo truncado, magic/version inválidos, count excessivo, ranges sobrepostos ou integer overflow",
    starter: cStarter
  },
  concurrency: {
    architecture: ["task API", "bounded queue", "synchronization", "workers", "shutdown state machine", "metrics + stress tests"],
    invariants: ["Todo dado compartilhado tem uma política de sincronização identificável.", "Toda espera revalida um predicado e possui caminho de wakeup/shutdown.", "Tasks aceitas são concluídas ou canceladas segundo contrato explícito."],
    tools: ["ThreadSanitizer quando disponível", "stress/repetition harness", "tracing", "contention profiler"],
    failure: "spurious wakeup, queue cheia, exception da task, shutdown concorrente, worker lento ou producer interrompido",
    starter: cppStarter
  },
  systems: {
    architecture: ["CLI/control plane", "native API wrapper", "owned handles", "OS object/state", "observation adapter", "tests + traces"],
    invariants: ["Cada handle/descriptor possui owner e fechamento correspondente.", "Valores de retorno e sentinels são validados antes de consultar erro/estado.", "Operações permanecem limitadas ao próprio laboratório e artefatos autorizados."],
    tools: ["debugger", "strace/Process Monitor", "sanitizers", "object/binary inspector"],
    failure: "API negada, recurso ausente, operação parcial, child que trava, handle inválido ou cleanup após falha intermediária",
    starter: cppStarter
  },
  general: {
    architecture: ["input adapter", "validated domain model", "core operations", "persistence/output", "diagnostics", "automated tests"],
    invariants: ["Input é validado antes de alterar estado.", "Ownership e lifetime de cada recurso são documentados.", "Falhas preservam estado anterior ou deixam um estado novo explicitamente válido."],
    tools: ["compiler warnings", "unit/integration tests", "sanitizers", "debugger"],
    failure: "entrada vazia, limite, falha de alocação/I/O, repetição ou cleanup depois de erro intermediário",
    starter: textStarter
  }
};

function profileFor(project: ProjectDefinition): ProjectProfile {
  const skills = `${project.title} ${project.description} ${project.skills.join(" ")}`.toLowerCase();
  if (/sqlite|repository|transaction|database/.test(skills)) return profiles.database!;
  if (/tcp|socket|http|protocol|network/.test(skills)) return profiles.network!;
  if (/opengl|direct3d|vulkan|renderer|gpu|shader|frame|game loop/.test(skills)) return profiles.graphics!;
  if (/allocator|memory pool|alignment|arena|free list/.test(skills)) return profiles.memory!;
  if (/thread|task queue|concurr|event system/.test(skills)) return profiles.concurrency!;
  if (/fuzz|yara|edr|sanitizer|hardening|detection|malware analysis|anti-cheat|integrity/.test(skills)) return profiles.binary!;
  if (/parser|binary|serialization|opcode|disassembl|(?:^|\W)(?:elf|pe|hex)(?:$|\W)/.test(skills)) return profiles.binary!;
  if (/win32|process|debugger|shell|dll|filesystem|file explorer/.test(skills)) return profiles.systems!;
  if (project.id.startsWith("c-")) return { ...profiles.general!, starter: cStarter };
  if (project.id.startsWith("cpp-")) return { ...profiles.general!, starter: cppStarter };
  return profiles.general!;
}

function starterFor(project: ProjectDefinition, profile: ProjectProfile): GuideCode {
  const skills = project.skills.map((skill) => skill.trim().toLowerCase());
  if (project.id.startsWith("cpp-") || skills.includes("c++")) return cppStarter(project);
  if (project.id.startsWith("c-") || skills.includes("c")) return cStarter(project);
  return profile.starter(project);
}

function milestone(index: number, title: string, objective: string, build: readonly string[], proof: string, edgeCases: readonly string[]): ProjectMilestone {
  return { index: String(index).padStart(2, "0"), title, objective, build, proof, edgeCases };
}

function genericMilestones(project: ProjectDefinition, profile: ProjectProfile): readonly ProjectMilestone[] {
  const [firstSkill, secondSkill, thirdSkill] = project.skills;
  return [
    milestone(1, "Contrato e baseline executável", `Transforme “${project.title}” em entradas, saídas, limites, owners e estados válidos antes de expandir a implementação.`, [
      "Crie build reproduzível com warnings altos e símbolos.",
      `Implemente uma execução vertical mínima usando ${firstSkill ?? "o conceito principal"}.`,
      "Escreva a primeira previsão e um teste que prove o baseline."
    ], "Comando único constrói/executa e o README mostra o fluxo mínimo com saída esperada.", ["input ausente", "opção/estado inválido"]),
    milestone(2, "Modelo de dados e ownership", `Modele o estado necessário para ${project.description.toLowerCase()} sem acoplar parsing, domínio e I/O.`, [
      `Defina tipos e invariantes para ${secondSkill ?? "os dados centrais"}.`,
      "Desenhe lifetime de buffers, handles e objetos.",
      "Adicione criação/destruição idempotente quando o contrato permitir."
    ], "Testes constroem, modificam e encerram o estado sem leak ou uso após lifetime.", ["estado vazio", "falha durante inicialização"]),
    milestone(3, "Vertical slice real", `Conecte uma entrada real a uma saída real atravessando ${profile.architecture.join(" → ")}.`, [
      `Implemente a operação nominal de ${thirdSkill ?? "integração"}.`,
      "Registre cada fronteira sem esconder o erro original.",
      "Mantenha a implementação pequena o suficiente para depurar passo a passo."
    ], "Uma demonstração reproduzível atravessa todas as camadas e produz artefato/saída verificável.", ["mínimo válido", "duas operações consecutivas"]),
    milestone(4, "Falhas, limites e recuperação", `Faça o sistema permanecer correto diante de ${profile.failure}.`, [
      "Injete falha em cada aquisição/operação que pode retornar erro.",
      "Implemente rollback ou estado parcial documentado.",
      "Adicione mensagens que preservem código, contexto e operação responsável."
    ], "A suíte provoca falhas determinísticas e demonstra cleanup/estado final sem depender de crash.", ["limite máximo", "falha depois de aquisição parcial", "repetição do cleanup"]),
    milestone(5, "Observabilidade e experimentos", "Converta decisões de implementação em hipóteses mensuráveis, sem generalizar um único benchmark.", [
      `Observe com ${profile.tools.slice(0, 2).join(" e ")}.`,
      "Compare uma alternativa mudando uma variável por vez.",
      "Registre ambiente, build, entrada, resultado e limitação da medida."
    ], "Relatório contém trace/perfil, interpretação refutável e uma decisão sustentada pela evidência.", ["build debug versus release", "entrada pequena versus representativa"]),
    milestone(6, "Integração, documentação e capstone", `Entregue ${project.title} como ferramenta repetível, não como demo que funciona apenas no computador do autor.`, [
      "Execute testes públicos, stress/edge cases e sanitizers aplicáveis.",
      "Documente arquitetura, invariantes, formato/API e troubleshooting.",
      "Faça post-mortem de um bug real encontrado e mantenha seu teste de regressão."
    ], "Build limpo, suíte verde, demonstração final e relatório técnico permitem a outra pessoa reproduzir o projeto.", ["workspace limpo", "execução repetida", "entrada corrompida/controlada"])
  ];
}

const sqliteMilestones: readonly ProjectMilestone[] = [
  milestone(1, "Schema e migration 001", "Modele items/users sem começar pelo SELECT *; habilite foreign keys e mantenha versão do schema.", ["Crie tabela schema_migrations.", "Aplique migration em transação.", "Defina NOT NULL, UNIQUE e CHECK conforme o domínio."], "Banco novo e banco já migrado chegam ao mesmo schema; migration interrompida faz rollback.", ["banco vazio", "migration repetida", "versão futura desconhecida"]),
  milestone(2, "Connection e statements com lifetime", "Encapsule open/close e prepare/finalize; preserve mensagem/código SQLite no ponto da falha.", ["Abra database temporário nos testes.", "Prepare statements uma vez por operação.", "Bind strings/blobs com lifetime correto."], "Counters/log demonstram cada statement finalizado e connection fechada mesmo em falha.", ["path inválido", "prepare falha", "bind NULL"]),
  milestone(3, "CRUD parametrizado", "Implemente create/read/update/delete sem concatenar input em SQL.", ["Use bind para todo valor variável.", "Diferencie ROW, DONE e erro.", "Mapeie colunas com validação de tipo/NULL."], "Testes CRUD cobrem constraints e nenhuma entrada vira estrutura SQL.", ["texto Unicode", "duplicata", "registro ausente"]),
  milestone(4, "Transactions e rollback", "Agrupe operações dependentes em begin/commit e garanta rollback em qualquer falha intermediária.", ["Crie transaction guard.", "Injete constraint na segunda operação.", "Confirme que nenhuma escrita parcial sobrevive."], "Estado antes e depois da transação falha é idêntico.", ["commit falha", "exception/return antecipado", "transaction aninhada rejeitada"]),
  milestone(5, "Índices e query plans", "Crie queries representativas e só adicione índice depois de observar plano e distribuição dos dados.", ["Carregue dataset controlado.", "Capture EXPLAIN QUERY PLAN.", "Compare tempo e custo de escrita antes/depois."], "Relatório mostra query, plano, cardinalidade e trade-off do índice.", ["tabela pequena", "filtro pouco seletivo", "ordenação"]),
  milestone(6, "CLI e backup verificável", "Integre repository a comandos claros, exportação e recuperação sem expor handles SQLite ao domínio.", ["Implemente help e códigos de saída.", "Use backup API ou snapshot consistente.", "Execute suite em banco novo e restaurado."], "Usuário cria, lista, altera, remove e restaura dados com testes e documentação.", ["arquivo read-only", "schema incompatível", "interrupção controlada"])
];

function relatedLessons(project: ProjectDefinition) {
  const tokens = project.skills.flatMap((skill) => skill.toLowerCase().split(/[^a-z0-9+#*]+/)).filter((token) => token.length >= 3);
  return curriculumLessons
    .map((lesson) => {
      const text = `${lesson.topic} ${lesson.module.title} ${lesson.module.summary}`.toLowerCase();
      const score = tokens.reduce((total, token) => total + (text.includes(token) ? 1 : 0), 0);
      return { lesson, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)
    .map(({ lesson }) => ({
      label: `${lesson.track.shortTitle} · ${lesson.topic}`,
      href: lessonHref(lesson.track, lesson.module, lesson.topic),
      reason: lesson.module.bridge
    }));
}

export function getProject(id: string): ProjectDefinition | undefined {
  return projects.find((project) => project.id === id);
}

export function getProjectBlueprint(project: ProjectDefinition): ProjectBlueprint {
  const profile = profileFor(project);
  const isSqlite = project.skills.some((skill) => skill.toLowerCase().includes("sqlite"));
  return {
    project,
    brief: `${project.description} A entrega é dividida em vertical slices: cada milestone termina executável, testado e observável antes de a próxima camada ser adicionada.`,
    architecture: profile.architecture,
    invariants: profile.invariants,
    milestones: isSqlite ? sqliteMilestones : genericMilestones(project, profile),
    publicTests: [
      { name: "Nominal end-to-end", setup: "Entrada pequena, válida e conhecida atravessa todas as camadas.", expected: "Saída corresponde ao contrato e todos os recursos são encerrados." },
      { name: "Empty / minimum", setup: "Use a menor entrada permitida, inclusive zero elementos quando aplicável.", expected: "Nenhum out-of-bounds, underflow ou estado impossível." },
      { name: "Boundary", setup: "Execute exatamente no limite documentado e uma unidade acima.", expected: "Limite é aceito; excesso é rejeitado antes de alocação/efeito perigoso." },
      { name: "Injected failure", setup: `Provoque ${profile.failure}.`, expected: "Erro contém contexto, estado permanece válido e cleanup ocorre uma vez." },
      { name: "Repeatability", setup: "Execute criação, operação e teardown muitas vezes no mesmo processo.", expected: "Sem leak, estado residual, handle dangling ou resultado dependente da execução anterior." }
    ],
    hiddenTests: "Os testes ocultos variam ordem, tamanho, Unicode/binário, falha após aquisição parcial, chamadas repetidas e dados que não aparecem nos exemplos públicos. Requisitos e limites permanecem os mesmos.",
    experiments: [
      `Compare duas estratégias para ${project.skills[0] ?? "a operação central"} mantendo build, entrada e ambiente constantes.`,
      "Execute build de diagnóstico com sanitizers e build otimizado; explique diferenças sem atribuir toda variação apenas à otimização.",
      `Instrumente a passagem ${profile.architecture.join(" → ")} e localize o primeiro gargalo/erro com evidência.`,
      "Quebre deliberadamente um invariante em teste isolado, capture o diagnóstico e restaure-o com um teste de regressão."
    ],
    deliverables: ["Código-fonte organizado por responsabilidades", "Comandos de build e execução reproduzíveis", "Testes públicos e harness de falhas", "README de arquitetura, invariantes e limites", "Trace/perfil ou captura de debugger", "Post-mortem técnico e backlog de extensões"],
    tools: profile.tools,
    starter: starterFor(project, profile),
    relatedLessons: relatedLessons(project)
  };
}
