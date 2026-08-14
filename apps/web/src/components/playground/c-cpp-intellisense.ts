import type { Monaco } from "@monaco-editor/react";

type SupportedLanguage = "c" | "cpp";
type SuggestionKind = "class" | "constant" | "function" | "keyword" | "macro" | "snippet" | "type" | "variable";

interface SuggestionSpec {
  readonly label: string;
  readonly insertText: string;
  readonly detail: string;
  readonly documentation: string;
  readonly kind: SuggestionKind;
  readonly snippet?: boolean;
  readonly filterText?: string;
  readonly sortText?: string;
}

interface HeaderSpec {
  readonly name: string;
  readonly detail: string;
  readonly languages: readonly SupportedLanguage[];
}

interface SignatureSpec {
  readonly label: string;
  readonly documentation: string;
  readonly parameters: readonly { readonly label: string; readonly documentation: string }[];
}

const configuredInstances = new WeakSet<object>();

const C_HEADERS: readonly HeaderSpec[] = [
  { name: "assert.h", detail: "Macro assert para invariantes de debug", languages: ["c", "cpp"] },
  { name: "ctype.h", detail: "Classificação e conversão de caracteres", languages: ["c", "cpp"] },
  { name: "errno.h", detail: "errno e códigos de erro POSIX/C", languages: ["c", "cpp"] },
  { name: "inttypes.h", detail: "Macros portáveis para inteiros de largura fixa", languages: ["c", "cpp"] },
  { name: "limits.h", detail: "Limites dos tipos inteiros", languages: ["c", "cpp"] },
  { name: "math.h", detail: "Funções matemáticas", languages: ["c", "cpp"] },
  { name: "signal.h", detail: "Sinais e handlers", languages: ["c", "cpp"] },
  { name: "stdbool.h", detail: "bool, true e false em C", languages: ["c"] },
  { name: "stddef.h", detail: "size_t, ptrdiff_t, NULL e offsetof", languages: ["c", "cpp"] },
  { name: "stdint.h", detail: "Inteiros de largura fixa", languages: ["c", "cpp"] },
  { name: "stdio.h", detail: "I/O formatado, streams e arquivos", languages: ["c", "cpp"] },
  { name: "stdlib.h", detail: "Alocação, conversão, processos e algoritmos", languages: ["c", "cpp"] },
  { name: "string.h", detail: "Strings C e operações de memória", languages: ["c", "cpp"] },
  { name: "time.h", detail: "Tempo de calendário e CPU", languages: ["c", "cpp"] },
  { name: "threads.h", detail: "Threads e sincronização de C11", languages: ["c"] },
  { name: "unistd.h", detail: "POSIX: read, write, close, fork e outros", languages: ["c", "cpp"] },
  { name: "sys/socket.h", detail: "POSIX sockets: socket, bind, listen, accept", languages: ["c", "cpp"] },
  { name: "netinet/in.h", detail: "Endereços IPv4/IPv6 e byte order", languages: ["c", "cpp"] },
  { name: "arpa/inet.h", detail: "inet_pton, inet_ntop e conversões de rede", languages: ["c", "cpp"] },
  { name: "Windows.h", detail: "Tipos e APIs fundamentais do Win32", languages: ["c", "cpp"] },
  { name: "WinSock2.h", detail: "Sockets do Windows", languages: ["c", "cpp"] },
  { name: "WS2tcpip.h", detail: "Endereços e helpers modernos do Winsock", languages: ["c", "cpp"] }
];

