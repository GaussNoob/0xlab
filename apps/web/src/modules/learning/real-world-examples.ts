import type { GuideCode, GuideStep } from "./lesson-guides/types";

export interface RealWorldExample {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly platform: string;
  readonly level: "Fundamentos" | "Intermediário" | "Avançado";
  readonly concepts: readonly string[];
  readonly files: readonly GuideCode[];
  readonly commands: GuideCode;
  readonly expected: string;
  readonly walkthrough: readonly GuideStep[];
  readonly extensions: readonly string[];
}

const tcpEchoServer: RealWorldExample = {
  id: "tcp-echo-server",
  title: "Servidor TCP echo completo",
  summary: "Um servidor real limitado ao loopback: abre o endpoint, publica a porta, aceita conexões, trata leituras e escritas parciais e encerra cada recurso no caminho correto.",
  platform: "Linux/POSIX e Windows/Winsock",
  level: "Intermediário",
  concepts: ["socket", "bind", "listen", "accept", "recv", "send", "short I/O", "shutdown"],
  files: [
    {
      language: "c",
      filename: "tcp_server_posix.c",
      source: String.raw`#define _POSIX_C_SOURCE 200809L
#include <arpa/inet.h>
#include <errno.h>
#include <signal.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <unistd.h>

enum { BUFFER_SIZE = 4096, BACKLOG = 16 };

static int send_all(int socket_fd, const char *data, size_t size) {
    size_t sent = 0;
    while (sent < size) {
        ssize_t result = send(socket_fd, data + sent, size - sent, 0);
        if (result > 0) {
            sent += (size_t)result;
            continue;
        }
        if (result < 0 && errno == EINTR) continue;
        return -1;
    }
    return 0;
}

static uint16_t parse_port(const char *text) {
    char *end = NULL;
    errno = 0;
    long value = strtol(text, &end, 10);
    if (errno != 0 || end == text || *end != '\0' || value < 1 || value > 65535) {
        fprintf(stderr, "porta inválida: %s\n", text);
        exit(EXIT_FAILURE);
    }
    return (uint16_t)value;
}

int main(int argc, char **argv) {
    uint16_t port = parse_port(argc > 1 ? argv[1] : "8080");
    signal(SIGPIPE, SIG_IGN);

    int listener = socket(AF_INET, SOCK_STREAM, 0);
    if (listener < 0) { perror("socket"); return EXIT_FAILURE; }

    int reuse = 1;
    if (setsockopt(listener, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof reuse) < 0) {
        perror("setsockopt"); close(listener); return EXIT_FAILURE;
    }

    struct sockaddr_in address = {
        .sin_family = AF_INET,
        .sin_port = htons(port)
    };
    if (inet_pton(AF_INET, "127.0.0.1", &address.sin_addr) != 1) {
        fputs("inet_pton falhou\n", stderr); close(listener); return EXIT_FAILURE;
    }
    if (bind(listener, (struct sockaddr *)&address, sizeof address) < 0) {
        perror("bind"); close(listener); return EXIT_FAILURE;
    }
    if (listen(listener, BACKLOG) < 0) {
        perror("listen"); close(listener); return EXIT_FAILURE;
    }

    printf("echo server em 127.0.0.1:%u\n", (unsigned)port);
    for (;;) {
        struct sockaddr_in peer = {0};
        socklen_t peer_size = sizeof peer;
        int client;
        do {
            client = accept(listener, (struct sockaddr *)&peer, &peer_size);
        } while (client < 0 && errno == EINTR);
        if (client < 0) { perror("accept"); break; }

        char peer_ip[INET_ADDRSTRLEN] = {0};
        inet_ntop(AF_INET, &peer.sin_addr, peer_ip, sizeof peer_ip);
        printf("cliente %s:%u conectado\n", peer_ip, ntohs(peer.sin_port));

        char buffer[BUFFER_SIZE];
        for (;;) {
            ssize_t received = recv(client, buffer, sizeof buffer, 0);
            if (received > 0) {
                if (send_all(client, buffer, (size_t)received) < 0) {
                    perror("send");
                    break;
                }
                continue;
            }
            if (received == 0) break;
            if (errno == EINTR) continue;
            perror("recv");
            break;
        }
        close(client);
        puts("cliente desconectado");
    }

    close(listener);
    return EXIT_SUCCESS;
}`,
      explanation: "A versão POSIX prende a porta apenas em 127.0.0.1. O listener permanece aberto; accept cria um descritor independente para cada fluxo. send_all preserva o offset quando o kernel aceita somente parte dos bytes."
    },
    {
      language: "cpp",
      filename: "tcp_server_win32.cpp",
      source: String.raw`#define WIN32_LEAN_AND_MEAN
#include <WinSock2.h>
#include <WS2tcpip.h>
#include <array>
#include <cstdio>

#pragma comment(lib, "Ws2_32.lib")

bool send_all(SOCKET socket, const char* data, int size) {
    int sent = 0;
    while (sent < size) {
        int result = send(socket, data + sent, size - sent, 0);
        if (result == SOCKET_ERROR || result == 0) return false;
        sent += result;
    }
    return true;
}

int main() {
    WSADATA data{};
    if (WSAStartup(MAKEWORD(2, 2), &data) != 0) return 1;

    SOCKET listener = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (listener == INVALID_SOCKET) {
        std::printf("socket: %d\n", WSAGetLastError());
        WSACleanup();
        return 1;
    }

    sockaddr_in address{};
    address.sin_family = AF_INET;
    address.sin_port = htons(8080);
    InetPtonW(AF_INET, L"127.0.0.1", &address.sin_addr);

    if (bind(listener, reinterpret_cast<sockaddr*>(&address), sizeof address) == SOCKET_ERROR ||
        listen(listener, SOMAXCONN) == SOCKET_ERROR) {
        std::printf("bind/listen: %d\n", WSAGetLastError());
        closesocket(listener);
        WSACleanup();
        return 1;
    }

    std::puts("echo server em 127.0.0.1:8080");
    for (;;) {
        SOCKET client = accept(listener, nullptr, nullptr);
        if (client == INVALID_SOCKET) {
            std::printf("accept: %d\n", WSAGetLastError());
            break;
        }

        std::array<char, 4096> buffer{};
        for (;;) {
            int received = recv(client, buffer.data(), static_cast<int>(buffer.size()), 0);
            if (received > 0 && send_all(client, buffer.data(), received)) continue;
            if (received == SOCKET_ERROR) std::printf("recv: %d\n", WSAGetLastError());
            break;
        }
        shutdown(client, SD_BOTH);
        closesocket(client);
    }

    closesocket(listener);
    WSACleanup();
    return 0;
}`,
      explanation: "Winsock exige WSAStartup/WSACleanup e usa SOCKET/INVALID_SOCKET em vez de file descriptors. O modelo TCP é o mesmo; os sentinels e a forma de obter o erro pertencem ao contrato Win32."
    }
  ],
  commands: {
    language: "shell",
    filename: "build-and-test.txt",
    source: String.raw`# Linux / WSL
cc -std=c17 -Wall -Wextra -Wpedantic -O2 tcp_server_posix.c -o tcp-server
./tcp-server 8080

# Em outro terminal
printf 'hello TCP\n' | nc 127.0.0.1 8080

# Windows — Developer PowerShell for VS
cl /std:c++20 /W4 /EHsc tcp_server_win32.cpp
./tcp_server_win32.exe

# Em outro PowerShell
'hello TCP' | ncat 127.0.0.1 8080`,
    explanation: "Teste apenas no loopback primeiro. Uma porta exposta em outras interfaces exige autenticação, limites, observabilidade e uma decisão explícita de segurança."
  },
  expected: "O cliente recebe exatamente os bytes enviados. O servidor registra conexão e desconexão sem assumir que uma chamada recv corresponde a uma mensagem completa.",
  walkthrough: [
    { title: "Criar o endpoint", detail: "socket cria o objeto no kernel, mas ainda não escolhe endereço local nem aceita conexões." },
    { title: "Publicar a porta", detail: "bind associa 127.0.0.1:8080; listen cria a fila de conexões concluídas aguardando accept." },
    { title: "Separar listener e conexão", detail: "accept devolve outro handle. Fechar o cliente não fecha o listener e não afeta novos peers." },
    { title: "Transportar um stream", detail: "recv e send movem quantidades observadas, não mensagens. O loop mantém offset e trata EOF separadamente." },
    { title: "Liberar ownership", detail: "Cada caminho fecha o socket que possui; Winsock também equilibra a inicialização global com WSACleanup." }
  ],
  extensions: ["Adicione framing de 4 bytes em network byte order.", "Atenda múltiplos clientes com epoll ou IOCP.", "Imponha timeout, limite de fila e shutdown cooperativo.", "Capture o handshake e os segmentos no Network Visualizer/Wireshark."]
};

