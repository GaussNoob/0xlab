import type { CurriculumLessonRef } from "./lesson-catalog";
import type { ModuleGuide } from "./lesson-guides";
import { getRealWorldExample, type RealWorldExample } from "./real-world-examples";

export interface TopicLens {
  readonly eyebrow: string;
  readonly title: string;
  readonly detail: string;
  readonly question: string;
}

export interface LayerTransition {
  readonly from: string;
  readonly to: string;
  readonly contract: string;
  readonly evidence: string;
  readonly failure: string;
}

export interface TopicCheckpoint {
  readonly question: string;
  readonly answer: string;
}

export interface TopicDepth {
  readonly readingMinutes: number;
  readonly lenses: readonly TopicLens[];
  readonly transitions: readonly LayerTransition[];
  readonly checkpoints: readonly TopicCheckpoint[];
  readonly example?: RealWorldExample;
}

interface DomainLens {
  readonly representation: string;
  readonly observation: string;
  readonly boundary: string;
}

const domainLensByTrack: Readonly<Record<string, DomainLens>> = {
  c: {
    representation: "Separe regra da linguagem, representação do objeto e instruções emitidas. A CPU enxerga endereços, larguras e operações; tipos e lifetime precisam ser preservados pelo programa e pelo compilador.",
    observation: "Compile com warnings e símbolos, compare -O0/-O2, inspecione assembly e valide memória com sanitizers. Registre valores, endereços, tamanhos e o primeiro ponto em que o invariante muda.",
    boundary: "Pergunte onde termina o contrato ISO C e começam ABI, libc, sistema operacional e comportamento específico da implementação."
  },
  cpp: {
    representation: "Traduza a abstração C++ em storage, layout, chamadas implícitas, ownership e código instanciado. Zero-cost não significa custo zero: significa que o custo deve ser explicável no artefato final.",
    observation: "Observe constructors/destructors, allocations, cópias, moves, symbols e assembly. Use testes de lifetime, sanitizers e profiling antes de concluir sobre correção ou desempenho.",
    boundary: "Diferencie semântica da linguagem, decisões do compilador, contratos da biblioteca padrão e recursos realmente possuídos pelo sistema operacional."
  },
  assembly: {
    representation: "Modele cada instrução por reads, writes, largura, flags e endereço efetivo. Depois separe o estado arquitetural visível das decisões internas de decode, execução especulativa, caches e retirement.",
    observation: "Faça single-step registrando RIP, RSP, RFLAGS, memória tocada e bytes da instrução. Confirme a ABI nos limites de função e compare o trace com o source/disassembly.",
    boundary: "A ISA define a instrução; o assembler define notação e objeto; a ABI define cooperação entre funções; a microarquitetura decide como executar preservando o mesmo resultado arquitetural."
  },
  systems: {
    representation: "Represente o estado como processos, threads, mapas virtuais, objetos do kernel, filas e descritores. Uma chamada de alto nível normalmente altera mais de uma dessas estruturas.",
    observation: "Correlacione retorno da API, registradores na transição, mapas de memória, scheduler, syscalls e eventos do driver. Use timestamps para distinguir causalidade de coincidência.",
    boundary: "Marque explicitamente as fronteiras user/kernel, virtual/físico, síncrono/assíncrono e mecanismo/política."
  },
  windows: {
    representation: "Comece pelo contrato Win32: tipos pointer-sized, HANDLEs opacos, ownership, sentinels e GetLastError. Siga somente depois para ntdll, objetos do kernel, drivers e hardware.",
    observation: "Valide o valor de retorno antes de ler GetLastError, registre criação/fechamento de HANDLEs e observe mensagens, regiões virtuais ou I/O com as ferramentas apropriadas.",
    boundary: "Win32 é a API documentada para aplicações; Native API e números de syscall são detalhes de implementação que podem mudar entre versões."
  },
  linux: {
    representation: "Modele file descriptors, processos, VMAs, sinais e sockets como referências a estado mantido pelo kernel. A libc pode envolver a syscall e ajustar errno sem mudar o serviço fundamental.",
    observation: "Use strace, /proc, readelf, debugger e contadores de desempenho para conectar o retorno observado à transição de kernel que ocorreu.",
    boundary: "Separe contrato POSIX, extensão Linux, wrapper de libc, ABI de syscall e implementação interna do kernel."
  },
  memory: {
    representation: "Desenhe endereço virtual, objeto, intervalo de bytes, alinhamento, lifetime, owner e proteção da página. Um endereço numérico só é utilizável quando todas essas condições concordam.",
    observation: "Registre alloc/free, offsets, tamanhos, page mappings, cache behavior e o primeiro acesso inválido. Sanitizers e o Memory Visualizer fornecem evidências complementares.",
    boundary: "Separe objeto da linguagem, bloco do allocator, região virtual do processo, página física e linha de cache."
  },
  networking: {
    representation: "Trate TCP como stream de bytes e UDP como datagramas. Modele framing, buffers do processo/kernel, estados do socket, endereços, portas e limites de recursos separadamente.",
    observation: "Compare retorno de send/recv, estado do parser, filas, timestamps e captura de pacotes. Uma chamada da aplicação e um pacote na rede raramente têm relação um-para-um.",
    boundary: "Marque as fronteiras mensagem/stream, aplicação/kernel, host/rede e dado autenticado/dado apenas transportado."
  },
  graphics: {
    representation: "Descreva recursos, formatos, layouts, estados de pipeline, comandos, dependências e ownership entre CPU, driver e GPU. O pixel é o resultado final de uma cadeia de transformações.",
    observation: "Capture um frame e inspecione buffers, shaders, descriptors, draw calls, barriers e tempos de CPU/GPU. Compare o recurso esperado com o realmente vinculado.",
    boundary: "Separe API e driver, memória CPU/VRAM, gravação/execução de comandos e conclusão da GPU/apresentação no monitor."
  },
  "reverse-engineering": {
    representation: "Parta de bytes e evidências observáveis: sections, instructions, basic blocks, calls, stack e recursos. Nomes e intenção são hipóteses reconstruídas, não fatos presentes no binário.",
    observation: "Trabalhe apenas com programas próprios ou autorizados; preserve hashes, endereços relativos, traces e hipóteses refutáveis para reproduzir a análise.",
    boundary: "Diferencie dado observado, inferência, símbolo de debug e comportamento confirmado por execução controlada."
  },
  cybersecurity: {
    representation: "Modele assets, atores, trust boundaries, entradas hostis, invariantes e controles. Uma vulnerabilidade existe quando uma transição permitida viola uma propriedade de segurança.",
    observation: "Reproduza somente em laboratório autorizado, capture a primeira violação, aplique a mitigação e mantenha um teste de regressão que demonstre a propriedade restaurada.",
    boundary: "Separe capacidade técnica de autorização, falha de correção de impacto de segurança e mitigação parcial de eliminação da causa."
  }
};