const CPP_HEADERS: readonly HeaderSpec[] = [
  { name: "algorithm", detail: "Algoritmos genéricos", languages: ["cpp"] },
  { name: "array", detail: "std::array", languages: ["cpp"] },
  { name: "atomic", detail: "Operações atômicas", languages: ["cpp"] },
  { name: "chrono", detail: "Durações e relógios", languages: ["cpp"] },
  { name: "concepts", detail: "Concepts da biblioteca padrão", languages: ["cpp"] },
  { name: "cstdint", detail: "Inteiros de largura fixa em namespace std", languages: ["cpp"] },
  { name: "filesystem", detail: "Paths e filesystem", languages: ["cpp"] },
  { name: "format", detail: "std::format", languages: ["cpp"] },
  { name: "fstream", detail: "Streams de arquivo", languages: ["cpp"] },
  { name: "functional", detail: "std::function, invoke e functors", languages: ["cpp"] },
  { name: "iostream", detail: "std::cin, std::cout e std::cerr", languages: ["cpp"] },
  { name: "memory", detail: "Smart pointers e allocators", languages: ["cpp"] },
  { name: "mutex", detail: "Mutexes e guards RAII", languages: ["cpp"] },
  { name: "optional", detail: "std::optional", languages: ["cpp"] },
  { name: "ranges", detail: "Ranges e views", languages: ["cpp"] },
  { name: "span", detail: "View contígua não proprietária", languages: ["cpp"] },
  { name: "string", detail: "std::string", languages: ["cpp"] },
  { name: "string_view", detail: "std::string_view", languages: ["cpp"] },
  { name: "thread", detail: "std::thread e std::jthread", languages: ["cpp"] },
  { name: "unordered_map", detail: "Hash map", languages: ["cpp"] },
  { name: "utility", detail: "move, forward, pair e helpers", languages: ["cpp"] },
  { name: "variant", detail: "std::variant", languages: ["cpp"] },
  { name: "vector", detail: "std::vector", languages: ["cpp"] }
];

const C_KEYWORDS = [
  "auto", "break", "case", "char", "const", "continue", "default", "do", "double", "else", "enum", "extern", "float", "for", "goto", "if", "inline", "int", "long", "register", "restrict", "return", "short", "signed", "sizeof", "static", "struct", "switch", "typedef", "union", "unsigned", "void", "volatile", "while", "_Alignas", "_Alignof", "_Atomic", "_Bool", "_Noreturn", "_Static_assert", "_Thread_local"
] as const;

const CPP_KEYWORDS = [
  "alignas", "alignof", "and", "and_eq", "asm", "bitand", "bitor", "bool", "break", "case", "catch", "char", "char8_t", "char16_t", "char32_t", "class", "compl", "concept", "const", "consteval", "constexpr", "constinit", "const_cast", "continue", "co_await", "co_return", "co_yield", "decltype", "default", "delete", "do", "double", "dynamic_cast", "else", "enum", "explicit", "export", "extern", "false", "float", "for", "friend", "if", "inline", "int", "long", "mutable", "namespace", "new", "noexcept", "not", "nullptr", "operator", "or", "private", "protected", "public", "requires", "return", "short", "signed", "sizeof", "static", "static_assert", "static_cast", "struct", "switch", "template", "this", "thread_local", "throw", "true", "try", "typedef", "typeid", "typename", "union", "unsigned", "using", "virtual", "void", "volatile", "wchar_t", "while", "xor"
] as const;

const C_TYPES: readonly SuggestionSpec[] = [
  typeSuggestion("size_t", "Tipo unsigned usado para tamanhos e contagens"),
  typeSuggestion("ptrdiff_t", "Tipo signed para diferença entre ponteiros"),
  typeSuggestion("int8_t", "Inteiro signed de exatamente 8 bits"),
  typeSuggestion("uint8_t", "Inteiro unsigned de exatamente 8 bits"),
  typeSuggestion("int16_t", "Inteiro signed de exatamente 16 bits"),
  typeSuggestion("uint16_t", "Inteiro unsigned de exatamente 16 bits"),
  typeSuggestion("int32_t", "Inteiro signed de exatamente 32 bits"),
  typeSuggestion("uint32_t", "Inteiro unsigned de exatamente 32 bits"),
  typeSuggestion("int64_t", "Inteiro signed de exatamente 64 bits"),
  typeSuggestion("uint64_t", "Inteiro unsigned de exatamente 64 bits"),
  typeSuggestion("FILE", "Objeto opaco de stream da biblioteca C")
];

