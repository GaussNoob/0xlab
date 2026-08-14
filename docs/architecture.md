# Arquitetura do 0xLAB

## Decisão principal

O produto começa como um monólito modular no Next.js, com uma exceção deliberada: a execução de código nativo vive em um processo e serviço separados. Separar todo o conteúdo em microsserviços agora aumentaria o custo operacional sem melhorar o uso pessoal; misturar o executor ao processo web criaria uma fronteira de segurança inaceitável.

```text
Browser
  │ HTTPS
  ▼
Next.js (presentation + application)
  ├── SQLite (conteúdo, progresso, submissões)
  │
  └── Execution gateway
          │ rede interna + token
          ▼
      Runner / fila limitada
          │ Docker API
          ▼
      container efêmero por job
      (sem rede, sem capabilities, limites de CPU/RAM/PIDs)
```

## Camadas

- `domain`: entidades e regras que não dependem de React, Next.js ou SQLite.
- `application`: casos de uso e portas (interfaces) para persistência e execução.
- `infrastructure`: adapters de SQLite, HTTP e configuração.
- `presentation`: App Router, componentes e hooks.
- `modules`: catálogo e funcionalidades verticais de aprendizado.

As dependências apontam para dentro: presentation → application → domain. Infrastructure implementa portas declaradas por application.

## Limites conscientes do primeiro incremento

- O alvo executável inicial é Linux. O seletor Windows serve ao conteúdo comparativo; execução Win32 exige workers Windows isolados e não é falsificada.
- A fila é em memória e limitada por processo. A interface `JobQueue` permite substituir por Redis/BullMQ quando houver mais de uma réplica.
- SQLite atende bem ao uso pessoal. Os IDs e contratos já evitam pressupor um único usuário, facilitando migração posterior para PostgreSQL.
- O visualizador interpreta modelos educacionais determinísticos; ele não finge ser um depurador real. Integração com traces instrumentados é um passo posterior.

## Low-Level Lab

O laboratório integrado mantém duas origens de dados incompatíveis por design:

```text
Native Sandbox                          CPU Simulation
Source -> compiler -> ELF -> process    Assembly subset -> deterministic state
             |                                      |
             +-- output / diagnostics                +-- registers / flags
             +-- sanitizer evidence                  +-- stack / abstract memory
             +-- objdump / readelf                    +-- reversible snapshots
```

- `real-compiler-artifact` identifica disassembly e seções extraídos do ELF criado pelo job; seus endereços são endereços virtuais de link e não um trace de runtime.
- `EDUCATIONAL SIMULATION` identifica registradores, flags, stack e memória da VM determinística. Endereços do modelo recebem o prefixo `SIM:`.
- A camada de visualização consome snapshots por interfaces tipadas e não conhece Docker, HTTP ou comandos de compilador.
- Em modo nativo, campos sem telemetria mostram `not captured`. Um futuro adapter GDB poderá preencher esses contratos sem alterar os visualizadores.
- Experimentos persistem source, flags, breakpoints, watches e layout no cliente. Resultados nativos continuam efêmeros e são reabertos pelo `jobId` enquanto a fila os mantiver.

## ADRs importantes

1. Código submetido nunca é carregado, compilado ou executado pelo processo Next.js.
2. Flags, compiladores, nomes de arquivo e tamanho de payload usam allowlists/limites.
3. O runner chama Docker com array de argumentos, nunca por concatenação em shell.
4. O container é descartável, sem rede, sem privilégios e com filesystem raiz somente leitura.
5. Resultados de sanitizers são analisados por regras determinísticas e exibem a evidência original.
6. Artefatos estáticos, dados de execução e simulação educacional nunca compartilham o mesmo rótulo de provenance.
7. Texto funcional da interface não usa tamanho inferior a 11 px; densidade deve vir do layout, não de tipografia ilegível.