const dynamicVector: RealWorldExample = {
  id: "c-dynamic-vector",
  title: "Vetor dinâmico seguro em C",
  summary: "Uma estrutura pequena, mas completa, para observar ponteiros, crescimento do heap, overflow de tamanho, realloc e ownership.",
  platform: "C17 · multiplataforma",
  level: "Fundamentos",
  concepts: ["pointer", "capacity", "realloc", "overflow", "lifetime", "ownership"],
  files: [{
    language: "c",
    filename: "int_vector.c",
    source: String.raw`#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int *data;
    size_t size;
    size_t capacity;
} IntVector;

static int vector_reserve(IntVector *vector, size_t requested) {
    if (requested <= vector->capacity) return 1;
    if (requested > SIZE_MAX / sizeof *vector->data) return 0;

    size_t capacity = vector->capacity ? vector->capacity : 4;
    while (capacity < requested) {
        if (capacity > SIZE_MAX / 2) { capacity = requested; break; }
        capacity *= 2;
    }
    if (capacity > SIZE_MAX / sizeof *vector->data) return 0;

    int *new_data = realloc(vector->data, capacity * sizeof *new_data);
    if (!new_data) return 0;
    vector->data = new_data;
    vector->capacity = capacity;
    return 1;
}

static int vector_push(IntVector *vector, int value) {
    if (!vector_reserve(vector, vector->size + 1)) return 0;
    vector->data[vector->size++] = value;
    return 1;
}

static void vector_destroy(IntVector *vector) {
    free(vector->data);
    *vector = (IntVector){0};
}

int main(void) {
    IntVector values = {0};
    for (int value = 10; value <= 50; value += 10) {
        if (!vector_push(&values, value)) {
            vector_destroy(&values);
            return EXIT_FAILURE;
        }
    }
    for (size_t i = 0; i < values.size; ++i)
        printf("values[%zu] = %d\n", i, values.data[i]);
    vector_destroy(&values);
    return EXIT_SUCCESS;
}`,
    explanation: "realloc é atribuído primeiro a um temporário: em caso de falha, o bloco antigo continua pertencendo ao vetor. size conta objetos construídos; capacity conta slots disponíveis."
  }],
  commands: { language: "shell", filename: "build.txt", source: String.raw`cc -std=c17 -Wall -Wextra -Wpedantic -fsanitize=address,undefined -g int_vector.c -o int-vector
./int-vector`, explanation: "Sanitizers transformam violações de bounds, lifetime e algumas formas de undefined behavior em diagnósticos observáveis." },
  expected: "Cinco valores são impressos, a capacidade cresce geometricamente e o sanitizer termina sem relatar leaks ou acessos inválidos.",
  walkthrough: [
    { title: "Estado vazio", detail: "O ponteiro nulo, size zero e capacity zero formam um invariante válido e podem ser passados a free." },
    { title: "Crescimento", detail: "A política geométrica reduz realocações; os checks impedem que capacity * sizeof(int) transborde." },
    { title: "Commit", detail: "Somente depois de realloc retornar sucesso o ponteiro e a capacidade são atualizados." },
    { title: "Destruição", detail: "free encerra o lifetime do bloco e zerar a estrutura evita reutilização acidental do endereço antigo." }
  ],
  extensions: ["Implemente insert/remove mantendo os invariantes.", "Visualize cada crescimento no Allocator 3D.", "Compare crescimento 1.5x e 2x medindo cópias e memória ociosa."]
};