const C_LIBRARY: readonly SuggestionSpec[] = [
  functionSuggestion("printf", "printf(\"${1:format}\\n\"${2:, args});", "int printf(const char *restrict format, ...)", "Escreve texto formatado em stdout."),
  functionSuggestion("fprintf", "fprintf(${1:stream}, \"${2:format}\\n\"${3:, args});", "int fprintf(FILE *restrict stream, const char *restrict format, ...)", "Escreve texto formatado em um stream."),
  functionSuggestion("snprintf", "snprintf(${1:buffer}, ${2:capacity}, \"${3:format}\"${4:, args});", "int snprintf(char *restrict buffer, size_t size, const char *restrict format, ...)", "Formata com limite explícito de capacidade."),
  functionSuggestion("scanf", "scanf(\"${1:format}\", ${2:&value});", "int scanf(const char *restrict format, ...)", "Lê entrada formatada; sempre limite campos de string."),
  functionSuggestion("puts", "puts(${1:text});", "int puts(const char *text)", "Escreve uma string e newline."),
  functionSuggestion("fgets", "fgets(${1:buffer}, sizeof ${1:buffer}, ${2:stdin})", "char *fgets(char *restrict buffer, int count, FILE *restrict stream)", "Lê no máximo count-1 caracteres e termina com zero."),
  functionSuggestion("malloc", "malloc(${1:count} * sizeof(${2:type}))", "void *malloc(size_t size)", "Aloca bytes não inicializados; valide overflow e retorno nulo."),
  functionSuggestion("calloc", "calloc(${1:count}, sizeof(${2:type}))", "void *calloc(size_t count, size_t size)", "Aloca um array zero-inicializado e trata a multiplicação internamente."),
  functionSuggestion("realloc", "realloc(${1:pointer}, ${2:new_size})", "void *realloc(void *pointer, size_t new_size)", "Redimensiona um bloco; use temporário para não perder o owner em falha."),
  functionSuggestion("free", "free(${1:pointer});", "void free(void *pointer)", "Encerra o lifetime do bloco alocado."),
  functionSuggestion("memcpy", "memcpy(${1:destination}, ${2:source}, ${3:size});", "void *memcpy(void *restrict destination, const void *restrict source, size_t count)", "Copia bytes entre regiões que não se sobrepõem."),
  functionSuggestion("memmove", "memmove(${1:destination}, ${2:source}, ${3:size});", "void *memmove(void *destination, const void *source, size_t count)", "Copia bytes mesmo quando as regiões se sobrepõem."),
  functionSuggestion("memset", "memset(${1:destination}, ${2:value}, ${3:size});", "void *memset(void *destination, int value, size_t count)", "Preenche bytes, não objetos inteiros com um valor arbitrário."),
  functionSuggestion("strlen", "strlen(${1:text})", "size_t strlen(const char *text)", "Conta caracteres até o terminador zero."),
  functionSuggestion("strcmp", "strcmp(${1:left}, ${2:right})", "int strcmp(const char *left, const char *right)", "Compara strings lexicograficamente."),
  functionSuggestion("fopen", "fopen(\"${1:path}\", \"${2:rb}\")", "FILE *fopen(const char *restrict path, const char *restrict mode)", "Abre um stream e devolve NULL em falha."),
  functionSuggestion("fread", "fread(${1:buffer}, 1, ${2:capacity}, ${3:stream})", "size_t fread(void *restrict buffer, size_t size, size_t count, FILE *restrict stream)", "Lê elementos e retorna a quantidade completa transferida."),
  functionSuggestion("fwrite", "fwrite(${1:buffer}, 1, ${2:size}, ${3:stream})", "size_t fwrite(const void *restrict buffer, size_t size, size_t count, FILE *restrict stream)", "Escreve elementos e pode retornar menos que count."),
  functionSuggestion("fclose", "fclose(${1:stream});", "int fclose(FILE *stream)", "Flush e fechamento de um stream pertencente ao caller."),
  functionSuggestion("socket", "socket(${1:AF_INET}, ${2:SOCK_STREAM}, ${3:0})", "int socket(int domain, int type, int protocol)", "Cria um endpoint no kernel."),
  functionSuggestion("bind", "bind(${1:socket_fd}, (const struct sockaddr *)&${2:address}, sizeof ${2:address})", "int bind(int socket, const struct sockaddr *address, socklen_t length)", "Associa endereço local ao socket."),
  functionSuggestion("listen", "listen(${1:socket_fd}, ${2:16})", "int listen(int socket, int backlog)", "Transforma um socket TCP ligado em listener."),
  functionSuggestion("accept", "accept(${1:listener}, (struct sockaddr *)&${2:peer}, &${3:peer_size})", "int accept(int listener, struct sockaddr *address, socklen_t *length)", "Cria um novo socket conectado; o listener permanece aberto."),
  functionSuggestion("recv", "recv(${1:socket_fd}, ${2:buffer}, ${3:capacity}, ${4:0})", "ssize_t recv(int socket, void *buffer, size_t length, int flags)", "Recebe parte do stream; zero significa encerramento ordenado."),
  functionSuggestion("send", "send(${1:socket_fd}, ${2:buffer}, ${3:size}, ${4:0})", "ssize_t send(int socket, const void *buffer, size_t length, int flags)", "Entrega bytes ao buffer do kernel e pode aceitar apenas uma parte."),
  functionSuggestion("close", "close(${1:file_descriptor});", "int close(int file_descriptor)", "Libera um file descriptor POSIX pertencente ao processo.")
];