const defaultDomainLens: DomainLens = {
  representation: "Converta a abstração em estado concreto: dados de entrada, transformação, armazenamento e saída observável.",
  observation: "Registre o estado antes e depois, controle uma variável por vez e preserve a evidência necessária para repetir o experimento.",
  boundary: "Identifique o contrato em cada fronteira e não atribua a uma camada garantias que pertencem a outra."
};

function compactSentence(value: string, maximum = 210): string {
  if (value.length <= maximum) return value;
  const clipped = value.slice(0, maximum);
  const sentence = clipped.lastIndexOf(". ");
  return `${clipped.slice(0, sentence > 100 ? sentence + 1 : maximum).trim()}…`;
}

function transitionEvidence(from: string, to: string, fallback: string): string {
  const boundary = `${from} ${to}`.toLowerCase();
  if (/source|compiler|template|object|linker|assembly|opcode|instruction/.test(boundary))
    return `Compare source, símbolos, relocations, bytes e disassembly; marque exatamente qual artefato representa a passagem ${from} → ${to}.`;
  if (/register|rip|rsp|flags|alu|cpu|core/.test(boundary))
    return `Capture RIP/RSP, registradores lidos e escritos, RFLAGS e bytes da instrução imediatamente antes e depois de ${from} → ${to}.`;
  if (/memory|pointer|address|page|mmu|tlb|cache|heap|stack|vram/.test(boundary))
    return `Registre endereço inicial, tamanho, alinhamento, lifetime, proteção e bytes alterados; depois confirme o mapeamento em ${from} → ${to}.`;
  if (/socket|tcp|udp|packet|buffer|driver|nic|network|ethernet/.test(boundary))
    return `Correlacione retorno da API, fila do socket, sequência/ACK, timestamp e captura do pacote ao atravessar ${from} → ${to}.`;
  if (/kernel|syscall|native api|win32|libc|handle|descriptor|vfs/.test(boundary))
    return `Valide retorno e erro, identifique o handle/descriptor e alinhe o trace de syscall/evento do kernel à passagem ${from} → ${to}.`;
  if (/shader|pipeline|draw|gpu|frame|pixel|raster|swap|present/.test(boundary))
    return `No frame capture, confira recurso, layout, shader, comando, dependência e timestamp de GPU correspondentes a ${from} → ${to}.`;
  return compactSentence(`${fallback} Preserve snapshots comparáveis na passagem ${from} → ${to}.`, 225);
}

