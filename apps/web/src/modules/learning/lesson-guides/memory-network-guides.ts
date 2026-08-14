import { guide, type GuideMap } from "./types";

export const memoryNetworkGuides: GuideMap = {
  "mem-layout": guide({
    thesis: "Memória não guarda tipos: guarda bytes. Tipo, ABI e alinhamento dizem ao programa como interpretar e acessar esses bytes sem violar o contrato da máquina.",
    context: [
      "Binário e hexadecimal são duas formas de escrever o mesmo padrão. Hexadecimal é útil porque cada dígito representa quatro bits e deixa máscaras, endereços e dumps legíveis.",
      "O layout de um objeto inclui ordem dos campos, padding e alinhamento. Endianness muda a ordem dos bytes de valores multibyte, mas não a ordem dos bits dentro de cada byte."
    ],
    flow: ["valor tipado", "bits", "bytes", "layout ABI", "cache line", "load/store"],
    topicNotes: {
      binary: "Binário torna explícitos bits de sinal, máscaras e potências de dois. Shifts só fazem sentido quando largura e signedness do operando estão definidos.",
      hex: "Um byte cabe em dois dígitos hexadecimais. Dumps agrupam bytes; endereços em hex não indicam, por si só, o conteúdo ou a validade da região.",
      endian: "Em little endian, o byte menos significativo ocupa o menor endereço; em big endian ocorre o inverso. Protocolos frequentemente definem network byte order como big endian.",
      alignment: "Alinhamento restringe o endereço inicial de um objeto. O compilador insere padding para satisfazer a ABI e permitir loads eficientes ou obrigatórios pela ISA."
    },
    code: { language: "c", filename: "layout.c", source: `#include <stdint.h>
#include <stddef.h>

struct Packet {
    uint8_t kind;
    uint32_t length;
    uint16_t flags;
};

_Static_assert(offsetof(struct Packet, length) % _Alignof(uint32_t) == 0,
               "length must be aligned");`, explanation: "Use sizeof, alignof e offsetof para observar o layout real; não serialize a representação bruta de uma struct como se fosse um protocolo estável." },
    mechanics: [
      { title: "Codificar", detail: "O valor é reduzido a um padrão com largura fixa e regras de signedness." },
      { title: "Posicionar", detail: "A ABI escolhe offsets que respeitam alinhamento e pode inserir bytes de padding." },
      { title: "Endereçar", detail: "A CPU calcula o endereço efetivo e lê uma largura definida pela instrução." },
      { title: "Interpretar", detail: "A linguagem associa aqueles bytes a um tipo; aliasing e lifetime limitam acessos válidos." }
    ],
    invariants: ["O tamanho inclui padding final e interno.", "Conversão de endianness ocorre nas fronteiras do formato, não aleatoriamente no programa.", "Todo acesso respeita tamanho, alinhamento e lifetime do objeto."],
    pitfalls: [{ title: "Comparar structs com memcmp", detail: "Padding pode conter valores indeterminados; compare campos semanticamente." }, { title: "Fazer type punning por cast", detail: "Pode quebrar alinhamento e strict aliasing; prefira memcpy ou APIs de bytes." }],
    practice: { prompt: "Construa um inspetor de layout para três structs.", tasks: ["Imprima sizeof, alignof e offsets.", "Mostre os bytes de valores conhecidos.", "Explique cada padding e teste uma ordem de campos melhor."], evidence: "Tabela de offsets acompanhada de um dump anotado e asserts de invariantes." }
  }),

  "mem-regions": guide({
    thesis: "Stack e heap são políticas de uso dentro de um espaço de endereços virtual; páginas e permissões são o mecanismo que o sistema operacional e a MMU realmente aplicam.",
    context: [
      "Cada processo enxerga um mapa virtual próprio. Um endereço só pode ser usado se estiver mapeado, tiver a permissão exigida e pertencer a um objeto cujo lifetime ainda esteja ativo.",
      "A stack cresce e encolhe conforme chamadas; o heap é administrado por um allocator. Ambos acabam apoiados em páginas que o kernel pode reservar, comprometer, proteger, paginar ou compartilhar."
    ],
    flow: ["pointer", "virtual address", "page table", "physical frame", "cache", "CPU"],
    topicNotes: {
      stack: "Frames guardam retornos, registradores preservados e locais que não ficaram em registradores. Stack overflow é esgotamento da região ou corrupção de seus limites.",
      heap: "O heap fornece lifetime dinâmico. malloc/new devolvem blocos de um allocator, que por sua vez obtém páginas do sistema e mantém metadados.",
      pages: "Page tables traduzem números de página virtual para frames e atributos. O TLB guarda traduções recentes para evitar percorrer tabelas a cada acesso.",
      protection: "Permissões R/W/X são verificadas por página. Uma violação produz fault; DEP/NX impede executar páginas tratadas apenas como dados."
    },
    code: { language: "c", filename: "regions.c", source: `#include <stdio.h>
#include <stdlib.h>

static int global_value = 7;

int main(void) {
    int local = 11;
    int *dynamic = malloc(sizeof *dynamic);
    if (!dynamic) return 1;
    *dynamic = 13;
    printf("text=%p global=%p stack=%p heap=%p\\n",
           (void *)&main, (void *)&global_value,
           (void *)&local, (void *)dynamic);
    free(dynamic);
}`, explanation: "Compare os endereços com o mapa de memória do processo. O valor numérico não revela permissões; consulte /proc/<pid>/maps, VirtualQuery ou um debugger." },
    mechanics: [{ title: "Reservar", detail: "O SO separa uma faixa de endereços sem necessariamente fornecer backing físico imediato." }, { title: "Mapear", detail: "Entradas de page table associam páginas virtuais a frames, arquivo ou zero-fill." }, { title: "Acessar", detail: "TLB/MMU traduzem e validam permissões; um miss pode exigir page walk." }, { title: "Fault", detail: "O kernel resolve demanda legítima ou entrega uma exceção por acesso inválido." }],
    invariants: ["Pointer válido precisa de mapping, permissão e lifetime.", "Proteção é granular por página, enquanto objetos podem ser menores.", "Liberar um bloco encerra seu uso mesmo que o mapping ainda exista."],
    pitfalls: [{ title: "Achar que heap significa RAM", detail: "Páginas podem estar não residentes, compartilhadas ou apoiadas por arquivo." }, { title: "Usar endereço após free", detail: "O número pode permanecer igual, mas a autorização semântica acabou e o bloco pode ser reutilizado." }],
    practice: { prompt: "Mapeie um processo pequeno do arquivo até a RAM.", tasks: ["Classifique text, data, heap, mappings e stack.", "Mude a proteção de uma página em laboratório próprio.", "Registre o fault ao violar a permissão."], evidence: "Diagrama de VA com permissões e uma captura do evento de fault." }
  }),

  "mem-alloc": guide({
    thesis: "Um allocator transforma páginas grandes em objetos pequenos enquanto equilibra latência, fragmentação, concorrência e localidade de cache.",
    context: [
      "malloc não faz uma syscall para cada objeto. Allocators mantêm arenas, bins, slabs ou free lists e só pedem novas páginas quando seus estoques não satisfazem a requisição.",
      "Performance depende mais do padrão de alocação e acesso que do número isolado de chamadas. Objetos contíguos aproveitam cache lines e prefetch; ponteiros dispersos aumentam misses."
    ],
    flow: ["request size", "size class", "arena/free list", "page span", "cache lines", "working set"],
    topicNotes: {
      malloc: "malloc devolve memória adequadamente alinhada para tipos fundamentais, ou NULL. realloc pode mover o bloco; free exige exatamente um ponteiro ainda alocado.",
      arenas: "Arenas particionam metadados e pools para reduzir contenção. Thread-local caches aceleram o caminho quente, mas podem elevar memória retida.",
      fragmentation: "Fragmentação interna desperdiça espaço dentro do bloco; externa deixa buracos incompatíveis com novas solicitações mesmo havendo espaço total.",
      cache: "Localidade espacial reutiliza uma cache line; localidade temporal reutiliza dados antes da evicção. Layout AoS/SoA muda o tráfego por operação."
    },
    code: { language: "cpp", filename: "arena.cpp", source: `struct Arena {
    std::byte *begin;
    std::size_t capacity;
    std::size_t used;

    void *allocate(std::size_t bytes, std::size_t alignment) {
        std::size_t p = (used + alignment - 1) & ~(alignment - 1);
        if (p > capacity || bytes > capacity - p) return nullptr;
        used = p + bytes;
        return begin + p;
    }
};`, explanation: "Um bump allocator é rápido porque só alinha e avança um cursor; sua limitação é liberar tudo em conjunto, não objetos individuais." },
    mechanics: [{ title: "Classificar", detail: "O tamanho solicitado é arredondado para uma classe alinhada." }, { title: "Reutilizar", detail: "Um bloco livre compatível sai de um bin, slab ou cache da thread." }, { title: "Expandir", detail: "Sem bloco disponível, o allocator mapeia ou compromete mais páginas." }, { title: "Liberar", detail: "O bloco retorna à estrutura, pode coalescer com vizinhos e talvez liberar páginas." }],
    invariants: ["Metadados distinguem blocos livres e ocupados sem sobreposição.", "O endereço retornado satisfaz o alinhamento prometido.", "A soma é validada contra overflow antes de calcular tamanhos."],
    pitfalls: [{ title: "Otimizar sem medir", detail: "Trocar allocator não corrige automaticamente um layout com baixa localidade." }, { title: "Confundir reserved com leaked", detail: "Allocators podem manter páginas livres para reutilização; observe live objects e RSS separadamente." }],
    practice: { prompt: "Implemente um arena allocator de laboratório.", tasks: ["Adicione alinhamento e checagem de overflow.", "Meça 100 mil objetos contra alocação individual.", "Compare AoS e SoA percorrendo um único campo."], evidence: "Testes de limites, contagem de bytes desperdiçados e benchmark com metodologia descrita." }
  }),

  "mem-safety": guide({
    thesis: "Segurança de memória exige provar limites, lifetime e permissões; mitigações reduzem impacto, mas não tornam uma operação inválida correta.",
    context: [
      "Overflow escreve ou lê além do objeto. Use-after-free acessa armazenamento após o lifetime. Ambos podem apenas falhar, corromper estado distante ou se tornar vulnerabilidades dependendo do contexto.",
      "ASLR randomiza posições e DEP/NX separa dados de código. Canaries, CFI e sanitizers adicionam outras camadas, mas a correção começa em APIs com tamanhos e ownership explícitos."
    ],
    flow: ["untrusted length", "bounds/lifetime check", "memory operation", "mitigation", "fault or valid state"],
    topicNotes: {
      overflow: "Valide origem, destino e overflow aritmético antes de copiar. Um length correto isoladamente não basta se offset + length puder dar wrap.",
      UAF: "Use-after-free é falha temporal. Ownership claro, RAII, handles geracionais e sanitizers reduzem referências que sobrevivem ao objeto.",
      ASLR: "ASLR varia bases de executáveis, bibliotecas, heap e stack conforme plataforma e configuração. Requer binaries relocatable para melhor cobertura.",
      DEP: "DEP/NX marca páginas de dados como não executáveis. JITs seguros alternam permissões controladamente e evitam W+X simultâneo."
    },
    code: { language: "c", filename: "checked-copy.c", source: `#include <stddef.h>
#include <string.h>
#include <stdbool.h>

bool copy_slice(unsigned char *dst, size_t dst_size,
                const unsigned char *src, size_t src_size,
                size_t offset, size_t count) {
    if (offset > src_size || count > src_size - offset) return false;
    if (count > dst_size) return false;
    memcpy(dst, src + offset, count);
    return true;
}`, explanation: "A forma subtrativa evita que offset + count transborde. O contrato preserva tamanhos e torna falha parte do retorno." },
    mechanics: [{ title: "Validar", detail: "Converta input externo em comprimentos e estados internos apenas após checar faixa." }, { title: "Operar", detail: "A primitiva recebe ponteiros, tamanhos e lifetime comprovados." }, { title: "Detectar", detail: "Sanitizers, guard pages e allocators instrumentados expõem violações perto da causa." }, { title: "Conter", detail: "ASLR, DEP, CFI e sandbox limitam caminhos e impacto quando um bug resta." }],
    invariants: ["offset ≤ size e count ≤ size - offset.", "Nenhuma referência é usada depois do fim do lifetime.", "Páginas graváveis não permanecem executáveis sem necessidade justificada."],
    pitfalls: [{ title: "Confiar só em funções str*", detail: "Algumas APIs ainda truncam, não terminam string ou dependem de sentinela; modele capacidade explicitamente." }, { title: "Desativar o sanitizer para passar", detail: "Um achado reproduzível é evidência da violação; corrija a causa e acrescente regressão." }],
    practice: { prompt: "Endureça um parser binário propositalmente frágil.", tasks: ["Liste operações de limite e lifetime.", "Execute ASan/UBSan ou equivalente.", "Documente quais mitigações estão presentes no binário."], evidence: "Corpus de regressão, execução limpa no sanitizer e tabela bug → correção → mitigação." }
  }),

  "net-model": guide({
    thesis: "Uma mensagem atravessa envelopes sucessivos: o processo produz bytes, o transporte identifica fluxos, IP encaminha pacotes e Ethernet entrega frames no enlace local.",
    context: [
      "Cada camada possui endereços, limites e unidade de dados próprios. Encapsulamento adiciona headers; no destino, validação e demultiplexação removem cada camada na ordem inversa.",
      "TCP oferece um stream confiável e ordenado, não mensagens. UDP preserva datagramas, mas não promete entrega, ordem ou controle de congestionamento para a aplicação."
    ],
    flow: ["application bytes", "TCP segment / UDP datagram", "IP packet", "Ethernet frame", "NIC", "link"],
    topicNotes: {
      Ethernet: "Ethernet move frames dentro do domínio de enlace usando MACs, EtherType e FCS. ARP/Neighbor Discovery descobre o próximo salto local.",
      IP: "IP fornece endereçamento e roteamento best-effort. Routers decrementam TTL/Hop Limit; fragmentação e MTU afetam o tamanho útil do caminho.",
      TCP: "TCP numera bytes, confirma recebimento, retransmite perdas e controla fluxo/congestionamento. Uma leitura pode retornar menos ou mais que uma mensagem lógica.",
      UDP: "UDP adiciona portas e checksum a datagramas. A aplicação decide retry, deduplicação, ordenação e limites para cada caso."
    },
    code: { language: "text", filename: "packet.trace", source: `Ethernet  dst=02:00:00:00:00:02  type=0x0800
IPv4      src=10.0.0.1 dst=10.0.0.2 ttl=64 proto=TCP
TCP       sport=51514 dport=8080 seq=1200 ack=900 flags=PSH,ACK
Payload   48 45 4c 4c 4f                         HELLO`, explanation: "Leia de fora para dentro: o frame chega à interface, IP escolhe protocolo, TCP escolhe o socket e só então os bytes alcançam a aplicação." },
    mechanics: [{ title: "Encapsular", detail: "Cada camada acrescenta metadados necessários ao seu escopo." }, { title: "Transmitir", detail: "A NIC usa DMA para consumir descritores e colocar bits no meio." }, { title: "Encaminhar", detail: "Switches usam MAC; routers consultam prefixos IP e próximo salto." }, { title: "Demultiplexar", detail: "EtherType, protocol e portas conduzem os bytes até o socket correto." }],
    invariants: ["Tamanhos de headers cabem no pacote capturado.", "Checksums são validados no ponto correto, considerando offload.", "O parser não presume que captura equivale a mensagem completa."],
    pitfalls: [{ title: "Confundir MAC com identidade global", detail: "MAC atua no enlace local e muda entre saltos roteados." }, { title: "Achar que send entregou", detail: "Normalmente send apenas aceitou bytes no buffer local; entrega remota exige protocolo e confirmação." }],
    practice: { prompt: "Anote uma captura produzida pelo laboratório de rede.", tasks: ["Localize limites Ethernet/IP/TCP.", "Siga números de sequência e ACK.", "Reconstrua o payload sem assumir um pacote por mensagem."], evidence: "Diagrama de encapsulamento e tabela pacote → estado do fluxo." }
  }),

  "net-sockets": guide({
    thesis: "Socket é um endpoint do kernel; select, epoll e IOCP são modelos diferentes para descobrir ou receber conclusão de trabalho sem dedicar uma thread bloqueada a cada conexão.",
    context: [
      "A API de sockets separa criação, binding, listening/connecting e transferência. Buffers do kernel desacoplam a aplicação da NIC, por isso readiness não significa que toda a operação desejada terminará.",
      "select varre conjuntos; epoll registra interesse e entrega eventos de readiness; IOCP associa handles a um porto que recebe pacotes de conclusão de operações assíncronas."
    ],
    flow: ["application state", "socket API", "kernel socket", "protocol buffers", "driver rings", "NIC"],
    topicNotes: {
      sockets: "Um socket TCP é identificado pela tupla de endereços e portas. Accept cria um novo socket conectado; o listener continua aceitando outros fluxos.",
      select: "select modifica conjuntos e tem custo de cópia/varredura proporcional ao maior descritor. É simples e portátil, mas exige reconstruir estado a cada iteração.",
      epoll: "epoll mantém uma interest list no kernel. Em edge-triggered, drene até EAGAIN; em level-triggered, o evento persiste enquanto houver trabalho.",
      IOCP: "IOCP é completion-based: poste operações overlapped e consuma conclusões. Buffer e OVERLAPPED precisam permanecer vivos até a conclusão."
    },
    code: { language: "c", filename: "stream-read.c", source: `size_t used = 0;
while (used < frame_size) {
    ssize_t n = recv(fd, buffer + used, frame_size - used, 0);
    if (n > 0) { used += (size_t)n; continue; }
    if (n == 0) { /* orderly shutdown */ break; }
    if (errno == EINTR) continue;
    if (errno == EAGAIN || errno == EWOULDBLOCK) break;
    /* handle fatal error */
}`, explanation: "O loop trata leitura parcial, EOF, interrupção e would-block como estados distintos. O framing da aplicação decide quando a mensagem terminou." },
    mechanics: [{ title: "Registrar", detail: "Associe o endpoint ao mecanismo e mantenha o estado da conexão fora da pilha da callback." }, { title: "Notificar", detail: "Readiness indica que tentar I/O não bloqueará imediatamente; completion informa resultado de uma operação postada." }, { title: "Drenar", detail: "Leia/escreva em loop até completar o estado lógico ou receber would-block." }, { title: "Aplicar backpressure", detail: "Limite filas e pause leitura ou produção quando o consumidor não acompanha." }],
    invariants: ["Cada conexão tem parser e buffers próprios.", "Operações parciais preservam offset e intenção.", "Recursos assíncronos vivem até cancelamento confirmado ou conclusão."],
    pitfalls: [{ title: "Uma recv, uma mensagem", detail: "TCP não preserva fronteiras; use length prefix, delimitador ou formato auto-delimitado." }, { title: "Ignorar fila de saída", detail: "Produtor sem limite pode consumir toda a memória quando o peer fica lento." }],
    practice: { prompt: "Implemente um echo server com framing e backpressure.", tasks: ["Escolha select, epoll ou IOCP e documente o modelo.", "Simule reads/writes parciais.", "Aplique limite por conexão e timeout."], evidence: "Teste com múltiplos clientes lentos, métricas de fila e shutdown sem vazamentos." }
  }),

  "net-http": guide({
    thesis: "HTTP define semântica de mensagens; DNS encontra endereços, TLS protege o canal e TCP/QUIC transporta bytes. Debugar exige separar essas camadas.",
    context: [
      "Uma URL conduz a resolução, conexão, negociação segura e troca de requests/responses. Cache, redirects, proxies e multiplexação podem mudar o caminho sem alterar a intenção da aplicação.",
      "TLS autentica o peer por uma cadeia de certificados e deriva chaves de sessão. Ele não valida a lógica do HTTP nem torna input remoto confiável para o parser."
    ],
    flow: ["URL", "DNS", "TCP or QUIC", "TLS", "HTTP message", "application"],
    topicNotes: {
      HTTP: "HTTP é stateless no protocolo base e possui métodos, status, headers e body. Content-Length e transfer coding precisam ser interpretados sem ambiguidades.",
      DNS: "Resolvers consultam caches e servidores para mapear nomes a records. TTL controla reutilização; A/AAAA não garantem que todos os endereços respondam igualmente.",
      TLS: "Handshake negocia versão/cipher, autentica e deriva secrets. Validação inclui hostname, período, cadeia e trust store, não apenas criptografia bem-sucedida.",
      WebSocket: "WebSocket começa com upgrade HTTP e depois troca frames full-duplex. Máscara, opcode, fragmentation e limites ainda exigem um parser de estados."
    },
    code: { language: "http", filename: "request.http", source: `GET /status HTTP/1.1
Host: lab.example
Accept: application/json
Connection: keep-alive

HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 15

{"ready":true}`, explanation: "A linha vazia encerra headers; o framing do body vem da versão e dos headers. Nunca use fechamento de conexão como delimitador quando o protocolo define outro." },
    mechanics: [{ title: "Resolver", detail: "Nome vira uma lista de endpoints com política de cache e fallback." }, { title: "Conectar", detail: "O transporte estabelece estado e aplica controle de congestionamento." }, { title: "Autenticar", detail: "TLS valida identidade e cria um canal com integridade e confidencialidade." }, { title: "Interpretar", detail: "HTTP converte bytes autenticados em mensagem, que ainda passa por autorização e validação da aplicação." }],
    invariants: ["Hostname validado corresponde ao serviço pretendido.", "Existe uma única interpretação para comprimento e fronteiras.", "Redirects, cookies e credentials obedecem política explícita."],
    pitfalls: [{ title: "Chamar TLS de autorização", detail: "O certificado autentica um endpoint; permissões sobre recursos são decisão da aplicação." }, { title: "Parsing permissivo diferente entre proxies", detail: "Interpretações divergentes de framing abrem request smuggling; rejeite ambiguidades." }],
    practice: { prompt: "Trace uma requisição HTTPS do nome ao JSON.", tasks: ["Registre resolução e tentativas de conexão.", "Inspecione certificado e parâmetros TLS.", "Delimite request/response e tempos por fase."], evidence: "Waterfall com DNS, connect, TLS, TTFB e body, mais validações aplicadas." }
  }),

  "net-security": guide({
    thesis: "Protocolos robustos transformam bytes hostis em estado validado com limites explícitos de tamanho, tempo, profundidade e trabalho.",
    context: [
      "O parser é uma fronteira de confiança. Ele precisa falhar fechado, consumir input de forma determinística e diferenciar mensagem incompleta, inválida e válida.",
      "Timeouts e quotas evitam que peers lentos ou entradas patológicas ocupem conexões, CPU e memória indefinidamente. Fuzzing explora combinações que exemplos manuais raramente cobrem."
    ],
    flow: ["untrusted bytes", "framing", "bounded parser", "semantic validation", "authorized state", "telemetry"],
    topicNotes: {
      parsing: "Valide comprimentos antes de offsets, normalize uma vez e rejeite campos duplicados ou representações ambíguas conforme a especificação.",
      timeouts: "Separe timeout de conexão, header, body, idle e operação total. Um único relógio pode punir tráfego legítimo ou permitir slowloris.",
      fuzzing: "Fuzzers mutacionais precisam de harness determinístico, corpus pequeno e oráculos como assertions, sanitizers e limites de tempo/memória.",
      logging: "Logs registram decisão e contexto sem guardar secrets ou payloads excessivos. Correlation IDs conectam eventos entre camadas."
    },
    code: { language: "c", filename: "bounded-frame.c", source: `enum parse_result parse_frame(const uint8_t *data, size_t size) {
    if (size < 4) return PARSE_INCOMPLETE;
    uint32_t length = read_be32(data);
    if (length > MAX_FRAME) return PARSE_INVALID;
    if ((size_t)length > size - 4) return PARSE_INCOMPLETE;
    return validate_payload(data + 4, length)
        ? PARSE_OK : PARSE_INVALID;
}`, explanation: "O contrato distingue falta de bytes de uma mensagem proibida e limita o trabalho antes de interpretar o payload." },
    mechanics: [{ title: "Delimitar", detail: "Determine exatamente quantos bytes pertencem ao frame sem overflow." }, { title: "Validar estrutura", detail: "Cheque versão, enums, comprimentos, profundidade e canonicalização." }, { title: "Validar semântica", detail: "A mensagem estruturalmente válida ainda precisa respeitar estado, identidade e autorização." }, { title: "Observar", detail: "Contabilize rejeições, latência e uso de recursos com cardinalidade controlada." }],
    invariants: ["Input nunca controla alocação sem teto.", "Cada estado possui transições permitidas e timeout.", "Falhas não vazam secrets nem deixam estado parcial autorizado."],
    pitfalls: [{ title: "Fuzzing sem sanitizer", detail: "Crashes silenciosos e UB podem escapar; combine instrumentação e asserts." }, { title: "Logar credenciais", detail: "Redação acontece antes de persistir; observabilidade também é uma superfície de dados." }],
    practice: { prompt: "Modele e teste um protocolo length-prefixed mínimo.", tasks: ["Escreva a máquina de estados.", "Adicione quotas e timeouts por fase.", "Crie harness de fuzz e corpus de regressão."], evidence: "Propriedades do parser, casos-limite e métricas de rejeição demonstradas no laboratório." }
  })
};