const C_SNIPPETS: readonly SuggestionSpec[] = [
  snippet("main", "main — programa C completo", "int main(void) {\n    ${1:// código}\n    return EXIT_SUCCESS;\n}", "Cria o entry point C com retorno explícito."),
  snippet("include", "#include — header do sistema", "#include <${1:stdio.h}>", "Insere uma diretiva de inclusão."),
  snippet("fori", "for — iteração por índice", "for (size_t ${1:i} = 0; ${1:i} < ${2:count}; ++${1:i}) {\n    ${3:// código}\n}", "Loop com size_t para percorrer uma contagem."),
  snippet("while", "while — loop com condição", "while (${1:condition}) {\n    ${2:// código}\n}", "Loop while estruturado."),
  snippet("if", "if/else — desvio estruturado", "if (${1:condition}) {\n    ${2:// true}\n} else {\n    ${3:// false}\n}", "Bloco condicional completo."),
  snippet("struct", "typedef struct — tipo nomeado", "typedef struct {\n    ${1:int value};\n} ${2:TypeName};", "Define uma struct e um typedef portável em C."),
  snippet("enum", "enum — estados nomeados", "typedef enum {\n    ${1:STATE_IDLE},\n    ${2:STATE_READY}\n} ${3:State};", "Enum nomeado para modelar estados."),
  snippet("malloc_checked", "malloc — alocação verificada", "${1:type} *${2:pointer} = malloc(${3:count} * sizeof *${2:pointer});\nif (!${2:pointer}) {\n    ${4:return EXIT_FAILURE;}\n}", "Aloca com sizeof baseado no ponteiro e verifica falha."),
  snippet("read_loop", "read — I/O parcial robusto", "for (;;) {\n    ssize_t ${1:received} = read(${2:fd}, ${3:buffer}, sizeof ${3:buffer});\n    if (${1:received} > 0) { ${4:// consume}; continue; }\n    if (${1:received} == 0) break;\n    if (errno == EINTR) continue;\n    ${5:// erro fatal}\n    break;\n}", "Distingue dados, EOF, interrupção e erro fatal."),
  snippet("static_assert", "_Static_assert — invariante de compilação", "_Static_assert(${1:condition}, \"${2:invariant failed}\");", "Valida uma propriedade durante a tradução.")
];

const CPP_LIBRARY: readonly SuggestionSpec[] = [
  cppStd("vector", "vector<${1:int}> ${2:values};", "std::vector<T>", "Container contíguo com tamanho dinâmico."),
  cppStd("array", "array<${1:int}, ${2:N}> ${3:values}{};", "std::array<T, N>", "Array de tamanho fixo com interface de container."),
  cppStd("span", "span<${1:const int}> ${2:view}{${3:data}};", "std::span<T>", "View não proprietária sobre memória contígua."),
  cppStd("string", "string ${1:text};", "std::string", "String proprietária de chars."),
  cppStd("string_view", "string_view ${1:view}{${2:text}};", "std::string_view", "View não proprietária; o texto original precisa continuar vivo."),
  cppStd("unique_ptr", "unique_ptr<${1:Type}> ${2:owner};", "std::unique_ptr<T>", "Ownership exclusivo com destruição RAII."),
  cppStd("shared_ptr", "shared_ptr<${1:Type}> ${2:owner};", "std::shared_ptr<T>", "Ownership compartilhado via control block."),
  cppStd("make_unique", "make_unique<${1:Type}>(${2:arguments})", "std::unique_ptr<T> std::make_unique<T>(Args&&...)", "Constrói um objeto com ownership exclusivo."),
  cppStd("make_shared", "make_shared<${1:Type}>(${2:arguments})", "std::shared_ptr<T> std::make_shared<T>(Args&&...)", "Constrói objeto e control block para ownership compartilhado."),
  cppStd("optional", "optional<${1:Type}> ${2:value};", "std::optional<T>", "Representa zero ou um valor sem alocação obrigatória."),
  cppStd("variant", "variant<${1:TypeA}, ${2:TypeB}> ${3:value};", "std::variant<Ts...>", "União discriminada type-safe."),
  cppStd("cout", "cout << ${1:value} << '\\n';", "std::ostream std::cout", "Stream de saída padrão."),
  cppStd("cerr", "cerr << ${1:error} << '\\n';", "std::ostream std::cerr", "Stream de erro padrão."),
  cppStd("move", "move(${1:value})", "std::remove_reference_t<T>&& std::move(T&&)", "Converte para rvalue; a operação selecionada é quem transfere estado."),
  cppStd("forward", "forward<${1:T}>(${2:value})", "T&& std::forward<T>(remove_reference_t<T>&)", "Preserva a categoria do valor em forwarding references."),
  cppStd("sort", "ranges::sort(${1:range});", "std::ranges::sort(range)", "Ordena um range conforme comparator/projection."),
  cppStd("thread", "thread ${1:worker}{[&] {\n    ${2:// trabalho}\n}};", "std::thread", "Thread de execução que precisa de join ou detach."),
  cppStd("jthread", "jthread ${1:worker}{[](stop_token ${2:stop}) {\n    ${3:// trabalho cooperativo}\n}};", "std::jthread", "Thread RAII com stop token cooperativo."),
  cppStd("mutex", "mutex ${1:lock};", "std::mutex", "Primitiva de exclusão mútua não copiável."),
  cppStd("lock_guard", "lock_guard ${1:guard}{${2:mutex}};", "std::lock_guard<Mutex>", "Adquire no construtor e libera no destrutor.")
];