export function getTopicDepth(lesson: CurriculumLessonRef, guide: ModuleGuide): TopicDepth {
  const { track, module, topic } = lesson;
  const topicIndex = Math.max(0, module.topics.indexOf(topic));
  const lens = domainLensByTrack[track.id] ?? defaultDomainLens;
  const focusMechanic = guide.mechanics[topicIndex % guide.mechanics.length]!;
  const nextMechanic = guide.mechanics[(topicIndex + 1) % guide.mechanics.length]!;
  const topicNote = guide.topicNotes[topic]!;
  const example = getRealWorldExample(module.id, topic);

  const lenses: readonly TopicLens[] = [
    {
      eyebrow: "Definição operacional",
      title: `O que “${topic}” realmente significa`,
      detail: topicNote,
      question: `Que estado precisa existir para afirmar que ${topic} ocorreu corretamente?`
    },
    {
      eyebrow: "Representação concreta",
      title: "Onde os dados e o estado vivem",
      detail: lens.representation,
      question: `Qual parte de ${topic} está em código, registradores, memória, kernel ou hardware?`
    },
    {
      eyebrow: "Mecanismo dominante",
      title: focusMechanic.title,
      detail: `${focusMechanic.detail} Em seguida, ${nextMechanic.title.toLowerCase()}: ${nextMechanic.detail}`,
      question: "Qual entrada é consumida, qual estado muda e quem possui a saída?"
    },
    {
      eyebrow: "Evidência e ferramenta",
      title: "Como provar em vez de presumir",
      detail: `${lens.observation} Evidência mínima desta aula: ${guide.practice.evidence}`,
      question: "Que medida ou trace refutaria sua explicação atual?"
    },
    {
      eyebrow: "Fronteira de abstração",
      title: "O que pertence a cada camada",
      detail: `${lens.boundary} Nesta aula, use a ponte “${module.bridge}” como mapa de responsabilidade.`,
      question: "Qual garantia desaparece ao atravessar a próxima fronteira?"
    }
  ];

  const transitions: readonly LayerTransition[] = guide.flow.slice(0, -1).map((from, index) => {
    const to = guide.flow[index + 1]!;
    const mechanism = guide.mechanics[index % guide.mechanics.length]!;
    const pitfall = guide.pitfalls[index % guide.pitfalls.length]!;
    return {
      from,
      to,
      contract: `${mechanism.title}: ${compactSentence(mechanism.detail)}`,
      evidence: transitionEvidence(from, to, lens.observation),
      failure: `${pitfall.title}: ${compactSentence(pitfall.detail, 185)}`
    };
  });

  const checkpoints: readonly TopicCheckpoint[] = [
    {
      question: `Explique ${topic} sem usar o nome da abstração. Quais dados entram, qual estado muda e o que sai?`,
      answer: `Use esta cadeia: ${guide.flow.join(" → ")}. Em cada seta, declare representação, owner e contrato; o foco específico é: ${topicNote}`
    },
    {
      question: "Qual invariante você verificaria primeiro antes de dar mais um passo no debugger?",
      answer: `${guide.invariants[topicIndex % guide.invariants.length]!} Verifique-o antes e depois da menor operação que pode alterar o estado; registre a primeira divergência, não apenas o crash final.`
    },
    {
      question: "Que erro plausível produz um resultado aparentemente correto nos casos simples?",
      answer: `${guide.pitfalls[topicIndex % guide.pitfalls.length]!.title}: ${guide.pitfalls[topicIndex % guide.pitfalls.length]!.detail}`
    },
    {
      question: "Como transformar a explicação em um experimento reproduzível?",
      answer: `${guide.practice.prompt} Execute: ${guide.practice.tasks.join("; ")} Critério: ${guide.practice.evidence}`
    }
  ];

  return {
    readingMinutes: example ? 110 : 85,
    lenses,
    transitions,
    checkpoints,
    ...(example ? { example } : {})
  };
}