const assemblyBridge: RealWorldExample = {
  id: "assembly-c-bridge",
  title: "Função NASM chamada por C",
  summary: "Um projeto de dois arquivos que prova, pelo linker e pela ABI System V AMD64, como um array C chega a uma função Assembly.",
  platform: "Linux x86-64 · NASM + GCC/Clang",
  level: "Intermediário",
  concepts: ["System V AMD64", "RDI", "RSI", "RAX", "symbol", "object file", "linker"],
  files: [
    {
      language: "asm",
      filename: "sum_i32.asm",
      source: String.raw`bits 64
default rel
section .text
global sum_i32

; int64_t sum_i32(const int32_t *values, size_t count)
; RDI = values, RSI = count, RAX = return value
sum_i32:
    xor eax, eax
    xor ecx, ecx
.loop:
    cmp rcx, rsi
    jae .done
    movsxd rdx, dword [rdi + rcx*4]
    add rax, rdx
    inc rcx
    jmp .loop
.done:
    ret

section .note.GNU-stack noalloc noexec nowrite progbits`,
      explanation: "A função é leaf: não altera RSP e usa apenas registradores caller-saved. movsxd preserva o sinal de cada int32_t antes da soma em 64 bits."
    },
    {
      language: "c",
      filename: "main.c",
      source: String.raw`#include <inttypes.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>

extern int64_t sum_i32(const int32_t *values, size_t count);

int main(void) {
    const int32_t values[] = {10, -4, 20, 7};
    int64_t result = sum_i32(values, sizeof values / sizeof values[0]);
    printf("resultado = %" PRId64 "\n", result);
    return result == 33 ? 0 : 1;
}`,
      explanation: "A declaração C é o contrato compartilhado. O nome exportado, os tipos e a calling convention precisam concordar; o linker não valida a semântica dos registradores."
    }
  ],
  commands: { language: "shell", filename: "build-and-inspect.sh", source: String.raw`nasm -f elf64 -g -F dwarf sum_i32.asm -o sum_i32.o
cc -std=c17 -Wall -Wextra -O2 main.c sum_i32.o -o asm-bridge
./asm-bridge
objdump -dr -Mintel sum_i32.o
readelf -Ws asm-bridge | grep sum_i32`, explanation: "Inspecione o objeto antes e depois do link: o símbolo existe no .o e recebe endereço virtual quando a imagem final é criada/carregada." },
  expected: "O processo imprime resultado = 33 e retorna zero. O disassembly mostra RDI/RSI como entradas e RAX como retorno.",
  walkthrough: [
    { title: "Declarar o contrato", detail: "O protótipo C fixa tipos e permite ao compiler montar a chamada segundo System V AMD64." },
    { title: "Receber argumentos", detail: "O endereço do primeiro elemento chega em RDI e a contagem em RSI; nenhum argumento precisa ser lido da stack." },
    { title: "Percorrer memória", detail: "[rdi + rcx*4] traduz a indexação de int32_t em base + índice escalado." },
    { title: "Retornar", detail: "RAX contém o inteiro de 64 bits e ret consome o endereço colocado por call." }
  ],
  extensions: ["Implemente a versão Windows x64 usando RCX/RDX.", "Compare -O0/-O3 de uma versão equivalente em C.", "Vetorize o loop com SSE2 e valide o tail escalar."]
};