const CPP_SNIPPETS: readonly SuggestionSpec[] = [
  snippet("main", "main — programa C++ completo", "int main() {\n    ${1:// código}\n    return 0;\n}", "Cria o entry point C++."),
  snippet("include", "#include — header do sistema", "#include <${1:iostream}>", "Insere uma diretiva de inclusão."),
  snippet("fori", "for — iteração por índice", "for (std::size_t ${1:i} = 0; ${1:i} < ${2:container}.size(); ++${1:i}) {\n    ${3:// código}\n}", "Percorre um container por índice."),
  snippet("rangefor", "range-for — iteração por valor/referência", "for (${1:const auto&} ${2:value} : ${3:container}) {\n    ${4:// código}\n}", "Range-based for preservando referência por padrão."),
  snippet("class", "class — regra de zero", "class ${1:Type} {\npublic:\n    ${1:Type}() = default;\n\nprivate:\n    ${2:int value_{}; }\n};", "Classe mínima com membros privados."),
  snippet("raii", "RAII — wrapper de recurso", "class ${1:unique_resource} {\npublic:\n    explicit ${1:unique_resource}(${2:resource_type} value) noexcept : value_{value} {}\n    ~${1:unique_resource}() { if (${3:valid()}) ${4:release(value_)}; }\n    ${1:unique_resource}(const ${1:unique_resource}&) = delete;\n    ${1:unique_resource}& operator=(const ${1:unique_resource}&) = delete;\nprivate:\n    ${2:resource_type} value_{};\n};", "Skeleton de ownership exclusivo; complete move e sentinels conforme a API."),
  snippet("lambda", "lambda — closure", "[${1:&}](${2:auto value}) ${3:-> void} {\n    ${4:// código}\n}", "Lambda com captures, parâmetros e retorno editáveis."),
  snippet("concept", "concept — restrição nomeada", "template <typename T>\nconcept ${1:Name} = requires(T ${2:value}) {\n    ${3:{ value.size() } -> std::convertible_to<std::size_t>;}\n};", "Define requisitos verificáveis para templates."),
  snippet("static_assert", "static_assert — invariante de compilação", "static_assert(${1:condition}, \"${2:invariant failed}\");", "Valida uma propriedade durante a tradução.")
];

