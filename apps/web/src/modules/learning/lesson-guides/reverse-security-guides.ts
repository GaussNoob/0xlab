import { guide, type GuideMap } from "./types";

export const reverseSecurityGuides: GuideMap = {
  "re-binary": guide({
    thesis: "Engenharia reversa começa com evidência: bytes são decodificados em instruções, instruções formam blocos e referências de dados ajudam a reconstruir comportamento sem inventar intenção.",
    context: [
      "Disassembly é uma interpretação dependente da arquitetura, modo e endereço inicial. Código, dados embutidos e padding podem compartilhar uma section; seguir control flow é mais confiável que decodificar tudo linearmente.",
      "Símbolos e strings são pistas, não provas. O método seguro combina formato do arquivo, cross-references, chamadas, efeitos observados e versões próprias ou explicitamente autorizadas do programa."
    ],
    flow: ["file bytes", "decoder", "instructions", "basic blocks", "CFG", "behavior hypothesis"],
    topicNotes: {
      disassembly: "O decoder consome prefixos, opcode, ModR/M, SIB, displacement e immediate. Uma fronteira errada pode transformar os bytes seguintes em instruções plausíveis, porém falsas.",
      CFG: "Um control-flow graph liga basic blocks por branches, fallthroughs, calls e returns. Indirect branches exigem análise de dados ou observação dinâmica.",
      symbols: "Symbols relacionam nomes, endereços e binding. Builds stripped removem muito contexto, mas imports, exports, unwind info e debug data separado ainda ajudam.",
      strings: "Strings sugerem caminhos de erro, formatos e recursos. Confirme cada uso por xref; bytes imprimíveis podem ser dados sem significado textual."
    },
    code: { language: "asm", filename: "sum.disasm", source: `0000000000000000 <sum>:
  0: 89 f8          mov eax, edi
  2: 01 f0          add eax, esi
  4: c3             ret

; x86-64 System V: edi=a, esi=b, eax=return`, explanation: "Leia bytes, instrução e ABI juntos. A hipótese 'soma dois inteiros' vem dos efeitos observáveis, não apenas do nome do símbolo." },
    mechanics: [{ title: "Identificar", detail: "Valide formato, arquitetura, entry point, mappings e permissões." }, { title: "Decodificar", detail: "Comece em alvos conhecidos e siga edges válidos para formar blocos." }, { title: "Relacionar", detail: "Use xrefs de código e dados, imports e constantes para dar contexto." }, { title: "Verificar", detail: "Teste hipóteses com debugger, inputs controlados e source próprio quando disponível." }],
    invariants: ["Cada instrução pertence a um mapping executável conhecido.", "Edges do CFG registram origem e evidência.", "Toda afirmação separa observação, inferência e incerteza."],
    pitfalls: [{ title: "Disassembly linear", detail: "Pode entrar em jump tables, dados ou padding; sem seeds e fluxo, a cobertura engana." }, { title: "Dar semântica por nome", detail: "Um símbolo pode ser antigo, enganoso ou uma thunk; valide os efeitos." }],
    practice: { prompt: "Reconstrua o CFG de uma função compilada por você.", tasks: ["Compile com e sem otimização.", "Marque basic blocks e edges.", "Associe cada branch a uma condição no source."], evidence: "CFG anotado, bytes das instruções e uma tabela observação → hipótese → teste." }
  }),

  "re-debug": guide({
    thesis: "Debugger é um instrumento para congelar uma transição e inspecionar estado; um breakpoint útil responde a uma hipótese sobre código, registradores, memória e tempo.",
    context: [
      "Breakpoints de software normalmente substituem um byte por uma trap e depois restauram/reexecutam a instrução. Hardware breakpoints usam registradores de debug e podem observar acesso a endereços sem modificar código.",
      "O estado visível inclui registers, flags, stack, mappings e threads. Debug info relaciona endereços otimizados ao source, mas variáveis podem estar movidas, combinadas ou eliminadas."
    ],
    flow: ["event", "trap", "debugger", "thread context", "memory/register evidence", "next hypothesis"],
    topicNotes: {
      debugger: "O debugger coordena eventos do processo e controla threads. Step into/over são políticas construídas sobre traps, breakpoints temporários e informação de símbolos.",
      breakpoints: "Um breakpoint deve ter condição e objetivo. Muitos stops perturbam timing e podem ocultar race conditions; tracepoints ou logging podem ser melhores.",
      registers: "Interprete registers pela ABI e instrução atual. O mesmo RAX pode ser retorno, temporário, parte de uma multiplicação ou simplesmente valor morto.",
      memory: "Examine mapping, tamanho, permissão e ownership antes de interpretar bytes. Watchpoints ajudam a encontrar a primeira escrita, não só o crash posterior."
    },
    code: { language: "text", filename: "debug-plan.txt", source: `Hypothesis: count becomes negative after parse_record
Breakpoint: parse_record return
Capture: RIP, RSP, RFLAGS, count, input_length
Watchpoint: first write to &count
Expected invariant: 0 <= count && count <= capacity
Stop condition: first violating instruction`, explanation: "Planejar a coleta reduz inspeção aleatória e preserva uma cadeia clara entre hipótese e evidência." },
    mechanics: [{ title: "Parar", detail: "Trap transfere controle e preserva o contexto do thread que gerou o evento." }, { title: "Ler", detail: "Debugger obtém registers, stack e bytes via interfaces do sistema." }, { title: "Interpretar", detail: "Símbolos, unwind e ABI transformam endereços em frames e variáveis aproximadas." }, { title: "Continuar", detail: "Breakpoints são restaurados, sinais/exceções são tratados conforme política e threads retomam." }],
    invariants: ["O endereço do breakpoint corresponde ao build carregado.", "A inspeção preserva largura e endianness dos dados.", "A hipótese define o que faria o experimento terminar."],
    pitfalls: [{ title: "Confiar cegamente no source view", detail: "Otimização reordena e elimina operações; confira o disassembly e os ranges de debug." }, { title: "Alterar estado sem registrar", detail: "Editar RIP ou memória muda o experimento; documente para não tratar resultado artificial como execução natural." }],
    practice: { prompt: "Encontre a primeira violação em um programa próprio com bug.", tasks: ["Formule um invariant.", "Use breakpoint e watchpoint.", "Explique a instrução culpada pela ABI e pelos operandos."], evidence: "Log reproduzível do stop, snapshot mínimo e correção validada por teste." }
  }),

  "re-formats": guide({
    thesis: "PE e ELF são contratos entre linker e loader: headers descrevem como bytes do arquivo viram regiões virtuais, símbolos resolvidos e um ponto inicial executável.",
    context: [
      "File layout e memory image não são idênticos. Sections ajudam linking e inspeção; segments/directories orientam mapping e serviços do loader. RVA, VA e file offset precisam ser convertidos pelo intervalo correto.",
      "Imports e relocations permitem compor módulos sem endereços finais fixos. Toda ferramenta de análise deve validar overflow, sobreposição e bounds antes de seguir offsets controlados pelo arquivo."
    ],
    flow: ["headers", "sections/segments", "virtual mappings", "imports", "relocations", "entry point"],
    topicNotes: {
      PE: "PE combina DOS header/stub, assinatura PE, COFF header, optional header, section table e data directories. Optional não significa dispensável para imagens executáveis.",
      ELF: "ELF header aponta program e section headers. O loader usa principalmente program headers PT_LOAD; sections atendem linker e ferramentas.",
      imports: "Import tables/DT_NEEDED declaram dependências e symbols. O loader localiza módulos, resolve endereços e preenche IAT/GOT/PLT conforme plataforma.",
      relocations: "Relocations descrevem onde e como ajustar referências quando base ou symbol muda. Tipo de relocation determina cálculo, largura e overflow permitido."
    },
    code: { language: "text", filename: "address-translation.txt", source: `PE:
VA  = ImageBase + RVA
FOA = PointerToRawData + (RVA - Section.VirtualAddress)

ELF PT_LOAD:
VA  = load_bias + p_vaddr
FOA = p_offset + (VA - load_bias - p_vaddr)`, explanation: "A conversão só é válida se o endereço estiver dentro do intervalo do section/segment escolhido e se todos os cálculos forem bounds-checked." },
    mechanics: [{ title: "Validar header", detail: "Magic, arquitetura, contagens, offsets e tamanhos são checados antes de indexar." }, { title: "Mapear", detail: "Faixas de arquivo são projetadas em VAs alinhados com zero-fill e permissões." }, { title: "Resolver", detail: "Dependências e símbolos alimentam slots de chamada/endereço." }, { title: "Relocar", detail: "O loader aplica deltas/tipos e então endurece permissões finais." }],
    invariants: ["Cada intervalo está contido no arquivo ou no image size declarado.", "Traduções usam a section/segment que realmente contém o endereço.", "Parsing nunca executa constructors ou código do arquivo analisado."],
    pitfalls: [{ title: "Somar offsets sem overflow check", detail: "Arquivos malformados exploram wraparound; use aritmética verificada." }, { title: "Executar para inspecionar", detail: "Um parser read-only é suficiente e reduz risco; use sandbox apenas quando observação dinâmica for necessária e autorizada." }],
    practice: { prompt: "Implemente um inspetor unificado PE/ELF read-only.", tasks: ["Valide headers e ranges.", "Liste mappings e permissões.", "Traduza três RVA/VA para offsets e explique falhas."], evidence: "Corpus válido/truncado, comparação com ferramentas oficiais e zero acesso fora dos bounds." }
  }),

  "re-graphics": guide({
    thesis: "Uma aplicação gráfica própria pode ser compreendida como uma sequência observável: atualizar estado, registrar comandos, submeter trabalho, apresentar uma imagem e sincronizar recursos.",
    context: [
      "Render loops não são todos iguais: jogos, editores e UIs desacoplam simulação e apresentação de modos diferentes. Frame capture organiza API calls em draws e relaciona cada draw a pipeline e resources.",
      "A análise permanece educacional e autorizada. O objetivo é explicar arquitetura e diagnosticar programas próprios, não interferir em software de terceiros ou contornar proteções."
    ],
    flow: ["input/update", "camera/transforms", "record commands", "draw calls", "present", "frame capture"],
    topicNotes: {
      "render loop": "O loop coleta eventos, avança simulação, prepara estado visível, grava/submete comandos e apresenta. Fixed timestep evita vincular física ao FPS.",
      swapchain: "A swapchain possui imagens apresentáveis negociadas com a janela/compositor. Acquire, render e present precisam respeitar ownership e sincronização.",
      shaders: "Shaders compilados e seus bindings revelam como vertices, uniforms, textures e targets produzem pixels. Reflection ajuda a mapear slots sem inferir por tentativa.",
      camera: "A câmera normalmente é view matrix, projeção e parâmetros. Em memória pode aparecer transposta ou combinada; confirme pela convenção matemática do renderer."
    },
    code: { language: "cpp", filename: "render-loop.cpp", source: `while (running) {
    poll_events();
    accumulator += clock.tick();
    while (accumulator >= fixed_dt) {
        simulate(fixed_dt);
        accumulator -= fixed_dt;
    }
    Frame frame = renderer.begin_frame();
    renderer.draw_scene(frame, camera);
    renderer.draw_ui(frame);
    renderer.present(frame);
}`, explanation: "Instrumente cada fase e dê nomes aos passes/draws. Um capture então mostra intenção ao lado das chamadas de API." },
    mechanics: [{ title: "Capturar", detail: "Ferramenta intercepta ou recebe eventos da API no próprio programa e serializa comandos/resources." }, { title: "Agrupar", detail: "Markers e passes organizam clears, bindings, draws, dispatches e present." }, { title: "Inspecionar", detail: "Selecione draw para ver buffers, pipeline, shaders, textures e attachments." }, { title: "Reproduzir", detail: "A ferramenta reconstitui o estado necessário para observar estágios e outputs intermediários." }],
    invariants: ["Captura pertence a um programa e workload autorizados.", "Resources são interpretados pelo formato/stride declarado.", "Matrizes registram ordem, handedness e layout row/column-major."],
    pitfalls: [{ title: "Tratar API calls como intenção", detail: "Uma chamada pode ser redundante ou indireta; markers, dados e output completam a história." }, { title: "Ignorar frames in flight", detail: "O recurso observado pode pertencer a outro frame se sincronização e índices não forem seguidos." }],
    practice: { prompt: "Anote um frame do renderer educacional.", tasks: ["Nomeie os passes.", "Escolha um draw e decodifique vertex/index buffers.", "Siga MVP e shader até o pixel final."], evidence: "Linha do tempo com estado do draw, screenshots por estágio e hipótese de custo medida." }
  }),

  "sec-model": guide({
    thesis: "Threat modeling conecta arquitetura a decisões: identifique assets, trust boundaries, capacidades do adversário e controles verificáveis antes de escolher ferramentas.",
    context: [
      "Attack surface inclui toda entrada, parser, dependência, credencial e canal administrativo. Um diagrama de fluxo de dados mostra onde confiança muda e onde validação ou autorização é obrigatória.",
      "Risco combina plausibilidade e impacto dentro de um contexto. O modelo deve produzir casos testáveis e prioridades, não uma lista abstrata de ameaças sem owners."
    ],
    flow: ["assets", "data flows", "trust boundaries", "abuse cases", "controls", "verification"],
    topicNotes: {
      "threat model": "Defina escopo, assets, atores, entradas e suposições. Revise quando arquitetura ou dependências mudarem.",
      "attack surface": "Enumere endpoints, parsers, formatos, plugins, arquivos e operações privilegiadas; remova caminhos desnecessários antes de protegê-los.",
      trust: "Trust é uma decisão contextual, não atributo permanente. Autenticação, origem ou processo local não substituem validação e least privilege.",
      risk: "Priorize pela combinação de impacto, exposição, explorabilidade e detectabilidade, registrando incerteza e critérios de aceite."
    },
    code: { language: "text", filename: "threat-model.md", source: `FLOW: client bytes -> protocol parser -> command dispatcher -> file service
ASSET: files inside workspace
BOUNDARY: network -> parser; user request -> filesystem
ABUSE: path escapes workspace through normalization mismatch
CONTROL: canonicalize once; verify descendant path; deny links/reparse points
EVIDENCE: property tests + audit event on rejection`, explanation: "Cada ameaça se liga a um fluxo concreto, um controle e uma forma de provar que o controle funciona." },
    mechanics: [{ title: "Decompor", detail: "Desenhe processos, stores, fluxos e boundaries no escopo." }, { title: "Enumerar", detail: "Para cada boundary, pergunte como dados, identidade e recursos podem ser abusados." }, { title: "Tratar", detail: "Evite, reduza, detecte ou aceite risco com owner e prazo explícitos." }, { title: "Verificar", detail: "Transforme controles em testes, configurações inspecionáveis e telemetria." }],
    invariants: ["Todo asset crítico possui owner e fluxo conhecido.", "Toda mudança de confiança possui validação e autorização explícitas.", "Risco aceito registra premissas e data de revisão."],
    pitfalls: [{ title: "Checklist sem arquitetura", detail: "Controles genéricos não mostram onde aplicar nem qual ameaça mitigam." }, { title: "Modelar só atacante externo", detail: "Dependências comprometidas, arquivos locais e erros operacionais também cruzam boundaries." }],
    practice: { prompt: "Modele a superfície do servidor de laboratório.", tasks: ["Desenhe fluxos e assets.", "Crie cinco abuse cases.", "Associe controle, teste e telemetria a cada um."], evidence: "Modelo versionado e duas descobertas reproduzidas em ambiente isolado." }
  }),

  "sec-memory": guide({
    thesis: "Falhas de memória quebram as propriedades espaciais ou temporais do programa; exploração não é necessária para aprender a diagnosticar causa e validar defesa em laboratório isolado.",
    context: [
      "Overflow, out-of-bounds e use-after-free mudam dados que não pertencem à operação. O efeito depende de layout e timing, por isso reproduções mínimas com sanitizers são mais úteis que sintomas distantes.",
      "ASLR, CFI, canaries e páginas NX elevam o custo de transformar corrupção em controle. Linguagens memory-safe, ownership e APIs bounded eliminam classes inteiras mais cedo."
    ],
    flow: ["unsafe primitive", "bounds/lifetime violation", "corrupted state", "detector", "root cause", "regression"],
    topicNotes: {
      overflow: "Buffer overflow ocorre quando índice ou comprimento excede o objeto. Cheque também multiplicações e somas usadas para calcular a alocação.",
      UAF: "UAF separa desalocação do acesso posterior. Quarantine de sanitizer aumenta chance de detectar antes que o endereço seja reutilizado silenciosamente.",
      ASLR: "ASLR depende de entropia e relocabilidade e deve ser combinado a não-execução e integridade de control flow. Vazamentos de endereço reduzem seu valor.",
      CFI: "Control-Flow Integrity restringe destinos indiretos a conjuntos compatíveis derivados do programa. Não impede corrupção de dados nem todos os desvios válidos."
    },
    code: { language: "cpp", filename: "owned-buffer.cpp", source: `class Buffer {
public:
    explicit Buffer(std::size_t size) : bytes_(size) {}

    std::span<std::byte> slice(std::size_t offset, std::size_t count) {
        if (offset > bytes_.size() || count > bytes_.size() - offset)
            throw std::out_of_range("slice");
        return {bytes_.data() + offset, count};
    }
private:
    std::vector<std::byte> bytes_;
};`, explanation: "Ownership RAII e span mantêm lifetime e tamanho próximos da operação. A checagem subtrativa evita overflow aritmético." },
    mechanics: [{ title: "Reproduzir", detail: "Reduza input e execução até o sanitizer apontar a primeira operação inválida." }, { title: "Classificar", detail: "Separe spatial, temporal, uninitialized e integer-derived memory errors." }, { title: "Corrigir", detail: "Mude contrato, ownership ou representação, não apenas o layout que mascarou o bug." }, { title: "Endurecer", detail: "Ative mitigações e testes que comprovem propriedades do binário e runtime." }],
    invariants: ["Cada acesso cabe no objeto vivo.", "Comprimentos derivados de input passam por aritmética verificada.", "Build de produção mantém mitigações compatíveis com o threat model."],
    pitfalls: [{ title: "Corrigir adicionando margem", detail: "Um buffer maior só desloca o limite se o contrato continuar incorreto." }, { title: "Usar ASLR como correção", detail: "Randomização não restaura bounds ou lifetime; corrija a operação inválida." }],
    practice: { prompt: "Diagnostique duas falhas deliberadas no sandbox.", tasks: ["Capture ASan/UBSan ou PageHeap equivalente.", "Classifique root cause.", "Implemente correção estrutural e teste de regressão."], evidence: "Antes/depois com stack trace, invariant corrigido e propriedades de hardening do binário." }
  }),

  "sec-protocol": guide({
    thesis: "Input de rede é um programa para o parser; segurança vem de gramática inequívoca, trabalho limitado, estado autenticado e testes gerados continuamente.",
    context: [
      "Fuzzing encontra crashes, hangs e invariantes quebrados ao explorar o espaço de inputs. Um harness bom isola a unidade, reinicializa estado e não depende de rede ou relógio quando isso não é o alvo.",
      "DoS pode explorar tamanho, compressão, recursão, regex, filas ou estados lentos. Autenticação prova uma identidade segundo um método; autorização decide a operação permitida naquele recurso."
    ],
    flow: ["bytes", "bounded grammar", "authenticated principal", "authorization", "resource budget", "result"],
    topicNotes: {
      fuzzing: "Combine coverage-guided fuzzing, dictionaries e corpus de formatos reais. Minimize crashes e preserve cada caso como regressão.",
      parsing: "Parse uma vez para uma representação canônica. Valide encoding, duplicatas, ranges, nesting e trailing bytes conforme o contrato.",
      DoS: "Defina budgets de bytes, objetos, profundidade, CPU, concorrência e tempo. Backpressure impede que fila interna apenas mova o gargalo.",
      auth: "Evite confundir autenticação, sessão e autorização. Toda ação sensível vincula principal, recurso, operação e contexto anti-replay."
    },
    code: { language: "cpp", filename: "fuzz-parser.cpp", source: `extern "C" int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    Parser parser{Limits{
        .max_frame = 64 * 1024,
        .max_depth = 16,
        .max_fields = 256
    }};
    auto result = parser.parse({data, size});
    if (result.ok()) assert(result.consumed <= size);
    return 0;
}`, explanation: "O harness é determinístico, limitado e contém um oráculo. Execute com sanitizers para transformar UB e corrupções em achados precisos." },
    mechanics: [{ title: "Gerar", detail: "Mutador combina corpus e feedback de cobertura para alcançar novos edges." }, { title: "Executar", detail: "Harness reinicia estado e aplica limites de tempo/memória." }, { title: "Detectar", detail: "Sanitizers, asserts e timeouts funcionam como oráculos." }, { title: "Minimizar", detail: "O input é reduzido preservando a falha e entra na suíte de regressão." }],
    invariants: ["Parser termina dentro do budget para qualquer input.", "Mensagem aceita possui representação canônica única.", "Autorização é verificada no servidor para cada ação sensível."],
    pitfalls: [{ title: "Fuzz endpoint inteiro primeiro", detail: "Muito ruído e baixa velocidade; comece na função pura de parsing e depois suba as camadas." }, { title: "Rate limit sem limite interno", detail: "Poucas requisições ainda podem ser gigantes ou algorítmicas; limite trabalho por operação." }],
    practice: { prompt: "Crie um fuzz target para o protocolo educacional.", tasks: ["Declare propriedades e budgets.", "Rode com sanitizer e minimize um achado.", "Adicione autenticação e teste replay/authorization."], evidence: "Corpus, crash minimizado ou cobertura alcançada, regressão e métricas de budget." }
  }),

  "sec-hardening": guide({
    thesis: "Hardening é defesa em profundidade mensurável: propriedades no source e no binário, privilégio mínimo no runtime e telemetria capaz de confirmar ou contestar o modelo de ameaça.",
    context: [
      "Flags de compiler/linker habilitam canaries, CFI, PIE, RELRO, CFG e outras proteções conforme plataforma. Verifique o artefato final, pois uma dependência ou opção de link pode reduzir a cobertura.",
      "Sandbox limita syscalls, filesystem, registry, network e objetos acessíveis. Observabilidade deve registrar decisões relevantes com integridade, retenção e privacidade adequadas."
    ],
    flow: ["secure source", "hardened build", "signed artifact", "least-privilege sandbox", "telemetry", "response"],
    topicNotes: {
      hardening: "Use warnings, sanitizers em testes, stack protection, PIE/ASLR, NX, RELRO/CFG/CFI e dependências atualizadas de acordo com toolchain e threat model.",
      sandbox: "Comece pelo conjunto mínimo de recursos. Separe parsing arriscado em processo menos privilegiado e use canais estreitos com mensagens validadas.",
      telemetry: "Eventos úteis registram quem, o quê, resultado e correlação sem secrets. Métricas detectam desvio; traces explicam caminho; logs preservam decisão.",
      response: "Resposta contém, coleta evidência, remove causa, restaura serviço e aprende. Playbooks definem autoridade, comunicação e critérios antes do incidente."
    },
    code: { language: "text", filename: "release-gates.yml", source: `build:
  warnings_as_errors: true
  sanitizer_tests: [address, undefined]
  binary_checks: [pie, nx, stack_protector, control_flow]
runtime:
  identity: dedicated-unprivileged
  filesystem: workspace-only
  network: deny-by-default
evidence:
  audit_rejections: true
  redact_secrets: true`, explanation: "Transforme a política em gates automatizados e inspeção do artefato, não apenas documentação." },
    mechanics: [{ title: "Prevenir", detail: "Remova superfície, aplique linguagem/API segura e configure build defensivo." }, { title: "Conter", detail: "Isolamento e least privilege limitam alcance de uma falha." }, { title: "Detectar", detail: "Eventos e alertas observam violações de invariant com baixo ruído." }, { title: "Responder", detail: "Playbook preserva evidência, recupera com segurança e alimenta correções permanentes." }],
    invariants: ["O artefato implantado é o mesmo que passou pelos gates.", "A identidade do processo não possui capacidade desnecessária.", "Telemetria sensível tem controle de acesso, retenção e redação."],
    pitfalls: [{ title: "Hardening por checkbox", detail: "Uma flag pode não se aplicar ao binário; verifique headers, mappings e runtime." }, { title: "Sandbox depois do deploy", detail: "Aplicação que pressupõe acesso amplo torna redução dolorosa; projete capabilities desde o início." }],
    practice: { prompt: "Produza um perfil de hardening para um serviço do laboratório.", tasks: ["Inspecione source, binary e runtime.", "Negue um recurso e registre a falha esperada.", "Simule um evento e execute o playbook."], evidence: "Relatório automatizado, perfil mínimo e timeline do exercício com melhoria registrada." }
  })
};