const win32Window: RealWorldExample = {
  id: "win32-window",
  title: "Janela Win32 Unicode com pintura",
  summary: "Aplicação Win32 completa: registra classe, cria HWND, executa message loop e pinta somente durante WM_PAINT.",
  platform: "Windows x64 · MSVC",
  level: "Intermediário",
  concepts: ["wWinMain", "WNDCLASSEXW", "HWND", "GetMessageW", "WndProc", "WM_PAINT"],
  files: [{
    language: "cpp",
    filename: "window.cpp",
    source: String.raw`#define UNICODE
#define _UNICODE
#include <Windows.h>

LRESULT CALLBACK WindowProc(HWND window, UINT message, WPARAM wparam, LPARAM lparam) {
    switch (message) {
    case WM_PAINT: {
        PAINTSTRUCT paint{};
        HDC dc = BeginPaint(window, &paint);
        constexpr wchar_t text[] = L"C++ → Win32 → GDI → DWM";
        TextOutW(dc, 24, 24, text, static_cast<int>((sizeof text / sizeof text[0]) - 1));
        EndPaint(window, &paint);
        return 0;
    }
    case WM_KEYDOWN:
        if (wparam == VK_ESCAPE) DestroyWindow(window);
        return 0;
    case WM_DESTROY:
        PostQuitMessage(0);
        return 0;
    default:
        return DefWindowProcW(window, message, wparam, lparam);
    }
}

int WINAPI wWinMain(HINSTANCE instance, HINSTANCE, PWSTR, int show_command) {
    constexpr wchar_t class_name[] = L"ZeroLabWindow";
    WNDCLASSEXW window_class{
        .cbSize = sizeof(WNDCLASSEXW),
        .style = CS_HREDRAW | CS_VREDRAW,
        .lpfnWndProc = WindowProc,
        .hInstance = instance,
        .hCursor = LoadCursorW(nullptr, IDC_ARROW),
        .hbrBackground = reinterpret_cast<HBRUSH>(COLOR_WINDOW + 1),
        .lpszClassName = class_name
    };
    if (!RegisterClassExW(&window_class)) return 1;

    HWND window = CreateWindowExW(
        0, class_name, L"0xLAB · Win32 real",
        WS_OVERLAPPEDWINDOW, CW_USEDEFAULT, CW_USEDEFAULT,
        900, 560, nullptr, nullptr, instance, nullptr
    );
    if (!window) return 2;

    ShowWindow(window, show_command);
    UpdateWindow(window);

    MSG message{};
    BOOL result;
    while ((result = GetMessageW(&message, nullptr, 0, 0)) != 0) {
        if (result == -1) return 3;
        TranslateMessage(&message);
        DispatchMessageW(&message);
    }
    return static_cast<int>(message.wParam);
}`,
    explanation: "GetMessage possui três resultados, não dois: positivo, zero para WM_QUIT e -1 para erro. BeginPaint/EndPaint validam a região de atualização; mensagens não tratadas seguem para DefWindowProcW."
  }],
  commands: { language: "powershell", filename: "Developer PowerShell", source: String.raw`cl /std:c++20 /W4 /EHsc window.cpp user32.lib gdi32.lib /link /SUBSYSTEM:WINDOWS
./window.exe`, explanation: "Use o Developer PowerShell do Visual Studio para que cl.exe e as bibliotecas do Windows SDK estejam no PATH." },
  expected: "Uma janela nativa exibe o texto, repinta ao ser descoberta/redimensionada e encerra com Esc ou pelo botão fechar.",
  walkthrough: [
    { title: "Registrar a classe", detail: "WNDCLASSEXW associa nome, callback, cursor e defaults que o USER32 reutiliza ao criar janelas." },
    { title: "Criar o HWND", detail: "CreateWindowExW cria o objeto de janela e pode provocar mensagens antes de retornar." },
    { title: "Bombear mensagens", detail: "GetMessage bloqueia, TranslateMessage produz mensagens de caractere e DispatchMessage chama WindowProc." },
    { title: "Pintar sob contrato", detail: "WM_PAINT delimita a região inválida. BeginPaint prepara o DC e EndPaint conclui a validação." }
  ],
  extensions: ["Armazene estado por janela com GWLP_USERDATA.", "Adicione WM_SIZE e um child control.", "Substitua GDI por uma swapchain Direct3D 11 ligada ao mesmo HWND."]
};

