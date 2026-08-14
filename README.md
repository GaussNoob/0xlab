# 0xLAB

Ambiente técnico para estudar C, C++, Assembly, memória, redes, Windows/Linux, APIs gráficas, binários e software seguro. A interface combina currículo conectado, IDE, execução nativa isolada e visualizadores que tornam estado interno observável.

## O que já está funcional

- shell inspirado em IDEs, navegação rápida (`Ctrl+K`) e currículo progressivo;
- lição completa de ponteiros com teoria, código, trace, checkpoint e assembly;
- Playground Monaco multi-arquivo com C/C++, GCC/Clang, flags, diagnostics inline e terminal;
- execução real e assíncrona em container descartável — não existe fallback simulado;
- interpretação inicial de diagnostics, AddressSanitizer e UndefinedBehaviorSanitizer;
- Memory Visualizer em Three.js com ponteiros, arrays, dupla indireção e registradores;
- Network Visualizer com encapsulamento, handshake TCP e comparação POSIX/Winsock;
- currículo de Computer Engineering com 11 trilhas conectando C/C++, Assembly, Windows API, Linux, gráficos, engenharia reversa e segurança;
- Assembly Visualizer x86/x86-64 com Intel/AT&T, NASM/MASM/GAS, registers, RFLAGS, RIP, stack, memória e execução F5/F7/F8;
- C/C++ ↔ Assembly com GCC/Clang/MSVC, níveis `-O0` a `-O3`/`-Os`, Opcode Explorer e comparador Windows x64/System V AMD64;
- Windows Internals Lab com VirtualAlloc/VirtualProtect, PE Explorer, message loop, processos, threads, handles e sincronização;
- Graphics Playground com shader GLSL recompilado no preview, pipeline por estágio, Frame Debugger, comparador OpenGL/D3D11/D3D12/Vulkan, timeline CPU/GPU e matemática 3D;
- catálogo de projetos finais para parsers PE/ELF, VM/CPU, debugger educacional, Win32/DLLs e renderers OpenGL, Direct3D e Vulkan;
- catálogo de projetos, mapa curricular e progresso persistido em SQLite;
- contratos tipados, casos de uso, adapters e testes separados por responsabilidade.

O mapa curricular avançado e seus laboratórios centrais estão implementados. A autoria de cada lição e exercício continua incremental: a plataforma diferencia conteúdo navegável, simulação educacional determinística e execução real, sem apresentar páginas vazias como se fossem aulas concluídas. Veja [docs/roadmap.md](docs/roadmap.md).

### Low-Level Lab e legibilidade

O workspace principal integra editor Monaco multi-arquivo, artefatos reais de `objdump`/`readelf`, CPU x86-64 educacional editável, timeline/snapshots, watches, stack/heap/memória, pointer graph e visualizações 2D/3D. Todo texto de interface possui piso tipográfico de 11 px; código permanece em 14 px ou mais.

## Rodar com Docker

Pré-requisitos: Docker Desktop/Engine recente com Linux containers e Compose v2.

```bash
cp .env.example .env
# altere RUNNER_API_TOKEN no .env
docker compose up --build
```

Abra `http://localhost:3000`. O runner não publica porta no host; apenas o serviço web consegue acessá-lo pela rede interna.

Para reconstruir somente a imagem usada por cada job:

```bash
npm run sandbox:build
```

## Desenvolvimento local

Requer Node.js 22+ e um daemon Docker ativo.

```bash
npm install
npm run sandbox:build
npm run dev
```

O Next.js roda em `:3000` e o runner em `:8787`. O token local padrão é exclusivamente para desenvolvimento.

## Testes

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
npm run test:sandbox
```

Os testes do runner cobrem validação e interpretação de sanitizers. Os testes de currículo preservam a cobertura das trilhas avançadas; os smoke tests E2E cobrem a bancada, lição, playground, Memory Visualizer, Assembly, compiler/ABI, PE e pipeline gráfico. O plano de hardening inclui testes de fork bomb, timeout, memória, output flooding e indisponibilidade do daemon em workers dedicados.

## Fronteira de segurança

Todo código submetido é tratado como malicioso. O processo Next.js apenas cria e consulta jobs; compilação e execução ocorrem no runner e, então, em um container novo, sem rede, sem capabilities, com filesystem raiz read-only e limites de CPU, RAM, PIDs, arquivo, saída e tempo.

O Compose é apropriado para uso pessoal. O runner possui acesso ao socket Docker e, portanto, não deve ser exposto publicamente. Uma implantação multiusuário deve movê-lo para workers/VMs dedicados e adicionar uma segunda fronteira como gVisor, Kata Containers ou Firecracker. Consulte [docs/threat-model.md](docs/threat-model.md) e [docs/architecture.md](docs/architecture.md).

## Decisões de escopo

- execução inicial: Linux x86-64;
- Windows/Winsock/Win32: conteúdo, modelos e snapshots comparativos na UI; execução nativa exige workers Windows e nunca é falsificada;
- Assembly/PE/graphics: os visualizadores são modelos educacionais identificados como tais; bytes de referência e estado simulado não são apresentados como traces capturados do host;
- SQLite: adequado ao uso pessoal, com esquema preparado para cursos, submissões e workspaces;
- fila: limitada em memória para uma instância; a porta de aplicação permite migrar para uma fila durável quando necessário.

Uso de laboratórios de segurança é restrito a programas próprios, desafios educacionais e ambientes explicitamente autorizados.