const SIGNATURES: Readonly<Record<string, SignatureSpec>> = {
  printf: signature("int printf(const char *format, ...)", "Escreve em stdout e retorna caracteres escritos ou valor negativo.", [["format", "String de formato."], ["...", "Argumentos compatíveis com cada conversão."]]),
  fprintf: signature("int fprintf(FILE *stream, const char *format, ...)", "Escreve texto formatado no stream.", [["stream", "Stream válido."], ["format", "String de formato."], ["...", "Argumentos formatados."]]),
  snprintf: signature("int snprintf(char *buffer, size_t capacity, const char *format, ...)", "Formata até capacity bytes e informa o tamanho necessário.", [["buffer", "Destino."], ["capacity", "Capacidade total incluindo zero."], ["format", "String de formato."], ["...", "Argumentos formatados."]]),
  malloc: signature("void *malloc(size_t size)", "Aloca size bytes ou devolve NULL.", [["size", "Quantidade de bytes; valide overflow antes."]]),
  calloc: signature("void *calloc(size_t count, size_t size)", "Aloca count elementos zero-inicializados.", [["count", "Quantidade de elementos."], ["size", "Bytes por elemento."]]),
  realloc: signature("void *realloc(void *pointer, size_t new_size)", "Redimensiona preservando o bloco antigo se falhar.", [["pointer", "Bloco atual ou NULL."], ["new_size", "Novo tamanho em bytes."]]),
  free: signature("void free(void *pointer)", "Libera um bloco alocado; NULL é aceito.", [["pointer", "Owner do bloco a liberar."]]),
  memcpy: signature("void *memcpy(void *destination, const void *source, size_t count)", "Copia count bytes sem overlap.", [["destination", "Região gravável."], ["source", "Região legível."], ["count", "Bytes dentro de ambas as regiões."]]),
  fopen: signature("FILE *fopen(const char *path, const char *mode)", "Abre um stream ou devolve NULL.", [["path", "Caminho do arquivo."], ["mode", "Modo como rb, wb ou ab."]]),
  fread: signature("size_t fread(void *buffer, size_t size, size_t count, FILE *stream)", "Lê até count elementos.", [["buffer", "Destino com capacidade suficiente."], ["size", "Bytes por elemento."], ["count", "Quantidade de elementos."], ["stream", "Stream de origem."]]),
  socket: signature("int socket(int domain, int type, int protocol)", "Cria um socket e devolve descriptor ou -1.", [["domain", "Família como AF_INET."], ["type", "Tipo como SOCK_STREAM."], ["protocol", "Normalmente zero para inferir."]]),
  bind: signature("int bind(int socket, const struct sockaddr *address, socklen_t length)", "Associa um endereço local.", [["socket", "Descriptor do endpoint."], ["address", "Endereço com família compatível."], ["length", "Tamanho da estrutura."]]),
  listen: signature("int listen(int socket, int backlog)", "Habilita a fila de conexões TCP.", [["socket", "Socket ligado."], ["backlog", "Limite solicitado para a fila."]]),
  accept: signature("int accept(int listener, struct sockaddr *peer, socklen_t *peer_size)", "Retira uma conexão e cria outro socket.", [["listener", "Socket em listening."], ["peer", "Destino opcional para o endereço remoto."], ["peer_size", "Capacidade na entrada e tamanho real na saída."]]),
  recv: signature("ssize_t recv(int socket, void *buffer, size_t capacity, int flags)", "Recebe bytes do stream; zero indica EOF.", [["socket", "Socket conectado."], ["buffer", "Destino gravável."], ["capacity", "Capacidade em bytes."], ["flags", "Flags ou zero."]]),
  send: signature("ssize_t send(int socket, const void *buffer, size_t size, int flags)", "Enfileira até size bytes e pode retornar parcialmente.", [["socket", "Socket conectado."], ["buffer", "Origem dos bytes."], ["size", "Bytes disponíveis."], ["flags", "Flags ou zero."]]),
  "std::make_unique": signature("std::unique_ptr<T> std::make_unique<T>(Args&&... arguments)", "Constrói T e devolve ownership exclusivo.", [["arguments", "Argumentos encaminhados ao construtor de T."]]),
  make_unique: signature("std::unique_ptr<T> std::make_unique<T>(Args&&... arguments)", "Constrói T e devolve ownership exclusivo.", [["arguments", "Argumentos encaminhados ao construtor de T."]]),
  "std::move": signature("std::remove_reference_t<T>&& std::move(T&& value)", "Converte value para rvalue; não move por conta própria.", [["value", "Objeto cuja operação de move pode ser selecionada."]]),
  move: signature("std::remove_reference_t<T>&& std::move(T&& value)", "Converte value para rvalue; não move por conta própria.", [["value", "Objeto cuja operação de move pode ser selecionada."]])
};