const virtualMemoryDemo: RealWorldExample = {
  id: "win32-virtual-memory",
  title: "Reserva, commit e proteção de páginas",
  summary: "Demonstra a diferença real entre reservar endereço, comprometer backing store, alterar proteção, consultar a região e liberar a reserva inteira.",
  platform: "Windows x64 · MSVC",
  level: "Avançado",
  concepts: ["MEM_RESERVE", "MEM_COMMIT", "PAGE_READWRITE", "VirtualProtect", "VirtualQuery", "MEM_RELEASE"],
  files: [{
    language: "cpp",
    filename: "virtual_memory.cpp",
    source: String.raw`#include <Windows.h>
#include <cstdio>
#include <cstring>

int main() {
    SYSTEM_INFO system{};
    GetSystemInfo(&system);
    const SIZE_T page = system.dwPageSize;
    const SIZE_T reserve_size = page * 16;

    void* base = VirtualAlloc(nullptr, reserve_size, MEM_RESERVE, PAGE_NOACCESS);
    if (!base) { std::printf("reserve: %lu\n", GetLastError()); return 1; }

    void* committed = VirtualAlloc(base, page, MEM_COMMIT, PAGE_READWRITE);
    if (!committed) {
        std::printf("commit: %lu\n", GetLastError());
        VirtualFree(base, 0, MEM_RELEASE);
        return 2;
    }

    constexpr char message[] = "bytes em uma página comprometida";
    std::memcpy(committed, message, sizeof message);

    DWORD previous = 0;
    if (!VirtualProtect(committed, page, PAGE_READONLY, &previous)) {
        std::printf("protect: %lu\n", GetLastError());
        VirtualFree(base, 0, MEM_RELEASE);
        return 3;
    }

    MEMORY_BASIC_INFORMATION info{};
    SIZE_T queried = VirtualQuery(committed, &info, sizeof info);
    if (queried == sizeof info) {
        std::printf("base=%p region=%zu state=0x%lx protect=0x%lx text=%s\n",
            info.BaseAddress, static_cast<size_t>(info.RegionSize),
            info.State, info.Protect, static_cast<const char*>(committed));
    }

    if (!VirtualFree(base, 0, MEM_RELEASE)) return 4;
    return 0;
}`,
    explanation: "Reserve escolhe um intervalo de endereços virtuais; commit torna páginas utilizáveis. VirtualProtect altera o contrato de acesso e VirtualQuery descreve regiões contíguas com atributos iguais."
  }],
  commands: { language: "powershell", filename: "Developer PowerShell", source: String.raw`cl /std:c++20 /W4 /EHsc virtual_memory.cpp
./virtual_memory.exe`, explanation: "Execute também no Virtual Memory Visualizer e compare tamanho de página, base, estado e proteção reportados." },
  expected: "A consulta mostra uma região MEM_COMMIT/PAGE_READONLY, o texto continua legível e a reserva inteira é liberada com size zero e MEM_RELEASE.",
  walkthrough: [
    { title: "Reservar VA", detail: "O intervalo passa a pertencer ao processo, mas PAGE_NOACCESS e ausência de commit impedem acesso." },
    { title: "Comprometer uma página", detail: "Somente a primeira página recebe estado MEM_COMMIT e proteção de leitura/escrita." },
    { title: "Reduzir permissão", detail: "VirtualProtect troca RW por R; tentar escrever depois disso provocaria access violation." },
    { title: "Consultar e liberar", detail: "VirtualQuery revela o agrupamento atual; MEM_RELEASE encerra a reserva usando o endereço base original." }
  ],
  extensions: ["Commit páginas não contíguas e desenhe as regiões.", "Implemente um bump allocator sobre a reserva.", "Meça page faults ao tocar uma página por vez."]
};

