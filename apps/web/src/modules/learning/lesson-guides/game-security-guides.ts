import { guide, type GuideMap } from "./types";

export const gameSecurityGuides: GuideMap = {
  "gsec-fundamentals": guide({
    thesis: "Um cheat não é magia: é um programa que lê ou altera o mesmo estado que o jogo já mantém em memória. Pesquisa educacional começa no processo do laboratório — game state, entities e o loop que os atualiza — nunca em títulos online de terceiros.",
    context: [
      "O jogo educacional da plataforma é um processo como qualquer outro: threads, páginas, estruturas C++ e um loop que lê input, atualiza física e apresenta um frame. Coordenadas, health e câmera existem como bytes com tipo e lifetime.",
      "Ferramentas de pesquisa só observam esse processo próprio. A trilha ensina arquitetura para defender o estado, não para obter vantagem em jogos alheios ou desativar anti-cheats reais."
    ],
    flow: ["game process", "memory pages", "game state", "entity update", "research view", "detection"],
    topicNotes: {
      "game state": "Game state é o conjunto de objetos vivos que o loop consulta: mundo, entidades, câmera, timers e flags. Não é um screenshot. É memória tipada que muda a cada tick e precisa de um owner — neste laboratório, o próprio Arena Lab.",
      "entity": "Uma entity é um registro com identidade, tipo e componentes (posição, health, flags). A lista de entidades é um array ou container apontado pelo GameState; índices inválidos e ponteiros nulos são bugs, não 'hacks'.",
      "player state": "Player state especializa a entity do controlador local: input acumulado, velocity, câmera e recursos. Separar 'o que o cliente mostra' de 'o que o servidor autoriza' é o primeiro invariante de segurança.",
      "game loop": "Input → Update → Physics → Game State → Render → Present → próximo frame. Cada seta tem um horário e um conjunto de escritas. Cheats e detecção disputam exatamente essas escritas.",
      "lab process": "O alvo prático é sempre um processo criado pela plataforma, com PID conhecido, módulos próprios e sandbox. Processos de terceiros, lojas e anti-cheats comerciais estão fora do contrato do laboratório."
    },
    code: {
      language: "cpp",
      filename: "lab_game_state.hpp",
      source: `struct Vec3 { float x, y, z; };

struct Player {
    Vec3 position;
    int health;
    int armor;
};

struct GameState {
    float time;
    Player* local;
    Player* entities;
    int entity_count;
};

void tick(GameState& state, float dt) {
    state.time += dt;
    if (state.local) {
        state.local->position.x += 0.0f; /* input applied in lab */
    }
}

/* Open Arena Lab: the live Player bytes belong to this process only. */`,
      explanation: "O estado é um grafo de ponteiros com tipos C++. A ferramenta de pesquisa lê o mesmo layout que o loop escreve; o anti-cheat do laboratório observa as mesmas escritas."
    },
    mechanics: [
      { title: "Nomear o processo", detail: "Identifique PID, módulos e o binário do Arena Lab antes de falar em memória. Sem processo próprio não há experimento autorizado." },
      { title: "Desenhar o estado", detail: "Liste objetos, owners e quem escreve cada campo por frame: input, física, rede ou UI. O diagrama precede qualquer inspeção de bytes." },
      { title: "Congelar um tick", detail: "Capture time, posição e health no mesmo instante. Comparar campos de frames diferentes inventa causalidade." },
      { title: "Separar observação e mutação", detail: "Ler estado para aprender layout é pesquisa. Escrever health no lab só existe para treinar detecção e correção, nunca como produto contra terceiros." }
    ],
    invariants: [
      "Todo exercício prático usa o jogo, o binário ou o processo do laboratório.",
      "Game state tem owner, lifetime e um único loop que o publica por frame.",
      "Ferramentas desta trilha são classificadas como RESEARCH / DEBUG TOOLS."
    ],
    pitfalls: [
      { title: "Confundir render com estado", detail: "O que aparece na tela é uma projeção atrasada. Health e posição 'reais' para o simulador vivem nas estruturas, não no framebuffer." },
      { title: "Tratar qualquer jogo como laboratório", detail: "Títulos online e anti-cheats reais não são alvos. Usá-los viola o contrato da plataforma e a autorização legal." }
    ],
    practice: {
      prompt: "Mapeie o Arena Lab: processo, Player e o caminho até health.",
      tasks: [
        "Anote PID simbólico, endereço base do Player e os campos visíveis no inspector.",
        "Pause o loop, mova o personagem e registre quais campos mudaram no mesmo frame.",
        "Escreva o diagrama Game → Process → Memory → Game State → Research Tool."
      ],
      evidence: "Diagrama do fluxo, screenshot do inspector com health/x/y e a nota de que o processo é o Arena Lab."
    }
  }),

  "gsec-memory": guide({
    thesis: "O layout de uma struct C++ é o contrato entre o compilador e a CPU: offsets, alinhamento e região (stack, heap, global). Pesquisa de memória educacional observa esses bytes enquanto o lab game executa.",
    context: [
      "struct Player { float x,y,z; int health; } ocupa um bloco contíguo. O inspector mostra endereço base, cada campo e o valor ao vivo. Stack, heap e globais diferem em lifetime, não em 'serem memória'.",
      "Offsets mudam com recompilação, packing, herança e builds. Um número decorado de um tutorial externo não é evidência; o laboratório mede o layout da versão atual do binário próprio."
    ],
    flow: ["struct definition", "compiler layout", "virtual address", "live bytes", "watch", "version note"],
    topicNotes: {
      "Player layout": "x em +0x00, y em +0x04, z em +0x08, health em +0x0C, armor em +0x10 — neste binário educacional. Cada float são 4 bytes little-endian; health é int32. Padding pode existir se o compilador alinhar para 8.",
      "stack heap globals": "Automáticos morrem com o frame; heap vive até delete/free; globais/statics têm lifetime do módulo. Um ponteiro 'estável' em um build pode ser um global; em outro, um membro no heap.",
      "live inspection": "O Memory Inspector relê o bloco a cada tick. Alterar health pelo jogo atualiza os bytes; alterar pelos botões de pesquisa dispara o Mini Anti-Cheat para treinar detecção.",
      "watchpoints": "Um watch educacional dispara quando o endereço do campo muda. Serve para responder 'quem escreveu health neste frame?', não para esconder a escrita de um produto real.",
      "version offsets": "Mudou o compilador, um campo ou o packing e os offsets quebram. Documente hash do binário, sizeof e offsetof a cada build do laboratório."
    },
    code: {
      language: "cpp",
      filename: "player_layout.cpp",
      source: `#include <cstddef>
#include <cstdio>

struct Player {
    float x;
    float y;
    float z;
    int health;
    int armor;
};

static_assert(offsetof(Player, x) == 0);
static_assert(offsetof(Player, health) == 12);

void dump_layout() {
    std::printf("sizeof=%zu health@+%zu\\n",
                sizeof(Player), offsetof(Player, health));
}`,
      explanation: "offsetof é a evidência do layout nesta compilação. O laboratório mostra o mesmo mapa em hexadecimal enquanto o loop corre."
    },
    mechanics: [
      { title: "Fixar o tipo", detail: "Declare a struct, sizeof e alinhamento antes de interpretar bytes. Sem tipo, um dump é só um vetor de números." },
      { title: "Medir offsets", detail: "Use offsetof ou o inspector do Arena Lab. Anote +0x00…+0x10 e o endian. Não copie offsets de outra versão." },
      { title: "Escolher a região", detail: "Classifique o bloco como stack, heap ou global e registre o lifetime. Watchpoints em stack morta mentem." },
      { title: "Observar a escrita", detail: "Cause uma mudança pelo input do jogo e confirme os bytes. Depois provoque uma mutação de pesquisa e compare o evento do Mini Anti-Cheat." }
    ],
    invariants: [
      "Interpretação de memória sempre cita tipo, sizeof e build.",
      "Watchpoints observam o processo do laboratório, não processos alheios.",
      "Mutação existe para gerar telemetria de detecção, não para 'vencer' o jogo."
    ],
    pitfalls: [
      { title: "Acreditar em offsets eternos", detail: "Um patch, um campo extra ou #pragma pack desloca health. Sem hash do binário o mapa é hipótese vencida." },
      { title: "Confundir valor e endereço", detail: "0x42 pode ser health ou um byte de um float. O inspector colorido por campo existe para impedir essa leitura crua." }
    ],
    practice: {
      prompt: "Prove o layout de Player no Arena Lab com o processo em execução.",
      tasks: [
        "Preencha a tabela +0x00 X … +0x10 Armor com valores vivos.",
        "Mova o player e marque quais offsets mudam no mesmo frame.",
        "Ative um watch em health e descreva quem escreveu (loop vs poke de pesquisa)."
      ],
      evidence: "Tabela de offsets, dois dumps (antes/depois) e o evento de watch com origem da escrita."
    }
  }),

  "gsec-pointers": guide({
    thesis: "Estado de jogo real quase nunca é um único bloco: é uma cadeia de ponteiros com offsets. Descobrir GameState → PlayerManager → Player → Position é engenharia de layout no binário próprio.",
    context: [
      "Ponteiros, aritmética, structs aninhadas, arrays e alocação dinâmica produzem caminhos de vários níveis. Cada seta é um load; cada +N é um offset no objeto apontado.",
      "O Pointer Chain Lab desenha a cadeia com endereços educacionais. O exercício é reconstruir o grafo, não 'achar o pointer map de um jogo da Steam'."
    ],
    flow: ["base pointer", "offset", "load", "nested object", "leaf field", "rebuild layout"],
    topicNotes: {
      "pointer chains": "Uma cadeia é base + offset0 → load → +offset1 → load → campo. Quebrar qualquer load (nullptr, página inválida) aborta a leitura. O laboratório mostra cada seta e o valor carregado.",
      "nested structs": "Position pode ser membro por valor (offset fixo) ou ponteiro (indireção extra). O layout decide quantos loads existem até X/Y/Z.",
      "offsets": "Offsets são deslocamentos dentro do objeto atual, não endereços absolutos. +0x20 em GameState não é o mesmo +0x20 em Player.",
      "multi-level pointers": "Dois ou mais loads encadeados. Arrays no meio exigem índice * stride. O laboratório permite escolher o índice da entity list.",
      "layout discovery": "Dado o binário próprio, o aluno infere tipos a partir de padrões: floats que mudam com movimento, int que cai com dano, ponteiros alinhados em 8."
    },
    code: {
      language: "cpp",
      filename: "pointer_chain.cpp",
      source: `struct Position { float x, y, z; };
struct Player { Position pos; int health; };
struct PlayerManager { Player** list; int count; };
struct GameState { PlayerManager* managers; };

float read_x(const GameState* gs, int index) {
    if (!gs || !gs->managers) return 0;
    PlayerManager* pm = gs->managers;
    if (index < 0 || index >= pm->count || !pm->list) return 0;
    Player* p = pm->list[index];
    return p ? p->pos.x : 0;
}`,
      explanation: "Cada seta do diagrama é um teste de nulo mais um load. A função de pesquisa no lab replica essa cadeia com endereços visíveis."
    },
    mechanics: [
      { title: "Partir da base", detail: "Marque o ponteiro estável do GameState neste build. Sem base, offsets seguintes não têm origem." },
      { title: "Aplicar um offset por vez", detail: "Some, leia o ponteiro, verifique alinhamento e só então avance. Pular níveis esconde o load que falha." },
      { title: "Nomear o objeto intermediário", detail: "Dê tipo a cada nó (Manager, Player, Position). Cadeias anônimas não sobrevivem à próxima compilação." },
      { title: "Validar com mutação controlada", detail: "Mova só o player 0 e confirme que apenas essa folha muda. Se X de outro índice mudar, o stride/índice está errado." }
    ],
    invariants: [
      "Cada load da cadeia é testado contra nulo e faixa.",
      "Offsets são relativos ao objeto corrente e versionados com o binário.",
      "Descoberta de layout usa somente o programa do laboratório."
    ],
    pitfalls: [
      { title: "Copiar cadeias de fóruns", detail: "Pointer maps de jogos alheios descrevem outro binário, outra ABI e outra autorização. Aqui a cadeia é medida no Arena Lab." },
      { title: "Tratar array como ponteiro simples", detail: "list[i] é base + i*stride. Esquecer o stride lê o player errado ou bytes no meio de um objeto." }
    ],
    practice: {
      prompt: "Reconstrua GameState → PlayerManager → Player → Position → X no Pointer Chain Lab.",
      tasks: [
        "Preencha cada endereço e offset da cadeia visual.",
        "Altere o índice da entity e explique o stride.",
        "Desenhe o layout com sizeof de cada nó."
      ],
      evidence: "Cadeia anotada, stride calculado e dump dos três primeiros players."
    }
  }),

  "gsec-world": guide({
    thesis: "ESP educacional é matemática de câmera: mundo → view → clip → tela. A plataforma demonstra world-to-screen só nas entidades artificiais do próprio jogo, para explicar projeção — não para atravessar paredes em títulos reais.",
    context: [
      "Entity list, coordenadas de mundo, view matrix, projection e o viewport transformam um ponto 3D em pixels. Sem a matriz correta, um overlay mente.",
      "O World Lab mostra a cadeia 3D World → Camera → Projection → 2D Screen com Three.js e números ao vivo. O overlay só desenha caixas das entidades do laboratório."
    ],
    flow: ["world point", "view transform", "projection", "clip / w divide", "viewport", "screen overlay"],
    topicNotes: {
      "entity list": "Container de entidades visíveis ao simulador. Iterar a lista no lab é o análogo honesto de 'o jogo já sabe onde cada corpo está'; o renderizador usa a mesma fonte.",
      "world coordinates": "Posição no espaço do mundo, antes da câmera. Trocar de espaço (local/world/view) sem declarar o espaço produz overlays deslocados.",
      "view matrix": "Transforma mundo em espaço da câmera: translação inversa da câmera e rotação pelos eixos right/up/forward. É a mesma matriz que o renderer usa.",
      "projection": "Perspectiva divide por profundidade; ortográfica não. FOV, aspect, near e far definem o frustum. Pontos atrás da câmera não devem virar ESP.",
      "world-to-screen": "Composição view*projection, perspectiva (x/w, y/w) e mapeamento para pixels. O laboratório imprime cada etapa para o ponto selecionado."
    },
    code: {
      language: "cpp",
      filename: "world_to_screen.cpp",
      source: `struct Vec4 { float x, y, z, w; };

Vec4 mul(const float m[16], Vec4 v);

bool world_to_screen(const float viewproj[16], Vec4 world,
                     float width, float height, float* sx, float* sy) {
    Vec4 clip = mul(viewproj, world);
    if (clip.w <= 0.001f) return false;
    float ndc_x = clip.x / clip.w;
    float ndc_y = clip.y / clip.w;
    *sx = (ndc_x * 0.5f + 0.5f) * width;
    *sy = (1.0f - (ndc_y * 0.5f + 0.5f)) * height;
    return ndc_x >= -1 && ndc_x <= 1 && ndc_y >= -1 && ndc_y <= 1;
}`,
      explanation: "w<=0 significa atrás da câmera. O overlay educacional só desenha quando a função retorna true para entidades do lab."
    },
    mechanics: [
      { title: "Declarar o espaço", detail: "Comece em world. Aplique view, depois projection. Misturar um vetor já em view com a matriz de mundo desloca o ponto." },
      { title: "Dividir por w", detail: "Perspectiva só existe após o clip. Sem a divisão, coordenadas não são NDC e o viewport não faz sentido." },
      { title: "Testar o frustum", detail: "Pontos fora de [-1,1] ou com w pequeno não devem gerar caixa. ESP que ignora isso desenha lixo nas bordas." },
      { title: "Conferir com o renderer", detail: "A caixa 2D deve coincidir com o cubo Three.js da mesma entity. Divergência prova matriz ou eixo Y invertido." }
    ],
    invariants: [
      "World-to-screen no laboratório usa somente entidades do Arena/World Lab.",
      "A mesma view-projection do preview 3D alimenta o overlay 2D.",
      "Nenhum exercício aponta para câmeras de jogos de terceiros."
    ],
    pitfalls: [
      { title: "Chamar de wallhack um overlay local", detail: "O lab mostra informação que o próprio simulador já possui. Isso ensina a matemática; não autoriza overlays em clientes alheios." },
      { title: "Ignorar handedness e Y da tela", detail: "NDC Y crescente para cima e pixels Y crescente para baixo. Esquecer a inversão coloca a caixa no chão errado." }
    ],
    practice: {
      prompt: "Projete a entity selecionada e alinhe a caixa 2D ao cubo 3D.",
      tasks: [
        "Anote world, view, clip, NDC e pixels do ponto.",
        "Gire a câmera até a entity sair do frustum e confirme o reject.",
        "Explique por que health da entity não precisa do overlay para existir."
      ],
      evidence: "Tabela das cinco etapas, screenshot 3D+2D alinhados e o caso behind-camera."
    }
  }),

  "gsec-aim": guide({
    thesis: "Sistemas de mira são geometria: vetores, distância, produto interno, ângulos e interpolação. O simulador 3D ensina a matemática entre player, inimigo, câmera e crosshair — não assistência contra jogadores reais.",
    context: [
      "Normalizar (enemy-player) produz a direção. Distância filtra alvos. Dot product e atan2 convertem direção em yaw/pitch. Line of sight é um ray contra o mundo do laboratório.",
      "O objetivo é compreender coordenadas e seleção de alvos como problemas de math/engine. Implementar aimbots para títulos online está fora do contrato."
    ],
    flow: ["positions", "delta vector", "normalize", "angle", "los test", "debug overlay"],
    topicNotes: {
      "vectors": "Posições são pontos; a direção é a diferença. Somar pontos sem delta não produz mira. O lab desenha o vetor player→enemy em world space.",
      "distance": "length(delta) ordena candidatos e descarta fora do alcance. Distância ao quadrado evita sqrt quando só a ordem importa.",
      "angles": "Yaw no plano XZ, pitch no Y. Conversão direção→ângulo usa atan2. Wrap de 180°/-180° precisa de shortest-path, senão a interpolação dá a volta longa.",
      "interpolation": "Lerp/slerp aproximam a câmera do ângulo alvo. Em engines, isso é smoothing de câmera ou assist de acessibilidade — no lab, só visualização da curva.",
      "line of sight": "Um ray do olho ao alvo que falha em um AABB do cenário bloqueia a seleção. Sem LoS, a matemática 'enxerga' através de paredes do próprio mapa educacional."
    },
    code: {
      language: "cpp",
      filename: "aim_math.cpp",
      source: `#include <cmath>

struct Vec3 { float x, y, z; };

float length(Vec3 v) {
    return std::sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

Vec3 sub(Vec3 a, Vec3 b) { return { a.x - b.x, a.y - b.y, a.z - b.z }; }

float distance(Vec3 a, Vec3 b) { return length(sub(a, b)); }

float yaw_to(Vec3 from, Vec3 to) {
    Vec3 d = sub(to, from);
    return std::atan2(d.x, d.z);
}`,
      explanation: "distance() é a mesma rotina que o módulo de Assembly desce até SSE/x87. yaw_to é o ângulo no plano, não um 'lock' de input."
    },
    mechanics: [
      { title: "Construir o delta", detail: "enemy - player em world space. Confira o sinal: inverter o delta aponta para trás e o crosshair mente." },
      { title: "Normalizar só quando precisa", detail: "Dot product de direções exige unitários. Distância usa o vetor cru. Normalizar cedo perde magnitude." },
      { title: "Converter para ângulo", detail: "atan2(x,z) no yaw; asin ou atan2(y, horiz) no pitch. Documente a convenção da câmera do lab." },
      { title: "Testar LoS", detail: "Lance o ray contra os AABB do cenário educacional. Se houver hit antes do alvo, a seleção deve falhar." }
    ],
    invariants: [
      "O simulador só contém player, inimigos e obstáculos do laboratório.",
      "Ângulos são apresentados como debug, não injetados em jogos alheios.",
      "LoS usa a geometria do mapa educacional."
    ],
    pitfalls: [
      { title: "Chamar a aula de aimbot", detail: "Compreender atan2 não é um produto. A plataforma classifica esta vista como RESEARCH MATH." },
      { title: "Esquecer o wrap angular", detail: "Lerp linear de 179° para -179° atravessa 358° no sentido longo e a câmera gira o mapa inteiro." }
    ],
    practice: {
      prompt: "Meça distância, yaw e LoS entre player e a entity 1 no World Lab.",
      tasks: [
        "Confira distance() com a fórmula do overlay.",
        "Gire a câmera e compare yaw calculado com o yaw da câmera.",
        "Coloque um obstáculo no ray e documente o bloqueio."
      ],
      evidence: "Valores numéricos, screenshot do vetor/ray e o caso LoS bloqueado."
    }
  }),

  "gsec-input": guide({
    thesis: "Jogos não leem o teclado 'direto da física': passam por fila do SO, polling ou eventos, e só então viram comandos. Observar isso na janela do laboratório ensina o contrato — sem keyloggers globais.",
    context: [
      "Polling consulta o estado atual (GetAsyncKeyState, SDL_GetKeyboardState). Event-driven consome WM_KEYDOWN / WM_INPUT. Mouse absoluto e relativo (delta) são modelos diferentes.",
      "O Input observer do laboratório registra apenas eventos da própria aplicação. Captura global, hooks de teclado de sistema e monitoramento de outros processos estão proibidos."
    ],
    flow: ["device", "OS queue", "game pump", "command", "simulation", "lab log"],
    topicNotes: {
      "polling": "A cada frame o loop lê um snapshot. Teclas curtas entre frames podem ser perdidas. Bom para estado contínuo (segurar W); ruim para toques únicos sem repeat logic.",
      "event-driven input": "A fila entrega press/release com timestamp. O jogo precisa bombear a fila ou o buffer enche. Combina com message loop Win32/SDL.",
      "Win32 input": "GetMessage/PeekMessage, WM_KEY*, Raw Input (WM_INPUT) e, em alguns títulos, DirectInput legado. São APIs de aplicação, não receitas de injeção em outros processos.",
      "mouse delta": "Modo relativo alimenta yaw/pitch da câmera. DPI, polling rate e raw input mudam a magnitude. O lab mostra dx/dy da própria superfície.",
      "lab observer": "Somente a caixa/canvas do laboratório. Nada de WH_KEYBOARD_LL, nada de clipboard, nada de outros HWNDs. O log existe para correlacionar input → comando → estado."
    },
    code: {
      language: "cpp",
      filename: "lab_input.cpp",
      source: `enum Cmd { None, Forward, Jump };

Cmd poll_keys(const bool keys[256]) {
    if (keys['W']) return Forward;
    if (keys[' ']) return Jump;
    return None;
}

/* Educational note: observe keys[] only for this lab window.
 * Never install a system-wide hook in exercises. */`,
      explanation: "O mapa tecla→comando é o contrato do jogo. O observer mostra a transição; o Mini Anti-Cheat pode marcar padrões impossíveis (disparo sem evento)."
    },
    mechanics: [
      { title: "Escolher o modelo", detail: "Polling para estado contínuo, eventos para bordas. Misture só com um adaptador explícito, senão o mesmo W dispara duas vezes." },
      { title: "Medir o delta", detail: "Registre dx/dy e o timestamp do frame. Sem isso, 'a câmera virou sozinha' não tem evidência." },
      { title: "Ligar comando a estado", detail: "Forward deve alterar velocity no tick, não teleportar. O AC comportamental usa exatamente esse contrato." },
      { title: "Limitar o observer", detail: "O log só aceita eventos da janela do lab. Qualquer proposta de captura global é rejeitada pelo enunciado." }
    ],
    invariants: [
      "Input observado pertence à aplicação do laboratório.",
      "Comandos têm timestamp de frame para correlação com o estado.",
      "Não há keylogger, clipboard monitor ou hook de sistema nos exercícios."
    ],
    pitfalls: [
      { title: "Tratar GetAsyncKeyState como licença global", detail: "Mesmo APIs documentadas podem ser abusadas fora do processo. O laboratório só demonstra leitura do próprio foco." },
      { title: "Ignorar o foco da janela", detail: "Eventos de outra aplicação não devem mover o player. Se o lab reage sem foco, o pump está errado." }
    ],
    practice: {
      prompt: "Gere três comandos no Arena Lab e correlacione com o log de input.",
      tasks: [
        "Pressione W e anote o evento, o comando e a variação de X/Z.",
        "Compare polling versus o evento listado no painel.",
        "Explique por que um poke de posição sem evento de input é suspeito para o AC."
      ],
      evidence: "Log com timestamps, dump de posição e a regra de detecção correspondente."
    }
  }),

  "gsec-tools": guide({
    thesis: "Ferramentas internas compartilham o address space do jogo; externas observam de outro processo. Hooking intercepta uma função e devolve o controle. Tudo isso só é exercitado entre processos que a plataforma lança.",
    context: [
      "Internal: módulo carregado no mesmo processo, acesso direto a ponteiros. External: Read/Write via APIs de debugging no alvo autorizado. Cada modelo tem superfície, atraso e risco diferentes.",
      "Injeção, DLL e trampolines são conceitos de sistemas. As demos ligam um logger à função original do lab: Original → Hook → Logger → Original. BattlEye, EAC e Vanguard não são alvos."
    ],
    flow: ["process boundary", "module", "function address", "hook", "logger", "original"],
    topicNotes: {
      "internal tools": "Mesmo processo, mesmo heap. Overlay e inspector podem chamar funções do jogo diretamente. Crash do tool derruba o lab game. Útil para debug builds.",
      "external tools": "Outro processo. Precisa de handle com direitos de debug no alvo próprio. Cada read atravessa o kernel. Mais isolado, mais sujeito a racing com o frame.",
      "process boundary": "Espaços de endereço não compartilham ponteiros crus. Um endereço válido no jogo é um número sem sentido no tool até haver ReadProcessMemory educacional no par lab-game/lab-tool.",
      "function hook": "Substitui o prólogo ou o ponteiro da função por um wrapper que registra argumentos e chama o original. No lab, ApplyDamage passa pelo logger.",
      "IAT trampoline": "IAT redireciona imports; trampoline guarda bytes originais e salta de volta. A aula mostra o fluxo, não um injector genérico para software alheio."
    },
    code: {
      language: "cpp",
      filename: "lab_hook.cpp",
      source: `using DamageFn = int (*)(int health, int amount);

int original_damage(int health, int amount) {
    return health - amount;
}

int hooked_damage(int health, int amount) {
    lab_log("ApplyDamage", health, amount);
    return original_damage(health, amount);
}

DamageFn apply_damage = original_damage;

void install_lab_hook() { apply_damage = hooked_damage; }`,
      explanation: "O hook educacional é um ponteiro de função no próprio binário. Visualize o fluxo no Hook Lab; não gere loaders para processos de terceiros."
    },
    mechanics: [
      { title: "Declarar o lado", detail: "Internal ou external muda o contrato de ponteiros e falhas. Escreva isso antes de qualquer API de memória." },
      { title: "Nomear a função", detail: "Hook sem símbolo ou RVA do binário próprio é chute. No lab, ApplyDamage tem endereço visível." },
      { title: "Preservar o original", detail: "O trampoline deve conseguir chamar a implementação. Hook que engole a função quebra o jogo e a lição." },
      { title: "Registrar e devolver", detail: "Logger observa; o estado continua correto. Detecção do Mini AC pode marcar hooks não listados no módulo esperado." }
    ],
    invariants: [
      "Demos de injeção/hook usam somente processos do laboratório.",
      "O original permanece chamável após o hook.",
      "Nenhum exercício ensina bypass de anti-cheat comercial."
    ],
    pitfalls: [
      { title: "Escrever um injector 'genérico'", detail: "Um loader que aceita PID arbitrário sai do escopo educacional e vira ferramenta ofensiva. O lab amarra o alvo ao Arena." },
      { title: "Confundir hook com patch permanente", detail: "IAT/detour no lab é reversível. Patch de bytes sem restore impede comparar com o original." }
    ],
    practice: {
      prompt: "Instale o hook de ApplyDamage no Hook Lab e descreva o fluxo.",
      tasks: [
        "Capture o log de uma chamada com health e amount.",
        "Desinstale o hook e confirme que o logger silencia.",
        "Classifique a ferramenta como internal e liste um risco (crash compartilhado)."
      ],
      evidence: "Diagrama Original→Hook→Logger→Original, log e o estado health depois da chamada."
    }
  }),

  "gsec-assembly": guide({
    thesis: "O compilador transforma C++ de jogo em assembly que a CPU executa. Comparar float distance() no source, no listing e nos registradores liga research de memória à ISA.",
    context: [
      "C++ → compiler → assembly → machine code → CPU. Otimização apaga variáveis, reordena e usa SSE. O Low-Level Lab e o Compiler Lab mostram o mesmo exemplo do Arena.",
      "Funções simples (distance, damage, clamp) são o material certo: o aluno vê XMM, ABI e memória sem se perder em milhares de inlined templates."
    ],
    flow: ["C++ source", "compiler", "assembly", "machine code", "registers", "memory"],
    topicNotes: {
      "source to asm": "Cada statement vira zero ou mais instruções. -O0 preserva stores; -O2 pode manter tudo em XMM. Sem flags, a comparação é inválida.",
      "distance function": "sqrt(dx*dx+dy*dy+dz*dz) vira mulsd/addsd/sqrtss ou uma libcall. É o exemplo canônico da trilha para seguir bytes e registradores.",
      "registers": "Windows x64 usa XMM0–XMM3 para floats nos primeiros args; System V também usa XMM0. O retorno float está em XMM0. Inteiros seguem RCX/RDX ou RDI/RSI.",
      "compiler lowering": "O IR (LLVM/MSVC) escolhe instruções. Inlining de distance() no tick some com a call. O listing com /FAcs ou -S é a evidência.",
      "ABI": "Shadow space, red zone, alinhamento da stack antes de calls SSE. Quebrar ABI no hook educacional crasha o lab game de forma visível."
    },
    code: {
      language: "cpp",
      filename: "distance.cpp",
      source: `float distance(float ax, float ay, float az,
              float bx, float by, float bz) {
    float dx = ax - bx;
    float dy = ay - by;
    float dz = az - bz;
    return dx * dx + dy * dy + dz * dz;
}

/* Compile in Low-Level Lab at -O0 and -O2.
 * Compare source, assembly, XMM0 and the stack slot for dx. */`,
      explanation: "Comece sem sqrt para ver a cadeia mul/add. Depois adicione sqrt e observe a instrução extra ou a call."
    },
    mechanics: [
      { title: "Congelar as flags", detail: "Mesmo compilador, mesmo -O, mesmo ABI. Senão você compara programas diferentes." },
      { title: "Seguir o argumento", detail: "Marque onde ax entra (XMM0 ou stack) e onde dx vive depois da subtração." },
      { title: "Relacionar store e campo", detail: "Se o resultado for escrito em Player, o listing deve mostrar o offset de health/posição relativo ao this/ponteiro." },
      { title: "Repetir com -O2", detail: "Anote o que sumiu. Variáveis que existiam só para o debugger não são 'o estado real' em release." }
    ],
    invariants: [
      "O binário comparado é compilado pela plataforma a partir do source do exercício.",
      "Registradores são lidos no debugger educacional no mesmo build.",
      "Hooks respeitam a ABI do lab game."
    ],
    pitfalls: [
      { title: "Ler listing de outro compilador", detail: "MSVC e Clang não baixam distance() igual. Sem o artefato local, o mapa de registradores é ficção." },
      { title: "Assumir que o source é o binário", detail: "Inlining e LTO apagam a função. Research precisa do símbolo ou da RVA desta build." }
    ],
    practice: {
      prompt: "Compile distance() no Low-Level Lab e anote XMM0 no retorno.",
      tasks: [
        "Gere listing -O0 e -O2.",
        "Execute com pontos (0,0,0) e (3,4,0) e confira 25.0f.",
        "Relacione a store, se houver, ao offset de um campo do Player."
      ],
      evidence: "Dois listings, dump de XMM0 e a nota de ABI (Windows x64 ou SysV)."
    }
  }),

  "gsec-reverse": guide({
    thesis: "Engenharia reversa de jogos no 0xlab começa com binários propositalmente simples da plataforma: strings, funções, structs, game state e rendering. Depois o source original é revelado para calibrar o método.",
    context: [
      "Níveis progressivos: strings → functions → structures → game state → rendering → análise avançada. Cada nível exige evidência (endereço, xref, tamanho) antes da hipótese de nome.",
      "Não reverta jogos comerciais. Os crackmes/lab games existem para treinar o ciclo binary → facts → hypothesis → original source."
    ],
    flow: ["binary", "strings/imports", "functions", "structures", "game state", "source compare"],
    topicNotes: {
      "strings": "Literais como 'PLAYER_HEALTH' ou 'tick' ancoram funções. Encoding, seção e xref importam. String ausente não prova ausência de feature — pode ter sido construída em runtime.",
      "functions": "Prologue, calls, loops e xrefs desenham o CFG. distance() e tick() são alvos do Level 2. Nomes do import table (SDL, CreateWindow) situam o runtime.",
      "structures": "Acessos [reg+imm] repetidos sugerem campos. Health que decresce e floats que mudam com WASD sustentam o layout Player do laboratório.",
      "game state RE": "Um objeto global ou singleton referenciado por tick e render. O aluno aponta a base e a cadeia até o player local com evidência de loads.",
      "rendering RE": "Draw calls, matrices e o caminho câmera. Relacionar a view-projection achada no binário com o overlay educacional fecha o ciclo world-to-screen."
    },
    code: {
      language: "cpp",
      filename: "lab_strings.cpp",
      source: `static const char* kHud = "LAB_HEALTH";

void draw_hud(int health) {
    (void)kHud;
    (void)health;
}

/* Level 1: find LAB_HEALTH in the lab binary, then xref to draw_hud.
 * Level 3: recover Player from [rcx+0x0C] stores after damage. */`,
      explanation: "O gabarito só abre depois da análise. Comparar com o source calibra o que era fato (bytes) e o que era nome hipotético."
    },
    mechanics: [
      { title: "Coletar fatos", detail: "Hash, seções, strings, imports. Hipóteses ficam em outra coluna. Misturar as duas inventa funções que não existem." },
      { title: "Ancorar uma função", detail: "Xref da string ou do import até o call. Uma RVA sem evidência não é draw_hud." },
      { title: "Recuperar um campo", detail: "Correlacione offset, tamanho e comportamento no debugger do lab. sizeof inferido precisa de dois campos vizinhos." },
      { title: "Confrontar o source", detail: "Abra o original e marque acertos/erros. O erro ensina o viés; o acerto vira método." }
    ],
    invariants: [
      "Somente binários gerados ou fornecidos pela plataforma.",
      "Toda hipótese cita evidência observável.",
      "O source original é a calibração, não o ponto de partida dos níveis cegos."
    ],
    pitfalls: [
      { title: "Nomear cedo demais", detail: "Chamar uma função de 'aimbot' porque tem atan2 é fanfic. atan2 aparece em câmera, áudio e IA." },
      { title: "Pular o debugger", detail: "Listing estático mente com indireções. Um breakpoint no lab confirma o valor de health no offset proposto." }
    ],
    practice: {
      prompt: "Complete o desafio Level 1–3 no painel Challenges e compare com o source.",
      tasks: [
        "Encontre a string LAB_HEALTH e o xref.",
        "Identifique a função de update do player.",
        "Recupera o offset de health e valide no inspector."
      ],
      evidence: "Notas fato/hipótese, RVA e o diff mental contra o source revelado."
    }
  }),

  "gsec-anticheat": guide({
    thesis: "Anti-cheat educacional detecta violações de integridade, módulos inesperados e comportamento impossível no próprio lab game. O Bypass Research Lab usa um AC fictício: achar a fraqueza e depois corrigi-la — nunca BattlEye, EAC ou Vanguard.",
    context: [
      "Integridade (hash/checksum), inspeção de processo/módulo, telemetria, detecção comportamental e validação server-side são camadas. Cliente sozinho é insuficiente.",
      "O Mini Anti-Cheat monitora só programas do laboratório. Eventos: Process Created, Module Loaded, Memory Changed, Unexpected Function Call, Suspicious Input Pattern, Integrity Changed. Cada detecção gera explicação."
    ],
    flow: ["game", "telemetry", "detection engine", "event", "explanation", "AC patch"],
    topicNotes: {
      "integrity": "Hash do bloco Player, do código de tick ou da config. Original → hash → modification → hash changed → detection. Algoritmo fraco (só health) é o bug que o aluno deve corrigir.",
      "telemetry": "Eventos estruturados com timestamp, PID do lab e campo. Sem telemetria não há detecção reproduzível nem replay.",
      "behavioral detection": "Padrões: health sobe sem heal, posição salta além da velocidade máxima, tiro sem input. Falsos positivos existem; o projeto final pede reduzir os FP sem cegar o detector.",
      "fictional AC": "Educational Anti-Cheat da plataforma. Fraco no modo naive (só faixa de health). O exercício de bypass é mutar posição e observar o miss, depois habilitar sanity de velocidade.",
      "hardening the AC": "Depois de demonstrar a falha, o aluno implementa a checagem que faltava. Objetivo: 'como detectar uma alteração?', nunca 'como esconder de um AC real'."
    },
    code: {
      language: "cpp",
      filename: "mini_ac.cpp",
      source: `struct Telemetry { int health; float x, y; float dt; };

enum class Verdict { Ok, Integrity, SpeedHack, ImpossibleHeal };

Verdict check(const Telemetry& prev, const Telemetry& now, bool strong) {
    if (now.health > 100 || now.health < 0) return Verdict::Integrity;
    if (now.health > prev.health + 1) return Verdict::ImpossibleHeal;
    if (!strong) return Verdict::Ok; /* naive AC ignores teleport */
    float dx = now.x - prev.x, dy = now.y - prev.y;
    float max_step = 12.0f * now.dt;
    if (dx * dx + dy * dy > max_step * max_step) return Verdict::SpeedHack;
    return Verdict::Ok;
}`,
      explanation: "O modo naive é propositalmente incompleto. Encontre a teleporte, explique o miss, ligue strong e confirme a detecção — depois discuta falsos positivos."
    },
    mechanics: [
      { title: "Definir o invariante", detail: "O que não pode acontecer: health fora de [0,100], salto maior que vmax*dt, módulo fora da lista. Sem invariante a regra é estética." },
      { title: "Emitir telemetria", detail: "Grave prev e now com dt. Detecção sem o par é um chute no valor absoluto." },
      { title: "Classificar o evento", detail: "Integrity vs behavior vs input. O painel explica a classe para o aluno não tratar todo alerta como 'cheat genérico'." },
      { title: "Corrigir o detector", detail: "Após o bypass educacional, implemente a checagem ausente e meça FP com movimento legítimo." }
    ],
    invariants: [
      "O Mini AC só vê processos e memórias do laboratório.",
      "Bypass research ataca o AC fictício e termina em patch do detector.",
      "Nenhum material ensina evasão de produtos comerciais."
    ],
    pitfalls: [
      { title: "Apontar para AC real", detail: "BattlEye, Easy Anti-Cheat e Vanguard não entram nos exercícios. Analogias de mercado ficam no texto conceitual, sem alvos." },
      { title: "Otimizar só para o poke", detail: "Uma regra que pega o botão 'mutar health' mas acusa dash legítimo é um falso positivo. O lab pede os dois casos." }
    ],
    practice: {
      prompt: "No Mini Anti-Cheat, use o modo naive, teleporte e depois endureça o detector.",
      tasks: [
        "Mutar health e ler a explicação de Integrity.",
        "Teletransportar no modo naive e documentar o miss.",
        "Ativar strong, repetir o teleport e justificar o SpeedHack; mova com WASD para checar FP."
      ],
      evidence: "Dois eventos (hit e miss), o patch strong e um movimento legítimo sem alerta."
    }
  }),

  "gsec-network": guide({
    thesis: "Confiar só no cliente é perigoso: o cliente pode afirmar Position=impossible. Um servidor autoritativo local valida mensagens, limita taxa e replica estado. O laboratório é um multiplayer loopback, não um jogo online público.",
    context: [
      "Client → TCP/UDP de laboratório → Game Server. Pacotes têm header, type, length, payload e checksum. Replay reconstrói a linha do tempo. Sanity checks rejeitam o impossível.",
      "Packet viewer e replay existem para o tráfego gerado pelo próprio lab. Não há captura de partidas de terceiros."
    ],
    flow: ["client intent", "packet", "server validate", "authoritative state", "broadcast", "replay"],
    topicNotes: {
      "authoritative server": "O servidor é a fonte da verdade. O cliente envia intenção (quero mover), não o estado final. Health e posição oficiais nascem no sim server-side.",
      "sanity checks": "Faixa, velocidade máxima, sequence monotônico, timestamp razoável, checksum. Rate limiting corta flood. Rejeitar é melhor do que 'corrigir em silêncio' sem log.",
      "packets": "Header → Type → Length → Payload → Checksum. Length maior que o buffer é o mesmo bug da trilha de network security. O viewer mostra cada campo dos pacotes do lab.",
      "replay": "00:01 Move, 00:02 Shoot, 00:03 Jump. Voltar no tempo recarrega o estado gravado. Serve para explicar por que o AC disparou naquele frame.",
      "sequence": "IDs monotônicos detectam replay/reordenação. Duplicata vira drop. Sequence regresso é rejeitado com explicação no log."
    },
    code: {
      language: "cpp",
      filename: "lab_server.cpp",
      source: `enum Msg : uint8_t { Move = 1, Shoot = 2 };

struct Packet { uint16_t seq; Msg type; float x, y; uint32_t crc; };

bool accept_move(const Packet& p, uint16_t last_seq, float prev_x, float prev_y) {
    if (p.seq != last_seq + 1) return false;
    float dx = p.x - prev_x, dy = p.y - prev_y;
    if (dx * dx + dy * dy > 4.0f) return false; /* sanity */
    return true;
}`,
      explanation: "O cliente pode mandar x=999. O servidor recusa. O packet viewer mostra o payload rejeitado e o replay guarda o evento."
    },
    mechanics: [
      { title: "Tratar o cliente como hostil", detail: "Toda mensagem é input não confiável. Parse com length, depois domínio (faixa, seq)." },
      { title: "Simular no servidor", detail: "Aplique a intenção no sim autoritativo. Não copie posição crua do pacote para o estado oficial." },
      { title: "Logar a rejeição", detail: "Type, seq, motivo. Sem log, o aluno não distingue loss de cheat educacional." },
      { title: "Reproduzir no replay", detail: "Selecione o timestamp do evento e recarregue o estado. A detecção precisa ser contável frame a frame." }
    ],
    invariants: [
      "Tráfego é loopback entre client e server do laboratório.",
      "Estado oficial não é o payload do cliente.",
      "Replay e packet viewer só leem o buffer gerado pelo lab."
    ],
    pitfalls: [
      { title: "Validar só na UI", detail: "Esconder um botão não impede o pacote. A regra vive no servidor." },
      { title: "Aceitar sequence velho", detail: "Replay de um Move antigo teleporta o player. last_seq+1 é o contrato mínimo." }
    ],
    practice: {
      prompt: "Envie um Move impossível e um seq duplicado no Packet Lab.",
      tasks: [
        "Inspecione header/type/length/payload/checksum do pacote honesto.",
        "Injete x=999 e leia a rejeição no servidor.",
        "Rebobine o replay até o evento e explique o estado.",
      ],
      evidence: "Dump do pacote, log de reject e screenshot do replay no timestamp da falha."
    }
  })
};
