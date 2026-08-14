import { guide, type GuideMap } from "./types";

export const windowsGuides: GuideMap = {
  "win-model": guide({
    thesis: "Win32 expõe uma ABI C baseada em tipos de largura definida, pointer-sized values, callbacks e handles opacos; entender cada categoria evita casts que escondem erros de lifetime e arquitetura.",
    context: [
      "Windows.h agrega declarações de várias famílias. HWND, HANDLE, HINSTANCE e HMODULE parecem ponteiros, mas são tokens opacos com owners e funções de fechamento diferentes; não se desreferencia seu conteúdo.",
      "DWORD tem 32 bits, BOOL é inteiro, WPARAM/LPARAM/LRESULT acompanham a largura do pointer. O sufixo _PTR sinaliza tipos que precisam sobreviver à migração x86 → x64."
    ],
    flow: ["C++ call", "Win32 typedefs", "x64 ABI", "user-mode implementation", "kernel/user object", "status"],
    topicNotes: {
      "HWND / HANDLE": "HWND identifica uma janela gerenciada por USER; HANDLE é categoria genérica para objetos como process, thread, file e event. Cada API documenta validade, rights e fechamento.",
      "DWORD / BOOL": "DWORD é unsigned 32-bit mesmo em x64. BOOL usa zero/não-zero e não deve ser confundido com bool C++ no layout de estruturas ou callbacks.",
      "WPARAM / LPARAM": "WPARAM é unsigned pointer-sized e LPARAM signed pointer-sized. Mensagens definem individualmente se carregam valor, bits empacotados ou pointer válido apenas durante a chamada.",
      "HINSTANCE / HMODULE": "No Win32 moderno ambos representam base de módulo em muitos contextos, mas o significado da API permanece distinto: instance em entry/window resources, module em loader APIs.",
      LRESULT: "WndProc retorna LRESULT pointer-sized. Mensagens desconhecidas devem seguir DefWindowProc para manter comportamento padrão, acessibilidade e nonclient processing."
    },
    code: { language: "cpp", filename: "win32-error.cpp", source: `#define WIN32_LEAN_AND_MEAN
#include <Windows.h>
#include <system_error>

HANDLE open_readonly(PCWSTR path) {
    HANDLE file = CreateFileW(path, GENERIC_READ, FILE_SHARE_READ,
        nullptr, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (file == INVALID_HANDLE_VALUE)
        throw std::system_error((int)GetLastError(), std::system_category());
    return file;
}`, explanation: "CreateFile falha com INVALID_HANDLE_VALUE, não NULL. Leia GetLastError imediatamente e envolva o HANDLE em RAII antes de ampliar o exemplo." },
    mechanics: [{ title: "Marshalling ABI", detail: "Typedefs estabilizam largura e signedness entre source e a calling convention." }, { title: "Validar handle", detail: "A função define o sentinel de falha e os access rights necessários." }, { title: "Despachar", detail: "Implementação user-mode pode resolver objeto local ou cruzar a fronteira do kernel." }, { title: "Traduzir erro", detail: "Return value indica falha; GetLastError só é válido quando a documentação manda consultá-lo." }],
    invariants: ["Nunca truncar pointer/handle para DWORD.", "Cada handle tem um owner e exatamente uma rotina correta de release.", "Sentinel e error contract são lidos da documentação de cada função."],
    pitfalls: [{ title: "CloseHandle em qualquer coisa", detail: "HWND usa DestroyWindow, HMODULE usa FreeLibrary e GDI objects têm DeleteObject; HANDLE não é um destructor universal." }, { title: "GetLastError depois de logging", detail: "O logger pode chamar Win32 e substituir o erro; capture primeiro." }],
    practice: { prompt: "Crie wrappers RAII para três recursos Win32.", tasks: ["Modele invalid value e close function.", "Remova cópia e implemente move.", "Teste sucesso, falha e transferência de ownership."], evidence: "Testes sem double-close e tabela tipo → sentinel → release → rights." }
  }),

  "win-text": guide({
    thesis: "Win32 moderno usa UTF-16 nas APIs W; conversão de encoding deve acontecer explicitamente nas fronteiras, preservando length e distinguindo bytes de code units.",
    context: [
      "LPCSTR aponta a char bytes interpretados pela code page da API A; LPCWSTR aponta a wchar_t UTF-16. Unicode pode usar surrogate pairs, portanto um code point nem sempre ocupa um wchar_t.",
      "Macros sem sufixo escolhem A ou W conforme UNICODE. Código novo deve chamar APIs W de modo explícito ou compilar consistentemente com UNICODE, evitando TCHAR como abstração ambígua em interfaces próprias."
    ],
    flow: ["UTF-8 application data", "validated conversion", "UTF-16 buffer", "Win32 W API", "UTF-16 result", "application encoding"],
    topicNotes: {
      Unicode: "Unicode define code points; UTF-8 e UTF-16 são encodings. Normalize apenas quando o domínio exige e nunca corte texto no meio de uma sequência/code point.",
      "UTF-16": "Windows wchar_t tem 16 bits. Length geralmente conta code units, e NUL termination é um contrato separado que precisa ser conferido por API.",
      MessageBoxA: "MessageBoxA converte bytes segundo a active code page e pode perder caracteres. É útil para compreender compatibilidade, não como padrão para texto novo.",
      MessageBoxW: "MessageBoxW recebe UTF-16 diretamente e suporta todo Unicode. Prefix L cria string literal wide: L\"texto\".",
      TCHAR: "TCHAR e TEXT alternam entre char/wchar_t por macro. Isso ajudou builds dual A/W; em código moderno, uma política explícita evita dois modelos escondidos."
    },
    code: { language: "cpp", filename: "unicode.cpp", source: `#define UNICODE
#define _UNICODE
#include <Windows.h>

int WINAPI wWinMain(HINSTANCE, HINSTANCE, PWSTR, int) {
    MessageBoxW(nullptr,
        L"Bytes fora; UTF-16 na fronteira Win32.",
        L"0xLab Unicode", MB_OK | MB_ICONINFORMATION);
    return 0;
}`, explanation: "wWinMain e MessageBoxW tornam a fronteira UTF-16 explícita. Dados UTF-8 de arquivo/rede devem ser validados e convertidos com flags estritas." },
    mechanics: [{ title: "Decodificar", detail: "Valide a sequência de origem e produza code points, rejeitando input inválido conforme política." }, { title: "Codificar", detail: "Converta para UTF-16 e calcule capacidade incluindo terminador quando exigido." }, { title: "Chamar", detail: "A API W recebe pointer e, conforme função, length explícito ou NUL termination." }, { title: "Converter retorno", detail: "Preserve erros de conversão e não confunda code units com caracteres visuais." }],
    invariants: ["Encoding é conhecido em cada boundary.", "Tamanho do buffer usa units documentadas pela API.", "Conversões inválidas falham de maneira observável, não substituem silenciosamente sem decisão."],
    pitfalls: [{ title: "reinterpret_cast entre char e wchar_t", detail: "Isso só relê bytes com largura diferente; não converte encoding." }, { title: "buffer.size() em bytes", detail: "Para APIs wide, counts frequentemente são wchar_t units; multiplicar ou não por sizeof depende do parâmetro." }],
    practice: { prompt: "Construa um conversor UTF-8 ↔ UTF-16 estrito.", tasks: ["Use MultiByteToWideChar/WideCharToMultiByte.", "Teste BMP, surrogate pair e input inválido.", "Mostre MessageBoxA vs W com texto não ASCII."], evidence: "Round-trip testado e tabela byte count/code-unit count/code-point count." }
  }),

  "win-gui": guide({
    thesis: "Uma GUI Win32 é orientada a mensagens: o thread cria uma janela, bombeia sua queue e deixa WndProc transformar eventos do sistema em estado e invalidation para pintura.",
    context: [
      "WNDCLASSEX registra comportamento e recursos associados a uma class name; CreateWindowEx cria a instância HWND. ShowWindow define estado de exibição e UpdateWindow pode provocar pintura imediata da região inválida.",
      "GetMessage bloqueia até haver mensagem e retorna >0, 0 para WM_QUIT e -1 em erro. TranslateMessage produz mensagens de caractere; DispatchMessage chama a WndProc associada ao HWND."
    ],
    flow: ["Windows/input", "thread message queue", "GetMessage", "TranslateMessage", "DispatchMessage", "WndProc"],
    topicNotes: {
      WNDCLASSEX: "WNDCLASSEXW inclui size, style, WndProc, instance, cursor, background e class name. Registre uma vez antes de criar janelas daquela classe.",
      CreateWindowEx: "CreateWindowExW escolhe extended styles, class, title, geometry, parent/menu e lpParam. Durante criação, WndProc recebe WM_NCCREATE/WM_CREATE.",
      GetMessage: "O loop correto trata -1 separadamente de WM_QUIT. GetMessage pode filtrar, mas um loop geral costuma receber todas as mensagens do thread.",
      DispatchMessage: "DispatchMessage entrega a MSG à WndProc. SendMessage é síncrono e pode reentrar; PostMessage enfileira e retorna.",
      WndProc: "WndProc deve executar rapidamente, tratar mensagens conhecidas e delegar o resto a DefWindowProcW. Estado por janela cabe em GWLP_USERDATA."
    },
    code: { language: "cpp", filename: "main-window.cpp", source: `LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM w, LPARAM l) {
    switch (msg) {
      case WM_PAINT: {
        PAINTSTRUCT ps{};
        HDC dc = BeginPaint(hwnd, &ps);
        TextOutW(dc, 16, 16, L"Hello, Win32", 12);
        EndPaint(hwnd, &ps);
        return 0;
      }
      case WM_DESTROY: PostQuitMessage(0); return 0;
      default: return DefWindowProcW(hwnd, msg, w, l);
    }
}`, explanation: "Este é o centro do app; WinMain ainda registra WNDCLASSEXW, chama CreateWindowExW/ShowWindow e executa o loop com retorno tri-state de GetMessage." },
    mechanics: [{ title: "Registrar", detail: "Class atom relaciona nome a callback, styles e recursos defaults." }, { title: "Criar", detail: "Window manager aloca HWND e envia mensagens de criação antes do retorno." }, { title: "Bombear", detail: "O thread retira mensagens e pode aguardar sem busy loop." }, { title: "Despachar", detail: "WndProc atualiza estado, agenda paint e retorna resultado definido por mensagem." }],
    invariants: ["Toda HWND é criada e destruída no thread que a possui.", "GetMessage -1 não é tratado como mensagem comum.", "Mensagens desconhecidas chegam a DefWindowProc."],
    pitfalls: [{ title: "Trabalho pesado na WndProc", detail: "Bloqueia input e pintura; mova trabalho e poste resultado de volta com lifetime seguro." }, { title: "Guardar pointer antes de WM_NCCREATE", detail: "Use CREATESTRUCT lpCreateParams e só leia estado depois de associá-lo à janela." }],
    practice: { prompt: "Construa janela, botão e input Win32 puros.", tasks: ["Registre/crie/mostre a janela.", "Trate command e redimensionamento.", "Adicione menu e shutdown limpo."], evidence: "Message log do create ao destroy e nenhum recurso GDI/HANDLE vazado." }
  }),

  "win-paint": guide({
    thesis: "Mensagens não são callbacks isolados: elas expressam lifecycle, input e regiões inválidas; a aplicação mantém estado e pinta uma representação consistente quando o sistema solicita.",
    context: [
      "WM_PAINT sinaliza uma update region não vazia. BeginPaint valida a região e fornece HDC; EndPaint encerra. Desenhar fora deste protocolo pode gerar repaints contínuos ou conteúdo perdido.",
      "WM_SIZE carrega client dimensions, teclado distingue keydown/up e repeat, mouse usa client coordinates. WM_CLOSE pede fechamento; DestroyWindow produz WM_DESTROY; PostQuitMessage encerra o message loop."
    ],
    flow: ["device/window event", "message", "WndProc", "state mutation", "InvalidateRect", "WM_PAINT"],
    topicNotes: {
      WM_PAINT: "Use BeginPaint/EndPaint exatamente em par e desenhe a partir do estado atual. Double buffering reduz flicker quando GDI compõe várias operações.",
      WM_SIZE: "LOWORD/HIWORD de lParam fornecem client width/height dentro das limitações históricas. Para tamanhos gerais, GetClientRect é a fonte robusta.",
      WM_KEYDOWN: "wParam contém virtual-key; lParam contém repeat/scan/previous state. Texto pertence a WM_CHAR/Unicode input, não a uma tabela simples de teclas.",
      WM_MOUSEMOVE: "Coordinates são signed em client space; use GET_X_LPARAM/GET_Y_LPARAM em vez de LOWORD para preservar posições negativas.",
      WM_DESTROY: "A janela já está sendo destruída. A top-level principal costuma chamar PostQuitMessage; child windows não devem necessariamente encerrar o thread."
    },
    code: { language: "cpp", filename: "paint-state.cpp", source: `struct WindowState { POINT cursor{}; bool pressed{}; };

case WM_MOUSEMOVE:
    state.cursor = {GET_X_LPARAM(lParam), GET_Y_LPARAM(lParam)};
    InvalidateRect(hwnd, nullptr, FALSE);
    return 0;
case WM_LBUTTONDOWN:
    state.pressed = true;
    SetCapture(hwnd);
    InvalidateRect(hwnd, nullptr, FALSE);
    return 0;
case WM_LBUTTONUP:
    state.pressed = false;
    ReleaseCapture();
    return 0;`, explanation: "Input altera o modelo e invalida; WM_PAINT desenha cursor/estado. Capture mantém o drag mesmo quando o pointer sai do client area." },
    mechanics: [{ title: "Receber evento", detail: "Window manager enfileira ou envia mensagem com payload definido." }, { title: "Atualizar modelo", detail: "WndProc converte WPARAM/LPARAM em estado tipado e bounded." }, { title: "Invalidar", detail: "Marque apenas a região que mudou; o sistema combina invalidations." }, { title: "Pintar", detail: "WM_PAINT reconstrói pixels a partir do modelo, independente da sequência passada." }],
    invariants: ["Paint nunca é a única cópia do estado.", "BeginPaint e EndPaint ocorrem no mesmo path.", "Mouse capture e recursos temporários são liberados em cancelamento/destruição."],
    pitfalls: [{ title: "Salvar HDC de BeginPaint", detail: "Sua validade é limitada ao paint cycle; adquira o contexto conforme a API apropriada." }, { title: "Tratar WM_CLOSE como WM_DESTROY", detail: "WM_CLOSE pode ser cancelado para confirmar; DestroyWindow inicia o teardown e WM_DESTROY observa o fim." }],
    practice: { prompt: "Crie um monitor visual de mensagens.", tasks: ["Registre create/paint/size/key/mouse/close/destroy.", "Implemente repaint orientado a estado.", "Adicione um editor de texto simples com caret/focus."], evidence: "Timeline de mensagens e gravação mostrando resize/input sem flicker ou busy loop." }
  }),

  "win-process": guide({
    thesis: "Um processo Windows combina objeto kernel, virtual address space, token, handle table e um ou mais threads; o ID identifica, enquanto o HANDLE concede acesso específico e lifetime de referência.",
    context: [
      "CreateProcessW cria process e primary thread, devolvendo handles e IDs em PROCESS_INFORMATION. Command line é mutável e parsing depende do programa alvo; executable path e arguments devem ser construídos sem ambiguidade.",
      "OpenProcess pede access rights e pode falhar por proteção ou política. GetCurrentProcess devolve pseudo-handle; GetCurrentProcessId e GetProcessId lidam com IDs, que podem ser reutilizados após término."
    ],
    flow: ["EXE path + token", "CreateProcess", "process object", "address space + handle table", "primary thread", "loader entry"],
    topicNotes: {
      CreateProcess: "Passe lpApplicationName explícito quando possível, buffer mutável para command line e defina inheritance conscientemente. Feche hProcess e hThread quando não precisar mais.",
      OpenProcess: "Solicite somente rights necessários, como PROCESS_QUERY_LIMITED_INFORMATION ou SYNCHRONIZE. Um PID válido não implica autorização.",
      GetProcessId: "GetProcessId converte um process handle válido em ID; o handle mantém referência ao objeto específico e evita confusão quando IDs são reciclados.",
      handles: "Handle table é por processo. DuplicateHandle transfere uma referência sob rights; inheritance só ocorre para handles marcados e quando criação permite.",
      modules: "O loader mapeia EXE e DLLs no address space. Module enumeration é uma visão momentânea e pode mudar com LoadLibrary/FreeLibrary."
    },
    code: { language: "cpp", filename: "spawn.cpp", source: `STARTUPINFOW si{sizeof(si)};
PROCESS_INFORMATION pi{};
wchar_t command[] = L"child.exe --mode lab";

if (!CreateProcessW(L"child.exe", command, nullptr, nullptr, FALSE,
        CREATE_UNICODE_ENVIRONMENT, nullptr, nullptr, &si, &pi))
    throw_last_error();

CloseHandle(pi.hThread);
WaitForSingleObject(pi.hProcess, 5000);
CloseHandle(pi.hProcess);`, explanation: "O exemplo não herda handles e separa executable path da command line. Produção deve tratar timeout sem usar TerminateProcess como cleanup normal." },
    mechanics: [{ title: "Criar objeto", detail: "Kernel cria process, address space, handle table, token association e primary thread suspenso durante setup." }, { title: "Carregar imagem", detail: "Loader mapeia PE, dependências, relocations e inicialização do runtime." }, { title: "Executar", detail: "Primary thread chega ao entry point e scheduler distribui seus quanta." }, { title: "Sinalizar término", detail: "Process object fica signaled, exit code permanece consultável enquanto handles o referenciam." }],
    invariants: ["Executable path/arguments não permitem interpretação ambígua.", "Handle rights seguem least privilege.", "Todos os handles devolvidos têm ownership e close definidos."],
    pitfalls: [{ title: "Confundir ID e handle", detail: "PID é nome reciclável; HANDLE é referência com rights ao objeto enquanto válido." }, { title: "TerminateProcess como rotina", detail: "Interrompe sem unwind/DLL cleanup e pode deixar estado externo inconsistente; reserve a containment excepcional." }],
    practice: { prompt: "Construa um process explorer educacional próprio.", tasks: ["Inicie um child conhecido.", "Mostre PID, handles próprios, modules e exit code.", "Implemente cancelamento cooperativo por event/pipe."], evidence: "Lifecycle completo e nenhuma herança/handle leak não intencional." }
  }),

  "win-threads": guide({
    thesis: "Threads compartilham address space e por isso precisam de happens-before explícito; waits e primitives sincronizam estado, mas cada uma possui ownership e semântica próprias.",
    context: [
      "CreateThread cria thread nativo, porém código que depende do CRT pode preferir std::thread/_beginthreadex. ExitThread encerra apenas o thread; retornar da rotina permite cleanup normal daquele frame.",
      "Mutex tem ownership e abandono, semaphore conta recursos, event representa condição manual/auto-reset e CriticalSection protege apenas threads do mesmo processo com caminho user-mode eficiente."
    ],
    flow: ["shared state", "synchronization object", "wait", "scheduler block/wake", "critical operation", "release/signal"],
    topicNotes: {
      CreateThread: "A start routine recebe LPVOID e retorna DWORD. O argumento precisa viver até ser consumido e o returned HANDLE deve ser fechado separadamente do término.",
      WaitForSingleObject: "Wait pode retornar signaled, timeout, abandoned ou failure. GUI threads não devem bloquear indefinidamente sem bombear messages; use MsgWaitForMultipleObjects quando necessário.",
      mutex: "Mutex kernel pode sincronizar processos e tem owner; WAIT_ABANDONED significa que estado protegido pode estar inconsistente e exige recuperação.",
      "event / semaphore": "Event sinaliza condição; auto-reset libera um waiter, manual-reset permanece signaled. Semaphore decrementa contagem em wait e incrementa em release.",
      CriticalSection: "CriticalSection é intra-processo e deve ser inicializada/destruída. Recursive acquisition pelo owner é permitida, mas pode esconder design confuso."
    },
    code: { language: "cpp", filename: "worker.cpp", source: `struct Shared {
    HANDLE stop_event;
    CRITICAL_SECTION lock;
    std::vector<int> results;
};

DWORD WINAPI worker(void *arg) {
    auto &s = *static_cast<Shared *>(arg);
    while (WaitForSingleObject(s.stop_event, 0) == WAIT_TIMEOUT) {
        int value = compute_one();
        EnterCriticalSection(&s.lock);
        s.results.push_back(value);
        LeaveCriticalSection(&s.lock);
    }
    return 0;
}`, explanation: "O event dá cancelamento cooperativo; a critical section protege apenas a mutação curta. O owner aguarda e fecha thread/event após garantir lifetimes." },
    mechanics: [{ title: "Publicar trabalho", detail: "Dados são preparados antes de tornar a tarefa visível ao worker." }, { title: "Esperar", detail: "Kernel ou primitive user-mode bloqueia sem spinning ilimitado." }, { title: "Acordar", detail: "Signal/release muda estado e torna waiters elegíveis ao scheduler." }, { title: "Sincronizar memória", detail: "Acquire/release da primitive estabelece ordering necessário para os dados protegidos." }],
    invariants: ["Todo shared mutable state tem uma política de sincronização.", "Lock ordering global evita ciclo de espera.", "Thread não sobrevive aos objetos que acessa."],
    pitfalls: [{ title: "Sleep como sincronização", detail: "Timing não cria happens-before e falha sob carga; espere um estado/evento real." }, { title: "Wait infinito no UI thread", detail: "A queue para de responder e pode deadlockar SendMessage; integre messages ou use async completion." }],
    practice: { prompt: "Implemente fila producer/consumer no Windows.", tasks: ["Use event/semaphore e CriticalSection.", "Adicione shutdown e WaitForMultipleObjects.", "Demonstre uma race e um deadlock controlados, depois corrija."], evidence: "Stress test, lock-order documentada e zero threads/handles vivos ao sair." }
  }),

  "win-memory": guide({
    thesis: "VirtualAlloc gerencia regiões/páginas do address space; HeapAlloc gerencia blocos menores sobre regiões. Reserve, commit e protection são estados diferentes que VirtualQuery torna observáveis.",
    context: [
      "MEM_RESERVE escolhe uma faixa de VAs; MEM_COMMIT garante backing lógico que pode ser demand-zero. VirtualFree com MEM_RELEASE libera a região inteira e exige size zero; MEM_DECOMMIT preserva a reserva.",
      "PAGE_READONLY/READWRITE/EXECUTE_* definem acesso por página. VirtualProtect retorna a proteção anterior e deve ser acompanhado de FlushInstructionCache quando código recém-gravado passa a ser executado. Evite PAGE_EXECUTE_READWRITE."
    ],
    flow: ["reserve VA", "commit pages", "set protection", "MMU access", "VirtualQuery state", "decommit/release"],
    topicNotes: {
      VirtualAlloc: "VirtualAlloc arredonda por allocation granularity/page size conforme operação. Reserve grandes arenas e commit sob demanda quando a política de memória justificar.",
      VirtualProtect: "Só altera pages committed e opera por páginas inteiras. Uma subrange pode afetar objetos vizinhos na mesma página; preserve old protection.",
      VirtualQuery: "VirtualQuery agrupa páginas consecutivas com State, Protect, Type e AllocationBase iguais. Percorra usando RegionSize e valide overflow do próximo address.",
      HeapAlloc: "HeapAlloc usa um process/private heap e retorna bloco; HeapFree exige o mesmo heap. HEAP_ZERO_MEMORY inicializa, mas não substitui lifetime/RAII.",
      "PAGE_*": "PAGE_READONLY, PAGE_READWRITE, PAGE_EXECUTE, PAGE_EXECUTE_READ e PAGE_EXECUTE_READWRITE representam combinations; guard e cache modifiers acrescentam semântica."
    },
    code: { language: "cpp", filename: "virtual-region.cpp", source: `SYSTEM_INFO info{};
GetSystemInfo(&info);
void *region = VirtualAlloc(nullptr, info.dwPageSize * 4,
    MEM_RESERVE, PAGE_NOACCESS);
if (!region) throw_last_error();

void *page = VirtualAlloc(region, info.dwPageSize,
    MEM_COMMIT, PAGE_READWRITE);
if (!page) { VirtualFree(region, 0, MEM_RELEASE); throw_last_error(); }

VirtualFree(region, 0, MEM_RELEASE);`, explanation: "Reserva quatro páginas e compromete apenas a primeira. O visualizer deve mostrar BaseAddress, AllocationBase, RegionSize, State e Protect antes/depois." },
    mechanics: [{ title: "Reservar", detail: "Memory manager registra uma Virtual Address Descriptor para a faixa." }, { title: "Comprometer", detail: "Commit contabiliza backing e configura demanda-zero; frame físico pode surgir no primeiro touch." }, { title: "Proteger", detail: "Page-table attributes controlam leitura, escrita e execução via MMU/TLB." }, { title: "Liberar", detail: "Decommit remove backing mantendo VA; release remove toda a reserva." }],
    invariants: ["Operações respeitam page size, allocation base e state.", "Código e dados não permanecem W+X.", "Heap blocks retornam ao heap que os criou; regions retornam por VirtualFree."],
    pitfalls: [{ title: "MEM_RELEASE com size", detail: "Para liberar uma reserved region inteira, address é AllocationBase e dwSize deve ser zero." }, { title: "Confundir commit com RAM residente", detail: "Commit é garantia lógica; residency muda com working set e paginação." }],
    practice: { prompt: "Expanda o Virtual Memory Visualizer.", tasks: ["Percorra o próprio process com VirtualQuery.", "Classifique free/reserve/commit e protections.", "Demonstre guard/noaccess em região controlada."], evidence: "Mapa ordenado, transições antes/depois e faults tratados no laboratório." }
  }),

  "win-files": guide({
    thesis: "Windows File API trata arquivos, diretórios, devices e pipes como handles; acesso, sharing, creation disposition, offset e completion formam um único contrato de I/O.",
    context: [
      "CreateFileW escolhe desired access, share modes e como criar/abrir. Negar sharing desnecessariamente causa conflitos; permitir demais pode quebrar invariantes. O retorno inválido é INVALID_HANDLE_VALUE.",
      "ReadFile/WriteFile podem completar parcialmente conforme handle/tipo e modo. File pointer implícito pertence ao handle síncrono; OVERLAPPED carrega offsets próprios para operações assíncronas."
    ],
    flow: ["path + access/share", "CreateFile", "HANDLE", "I/O manager", "filesystem driver/cache", "storage"],
    topicNotes: {
      CreateFile: "Use versão W, path validado e flags explícitas. Diretórios exigem FILE_FLAG_BACKUP_SEMANTICS para abertura; devices compartilham a mesma entry API.",
      ReadFile: "lpNumberOfBytesRead informa bytes reais em I/O síncrono. EOF pode ser sucesso com zero bytes; named pipes e async têm contratos adicionais.",
      WriteFile: "Trate bytes written e faça loop quando o protocolo exige escrever tudo. Durabilidade pode exigir FlushFileBuffers, com custo e sem promessa além do stack/storage.",
      SetFilePointer: "SetFilePointerEx evita ambiguidade de 32 bits e move o pointer do handle. Operações overlapped devem usar offsets no OVERLAPPED, não compartilhar cursor mutável.",
      directories: "CreateDirectoryW, RemoveDirectoryW, CopyFileW, MoveFileExW e DeleteFileW têm semântica própria; reparse points e canonicalization importam na segurança de paths."
    },
    code: { language: "cpp", filename: "binary-reader.cpp", source: `HANDLE file = CreateFileW(path, GENERIC_READ, FILE_SHARE_READ,
    nullptr, OPEN_EXISTING, FILE_FLAG_SEQUENTIAL_SCAN, nullptr);
if (file == INVALID_HANDLE_VALUE) throw_last_error();

std::array<std::byte, 4096> block;
for (;;) {
    DWORD got = 0;
    if (!ReadFile(file, block.data(), (DWORD)block.size(), &got, nullptr))
        throw_last_error();
    if (got == 0) break;
    consume(std::span(block).first(got));
}
CloseHandle(file);`, explanation: "O consumer recebe apenas os bytes efetivamente lidos. Um wrapper RAII garante CloseHandle também durante exceção." },
    mechanics: [{ title: "Resolver path", detail: "Object manager/I/O manager convertem nome em volume, filesystem e file object." }, { title: "Autorizar/compartilhar", detail: "Access token e existing share modes determinam se open é permitido." }, { title: "Executar I/O", detail: "Cache manager/filesystem/driver satisfazem ou encaminham IRPs ao device." }, { title: "Completar", detail: "Resultado síncrono retorna; overlapped sinaliza event/IOCP com status e bytes." }],
    invariants: ["Path permanece dentro do escopo após canonicalization e reparse policy.", "Todo loop usa bytes reais e limita tamanho total.", "Handle é fechado após cancelar/observar completions pendentes."],
    pitfalls: [{ title: "Assumir GetFileSize imutável", detail: "Outro actor pode alterar o arquivo; trate size como snapshot e reads como fonte final." }, { title: "File watcher como audit log", detail: "Notifications podem coalescer/overflow; reenumere e mantenha estratégia de reconciliação." }],
    practice: { prompt: "Construa binary reader, hex viewer e file watcher.", tasks: ["Implemente offsets de 64 bits e leitura parcial.", "Adicione copy/move com erros claros.", "Force overflow do watcher e reconcilie."], evidence: "Testes com empty/large/mutating files e fechamento limpo de handles." }
  }),

  "win-dll": guide({
    thesis: "DLLs compartilham código e exports em runtime; o loader mapeia a imagem, resolve imports e mantém referência, enquanto LoadLibrary/GetProcAddress tornam essa ligação explícita.",
    context: [
      "Static linking copia código de library para o executable; import linking registra DLL/symbols para resolução no load; runtime linking procura módulo e export durante execução. A assinatura C/ABI precisa coincidir em ambos os lados.",
      "DllMain roda sob loader lock e deve fazer trabalho mínimo. Search path inseguro pode carregar um nome da localização errada; use paths controlados e APIs/policies de search modernas."
    ],
    flow: ["DLL path", "LoadLibrary", "map PE", "resolve imports/relocations", "GetProcAddress", "typed call", "FreeLibrary"],
    topicNotes: {
      LoadLibrary: "LoadLibraryExW oferece flags de search mais explícitas. O returned HMODULE incrementa reference count e precisa de FreeLibrary quando owned.",
      GetProcAddress: "Procura nome ASCII exato ou ordinal. FARPROC deve ser convertido para function pointer com calling convention e assinatura corretas.",
      FreeLibrary: "Decrementa referência; quando chega a zero, detach/unmap pode ocorrer. Nenhum code/data pointer da DLL pode ser usado depois.",
      "import table": "Import descriptors e thunks declaram DLL/name/ordinal; loader preenche IAT com endereços. Delay-load adia resolução, mas adiciona seu próprio failure path.",
      "DLL search path": "Evite current directory e PATH ambíguos. Use absolute path, SetDefaultDllDirectories/AddDllDirectory e LOAD_LIBRARY_SEARCH_* conforme deployment."
    },
    code: { language: "cpp", filename: "plugin-loader.cpp", source: `using version_fn = unsigned (WINAPI *)();
HMODULE module = LoadLibraryExW(full_path, nullptr,
    LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR | LOAD_LIBRARY_SEARCH_DEFAULT_DIRS);
if (!module) throw_last_error();

auto version = reinterpret_cast<version_fn>(GetProcAddress(module, "lab_version"));
if (!version) { FreeLibrary(module); throw_last_error(); }
unsigned value = version();
FreeLibrary(module);`, explanation: "Export use extern \"C\" para nome estável e uma ABI/version function. Produção envolve HMODULE em RAII e mantém module vivo enquanto function pointers existirem." },
    mechanics: [{ title: "Localizar", detail: "Loader resolve nome pela política de search e evita carregar novamente módulo já referenciado." }, { title: "Mapear", detail: "Sections recebem protections, relocations aplicam base e dependências são carregadas." }, { title: "Resolver", detail: "Exports alimentam IAT ou GetProcAddress retorna endereço tipado pelo caller." }, { title: "Descarregar", detail: "Reference count cai; TLS/destructors/detach executam sob regras restritas antes de unmap." }],
    invariants: ["Path de DLL é confiável e política de search é explícita.", "Assinatura, calling convention e version ABI coincidem.", "Module vive mais que todos os pointers/objects fornecidos por ele."],
    pitfalls: [{ title: "Trabalho complexo em DllMain", detail: "Loader lock pode deadlockar LoadLibrary, waits e inicializações indiretas; ofereça init explícito." }, { title: "FreeLibrary prematuro", detail: "Function pointer não mantém module vivo; uma call posterior salta para memória unmapped." }],
    practice: { prompt: "Crie DLL e host próprios com runtime linking.", tasks: ["Exporte versão e uma função C.", "Valide ABI e erro de symbol ausente.", "Demonstre search seguro e unload ordenado."], evidence: "Build x64 reproduzível, dump de exports/imports e testes de versão incompatível." }
  }),

  "win-pe": guide({
    thesis: "Portable Executable descreve como uma imagem Windows sai do disco para o address space: headers validam arquitetura, sections mapeiam conteúdo e directories apontam imports, exports, resources e relocations.",
    context: [
      "O DOS header contém e_lfanew para a assinatura PE. Depois vêm COFF File Header, Optional Header PE32/PE32+ e Section Table. SizeOfImage, SectionAlignment e FileAlignment governam layouts distintos.",
      ".text costuma ser código, .data dados mutáveis, .rdata constantes/import data, .bss aparece como zero-fill virtual, .rsrc recursos e .reloc base relocations. Nomes são convenção; flags e directories são autoridade."
    ],
    flow: ["DOS header", "PE signature/COFF", "optional header", "section table", "data directories", "mapped image/entry point"],
    topicNotes: {
      "PE headers": "Valide MZ, e_lfanew, PE\\0\\0, Machine, NumberOfSections, optional magic e tamanhos antes de acessar qualquer tabela.",
      ".text/.data/.rdata": "IMAGE_SECTION_HEADER define VirtualAddress/VirtualSize, raw offset/size e Characteristics. Mapping pode incluir zero-fill além de raw data.",
      "RVA / VA": "RVA é relativo a ImageBase; VA = loaded base + RVA. File offset vem da section cujo virtual range contém o RVA, não de soma direta com a base.",
      "imports / exports": "Import directory lista dependencies e thunks; export directory mapeia ordinals/names/functions. Forwarded export aponta texto para outro module/symbol.",
      "resources / relocations": "Resources formam árvores type/name/language. Base reloc blocks ajustam addresses quando image não carrega no preferred ImageBase."
    },
    code: { language: "cpp", filename: "pe-bounds.cpp", source: `bool range_inside(std::size_t offset, std::size_t length, std::size_t file_size) {
    return offset <= file_size && length <= file_size - offset;
}

// Só depois de validar e_lfanew:
auto nt_offset = static_cast<std::size_t>(dos.e_lfanew);
if (!range_inside(nt_offset, sizeof(uint32_t) + sizeof(IMAGE_FILE_HEADER), bytes.size()))
    return ParseError::truncated_nt_headers;`, explanation: "Parsers usam aritmética subtrativa e memcpy para estruturas locais, evitando unaligned dereference e offsets fora do arquivo." },
    mechanics: [{ title: "Validar", detail: "Magic, offsets, counts, multiplication e ranges são checados progressivamente." }, { title: "Traduzir", detail: "RVA encontra section virtual e vira raw offset quando possui dados no arquivo." }, { title: "Interpretar directory", detail: "Cada directory tem layout, sentinels e bounds próprios dentro da image." }, { title: "Visualizar", detail: "PE Explorer separa file offset, RVA e VA e liga cada row aos bytes de origem." }],
    invariants: ["Nenhum pointer é formado antes de validar o range completo.", "Section overlap/overflow é rejeitado ou sinalizado.", "O explorer nunca carrega/executa o PE analisado."],
    pitfalls: [{ title: "reinterpret_cast do arquivo", detail: "Alinhamento, packing e truncamento tornam isso frágil; copie campos após bounds check." }, { title: "Confiar em section name", detail: "Malware e packers podem renomear; use Characteristics, mappings e directories — sempre em amostras autorizadas." }],
    practice: { prompt: "Construa um PE Explorer read-only.", tasks: ["Mostre headers/sections e hex selection.", "Resolva imports/exports e RVA↔offset.", "Liste resources/relocations com inputs truncados testados."], evidence: "Comparação com dumpbin e corpus que prova rejeição segura sem crash." }
  }),

  "win-native": guide({
    thesis: "Win32, Native API e syscall são camadas diferentes: a aplicação depende do contrato documentado; ntdll adapta serviços internos; o kernel implementa objetos e subsistemas que podem mudar entre versões.",
    context: [
      "Uma chamada Win32 pode ser resolvida em KernelBase/Kernel32, converter argumentos e chamar uma função Nt*/Zw* em ntdll. O stub então realiza a transição; kernel valida e despacha para executive, I/O manager, memory manager ou driver.",
      "Nem toda Win32 call vira syscall e uma call pode causar várias. Syscall IDs Windows não são API estável e variam por architecture/build, por isso material educacional mostra a cadeia sem hard-code."
    ],
    flow: ["Application", "Win32 API", "KernelBase/ntdll", "Native API", "syscall", "Kernel executive/driver"],
    topicNotes: {
      "Win32 API": "É o contrato de aplicação documentado, com HANDLE, BOOL, GetLastError e compatibilidade de longo prazo. Use a camada mais alta que oferece o controle necessário.",
      ntdll: "ntdll contém runtime user-mode, loader e stubs Native API. Está presente em todos os processos normais, mas seus detalhes internos não são todos contratos de app.",
      "Native API": "Funções Nt* usam NTSTATUS e estruturas como UNICODE_STRING/OBJECT_ATTRIBUTES. Use diretamente apenas quando oficialmente documentado para o cenário.",
      syscall: "Stub coloca identificador/argumentos conforme ABI daquele build e executa syscall. Hooks, mitigations e WOW64 podem mudar o caminho observável.",
      kernel: "Kernel mode separa system service dispatch de subsistemas como object, process, memory e I/O managers; drivers atendem operações de devices/filesystems."
    },
    code: { language: "text", filename: "win32-trace.txt", source: `CreateFileW(path, access, share, ...)
  -> Win32 validation / path adaptation
  -> ntdll Native API boundary (NTSTATUS)
  -> system-service transition (build-specific)
  -> Object Manager + I/O Manager
  -> filesystem / device driver
  <- HANDLE or INVALID_HANDLE_VALUE + translated error`, explanation: "O diagrama preserva contratos estáveis e mostra onde status muda de domínio. Não depende de offsets ou números internos." },
    mechanics: [{ title: "Adaptar", detail: "Win32 normaliza sua representação e prepara estruturas do nível inferior." }, { title: "Transicionar", detail: "Stub entra em kernel por mecanismo da arquitetura/build." }, { title: "Validar/despachar", detail: "Kernel captura input, verifica access e encaminha ao manager/driver correto." }, { title: "Traduzir retorno", detail: "NTSTATUS pode virar Win32 return + last error segundo o wrapper." }],
    invariants: ["Código de aplicação não depende de syscall number fixo.", "Status é interpretado antes de ser traduzido/descartado.", "Observação interna é versionada e não tratada como contrato público."],
    pitfalls: [{ title: "Chamar tudo de syscall", detail: "Message helpers, math e várias APIs resolvem inteiramente em user mode ou agregam múltiplos serviços." }, { title: "Contornar Win32 sem necessidade", detail: "Você assume versioning, structures e status mais frágeis sem ganho para a maioria dos apps." }],
    practice: { prompt: "Trace três APIs por documentação e ferramentas do próprio sistema.", tasks: ["Escolha uma user-only, uma kernel service e uma I/O.", "Marque mudanças de error domain.", "Compare duas versões sem fixar IDs."], evidence: "Diagramas versionados com fontes/observações e distinção contrato vs implementação." }
  }),

  "win-graphics": guide({
    thesis: "No desktop Windows, HWND ancora a superfície; DXGI negocia adapter, format e swapchain; Direct3D produz imagens; DWM compõe a apresentação com o restante do desktop.",
    context: [
      "A client area muda com DPI, resize, minimize e display transitions. O renderer reage a WM_SIZE sem manter resources antigos em uso e cria buffers na dimensão física correta.",
      "Swapchain não é o monitor: é um conjunto de presentable buffers associado ao HWND/compositor. Present agenda entrega e pode bloquear por frame latency, VSync ou pressão da queue."
    ],
    flow: ["C++ app", "HWND", "DXGI swapchain", "Direct3D commands", "driver/GPU", "DWM composition", "display"],
    topicNotes: {
      HWND: "O HWND fornece window ownership, size, DPI e message lifecycle. Renderer não deve usar o handle depois de WM_NCDESTROY e precisa tolerar zero-sized minimize.",
      DXGI: "DXGI enumera adapters/outputs, formatos e cria swapchains. Factory/device devem apontar ao mesmo adapter e debug layer ajuda a detectar misuse.",
      Direct3D: "D3D11 gerencia mais estado implicitamente; D3D12 expõe queues, heaps, barriers e fences. Ambos convertem pipeline/resources em commands para driver/GPU.",
      swapchain: "Flip model é o caminho moderno. ResizeBuffers exige liberar references aos back buffers e aguardar/organizar trabalho em flight conforme API.",
      DWM: "Desktop Window Manager compõe surfaces de janelas. Present envia conteúdo ao sistema de composição; fullscreen/borderless e tearing mudam políticas, não removem toda a cadeia."
    },
    code: { language: "cpp", filename: "resize.cpp", source: `void Renderer::resize(UINT width, UINT height) {
    if (width == 0 || height == 0) return;
    wait_for_gpu_if_explicit_api();
    release_back_buffer_views();
    check(swapchain->ResizeBuffers(0, width, height,
        DXGI_FORMAT_UNKNOWN, current_flags));
    acquire_back_buffers_and_recreate_views();
}`, explanation: "O resize é uma resource lifetime transition. D3D12 precisa provar que GPU terminou; D3D11 ainda exige soltar referências antes de ResizeBuffers." },
    mechanics: [{ title: "Criar plataforma", detail: "Win32 fornece HWND e message loop DPI-aware." }, { title: "Negociar apresentação", detail: "DXGI seleciona adapter, format, buffer count e present flags." }, { title: "Renderizar", detail: "Direct3D grava comandos que produzem o back buffer no estado correto." }, { title: "Compor", detail: "Present e DWM coordenam quando a imagem entra no desktop/display." }],
    invariants: ["Back buffer size acompanha client pixels e DPI policy.", "Nenhum resource é destruído enquanto CPU/GPU ainda o usa.", "Present mode/tearing/VSync obedecem capabilities consultadas."],
    pitfalls: [{ title: "Renderizar durante minimize", detail: "Dimensão zero e occlusion exigem pausar/reduzir trabalho até a janela voltar." }, { title: "Resize dentro de qualquer callback", detail: "Evite reentrancy e recursos in flight; registre tamanho e faça transição no ponto controlado do frame." }],
    practice: { prompt: "Conecte uma janela Win32 ao Graphics Playground.", tasks: ["Crie HWND DPI-aware.", "Implemente swapchain e resize seguro.", "Registre frame latency, present result e eventos DWM."], evidence: "Resize/minimize/multi-DPI estáveis e timeline CPU → GPU → Present." }
  })
};