const openGlTriangle: RealWorldExample = {
  id: "opengl-triangle",
  title: "Triângulo OpenGL com shaders próprios",
  summary: "O menor renderer moderno útil: contexto SDL3, vertex buffer, shaders, draw call, swap e limpeza dos recursos.",
  platform: "C++20 · SDL3 + OpenGL 3.3 + GLAD",
  level: "Intermediário",
  concepts: ["context", "VBO", "VAO", "vertex shader", "fragment shader", "draw call", "swap"],
  files: [{
    language: "cpp",
    filename: "triangle.cpp",
    source: String.raw`#include <SDL3/SDL.h>
#include <glad/gl.h>
#include <array>
#include <cstdio>

const char* vertex_source = R"GLSL(
#version 330 core
layout(location = 0) in vec2 position;
layout(location = 1) in vec3 color;
out vec3 vertex_color;
void main() {
    vertex_color = color;
    gl_Position = vec4(position, 0.0, 1.0);
}
)GLSL";

const char* fragment_source = R"GLSL(
#version 330 core
in vec3 vertex_color;
out vec4 pixel;
void main() { pixel = vec4(vertex_color, 1.0); }
)GLSL";

GLuint compile_shader(GLenum stage, const char* source) {
    GLuint shader = glCreateShader(stage);
    glShaderSource(shader, 1, &source, nullptr);
    glCompileShader(shader);
    GLint ok = GL_FALSE;
    glGetShaderiv(shader, GL_COMPILE_STATUS, &ok);
    if (!ok) {
        std::array<char, 1024> log{};
        glGetShaderInfoLog(shader, static_cast<GLsizei>(log.size()), nullptr, log.data());
        std::fprintf(stderr, "%s\n", log.data());
    }
    return shader;
}

int main() {
    if (!SDL_Init(SDL_INIT_VIDEO)) return 1;
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE);

    SDL_Window* window = SDL_CreateWindow("0xLAB triangle", 960, 540, SDL_WINDOW_OPENGL);
    SDL_GLContext context = window ? SDL_GL_CreateContext(window) : nullptr;
    if (!window || !context || !gladLoadGL(reinterpret_cast<GLADloadfunc>(SDL_GL_GetProcAddress))) return 2;
    SDL_GL_SetSwapInterval(1);

    const float vertices[] = {
         0.0f,  0.7f, 1.0f, 0.3f, 0.2f,
        -0.7f, -0.6f, 0.2f, 0.9f, 0.5f,
         0.7f, -0.6f, 0.3f, 0.5f, 1.0f
    };
    GLuint vao = 0, vbo = 0;
    glGenVertexArrays(1, &vao);
    glGenBuffers(1, &vbo);
    glBindVertexArray(vao);
    glBindBuffer(GL_ARRAY_BUFFER, vbo);
    glBufferData(GL_ARRAY_BUFFER, sizeof vertices, vertices, GL_STATIC_DRAW);
    glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 5 * sizeof(float), nullptr);
    glEnableVertexAttribArray(0);
    glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 5 * sizeof(float), reinterpret_cast<void*>(2 * sizeof(float)));
    glEnableVertexAttribArray(1);

    GLuint vertex = compile_shader(GL_VERTEX_SHADER, vertex_source);
    GLuint fragment = compile_shader(GL_FRAGMENT_SHADER, fragment_source);
    GLuint program = glCreateProgram();
    glAttachShader(program, vertex);
    glAttachShader(program, fragment);
    glLinkProgram(program);
    glDeleteShader(vertex);
    glDeleteShader(fragment);

    bool running = true;
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event))
            if (event.type == SDL_EVENT_QUIT) running = false;
        glClearColor(0.025f, 0.035f, 0.05f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);
        glUseProgram(program);
        glBindVertexArray(vao);
        glDrawArrays(GL_TRIANGLES, 0, 3);
        SDL_GL_SwapWindow(window);
    }

    glDeleteProgram(program);
    glDeleteBuffers(1, &vbo);
    glDeleteVertexArrays(1, &vao);
    SDL_GL_DestroyContext(context);
    SDL_DestroyWindow(window);
    SDL_Quit();
}`,
    explanation: "Cada vértice contém posição e cor intercaladas. O VAO registra como interpretar os bytes; o programa conecta os dois estágios e glDrawArrays transforma três registros em um triângulo."
  }],
  commands: { language: "shell", filename: "dependencies.txt", source: String.raw`# Requer SDL3 e um loader GLAD 2 para OpenGL 3.3 core.
# Exemplo Linux; ajuste os caminhos gerados pelo GLAD:
c++ -std=c++20 -Wall -Wextra triangle.cpp glad/src/gl.c \
  -Iglad/include $(pkg-config --cflags --libs sdl3) -ldl -o triangle
./triangle`, explanation: "GLAD carrega entry points após o contexto existir. Em Windows, ligue opengl32.lib e use as bibliotecas SDL3 do seu gerenciador de dependências." },
  expected: "Uma janela apresenta um triângulo colorido com VSync. Erros de compilação GLSL aparecem no terminal em vez de produzir uma tela silenciosamente vazia.",
  walkthrough: [
    { title: "Criar janela e contexto", detail: "SDL cria a janela nativa; o contexto OpenGL conecta chamadas da thread ao driver e a um framebuffer apresentável." },
    { title: "Descrever bytes", detail: "VBO armazena os floats e VAO registra offsets, stride e formatos consumidos pelo vertex shader." },
    { title: "Compilar pipeline", detail: "GLSL vira código intermediário/ISA específico do driver e o link valida a interface entre estágios." },
    { title: "Construir o frame", detail: "Clear, bind, draw e swap formam o frame mínimo; o driver traduz estado implícito em comandos para a GPU." }
  ],
  extensions: ["Adicione EBO e desenhe um quadrado.", "Passe uma matriz MVP por uniform.", "Capture o frame e inspecione atributos, shaders e draw call."]
};

