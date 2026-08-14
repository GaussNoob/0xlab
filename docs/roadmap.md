# Roadmap técnico

## Fase 1 — Fundação

- shell profissional, catálogo tipado, progresso persistente e estrutura de lições;
- domínio desacoplado, SQLite e contratos compartilhados;
- documentação de arquitetura e ameaças.

## Fase 2 — IDE e executor

- Monaco multi-arquivo, GCC/Clang, flags controladas, terminal e diagnostics;
- runner assíncrono e sandbox Docker efêmera;
- interpretação de compilador e sanitizers.

## Fase 3 — Conteúdo C/C++

- autoria em MDX validado, exercícios versionados e testes por exercício;
- trilhas C, C++ moderno, SQLite e projetos progressivos.

## Fase 4 — Memory Lab

- traces instrumentados, stack/heap/globals/registers e pointer playground;
- comparação de frames e explicação do estado interno.

## Fase 5 — Network Lab

- visualizador de camadas e TCP; sockets Linux/Windows lado a lado;
- ambientes de rede opt-in, isolados do host, para labs específicos.

## Fase 6 — Assembly e compiladores

- trilha x86/x86-64, Intel/AT&T, NASM/MASM/GAS, ABI, syscalls, SIMD e integração C/C++;
- Assembly Visualizer com registradores, flags, RIP, stack, memória e controles de execução;
- Compiler/Opcode Explorer com perfis GCC, Clang e MSVC e comparação Windows x64/System V.

## Fase 7 — Windows API e binários

- Win32 GUI, tipos A/W, processos, threads, sincronização, memória virtual, arquivos e DLLs;
- Virtual Memory Visualizer, Message Loop Monitor e PE Explorer;
- conexões explícitas Win32 → ntdll → Native API → kernel e PE → loader → processo.

## Low-Level Lab integrado — entregue

- workspace Monaco multi-arquivo com presets livres, experimentos, fork, breakpoints, watches e layouts rearranjáveis;
- artefatos reais de compiler (`objdump` e `readelf`) separados de estados educacionais;
- CPU Simulation x86-64 com stepping, branches, CALL/RET, stack, registradores, flags e memória editáveis;
- visualizadores 2D/3D para CPU, stack, heap, pointers, memória e CFG, com timeline e snapshots;
- integração “Open in Low-Level Lab” nos exercícios;
- revisão tipográfica global com piso de 11 px para informações funcionais.

O próximo adapter do laboratório é GDB/MI em worker dedicado, para breakpoints e telemetria nativos sem inferir estado ausente.

## Fase 8 — Graphics engineering

- matemática, shaders, OpenGL, Direct3D 11/12, Vulkan, SDL3, GPU e performance;
- shader preview, pipeline visual, Frame Debugger, API Comparator e timeline CPU/GPU;
- projetos C++ que conectam window system, graphics API, driver, GPU e apresentação.

## Próximos incrementos

- autoria completa e versionada das lições, checkpoints e exercícios de cada módulo avançado;
- execução opcional em workers Windows isolados e toolchains gráficas nativas;
- traces instrumentados importáveis de programas próprios para substituir snapshots onde houver suporte;
- labs locais de vulnerabilidades com mitigações ativáveis, acessibilidade e testes de caos do executor.