function typeSuggestion(label: string, documentation: string): SuggestionSpec {
  return { label, insertText: label, detail: `tipo · ${label}`, documentation, kind: "type", sortText: `30-${label}` };
}

function functionSuggestion(label: string, insertText: string, detail: string, documentation: string): SuggestionSpec {
  return { label, insertText, detail, documentation, kind: "function", snippet: true, sortText: `20-${label}` };
}

function cppStd(label: string, insertText: string, detail: string, documentation: string): SuggestionSpec {
  return { label, insertText, detail, documentation, kind: detail.includes("<") ? "class" : "function", snippet: true, filterText: `std::${label} ${label}`, sortText: `20-${label}` };
}

function qualifyCppSuggestion(spec: SuggestionSpec): SuggestionSpec {
  return {
    ...spec,
    label: `std::${spec.label}`,
    insertText: `std::${spec.insertText}`,
    filterText: `${spec.label} std::${spec.label}`
  };
}

function snippet(label: string, detail: string, insertText: string, documentation: string): SuggestionSpec {
  return { label, insertText, detail, documentation, kind: "snippet", snippet: true, sortText: `00-${label}` };
}

function signature(label: string, documentation: string, parameters: readonly (readonly [string, string])[]): SignatureSpec {
  return { label, documentation, parameters: parameters.map(([parameterLabel, parameterDocumentation]) => ({ label: parameterLabel, documentation: parameterDocumentation })) };
}

function kindFor(monaco: Monaco, kind: SuggestionKind) {
  const kinds = monaco.languages.CompletionItemKind;
  switch (kind) {
    case "class": return kinds.Class;
    case "constant": return kinds.Constant;
    case "function": return kinds.Function;
    case "keyword": return kinds.Keyword;
    case "macro": return kinds.Constant;
    case "snippet": return kinds.Snippet;
    case "type": return kinds.Struct;
    case "variable": return kinds.Variable;
  }
}

function keywordSuggestions(keywords: readonly string[]): readonly SuggestionSpec[] {
  return keywords.map((label) => ({ label, insertText: label, detail: "palavra-chave da linguagem", documentation: `Palavra-chave reservada: ${label}.`, kind: "keyword" as const, sortText: `40-${label}` }));
}