const exampleByTopic: Readonly<Record<string, RealWorldExample>> = {
  "c-pointers:pointers": dynamicVector,
  "c-pointers:heap": dynamicVector,
  "mem-alloc:malloc": dynamicVector,
  "net-model:TCP": tcpEchoServer,
  "net-sockets:sockets": tcpEchoServer,
  "linux-network:socket": tcpEchoServer,
  "linux-network:TCP": tcpEchoServer,
  "asm-abi:System V AMD64": assemblyBridge,
  "asm-compiler:compiler": assemblyBridge,
  "win-gui:CreateWindowEx": win32Window,
  "win-gui:GetMessage": win32Window,
  "win-gui:WndProc": win32Window,
  "win-paint:WM_PAINT": win32Window,
  "win-memory:VirtualAlloc": virtualMemoryDemo,
  "win-memory:VirtualProtect": virtualMemoryDemo,
  "win-memory:VirtualQuery": virtualMemoryDemo,
  "gfx-pipeline:vertex": openGlTriangle,
  "gfx-pipeline:draw call": openGlTriangle,
  "gfx-opengl:OpenGL context": openGlTriangle,
  "gfx-opengl:VAO/VBO/EBO": openGlTriangle,
  "gfx-opengl:GLSL": openGlTriangle
};

export function getRealWorldExample(moduleId: string, topic: string): RealWorldExample | undefined {
  return exampleByTopic[`${moduleId}:${topic}`];
}

export function hasRealWorldExample(moduleId: string, topic: string): boolean {
  return Boolean(getRealWorldExample(moduleId, topic));
}
