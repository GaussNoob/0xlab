import { guide, type GuideMap } from "./types";

export const coreGuides: GuideMap = {
  "c-toolchain": guide({
    thesis: "Um programa C não salta do texto para a CPU: ele atravessa tradução, geração de objeto, resolução de símbolos, carregamento e só então vira estado executável.",
    context: [
      "O tipo dá significado aos mesmos bytes e restringe as operações que o compilador pode emitir. Tamanho, signedness, alinhamento e padding fazem parte do contrato observável.",
      "A toolchain separa responsabilidades. O compilador traduz unidades isoladas; o linker combina símbolos e relocations; o loader mapeia segmentos e prepara o primeiro instruction pointer."
    ],
    flow: ["source.c", "preprocessor", "compiler", "object.o", "linker", "executable", "loader", "CPU"],
    topicNotes: {
      tipos: "Tipos especificam interpretação, faixa, alinhamento e operações válidas. sizeof mede a representação do objeto; ele não promete a mesma largura em toda ABI.",
      representação: "Valores viram padrões de bits. Inteiros signed usam representação definida pela implementação histórica e, nas máquinas modernas, complemento de dois; floating point costuma seguir IEEE 754.",
      compiler: "O compilador analisa tokens e tipos, constrói representações intermediárias, otimiza sob as regras da linguagem e seleciona instruções para uma arquitetura e ABI.",
      linker: "O linker resolve símbolos entre objetos e bibliotecas, aplica relocations e produz o layout final. Erros de undefined reference pertencem a esta etapa, não ao parser C."
    },
    code: {
      language: "shell",
      filename: "inspect-toolchain.sh",
      source: `gcc -std=c17 -Wall -Wextra -O2 -c soma.c -o soma.o
nm -C soma.o
objdump -dr -Mintel soma.o
gcc soma.o main.o -o app
readelf -h -S -l app`,
      explanation: "Compile sem linkar, observe símbolos e relocations no objeto e só depois produza o executável. A inspeção intermediária torna cada fronteira explícita."
    },
    mechanics: [
      { title: "Tradução", detail: "Macros e includes formam uma unidade; parsing e type checking rejeitam programas incompatíveis com o modelo da linguagem." },
      { title: "Lowering", detail: "Expressões viram IR, depois operações da ISA, com decisões de registradores, stack e calling convention." },
      { title: "Linkedição", detail: "Referências ainda sem endereço são ligadas a definições e cada relocation é ajustada ao layout escolhido." },
      { title: "Carregamento", detail: "O SO mapeia segmentos, resolve dependências dinâmicas e entrega o controle ao runtime antes de main." }
    ],
    invariants: ["Cada definição externa deve resolver para um símbolo compatível.", "A ABI precisa concordar sobre tamanho, alinhamento e chamada entre unidades.", "O executável contém bytes e metadados; nomes C podem não sobreviver sem símbolos de debug."],
    pitfalls: [
      { title: "Confundir compile e link", detail: "Um arquivo pode compilar perfeitamente e ainda falhar por símbolos ausentes ou definições duplicadas." },
      { title: "Assumir tamanhos", detail: "Use stdint.h quando a largura for parte do protocolo e valide layout com static_assert quando necessário." }
    ],
    practice: { prompt: "Siga uma função soma do source ao executável.", tasks: ["Gere apenas o .o e liste símbolos.", "Localize bytes e relocation da chamada.", "Ligue dois objetos e compare os endereços finais."], evidence: "Entregue source, comandos, trechos de nm/objdump e uma explicação de onde o endereço foi decidido." }
  }),

  "c-pointers": guide({
    thesis: "Ponteiros são valores tipados que localizam objetos; segurança depende de endereço válido, lifetime ativo, alinhamento correto e limites respeitados ao mesmo tempo.",
    context: [
      "Stack e heap não são qualidades do ponteiro. São regiões com políticas de lifetime diferentes; o mesmo tipo de ponteiro pode apontar para qualquer objeto compatível.",
      "Aritmética de ponteiros avança em unidades do tipo apontado. O compilador transforma essa regra em escala de endereço e a CPU executa loads e stores sem conhecer o tipo C original."
    ],
    flow: ["objeto", "& address", "pointer value", "register", "MMU translation", "load / store"],
    topicNotes: {
      pointers: "Um T* armazena a localização de um T. O valor pode ser nulo, válido, one-past ou inválido; somente alguns desses estados aceitam dereference.",
      stack: "A stack é organizada em frames de chamada. Locais automáticos deixam de existir ao sair do bloco, mesmo que seus bytes ainda pareçam intactos.",
      heap: "O heap oferece armazenamento de duração dinâmica. malloc entrega bytes alinhados; o programa define o tipo efetivo, inicialização e momento correto de free.",
      alignment: "Cada tipo exige endereços divisíveis por certo alinhamento. Um endereço numericamente dentro do buffer ainda pode ser inválido para um load tipado."
    },
    code: { language: "c", filename: "layout.c", source: `#include <stdint.h>
#include <stdlib.h>

int main(void) {
    int local = 7;
    int *on_stack = &local;
    int *on_heap = malloc(sizeof *on_heap);
    if (!on_heap) return 1;
    *on_heap = *on_stack + 5;
    free(on_heap);
}`, explanation: "Os dois ponteiros têm o mesmo tipo, mas apontam para objetos com owners e lifetimes diferentes. Após free, on_heap conserva um endereço sem conservar um objeto vivo." },
    mechanics: [
      { title: "Formar endereço", detail: "& produz a localização do objeto; arrays frequentemente convertem para ponteiro ao primeiro elemento." },
      { title: "Transportar", detail: "O endereço pode viver em memória ou registrador e ser passado conforme a ABI." },
      { title: "Traduzir", detail: "A MMU traduz o endereço virtual e verifica permissões da página antes do acesso físico/cache." },
      { title: "Acessar", detail: "O load/store usa tamanho e alinhamento escolhidos pelo compilador; a CPU não valida o lifetime C." }
    ],
    invariants: ["Nunca dereference null, dangling ou one-past.", "Todo objeto alocado deve ter um owner e exatamente uma liberação.", "A faixa [ptr, ptr + count) precisa permanecer dentro do mesmo array."],
    pitfalls: [{ title: "Retornar endereço local", detail: "O frame termina e o endereço fica dangling." }, { title: "Esquecer overflow de tamanho", detail: "count * sizeof(T) pode transbordar antes de malloc; valide a multiplicação." }],
    practice: { prompt: "Construa e desenhe um array dinâmico de quatro inteiros.", tasks: ["Registre endereço base e offsets.", "Mostre o valor antes/depois de um store indireto.", "Execute com AddressSanitizer e provoque um acesso one-past controlado."], evidence: "Inclua o mapa de endereços e a evidência do sanitizer, sem depender de endereços fixos." }
  }),

  "c-os": guide({
    thesis: "C alcança serviços do sistema por contratos de biblioteca e APIs nativas; uma chamada aparente pode atravessar wrappers, transição de privilégio, subsistemas e drivers.",
    context: [
      "POSIX padroniza interfaces como file descriptors e sockets. Win32 usa handles, funções A/W e objetos do sistema. Eles resolvem problemas semelhantes com contratos diferentes.",
      "Uma API de arquivo não fala diretamente com o disco. O kernel valida o caller, consulta caches e filesystems, agenda I/O e entrega o trabalho ao driver apropriado."
    ],
    flow: ["C function", "libc / Win32", "syscall boundary", "kernel object", "filesystem / network", "driver", "device"],
    topicNotes: {
      POSIX: "POSIX define uma superfície portátil de processos, arquivos e sockets. Retornos -1 e errno carregam falhas; partial I/O continua sendo resultado válido.",
      Win32: "Win32 expõe funções e tipos estáveis sobre subsistemas do Windows. HANDLE é referência opaca; ownership e CloseHandle pertencem ao contrato.",
      files: "Arquivos são streams de bytes mais metadados. Offsets, buffering, atomicidade e durabilidade são propriedades diferentes que precisam ser tratadas explicitamente.",
      sockets: "Sockets reutilizam a ideia de handle/descriptor, mas conectam o processo à network stack. send e recv podem transferir menos bytes que o solicitado."
    },
    code: { language: "c", filename: "read-loop.c", source: `for (;;) {
    ssize_t n = read(fd, buffer, sizeof buffer);
    if (n > 0) consume(buffer, (size_t)n);
    else if (n == 0) break;
    else if (errno != EINTR) return FAIL;
}`, explanation: "O loop diferencia dados, EOF, interrupção transitória e erro real. Uma única chamada não promete preencher todo o buffer." },
    mechanics: [
      { title: "Validar", detail: "O wrapper prepara argumentos; o kernel valida handle, endereço de user space, tamanho e permissões." },
      { title: "Resolver objeto", detail: "Descriptor ou HANDLE referencia uma entrada cuja implementação aponta para arquivo, socket, pipe ou dispositivo." },
      { title: "Executar I/O", detail: "Caches podem satisfazer a operação; caso contrário, subsistemas e drivers criam trabalho assíncrono para o dispositivo." },
      { title: "Retornar", detail: "Resultado, bytes transferidos e erro são copiados de volta sem garantir operação completa." }
    ],
    invariants: ["Feche apenas recursos que você possui.", "Trate short read/write e interrupções.", "Nunca passe ao kernel buffers menores que o tamanho declarado."],
    pitfalls: [{ title: "HANDLE inválido vs null", detail: "APIs Win32 não usam sempre o mesmo sentinel; confira o contrato de cada função." }, { title: "Confundir flush com persistência", detail: "Buffer de linguagem, cache do SO e cache do dispositivo são camadas diferentes." }],
    practice: { prompt: "Implemente um copiador binário robusto.", tasks: ["Faça loop de leitura e escrita parcial.", "Propague erros com contexto.", "Compare strace com a versão POSIX e Process Monitor com a versão Win32."], evidence: "Demonstre arquivo idêntico, tratamento de erro e sequência observada de chamadas." }
  }),

  "c-binary": guide({
    thesis: "O debugger conecta source, instruções e estado do processo; sanitizers adicionam instrumentação para transformar comportamento indefinido em evidência reproduzível.",
    context: [
      "Linhas de source não executam diretamente. Debug info mapeia intervalos de instruções para arquivos, linhas, variáveis e tipos, e a otimização pode romper uma correspondência simples.",
      "Uma ABI explica onde parâmetros e retorno vivem. Sem ela, registradores e stack parecem números arbitrários; com ela, tornam-se um contrato entre caller, callee e debugger."
    ],
    flow: ["source", "debug info", "breakpoint", "trap", "register snapshot", "memory", "hypothesis"],
    topicNotes: {
      assembly: "Disassembly mostra o código realmente executável. Leia instrução, operandos, largura e efeito em flags antes de inferir a intenção do source.",
      ABI: "A ABI fixa calling convention, layout, registradores preservados e formato de objetos. Código de módulos diferentes só coopera porque segue esse contrato.",
      debugging: "Debugging eficiente alterna hipótese e observação: pare no evento mínimo, examine estado relevante, dê um passo e compare com a previsão.",
      sanitizers: "ASan e UBSan instrumentam operações para detectar out-of-bounds, use-after-free e undefined behavior com stack traces e metadados."
    },
    code: { language: "shell", filename: "debug.sh", source: `clang -g3 -O1 -fno-omit-frame-pointer \
  -fsanitize=address,undefined bug.c -o bug
./bug
gdb --args ./bug
# break main
# disassemble /m
# info registers`, explanation: "Símbolos, frame pointers e sanitizers produzem visões complementares. O relatório é evidência; não substitua a causa pela linha onde o crash finalmente apareceu." },
    mechanics: [
      { title: "Breakpoint", detail: "O debugger altera fluxo com trap de software ou recurso de hardware e recebe controle quando o evento ocorre." },
      { title: "Contexto", detail: "O SO suspende a thread; registradores, mapas de memória e stack podem ser consultados de forma consistente." },
      { title: "Unwind", detail: "Debug info e regras da ABI reconstruem frames; otimização e corrupção podem tornar o unwind parcial." },
      { title: "Instrumentação", detail: "Sanitizers adicionam checks e shadow metadata durante a compilação, mudando custo e layout do programa." }
    ],
    invariants: ["Observe a thread e o frame corretos.", "Relacione RIP à imagem e ao módulo carregado.", "Reproduza com os mesmos dados e flags antes de concluir."],
    pitfalls: [{ title: "Confiar em variáveis optimized out", detail: "Em builds otimizados, valores podem ser constantes, combinados ou inexistentes como storage separado." }, { title: "Corrigir o crash, não a corrupção", detail: "O local do acesso inválido pode ocorrer muito depois da primeira escrita incorreta." }],
    practice: { prompt: "Diagnostique um overflow local em um programa próprio.", tasks: ["Reproduza com ASan.", "Pare antes da escrita e examine registers/stack.", "Compare -O0 e -O2 sem assumir assembly idêntico."], evidence: "Apresente hipótese, observação, origem da corrupção e a correção validada." }
  }),

  "cpp-objects": guide({
    thesis: "C++ organiza recursos em lifetimes de objetos: construção estabelece invariantes, destruição libera ownership e RAII torna o controle de fluxo responsável pela limpeza.",
    context: [
      "Uma classe é layout mais operações e invariantes; não é automaticamente heap allocation. Objetos podem viver como automáticos, subobjetos, estáticos ou alocações dinâmicas.",
      "Move transfere um estado válido entre objetos sem duplicar ownership. Smart pointers modelam políticas distintas: exclusivo, compartilhado e observador não proprietário."
    ],
    flow: ["storage", "constructor", "valid invariant", "use", "move / scope exit", "destructor", "release"],
    topicNotes: {
      classes: "Classes combinam representação e invariantes. Access control protege a interface; não altera por si só o layout ou custo das operações.",
      RAII: "RAII vincula aquisição a construção e liberação a destruição. Exceções e returns antecipados ainda percorrem destructors de objetos já construídos.",
      move: "Move construction recebe recursos de outro objeto e o deixa válido, porém com estado não especificado. std::move apenas habilita a seleção; ele não move bytes sozinho.",
      "smart pointers": "unique_ptr representa ownership exclusivo; shared_ptr usa um control block e custo atômico; weak_ptr observa sem prolongar lifetime."
    },
    code: { language: "cpp", filename: "native_handle.cpp", source: `class unique_handle {
    HANDLE value_ = INVALID_HANDLE_VALUE;
public:
    explicit unique_handle(HANDLE h) : value_(h) {}
    ~unique_handle() { if (valid()) CloseHandle(value_); }
    unique_handle(const unique_handle&) = delete;
    unique_handle(unique_handle&& other) noexcept
      : value_(std::exchange(other.value_, INVALID_HANDLE_VALUE)) {}
    bool valid() const { return value_ != INVALID_HANDLE_VALUE; }
};`, explanation: "A classe expressa exatamente um owner, impede cópia e torna a transferência explícita. O destructor traduz fim de lifetime C++ para CloseHandle." },
    mechanics: [{ title: "Storage", detail: "Memória é obtida antes do constructor; o objeto passa a existir conforme as regras de lifetime." }, { title: "Invariante", detail: "Ao terminar a construção, toda operação pública pode pressupor o estado válido documentado." }, { title: "Transferência", detail: "Move altera dois objetos e deve preservar destruição segura de ambos." }, { title: "Destruição", detail: "Destructors executam em ordem inversa e liberam recursos antes de o storage ser reutilizado." }],
    invariants: ["Todo recurso possui uma política de ownership identificável.", "Destructors não lançam durante unwinding.", "Objetos movidos continuam destruíveis e atribuíveis conforme o contrato."],
    pitfalls: [{ title: "shared_ptr por padrão", detail: "Ownership compartilhado esconde arquitetura e pode formar ciclos; prefira exclusivo até haver necessidade real." }, { title: "Destructor virtual ausente", detail: "Deletar via base sem destructor virtual quando o uso é polimórfico produz comportamento indefinido." }],
    practice: { prompt: "Crie wrappers RAII para FILE* e HANDLE.", tasks: ["Defina sentinel e função de fechamento corretos.", "Desabilite cópia e implemente move noexcept.", "Teste return antecipado e falha durante construção."], evidence: "Mostre que cada recurso é fechado uma vez em todos os caminhos." }
  }),

  "cpp-generic": guide({
    thesis: "Templates permitem gerar código específico preservando tipos; a STL combina containers, iterators e algorithms por contratos que deixam custo e ownership analisáveis.",
    context: [
      "Genericidade acontece em compile time, mas allocations, branches e cópias continuam existindo no binário. O tipo concreto determina a instanciação e oportunidades de inline.",
      "Allocators separam política de storage da estrutura. Concepts tornam requisitos verificáveis e produzem diagnósticos antes de uma sequência obscura de substitution failures."
    ],
    flow: ["template", "constraints", "instantiation", "optimized machine code", "container storage", "iterator operations"],
    topicNotes: {
      STL: "A STL trabalha com requisitos: vector oferece contiguidade e invalidação específica; list oferece estabilidade de nós com pior localidade. Escolha pela operação dominante.",
      templates: "Templates são receitas instanciadas por argumentos. Cada especialização pode gerar código diferente e aumentar binário, mas também expõe constantes ao otimizador.",
      concepts: "Concepts nomeiam propriedades como sortable ou contiguous_range. Eles restringem overloads e documentam o mínimo necessário do algoritmo.",
      allocators: "Allocators fornecem allocate/deallocate e construção acontece separadamente. Arenas e polymorphic allocators mudam origem e lifetime do storage."
    },
    code: { language: "cpp", filename: "sum.hpp", source: `template<std::ranges::input_range R>
requires std::integral<std::ranges::range_value_t<R>>
auto sum(const R& values) {
    using T = std::ranges::range_value_t<R>;
    T result{};
    for (T value : values) result += value;
    return result;
}`, explanation: "O concept declara o contrato; a instanciação conhece T e o iterator concretos, permitindo inline e, quando seguro, vetorização." },
    mechanics: [{ title: "Selecionar overload", detail: "Deduction encontra argumentos e constraints removem candidatos incompatíveis." }, { title: "Instanciar", detail: "O compilador forma uma especialização concreta e valida todas as expressões dependentes." }, { title: "Otimizar", detail: "Iterators e lambdas pequenos frequentemente desaparecem após inline, mas isso deve ser verificado no assembly." }, { title: "Gerenciar storage", detail: "Container controla capacidade, realocação, construção e destruição de elementos." }],
    invariants: ["Iterators respeitam categoria e faixa válidas.", "Reallocation invalida referências conforme o container.", "Allocator usado para liberar deve corresponder ao que alocou."],
    pitfalls: [{ title: "Abstração sem medir", detail: "Zero-cost significa não pagar pelo que não usa, não que toda combinação seja grátis." }, { title: "Guardar iterator inválido", detail: "push_back pode realocar vector; reserve ou recalcule posições." }],
    practice: { prompt: "Compare vector, deque e list para um workload concreto.", tasks: ["Declare operações e invariantes.", "Conte allocations e bytes.", "Meça tempo e cache misses em release."], evidence: "Justifique a escolha com complexidade, localidade e medições, não preferência." }
  }),

  "cpp-runtime": guide({
    thesis: "Concorrência em C++ combina threads do sistema com um memory model da linguagem; sincronização precisa ordenar acessos, não apenas impedir execução simultânea por acaso.",
    context: [
      "Data race em objeto não atômico é comportamento indefinido. Mutex cria exclusão e relações happens-before; atomics oferecem operações e memory orders mais específicos.",
      "Profiling deve separar wall time, CPU time, contenção, scheduling e cache. Uma função rápida isolada pode ser lenta dentro de um sistema por coordenação."
    ],
    flow: ["std::thread", "OS thread", "scheduler", "CPU core", "cache coherence", "shared state"],
    topicNotes: {
      threads: "std::thread representa uma execução concorrente normalmente mapeada a uma thread do SO. Join estabelece lifetime; detach remove essa coordenação e exige ownership independente.",
      atomics: "Atomics evitam data race no objeto atômico e oferecem read-modify-write indivisível. Memory order define quais outros acessos ficam ordenados.",
      "memory model": "Sequenced-before, synchronizes-with e happens-before determinam o que uma execução pode observar. Tempo de relógio ou cache compartilhado não substitui essa relação formal.",
      profiling: "Perfis precisam usar builds representativos, aquecimento e repetição. CPU sampling mostra onde o tempo ativo ocorre; tracing mostra espera e causalidade."
    },
    code: { language: "cpp", filename: "handoff.cpp", source: `std::mutex mutex;
std::condition_variable ready;
std::queue<Job> jobs;

void push(Job job) {
    { std::lock_guard lock(mutex); jobs.push(std::move(job)); }
    ready.notify_one();
}`, explanation: "O mutex protege a invariável da queue. O notify ocorre após liberar o lock para reduzir contenção; a espera deve sempre revalidar o predicado." },
    mechanics: [{ title: "Criar", detail: "Runtime chama a API do SO, que aloca kernel bookkeeping e uma stack virtual para a nova thread." }, { title: "Escalonar", detail: "Scheduler escolhe quando e em qual core a thread executa; preemption pode ocorrer entre operações." }, { title: "Sincronizar", detail: "Primitivas emitem operações atômicas e, se necessário, waits do kernel para evitar busy spinning prolongado." }, { title: "Observar", detail: "Profiler amostra stacks ou registra eventos; overhead e symbolization precisam ser conhecidos." }],
    invariants: ["Nenhum acesso concorrente conflitante fica sem sincronização.", "Lifetimes dos dados cobrem todas as threads que os acessam.", "Toda espera tem predicado e caminho de wakeup."],
    pitfalls: [{ title: "volatile como lock", detail: "volatile não cria atomicidade nem happens-before em C++." }, { title: "Benchmark em debug", detail: "Instrumentação e otimizações ausentes distorcem completamente hot paths." }],
    practice: { prompt: "Implemente uma fila produtor/consumidor limitada.", tasks: ["Defina predicados cheio/vazio.", "Teste shutdown sem deadlock.", "Meça throughput e tempo bloqueado com 1, 2 e 8 workers."], evidence: "Inclua invariantes, teste sob ThreadSanitizer quando disponível e perfil da contenção." }
  }),

  "cpp-native": guide({
    thesis: "Uma aplicação nativa conecta lifetime C++ a uma janela, uma fila de eventos e recursos de GPU; cada camada possui thread affinity, erros e regras de destruição próprias.",
    context: [
      "Win32 entrega controle por mensagens à thread criadora da janela. SDL3 oferece uma camada portátil, mas ainda cria uma janela nativa e integra contextos ou surfaces das APIs gráficas.",
      "OpenGL mantém grande parte do estado no driver; Vulkan torna recursos, comandos e sincronização explícitos. Em ambos, C++ deve representar ownership sem destruir dependências fora de ordem."
    ],
    flow: ["C++ application", "Win32 / SDL3", "native window", "graphics API", "driver", "GPU", "present"],
    topicNotes: {
      Win32: "Win32 associa HWND a uma thread e entrega mensagens a WndProc. O loop não é boilerplate descartável: ele determina responsividade e lifetime da interface.",
      SDL3: "SDL3 normaliza janela, input, controller e áudio. Native handles ainda podem ser necessários para integração específica e devem respeitar o backend ativo.",
      OpenGL: "OpenGL exige contexto current em uma thread. Objetos têm nomes e estado implícito; chamadas alteram uma máquina de estado mantida pelo driver.",
      Vulkan: "Vulkan separa instance, device, queues, resources e command buffers. A aplicação declara sincronização e transições que APIs implícitas escondem."
    },
    code: { language: "cpp", filename: "app-loop.cpp", source: `while (running) {
    while (poll_event(event)) handle(event, state);
    update(state, clock.tick());
    Frame frame = renderer.begin_frame();
    renderer.draw(frame, scene);
    renderer.present(frame);
}`, explanation: "O loop separa input, simulação, construção do frame e apresentação. Cada função pode ser instrumentada para atribuir frame time à CPU, driver ou GPU." },
    mechanics: [{ title: "Plataforma", detail: "Cria janela e coleta eventos do window system e dispositivos." }, { title: "Surface/context", detail: "A API gráfica conecta renderização a um alvo apresentável compatível com a janela." }, { title: "Record/submission", detail: "CPU prepara estado ou comandos; driver valida e agenda trabalho para queues da GPU." }, { title: "Present", detail: "Swapchain entrega imagem ao compositor, que coordena scanout e sincronização visual." }],
    invariants: ["Recursos filhos morrem antes do device/context pai.", "Eventos são drenados com frequência suficiente para manter a janela responsiva.", "Objetos usados pela GPU permanecem vivos até a conclusão sinalizada."],
    pitfalls: [{ title: "Destruir cedo demais", detail: "Retorno de submit não significa que a GPU terminou; use fence ou lifetime por frame." }, { title: "Acoplar lógica ao frame rate", detail: "Atualização variável sem delta controlado produz comportamento dependente da máquina." }],
    practice: { prompt: "Construa um loop com backend de plataforma intercambiável.", tasks: ["Modele eventos e shutdown.", "Registre CPU frame time e present wait.", "Troque Win32 por SDL3 sem alterar a simulação."], evidence: "Demonstre a mesma cena e documente quais camadas realmente mudaram." }
  }),

  "sys-cpu": guide({
    thesis: "A CPU executa instruções em níveis de privilégio; interrupções, exceções e traps transferem controle para handlers do kernel com contexto suficiente para retornar.",
    context: [
      "User mode limita instruções e endereços acessíveis. O kernel configura tabelas e entradas controladas para que aplicações peçam serviços sem poder saltar para qualquer endereço privilegiado.",
      "Interrupção externa, fault de página e syscall têm causas diferentes, mas convergem em salvar estado, mudar contexto de privilégio e escolher um handler."
    ],
    flow: ["instruction", "event / trap", "save context", "privilege transition", "kernel handler", "restore", "resume"],
    topicNotes: {
      CPU: "A CPU mantém registradores arquiteturais, flags e instruction pointer, mas performance também depende de pipeline, caches, prediction e execução fora de ordem.",
      "user mode": "User mode executa aplicações com page tables e privilégios restritos. Uma violação vira exception, não acesso silencioso ao kernel.",
      "kernel mode": "Kernel mode pode configurar MMU, dispositivos e interrupções. Esse poder amplia o impacto de bugs e justifica fronteiras pequenas e validadas.",
      interrupts: "Interrupções assíncronas sinalizam dispositivos ou timers; exceptions são síncronas à instrução; syscalls são traps intencionais."
    },
    code: { language: "asm", filename: "transition.asm", source: `; conceptual x86-64 path
mov rax, SERVICE_ID
mov rdi, buffer
syscall
; kernel validates user pointer
; result returns in rax`, explanation: "A instrução inicia uma entrada controlada. Registradores transportam o contrato da ABI, mas o kernel não confia no endereço apenas porque ele veio de um registrador." },
    mechanics: [{ title: "Detectar evento", detail: "A unidade arquitetural identifica trap, exception ou linha de interrupção pendente em um ponto preciso." }, { title: "Salvar estado", detail: "Hardware e software preservam RIP, flags e registradores necessários no contexto da thread/CPU." }, { title: "Executar handler", detail: "Kernel identifica causa, valida origem e realiza trabalho imediato ou agenda uma continuação." }, { title: "Retornar", detail: "Estado permitido é restaurado; scheduling pode escolher outra thread antes da volta a user mode." }],
    invariants: ["Entrada privilegiada usa vetor/target configurado pelo kernel.", "Dados vindos de user mode são tratados como não confiáveis.", "Contexto restaurado não pode elevar privilégios arbitrariamente."],
    pitfalls: [{ title: "Toda syscall troca de processo", detail: "Há transição de privilégio, mas o processo pode continuar sendo o mesmo; context switch é decisão separada." }, { title: "Interrupção é sempre hardware", detail: "Traps e exceptions também usam infraestrutura de controle semelhante." }],
    practice: { prompt: "Desenhe o caminho de uma leitura que sofre page fault.", tasks: ["Separe syscall de fault.", "Marque estado salvo e permissões.", "Indique onde a thread pode bloquear e o scheduler agir."], evidence: "Um diagrama causal que distinga eventos síncronos, assíncronos e troca de contexto." }
  }),

  "sys-process": guide({
    thesis: "Processo é um contêiner de recursos e address space; thread é a unidade escalonável que carrega registradores e stack dentro desse processo.",
    context: [
      "Isolamento vem principalmente de page tables e checks do kernel, não de o processo possuir memória física exclusiva. Duas imagens podem compartilhar páginas read-only e bibliotecas.",
      "O scheduler alterna contextos executáveis segundo política, prioridade e disponibilidade de cores. IPC cria canais explícitos entre domínios que não compartilham endereços por padrão."
    ],
    flow: ["executable", "process object", "virtual address space", "threads", "scheduler", "cores", "IPC"],
    topicNotes: {
      process: "O processo agrupa mapa virtual, handles/descriptors, credenciais e accounting. Ele não executa sem ao menos uma thread.",
      thread: "Cada thread possui registradores, stack e estado de scheduling, mas compartilha heap, globals e recursos do processo.",
      scheduler: "O scheduler escolhe entidades runnable e pode preemptá-las. Afinidade, prioridade e estado de espera influenciam latency e fairness.",
      IPC: "Pipes, sockets, shared memory e message queues trocam dados com diferentes custos, framing e modelos de confiança."
    },
    code: { language: "text", filename: "process-model.txt", source: `Process 4820
├─ address space: code | heap | mapped files
├─ handles: file 0x44 | event 0xA8
└─ threads
   ├─ T1: RIP + registers + stack → RUNNING
   └─ T2: RIP + registers + stack → WAITING(event)`, explanation: "Threads compartilham o contêiner, mas seus contextos de execução são independentes. Um race acontece justamente na interseção entre contextos separados e dados compartilhados." },
    mechanics: [{ title: "Criar processo", detail: "Kernel cria objetos, address space e recursos herdados; loader mapeia a imagem e prepara a thread inicial." }, { title: "Tornar runnable", detail: "Thread entra em fila de execução quando não está bloqueada por I/O ou sincronização." }, { title: "Trocar contexto", detail: "Scheduler salva registradores da thread anterior e carrega os da próxima, ajustando address space quando necessário." }, { title: "Comunicar", detail: "IPC copia dados pelo kernel ou mapeia memória comum com sincronização explícita." }],
    invariants: ["Cada thread usa uma stack válida dentro do address space.", "Shared memory exige protocolo de sincronização separado.", "Handles só são válidos no processo e contexto de herança/duplicação definidos."],
    pitfalls: [{ title: "Processo igual programa", detail: "O mesmo executável pode originar muitos processos com estado independente." }, { title: "IPC sem framing", detail: "Stream preserva bytes, não necessariamente limites de mensagens." }],
    practice: { prompt: "Modele um worker isolado controlado por um processo pai.", tasks: ["Escolha IPC e formato de mensagens.", "Defina timeout e encerramento.", "Mapeie recursos herdados e permissões."], evidence: "Documente estados do processo/thread e comportamento quando o worker trava ou sai." }
  }),

  "sys-memory": guide({
    thesis: "Memória virtual separa endereços usados pelo programa de frames físicos; loaders constroem esse mapa a partir de segmentos de executáveis e bibliotecas.",
    context: [
      "Pages têm estado, backing e permissões. Reservar endereço, comprometer storage e tocar a página são eventos diferentes; demand paging adia trabalho até o primeiro acesso.",
      "PE e ELF descrevem layout em arquivo e requisitos de memória. O loader mapeia segmentos, aplica relocations e resolve imports antes de transferir controle."
    ],
    flow: ["virtual address", "TLB", "page tables", "physical frame / file", "permissions", "fault handler"],
    topicNotes: {
      pages: "Pages são unidades de mapping e proteção. Uma região contínua virtual pode apontar para frames físicos dispersos ou para um arquivo mapeado.",
      MMU: "A MMU traduz endereços através de page tables e cacheia resultados no TLB. Falhas de presença ou permissão geram page fault.",
      PE: "PE organiza headers, sections e data directories para o loader Windows. RVA é relativo ao image base mapeado.",
      ELF: "ELF distingue sections úteis ao linker e program headers usados pelo loader. Segmentos PT_LOAD determinam mappings executáveis, read-only e graváveis."
    },
    code: { language: "text", filename: "mapping.txt", source: `VA 0x00007f12_00403120
  → PML4 / PDPT / PD / PT
  → PTE { present=1, writable=0, executable=1 }
  → physical frame 0x91ab + offset 0x120
  → bytes backed by executable .text`, explanation: "O offset dentro da page é preservado; os níveis superiores selecionam a entrada que fornece frame e permissões efetivas." },
    mechanics: [{ title: "Reservar mapa", detail: "Kernel encontra faixa virtual livre e registra a região sem necessariamente alocar RAM." }, { title: "Mapear backing", detail: "Páginas são associadas a arquivo, zero-fill, swap ou frames privados." }, { title: "Traduzir", detail: "MMU consulta TLB/page tables e combina permissões de todos os níveis." }, { title: "Resolver fault", detail: "Kernel carrega, cria copy-on-write ou encerra o processo conforme causa e política." }],
    invariants: ["Permissões refletem uso: código RX, dados RW sempre que possível.", "Endereço virtual não revela frame físico estável.", "Mappings sobrevivem apenas enquanto região e backing permanecem válidos."],
    pitfalls: [{ title: "Confundir section e segment", detail: "Sections são visão de linkedição; o loader usa program headers/section mapping apropriado ao formato." }, { title: "RAM no reserve", detail: "Reserva de VA não implica commit nem página residente." }],
    practice: { prompt: "Compare o layout em disco e memória de um executável próprio.", tasks: ["Liste sections/segments.", "Leia o mapa do processo.", "Converta RVA/offset e localize o entry point."], evidence: "Tabela mostrando arquivo, VA, permissões e backing de cada região relevante." }
  }),

  "sys-io": guide({
    thesis: "I/O atravessa abstrações de arquivo e device até drivers; caches e DMA permitem mover dados sem manter a CPU copiando cada byte.",
    context: [
      "Filesystem traduz nomes e offsets em objetos, blocos e políticas de consistência. O page cache pode atender reads e acumular writes antes de qualquer operação física.",
      "Drivers programam dispositivos e tratam completion/interrupts. DMA move buffers entre dispositivo e memória sob coordenação do kernel e da IOMMU."
    ],
    flow: ["API", "kernel I/O object", "VFS / I/O manager", "filesystem", "block layer", "driver", "DMA device"],
    topicNotes: {
      "I/O": "I/O pode ser síncrono do ponto de vista da thread e ainda assíncrono no dispositivo. Completion indica a garantia definida pela API, não necessariamente persistência física.",
      filesystem: "Filesystem mantém namespace, metadata e alocação de blocos. Journaling protege consistência estrutural, não substitui backup nem torna toda write atômica.",
      drivers: "Driver traduz operações genéricas em comandos do hardware, administra queues e devolve completions. Bugs operam com privilégio alto e exigem forte validação.",
      DMA: "DMA permite ao dispositivo acessar buffers preparados sem loops de cópia da CPU. Pinning, cache coherence e IOMMU fazem parte do contrato."
    },
    code: { language: "text", filename: "io-path.txt", source: `read(fd, user_buffer, 4096)
  → validate descriptor + user range
  → page cache lookup
  → cache miss: filesystem maps file offset to blocks
  → driver queues DMA into kernel pages
  → completion wakes thread
  → bytes copied/mapped to user buffer`, explanation: "O caminho real depende de cache hit, direct I/O, dispositivo e API. A observação deve indicar quais etapas ocorreram naquele trace." },
    mechanics: [{ title: "Resolver nome/handle", detail: "Kernel encontra objeto aberto e verifica modo, offset e credenciais." }, { title: "Consultar cache", detail: "Dados presentes podem evitar dispositivo; readahead pode antecipar blocos futuros." }, { title: "Submeter", detail: "Block layer e driver formam comandos, mapeiam buffers e acionam a queue do dispositivo." }, { title: "Completar", detail: "Interrupção ou polling registra status, atualiza cache e acorda waiters." }],
    invariants: ["Buffers permanecem válidos pelo lifetime exigido pela operação.", "Erros e transferências parciais são propagados.", "Durabilidade só é afirmada após a primitiva apropriada e suporte do dispositivo."],
    pitfalls: [{ title: "Medir cache como disco", detail: "Repita com metodologia que separe page cache, device cache e mídia." }, { title: "Bloquear event loop", detail: "I/O síncrono longo paralisa a thread que também deveria processar eventos." }],
    practice: { prompt: "Instrumente a leitura sequencial de um arquivo grande.", tasks: ["Compare primeira e segunda leitura.", "Registre syscalls, faults e throughput.", "Explique a diferença por cache e readahead."], evidence: "Medições reproduzíveis com tamanho, flags, estado de cache e interpretação." }
  }),

  "linux-syscalls": guide({
    thesis: "Em Linux, libc oferece wrappers estáveis sobre a ABI de syscall; a transição entrega argumentos ao kernel, que valida user memory e devolve resultado ou errno.",
    context: [
      "Nem toda função libc executa uma syscall, e uma função pode realizar várias. Buffering de stdio, vDSO e caching alteram o caminho sem mudar o contrato C.",
      "Números de syscall pertencem à arquitetura e versão da ABI. Código de aplicação usa nomes e wrappers, enquanto análise usa strace para observar a fronteira real."
    ],
    flow: ["application", "libc wrapper", "register ABI", "syscall instruction", "kernel", "return value", "errno"],
    topicNotes: {
      syscall: "syscall transfere controle por uma entrada configurada; registers carregam número e argumentos segundo a ABI. O kernel retorna valor negativo codificado para o wrapper.",
      libc: "libc traduz contratos C/POSIX em chamadas, buffering e compatibilidade. fopen/fprintf adicionam FILE e buffer sobre open/write.",
      strace: "strace observa entradas e saídas da fronteira, inclusive argumentos, sinais e tempo. Ele mostra syscalls, não todas as funções do processo.",
      errno: "errno é thread-local e só deve ser lido após uma função indicar falha. Preserve-o antes de outra chamada que possa alterá-lo."
    },
    code: { language: "c", filename: "write-all.c", source: `int write_all(int fd, const void *data, size_t size) {
    const unsigned char *p = data;
    while (size) {
        ssize_t n = write(fd, p, size);
        if (n > 0) { p += n; size -= (size_t)n; }
        else if (n < 0 && errno == EINTR) continue;
        else return -1;
    }
    return 0;
}`, explanation: "O wrapper da aplicação mantém o contrato 'todos os bytes' sobre a primitiva write, que permite resultados parciais e interrupção." },
    mechanics: [{ title: "Preparar ABI", detail: "Wrapper coloca identificador e argumentos nos registers esperados pela arquitetura." }, { title: "Transicionar", detail: "CPU muda para entry point do kernel e troca stacks/contexto conforme configuração." }, { title: "Validar", detail: "Kernel verifica descriptor, limites, permissões e copia dados com helpers seguros para user space." }, { title: "Traduzir erro", detail: "libc converte retorno de erro em -1 e grava errno da thread." }],
    invariants: ["Use wrappers salvo quando a aula estuda deliberadamente a ABI.", "Cheque retorno antes de errno.", "Buffers e tamanhos representam memória acessível pelo processo."],
    pitfalls: [{ title: "Fixar syscall number", detail: "Isso quebra portabilidade entre arquiteturas e pode ignorar compatibilidade da libc." }, { title: "Um printf, uma write", detail: "stdio pode acumular, dividir ou evitar writes conforme buffering." }],
    practice: { prompt: "Trace um programa que usa fopen, fprintf e fclose.", tasks: ["Prediga open/write/close.", "Execute strace filtrado.", "Explique buffering e chamadas adicionais do loader."], evidence: "Tabela função de alto nível → syscalls observadas → motivo das diferenças." }
  }),

  "linux-process": guide({
    thesis: "fork duplica logicamente o processo usando copy-on-write; execve substitui a imagem no mesmo processo, preservando apenas recursos definidos pelo contrato.",
    context: [
      "Após fork há dois fluxos retornando de uma mesma chamada, com PIDs diferentes e páginas inicialmente compartilhadas. Modificação provoca cópia privada quando necessário.",
      "execve não cria processo novo. O loader descarta mappings da imagem anterior, carrega o ELF e inicia o runtime com argv, envp e descriptors não marcados close-on-exec."
    ],
    flow: ["parent", "fork", "parent + child", "copy-on-write", "execve", "ELF loader", "new program"],
    topicNotes: {
      fork: "fork cria child com contexto quase idêntico e retorno 0 no child. Em programa multithread, só a thread chamadora sobrevive até exec e poucas funções são seguras nesse intervalo.",
      execve: "execve substitui address space e inicia novo entry point. PID permanece; código após sucesso nunca executa.",
      signals: "Signals são notificações assíncronas com disposition e máscara. Handlers têm conjunto restrito de operações async-signal-safe.",
      pipes: "Pipe é stream unidirecional no kernel. EOF aparece apenas quando todos os file descriptors de escrita foram fechados."
    },
    code: { language: "c", filename: "spawn.c", source: `int pipefd[2];
pipe2(pipefd, O_CLOEXEC);
pid_t pid = fork();
if (pid == 0) {
    dup2(pipefd[1], STDOUT_FILENO);
    close(pipefd[0]); close(pipefd[1]);
    execlp("printf", "printf", "child\\n", NULL);
    _exit(127);
}
close(pipefd[1]);
waitpid(pid, NULL, 0);`, explanation: "O child prepara descriptors e executa novo programa. _exit evita flushing duplicado quando exec falha." },
    mechanics: [{ title: "Clonar metadata", detail: "Kernel cria task, descriptor table e page tables com mappings copy-on-write." }, { title: "Separar fluxos", detail: "Retornos diferentes permitem branch de parent e child; ambos precisam fechar ends de pipe não usados." }, { title: "Substituir imagem", detail: "exec valida ELF, reconstrói stack inicial e mappings e aplica regras de credenciais." }, { title: "Recolher", detail: "Parent usa wait para obter status e liberar o zombie bookkeeping." }],
    invariants: ["Child termina com exec ou _exit no caminho de falha.", "Descriptors não necessários são fechados em ambos os processos.", "Parent sempre possui estratégia de wait/reaping."],
    pitfalls: [{ title: "Buffer duplicado", detail: "stdio buffered antes de fork pode ser flushed duas vezes; flush antes ou use _exit no child." }, { title: "Pipe que nunca fecha", detail: "Um descriptor de escrita esquecido impede o reader de observar EOF." }],
    practice: { prompt: "Implemente uma pipeline produtor | consumidor.", tasks: ["Crie pipe com CLOEXEC.", "Configure stdin/stdout com dup2.", "Feche todos os descriptors e colete ambos os status."], evidence: "Trace de processos e descriptors provando por que EOF e shutdown acontecem." }
  }),

  "linux-network": guide({
    thesis: "Sockets conectam descriptors à network stack; epoll observa transições de readiness, mas o programa ainda precisa drenar buffers e manter estado parcial por conexão.",
    context: [
      "TCP oferece stream ordenado, não mensagens. accept, recv e send retornam conforme filas do kernel e podem bloquear ou produzir progresso parcial.",
      "epoll reduz varredura de descriptors ao registrar interesse no kernel. Edge-triggered exige operações nonblocking até EAGAIN para não perder progresso."
    ],
    flow: ["socket", "bind / listen", "accept queue", "epoll readiness", "recv / parse", "send queue", "TCP/IP"],
    topicNotes: {
      socket: "socket cria endpoint e retorna descriptor. Domain, type e protocol escolhem address family e semântica de transporte.",
      epoll: "epoll mantém interest list e ready list. Readiness significa que uma operação pode progredir agora, não que uma mensagem inteira chegou.",
      TCP: "TCP controla sequência, retransmissão, janela e congestionamento. A aplicação define framing e limites sobre o byte stream.",
      UDP: "UDP preserva datagramas, mas não garante entrega, ordem ou unicidade. Tamanho e endereço do peer acompanham cada operação."
    },
    code: { language: "c", filename: "drain.c", source: `for (;;) {
    ssize_t n = recv(fd, buffer, sizeof buffer, 0);
    if (n > 0) parser_push(&client, buffer, (size_t)n);
    else if (n == 0) { close_client(fd); break; }
    else if (errno == EAGAIN || errno == EWOULDBLOCK) break;
    else if (errno != EINTR) { close_client(fd); break; }
}`, explanation: "No modo edge-triggered, o handler drena o socket até EAGAIN. O parser conserva bytes incompletos entre eventos." },
    mechanics: [{ title: "Ingressar pacote", detail: "NIC/driver entrega frames; kernel processa IP/TCP e coloca payload na receive queue do socket." }, { title: "Marcar readiness", detail: "Mudança relevante adiciona o fd à ready list e acorda a thread que espera em epoll_wait." }, { title: "Drenar", detail: "Aplicação lê até EAGAIN, atualiza parser e aplica limites por conexão." }, { title: "Enviar", detail: "send copia/agenda bytes; kernel segmenta, controla janela e retransmite quando necessário." }],
    invariants: ["Todo fd monitorado está nonblocking quando usado em edge-triggered.", "Parser aceita fragmentação e coalescência arbitrárias.", "Buffers e queues possuem limites contra peers lentos."],
    pitfalls: [{ title: "Uma recv = uma mensagem", detail: "TCP pode dividir ou juntar mensagens; framing é responsabilidade da aplicação." }, { title: "EPOLLOUT permanente", detail: "Monitorar escrita sem dados pendentes causa wakeups constantes." }],
    practice: { prompt: "Construa um echo server epoll com framing por tamanho.", tasks: ["Mantenha estado por conexão.", "Trate partial read/write.", "Aplique limite de frame e backpressure."], evidence: "Teste com frames fragmentados, múltiplos no mesmo recv e cliente lento." }
  }),

  "linux-elf": guide({
    thesis: "ELF organiza código, dados e metadados para linker e loader; symbols e relocations conectam referências que ainda não tinham endereço definitivo.",
    context: [
      "Section headers descrevem a visão de linkedição e podem até ser removidos de um executável. Program headers dizem ao kernel/loader o que mapear e com quais permissões.",
      "O dynamic linker carrega dependências, resolve symbols e aplica relocations. Lazy binding pode adiar parte da resolução até a primeira chamada."
    ],
    flow: ["ELF header", "program headers", "PT_LOAD mappings", "interpreter ld.so", "dependencies", "relocations", "entry point"],
    topicNotes: {
      ELF: "O header identifica classe, endian, machine e offsets das tabelas. Validação precisa checar magic, tamanhos, contagens e limites antes de seguir offsets.",
      "ld.so": "O interpreter mapeado pelo kernel carrega shared objects, aplica regras de search e transfere controle após relocation e inicializadores.",
      symbols: "Symbol table associa nome, binding, visibility, section e valor. Dynamic symbols são o subconjunto relevante ao runtime linking.",
      relocations: "Relocation descreve onde e como ajustar bytes com valor de símbolo, addend e endereço do local. Tipos variam por arquitetura."
    },
    code: { language: "shell", filename: "inspect-elf.sh", source: `readelf -h app
readelf -l app
readelf -S app
readelf -Ws app
readelf -r app
LD_DEBUG=libs,reloc ./app`, explanation: "Compare program headers com /proc/<pid>/maps e use sections apenas para responder perguntas de linkedição." },
    mechanics: [{ title: "Validar", detail: "Loader confere formato, arquitetura, offsets e política antes de mapear." }, { title: "Mapear", detail: "Cada PT_LOAD cria região alinhada com permissões e zero-fill para a diferença de memsz." }, { title: "Carregar dependências", detail: "ld.so resolve DT_NEEDED segundo path seguro e constrói o namespace de symbols." }, { title: "Relocar/iniciar", detail: "Relocations ajustam referências; constructors executam antes de main e destructors no shutdown normal." }],
    invariants: ["Todos os offsets e tamanhos permanecem dentro do arquivo.", "Permissões finais evitam W+X sempre que possível.", "Resolver symbol respeita binding, visibility e ordem do namespace."],
    pitfalls: [{ title: "Confiar em section names", detail: "Nomes são convenções e input não confiável; parsing usa offsets/tipos validados." }, { title: "Confundir VA e file offset", detail: "Traduza pelo segmento que contém o endereço, considerando p_vaddr e p_offset." }],
    practice: { prompt: "Escreva um ELF inspector read-only.", tasks: ["Valide header e program headers.", "Liste mappings e permissões.", "Resolva uma relocation simples sem executar o arquivo."], evidence: "Saída comparada com readelf e casos truncados rejeitados com erro claro." }
  })
};