function discoverLocalSymbols(source: string): readonly SuggestionSpec[] {
  const found = new Map<string, SuggestionSpec>();
  const blocked = new Set(["if", "for", "while", "switch", "return", "sizeof", "catch"]);
  const functionPattern = /(?:^|\n)\s*(?:[A-Za-z_]\w*(?:\s*[*&]\s*|\s+))+([A-Za-z_]\w*)\s*\(([^;{}]*)\)\s*(?:\{|;)/g;
  const typePattern = /\b(?:struct|class|enum|union)\s+([A-Za-z_]\w*)/g;
  let match: RegExpExecArray | null;
  while ((match = functionPattern.exec(source))) {
    const name = match[1]!;
    if (blocked.has(name)) continue;
    const parameters = match[2]?.trim() ?? "";
    found.set(name, {
      label: name,
      insertText: `${name}(${parameters && parameters !== "void" ? "${1:arguments}" : ""})`,
      detail: `função deste arquivo · (${parameters || "void"})`,
      documentation: "Símbolo detectado no modelo aberto. A compilação continua sendo a fonte de verdade para tipos e linkage.",
      kind: "function",
      snippet: true,
      sortText: `10-${name}`
    });
  }
  while ((match = typePattern.exec(source))) {
    const name = match[1]!;
    found.set(name, { label: name, insertText: name, detail: "tipo declarado neste arquivo", documentation: "Struct, class, enum ou union detectada no código atual.", kind: "type", sortText: `11-${name}` });
  }
  return [...found.values()];
}

function findCallContext(sourceBeforeCursor: string): { readonly name: string; readonly activeParameter: number } | undefined {
  let nested = 0;
  let opening = -1;
  for (let index = sourceBeforeCursor.length - 1; index >= 0; index -= 1) {
    const character = sourceBeforeCursor[index]!;
    if (character === ")" || character === "]" || character === "}") nested += 1;
    else if (character === "(" || character === "[" || character === "{") {
      if (nested > 0) nested -= 1;
      else if (character === "(") { opening = index; break; }
    }
  }
  if (opening < 0) return undefined;
  const nameMatch = sourceBeforeCursor.slice(0, opening).match(/([A-Za-z_]\w*(?:::[A-Za-z_]\w*)*)\s*(?:<[^<>]*>)?\s*$/);
  if (!nameMatch) return undefined;
  const argumentsText = sourceBeforeCursor.slice(opening + 1);
  let parameter = 0;
  let argumentNesting = 0;
  let quote: string | undefined;
  for (let index = 0; index < argumentsText.length; index += 1) {
    const character = argumentsText[index]!;
    const previous = argumentsText[index - 1];
    if (quote) {
      if (character === quote && previous !== "\\") quote = undefined;
      continue;
    }
    if (character === "\"" || character === "'") quote = character;
    else if ("([{<".includes(character)) argumentNesting += 1;
    else if (")]}>".includes(character)) argumentNesting = Math.max(0, argumentNesting - 1);
    else if (character === "," && argumentNesting === 0) parameter += 1;
  }
  return { name: nameMatch[1]!, activeParameter: parameter };
}

export function installCCppIntelliSense(monaco: Monaco): void {
  if (configuredInstances.has(monaco)) return;
  configuredInstances.add(monaco);

  for (const language of ["c", "cpp"] as const) {
    monaco.languages.registerCompletionItemProvider(language, {
      triggerCharacters: ["#", "<", "\"", ":", ".", ">"],
      provideCompletionItems(model, position) {
        const lineBeforeCursor = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
        const includeMatch = lineBeforeCursor.match(/^\s*#\s*include\s*([<"])([^>"]*)$/);
        if (includeMatch) {
          const typed = includeMatch[2] ?? "";
          const closing = includeMatch[1] === "<" ? ">" : "\"";
          const range = new monaco.Range(position.lineNumber, position.column - typed.length, position.lineNumber, position.column);
          const headers = [...C_HEADERS, ...(language === "cpp" ? CPP_HEADERS : [])].filter((header) => header.languages.includes(language));
          return {
            suggestions: headers.map((header) => ({
              label: header.name,
              kind: monaco.languages.CompletionItemKind.Module,
              detail: `header · ${header.detail}`,
              documentation: { value: `Inclui \`${header.name}\`. ${header.detail}.` },
              insertText: `${header.name}${closing}`,
              filterText: header.name,
              range,
              sortText: `00-${header.name}`
            }))
          };
        }

        const word = model.getWordUntilPosition(position);
        const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
        const stdContext = language === "cpp" && /\bstd::[A-Za-z_]*$/.test(lineBeforeCursor);
        const common = [...C_TYPES, ...C_LIBRARY, ...C_SNIPPETS, ...keywordSuggestions(C_KEYWORDS)];
        const cpp = language === "cpp" ? [...CPP_LIBRARY.map(qualifyCppSuggestion), ...CPP_SNIPPETS, ...keywordSuggestions(CPP_KEYWORDS)] : [];
        const local = discoverLocalSymbols(model.getValue());
        const specs = stdContext ? CPP_LIBRARY : [...local, ...common, ...cpp];
        return {
          suggestions: specs.map((spec) => ({
            label: spec.label,
            kind: kindFor(monaco, spec.kind),
            detail: spec.detail,
            documentation: { value: spec.documentation },
            insertText: spec.insertText,
            range,
            ...(spec.snippet ? { insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet } : {}),
            ...(spec.filterText ? { filterText: spec.filterText } : {}),
            ...(spec.sortText ? { sortText: spec.sortText } : {})
          }))
        };
      }
    });

    monaco.languages.registerSignatureHelpProvider(language, {
      signatureHelpTriggerCharacters: ["(", ","],
      signatureHelpRetriggerCharacters: [","],
      provideSignatureHelp(model, position) {
        const offset = model.getOffsetAt(position);
        const context = findCallContext(model.getValue().slice(Math.max(0, offset - 4_000), offset));
        if (!context) return null;
        const spec = SIGNATURES[context.name] ?? SIGNATURES[context.name.split("::").at(-1) ?? ""];
        if (!spec) return null;
        return {
          value: {
            signatures: [{
              label: spec.label,
              documentation: spec.documentation,
              parameters: spec.parameters.map((parameter) => ({ label: parameter.label, documentation: parameter.documentation }))
            }],
            activeSignature: 0,
            activeParameter: Math.min(context.activeParameter, Math.max(0, spec.parameters.length - 1))
          },
          dispose() {}
        };
      }
    });
  }
}
