import { guide, type GuideMap } from "./types";

export const assemblyGuides: GuideMap = {
  "asm-bits": guide({
    thesis: "Assembly opera sobre padrões de bits com largura definida; binário, hexadecimal, complemento de dois e endianness permitem prever exatamente quais bytes a CPU lê.",
    context: [
      "A mesma sequência de bits pode representar inteiro signed, unsigned, float, endereço ou opcode. A instrução e o contexto dão significado; a memória por si só não guarda o tipo.",
      "x86 é little endian para valores multibyte: o byte menos significativo ocupa o menor endereço. A escrita hexadecimal acompanha o valor numérico, enquanto um dump acompanha a ordem dos endereços."
    ],
    flow: ["valor", "largura", "padrão binário", "hex", "bytes little endian", "load da CPU"],
    topicNotes: {
      binary: "Bits são agrupados em campos e potências de dois. Máscaras selecionam bits; shifts reposicionam, mas largura e signedness determinam o resultado válido.",
      hex: "Cada dígito hexadecimal representa quatro bits; 0xFF cabe em um byte e 0xFFFFFFFF em 32 bits. Sempre anote a largura esperada.",
      "two's complement": "Em N bits, negar um inteiro equivale a inverter e somar um módulo 2^N. O bit alto participa do valor signed, e overflow signed não é carry.",
      "little endian": "0x12345678 fica 78 56 34 12 nos endereços crescentes. Registradores exibem o valor lógico; dumps exibem bytes em memória.",
      "big endian": "Big endian armazena o byte mais significativo primeiro e é comum em formatos e network byte order. Converta explicitamente na fronteira."
    },
    code: { language: "asm", filename: "representation.asm", source: `; valor lógico: 0x12345678
mov eax, 0x12345678
mov dword [buffer], eax

; bytes em buffer, endereços crescentes:
; 78 56 34 12

movsx ecx, byte [negative_one] ; FF -> FFFFFFFF
movzx edx, byte [negative_one] ; FF -> 000000FF`, explanation: "movsx preserva o valor signed estendendo o bit de sinal; movzx trata os bits como unsigned e completa com zeros." },
    mechanics: [{ title: "Escolher largura", detail: "byte, word, dword e qword fixam quantos bits participam." }, { title: "Codificar", detail: "O valor é reduzido módulo 2^N; signed muda a interpretação, não os bits." }, { title: "Armazenar", detail: "Endianness ordena bytes do valor em endereços crescentes." }, { title: "Estender", detail: "Ao aumentar largura, zero-extension e sign-extension preservam significados diferentes." }],
    invariants: ["Todo valor tem largura explícita.", "Hex dump e valor de registrador não são lidos na mesma ordem visual.", "Carry e signed overflow são propriedades distintas."],
    pitfalls: [{ title: "Contar dígitos sem largura", detail: "0xFF pode ser 255 ou -1 dependendo do tipo de 8 bits e extensão." }, { title: "Inverter string em vez de bytes", detail: "Endianness reorganiza bytes, não caracteres hex individuais nem bits dentro do byte." }],
    practice: { prompt: "Decodifique uma tabela de valores e bytes.", tasks: ["Converta cinco valores entre binário e hex.", "Mostre signed/unsigned em 8 e 32 bits.", "Grave qwords e anote o dump little endian."], evidence: "Tabela com largura, valor lógico, bytes em endereços crescentes e flags esperadas." }
  }),

  "asm-registers": guide({
    thesis: "Registradores são o estado de trabalho imediato da CPU; a ISA define nomes e efeitos, enquanto a ABI decide quais carregam argumentos, retornos e valores preservados.",
    context: [
      "x86-64 possui RAX, RBX, RCX, RDX, RSI, RDI, RSP, RBP, RIP e R8–R15. Subregistradores acessam partes: EAX, AX, AL; escrever EAX zera automaticamente a metade alta de RAX.",
      "RIP aponta à próxima instrução no modelo arquitetural, RSP ao topo da stack e RBP pode servir de frame pointer. Compilers frequentemente reutilizam RBP como registrador geral quando unwind permite."
    ],
    flow: ["instruction bytes at RIP", "decode", "read registers", "execute", "write registers", "advance/replace RIP"],
    topicNotes: {
      "RAX–R15": "RAX–R15 têm 64 bits e papéis convencionais, não tipos permanentes. RAX costuma carregar retorno; R8–R15 só existem no modo 64-bit.",
      RIP: "RIP seleciona o fluxo e suporta addressing relativo, essencial para código position-independent. call, ret, branch, exception e interrupt mudam seu curso.",
      RSP: "RSP referencia o topo da stack corrente. Calls, pushes, locals e alignment o movem; código deve restaurá-lo exatamente segundo a ABI.",
      RBP: "RBP pode ancorar o frame e simplificar unwind/debug, mas não é obrigatório. Se for callee-saved, qualquer função que o altere precisa preservá-lo.",
      "x86 vs x86-64": "x86 usa registradores/endereços de 32 bits e ABIs frequentemente stack-based; x86-64 amplia espaço, registradores e argumentos em registers, com regras diferentes por SO."
    },
    code: { language: "asm", filename: "registers.asm", source: `mov rax, 0xFFFF000012345678
mov eax, 7              ; RAX = 0000000000000007
mov al, 0xFF            ; RAX = 00000000000000FF

lea rdx, [rel message]  ; RIP-relative address
mov r10, [rdx]          ; load 8 bytes from memory`, explanation: "Observe o efeito parcial de AL e o zero-extension especial de EAX. lea calcula um endereço; não lê o conteúdo apontado." },
    mechanics: [{ title: "Fetch", detail: "RIP identifica bytes em memória executável e o frontend os busca." }, { title: "Decode", detail: "A instrução revela operandos, larguras e dependências de registers/flags." }, { title: "Execute", detail: "Unidades funcionais calculam resultados ou endereços efetivos." }, { title: "Retire", detail: "Estado arquitetural se torna observável em ordem, mesmo com execução interna fora de ordem." }],
    invariants: ["RSP respeita alinhamento e aponta para armazenamento válido nos pontos exigidos.", "Registradores não voláteis alterados são salvos/restaurados.", "A largura da escrita é considerada ao rastrear o valor completo."],
    pitfalls: [{ title: "Dar papel fixo ao register", detail: "RCX é argumento em Windows x64, mas pode ser temporário depois da última utilização." }, { title: "Esperar escrever AH com qualquer encoding", detail: "High-byte registers têm restrições com prefixo REX; prefira registradores baixos modernos." }],
    practice: { prompt: "Trace um bloco no Assembly Visualizer.", tasks: ["Registre RAX–R15 antes/depois.", "Explique cada alteração de RIP/RSP.", "Repita em 32-bit e anote diferenças de ABI."], evidence: "Tabela por instrução com reads, writes, largura e estado resultante." }
  }),

  "asm-flags": guide({
    thesis: "Instruções transformam operandos e, muitas vezes, RFLAGS; branches apenas interpretam essas condições segundo relações signed ou unsigned.",
    context: [
      "mov transfere dados; lea calcula endereços sem acessar memória; add/sub/imul/idiv fazem aritmética; and/or/xor/not e shl/shr trabalham em bits. cmp é subtração sem guardar resultado; test é AND sem guardar resultado.",
      "ZF indica zero, SF o bit de sinal, CF carry/borrow unsigned, OF overflow signed e PF paridade do byte baixo. je/jne usam ZF; jl/jg interpretam SF e OF; jb/ja seriam as versões unsigned."
    ],
    flow: ["operands", "ALU", "result", "RFLAGS", "jcc condition", "next RIP"],
    topicNotes: {
      "mov / lea": "mov copia valor entre register/memory/immediate dentro das combinações permitidas. lea executa a fórmula base + index*scale + displacement e não muda flags.",
      "add / sub / imul / idiv": "add/sub atualizam flags; imul oferece formas signed e pode sinalizar truncamento; idiv usa dividendos implícitos e exige extensão correta antes da divisão.",
      "and / or / xor": "Operações lógicas implementam máscaras. xor reg,reg zera sem dependência do valor anterior; test reg,reg verifica zero/sinal sem alterar o register.",
      "jmp / jcc": "jmp sempre troca RIP; jcc consulta flags. je/jne testam igualdade, jg/jge/jl/jle são comparações signed após cmp.",
      "ZF CF OF SF PF": "Flags pertencem ao resultado da última instrução que as definiu. Consulte documentação: algumas instruções preservam, limpam ou deixam flags indefinidas."
    },
    code: { language: "asm", filename: "max-signed.asm", source: `; int max(int a, int b) — System V: edi, esi
mov eax, esi
cmp edi, esi       ; computes edi - esi for flags
jle .done          ; signed: ZF=1 or SF!=OF
mov eax, edi
.done:
ret`, explanation: "Trocar jle por jbe mudaria para comparação unsigned. Os mesmos bits podem ordenar de forma diferente dependendo da condição escolhida." },
    mechanics: [{ title: "Ler", detail: "Operands vêm de registers, immediate ou um único operando de memória." }, { title: "Calcular", detail: "ALU produz resultado na largura da instrução." }, { title: "Sinalizar", detail: "Flags registram propriedades unsigned, signed, zero, sinal e paridade." }, { title: "Desviar", detail: "jcc avalia uma fórmula de flags e escolhe target ou fallthrough." }],
    invariants: ["A condição signed/unsigned corresponde ao tipo lógico.", "Nenhuma instrução entre cmp/test e jcc destrói as flags necessárias.", "idiv recebe dividendo corretamente estendido e divisor não zero."],
    pitfalls: [{ title: "Usar inc antes de branch de carry", detail: "inc/dec não atualizam CF; use add/sub quando CF fizer parte do contrato." }, { title: "Achar que lea lê ponteiro", detail: "lea só calcula o endereço efetivo; mov [addr] é que acessa memória." }],
    practice: { prompt: "Implemente condições e loop apenas com instruções básicas.", tasks: ["Trace flags após cmp/test.", "Compare versões signed e unsigned.", "Explique mov, lea, push, pop, call, ret e nop no stepper."], evidence: "Casos de borda para 0, -1, INT_MIN/MAX com flags previstas e observadas." }
  }),

  "asm-memory": guide({
    thesis: "Todo acesso x86 calcula um endereço efetivo a partir de base, índice, escala e deslocamento; stack e heap diferem em gestão, não no mecanismo de load/store da CPU.",
    context: [
      "O formato geral [base + index*scale + displacement] expressa arrays, campos e tabelas. A instrução define quantos bytes são lidos/escritos; o endereço não carrega tamanho.",
      "push decrementa RSP e armazena; pop lê e incrementa. call empilha o endereço de retorno e ret o desempilha. Frames também incluem locals, spills, saved registers e padding para alinhamento."
    ],
    flow: ["base/index/scale/disp", "effective VA", "TLB/MMU", "cache", "load/store", "register"],
    topicNotes: {
      "addressing modes": "x86 admite base + index vezes 1/2/4/8 + displacement. RIP-relative torna referências a dados independentes da base de carregamento.",
      stack: "A stack x86-64 cresce para endereços menores. Seu conteúdo só é seguro dentro dos limites e lifetimes dos frames; unwind depende de regras da ABI.",
      heap: "Heap é memória dinâmica fornecida por allocator. Assembly recebe apenas pointer e size; metadados, ownership e free continuam responsabilidade do programa/runtime.",
      "push / pop": "Em 64-bit, push/pop alteram RSP em oito bytes para operandos usuais. Pares desequilibrados quebram retorno e alignment.",
      alignment: "Windows x64 e System V exigem RSP alinhado a 16 bytes em pontos definidos. SIMD pode exigir ou se beneficiar de alinhamento maior para buffers."
    },
    code: { language: "asm", filename: "array.asm", source: `; rdi = base, rsi = index (System V)
mov eax, [rdi + rsi*4]       ; int value = base[index]
lea rdx, [rdi + rsi*4 + 4]  ; &base[index + 1]

push rbp
mov rbp, rsp
sub rsp, 32                  ; local storage, preserve alignment
; ...
mov rsp, rbp
pop rbp
ret`, explanation: "O primeiro operando acessa quatro bytes; lea apenas calcula o próximo endereço. O frame mostrado é didático e pode ser omitido pelo optimizer." },
    mechanics: [{ title: "Calcular EA", detail: "Address-generation unit soma base, índice escalado e displacement." }, { title: "Traduzir", detail: "TLB/MMU convertem VA e verificam page permissions." }, { title: "Acessar cache", detail: "Cache hierarchy atende ou busca a linha; alinhamento pode cruzar duas linhas/páginas." }, { title: "Atualizar stack", detail: "push/pop/call/ret combinam acesso com mudança de RSP/RIP." }],
    invariants: ["O range inteiro do operando pertence a um objeto válido.", "RSP retorna ao valor esperado antes de ret.", "Alignment da ABI vale em toda call boundary."],
    pitfalls: [{ title: "Confundir [] entre sintaxes", detail: "Intel usa brackets para memória; AT&T usa parênteses e ordem de operandos invertida." }, { title: "Salvar endereço de local", detail: "Após retornar, o frame acabou; o número pode existir, mas o objeto não." }],
    practice: { prompt: "Trace array, struct e stack frame.", tasks: ["Calcule dez effective addresses manualmente.", "Observe memória tocada por call/ret.", "Cause e corrija desalinhamento em função SIMD própria."], evidence: "Mapa de stack por offset e tabela fórmula → VA → bytes acessados." }
  }),

  "asm-syntax": guide({
    thesis: "Intel e AT&T descrevem a mesma semântica com notações diferentes; NASM, MASM e GAS também diferem em directives, objetos e integração, não na CPU final.",
    context: [
      "Intel normalmente escreve destino primeiro, usa brackets para memória e tamanho por keywords; AT&T escreve source primeiro, prefixa registers/immediates e usa suffix de largura. Disassemblers podem alternar a apresentação sem mudar bytes.",
      "NASM é comum em fluxos multiplataforma, MASM integra ao ecossistema Microsoft e GAS acompanha GNU binutils, com syntax AT&T por padrão e opção Intel. Directives pertencem ao assembler e formato de objeto."
    ],
    flow: ["assembly source", "assembler", "object format", "symbols/relocations", "linker", "machine code"],
    topicNotes: {
      "Intel syntax": "mov rax, [rbx+8] lê memória no source à direita e escreve RAX. size qualifiers resolvem operandos de memória ambíguos.",
      "AT&T syntax": "movq 8(%rbx), %rax expressa a mesma instrução: source, destination; % marca registers, $ marca immediates e q indica 64 bits.",
      NASM: "NASM usa sections, global/extern e formatos como elf64 ou win64. Ele não infere ABI: seu código precisa seguir a convenção do target.",
      MASM: "MASM produz COFF para Windows e oferece directives/procedures próprias. Em x64, o unwind correto exige prologue metadata compatível.",
      GAS: "GNU as integra GCC/Clang, ELF/COFF e inline assembly. .intel_syntax noprefix muda notação, mas directives GAS permanecem."
    },
    code: { language: "asm", filename: "same-bytes.asm", source: `; Intel / NASM
mov rax, [rbx + rcx*4 + 8]
add rax, 5

# AT&T / GAS
movq 8(%rbx,%rcx,4), %rax
addq $5, %rax

# ambos codificam a mesma operação para os mesmos registers`, explanation: "Compare o objeto com objdump -Mintel e objdump no modo padrão. O decoder muda a impressão, não os opcodes." },
    mechanics: [{ title: "Parse", detail: "Assembler interpreta mnemonics, operand notation, labels e directives." }, { title: "Encode", detail: "Seleciona opcode, prefixos, ModR/M, SIB e immediates/displacements." }, { title: "Emitir objeto", detail: "Sections recebem bytes; símbolos e referências pendentes viram relocations." }, { title: "Linkar", detail: "Linker combina objetos C/C++/ASM pela ABI e formato compatível." }],
    invariants: ["Arquitetura, object format e ABI do assembler coincidem com o linker.", "Símbolos exportados usam nomes/visibility esperados.", "A comparação de sintaxes parte da semântica e dos bytes, não da aparência."],
    pitfalls: [{ title: "Misturar directive e instrução", detail: "db/.byte emite dados e não é executado pelo assembler; section/global também não são opcodes." }, { title: "Usar inline asm como arquivo asm", detail: "Compiler impõe constraints, clobbers e syntax própria; omissões podem causar miscompilation." }],
    practice: { prompt: "Monte a mesma função em NASM e GAS ou MASM.", tasks: ["Gere objetos do mesmo target.", "Compare symbols, relocations e bytes.", "Linke ambos separadamente a um harness C."], evidence: "Comandos de build reproduzíveis e disassembly comprovando equivalência." }
  }),

  "asm-abi": guide({
    thesis: "Calling convention é um protocolo binário: define onde vivem parâmetros e retorno, quem preserva registers, como a stack é alinhada e como unwind atravessa frames.",
    context: [
      "Windows x64 passa os quatro primeiros argumentos integer/pointer em RCX, RDX, R8 e R9 e reserva 32 bytes de shadow space. System V AMD64 usa RDI, RSI, RDX, RCX, R8 e R9 e permite uma red zone de 128 bytes em leaf functions.",
      "Ambas retornam inteiros/pointers em RAX e exigem alinhamento de 16 bytes segundo pontos específicos. Caller-saved pode ser destruído pela chamada; callee-saved precisa voltar ao valor de entrada."
    ],
    flow: ["caller arguments", "registers/stack", "call pushes return", "callee frame", "RAX return", "ret to caller"],
    topicNotes: {
      "Windows x64": "RCX, RDX, R8, R9 carregam integer args; XMM0–3 carregam floating args por posição. RDI/RSI são nonvolatile e unwind metadata é parte essencial do contrato.",
      "System V AMD64": "RDI, RSI, RDX, RCX, R8, R9 carregam integer args; XMM0–7 floating. RDI/RSI são volatile e a red zone não deve ser usada por interrupt/kernel contexts.",
      "shadow space": "O caller Windows reserva 32 bytes antes de toda call, mesmo quando há menos de quatro argumentos. O callee pode usá-los como home slots.",
      "stack frame": "Frame organiza return address, saved registers, locals, spilled args e padding. Frame pointer é opcional, mas unwind precisa descrever alterações.",
      "call / ret": "call empilha o endereço seguinte e muda RIP; ret lê o endereço do topo. Um mismatch de stack transforma dados em control flow inválido."
    },
    code: { language: "asm", filename: "sum-abis.asm", source: `; Windows x64: int sum(int a, int b)
mov eax, ecx
add eax, edx
ret

; System V AMD64: int sum(int a, int b)
mov eax, edi
add eax, esi
ret`, explanation: "A operação é idêntica, mas os registers de entrada mudam. Retorno EAX zera a metade alta e representa o int de 32 bits." },
    mechanics: [{ title: "Preparar", detail: "Caller posiciona args, reserva stack args/shadow space e mantém alignment." }, { title: "Chamar", detail: "call salva return address e transfere para o symbol resolvido." }, { title: "Preservar", detail: "Callee salva apenas registers nonvolatile que realmente altera e descreve unwind." }, { title: "Retornar", detail: "Resultado entra no register definido, stack é restaurada e ret recupera RIP." }],
    invariants: ["A assinatura C/C++ e a ABI concordam sobre tipos e classificação de argumentos.", "RSP está alinhado antes de chamadas internas.", "Todo nonvolatile modificado é restaurado em todos os caminhos."],
    pitfalls: [{ title: "Copiar prólogo entre ABIs", detail: "Shadow space, red zone, preserved set e unwind mudam por plataforma." }, { title: "Esquecer varargs/struct returns", detail: "Agregados, variádicas e vetores têm regras de classificação adicionais; consulte a ABI oficial." }],
    practice: { prompt: "Compare uma chamada de seis argumentos em Windows e Linux.", tasks: ["Desenhe registers e stack antes de call.", "Implemente callee ASM chamada por C++.", "Valide unwind e preserved registers."], evidence: "Harness automatizado e dois diagramas de frame com alignment calculado." }
  }),

  "asm-compiler": guide({
    thesis: "Compiler transforma semântica C/C++ em IR, seleciona instruções e registra machine code; otimização muda a forma sem mudar comportamento observável definido.",
    context: [
      "-O0 preserva estrutura para debugging e produz spills/prologues extras. -O1/-O2/-O3 ampliam analyses, inlining e vectorization; -Os prioriza tamanho. Output diferente não prova performance diferente.",
      "Opcode é parte da codificação da instrução, junto a prefixos, ModR/M, SIB, displacement e immediate. Disassembler percorre bytes e reconstrói uma representação textual aproximada."
    ],
    flow: ["C/C++", "frontend", "IR", "optimizer", "instruction selection", "machine bytes", "CPU"],
    topicNotes: {
      compiler: "GCC, Clang e MSVC implementam frontends, optimizers e backends diferentes sob a mesma ABI alvo. Compare versões e flags registradas.",
      optimization: "Otimização explora as regras da linguagem: undefined behavior permite remover caminhos impossíveis. Meça -O0, -O1, -O2, -O3 e -Os com workload real.",
      opcodes: "Opcode identifica uma família/operação, mas não necessariamente toda a instrução. Registradores e addressing frequentemente ficam em ModR/M/SIB.",
      "instruction bytes": "x86 tem tamanho variável de 1 a 15 bytes. Prefixos, immediates e displacements influenciam length e fronteiras.",
      disassembly: "Disassembly recupera instruções, não source original. Tipos, nomes, macros e estrutura podem ter desaparecido ou sido combinados."
    },
    code: { language: "cpp", filename: "soma.cpp", source: `int soma(int a, int b) {
    return a + b;
}

// MSVC x64 aproximado:
// 8B C1       mov eax, ecx
// 03 C2       add eax, edx
// C3          ret`, explanation: "Selecione compiler e otimização no laboratório. Compare source, assembly, bytes, tamanho e um benchmark antes de concluir qual build é melhor." },
    mechanics: [{ title: "Lowering", detail: "Frontend converte tipos, control flow e objetos em IR com semântica explícita." }, { title: "Otimizar", detail: "Passes propagam constantes, removem mortos, inline e transformam loops." }, { title: "Selecionar", detail: "Backend escolhe instructions, registers e scheduling para target/microarchitecture." }, { title: "Emitir", detail: "Assembler/encoder gera bytes, symbols, relocations e debug/unwind metadata." }],
    invariants: ["Comparações usam mesma ABI, target e assumptions.", "Benchmark impede dead-code elimination e aquece/repete adequadamente.", "Bytes são decodificados a partir de uma fronteira comprovada."],
    pitfalls: [{ title: "Julgar por número de instruções", detail: "Throughput, latency, dependencies, cache e branch behavior importam mais que contagem crua." }, { title: "Aprender pelo -O0", detail: "É didático para frames, mas não representa como código de produção normalmente executa." }],
    practice: { prompt: "Faça uma matriz compiler × optimization.", tasks: ["Compare GCC/Clang/MSVC quando disponíveis.", "Anote assembly e bytes de -O0…-O3/-Os.", "Explique diferenças com IR ou optimization remarks."], evidence: "Tabela de tamanho, instruções relevantes, tempo medido e hipótese confirmada/refutada." }
  }),

  "asm-syscalls": guide({
    thesis: "Uma syscall é uma transição controlada do user mode para um serviço do kernel; wrappers de API estabilizam contratos que seriam frágeis se a aplicação dependesse diretamente do mecanismo interno.",
    context: [
      "No Linux x86-64, syscall usa uma ABI específica para número, argumentos e retorno; libc adiciona conveniência, compatibilidade, cancellation e errno. read/write/open/close/mmap/munmap/fork/execve/socket são interfaces, não instruções comuns.",
      "No Windows, aplicações normalmente chamam Win32; a implementação pode atravessar KernelBase/Kernel32, ntdll, Native API e syscall. Números de serviço variam entre builds e não são contrato público estável."
    ],
    flow: ["application", "documented API", "user-mode wrapper", "syscall transition", "kernel service", "return/status"],
    topicNotes: {
      syscall: "A instrução syscall troca RIP/RFLAGS conforme MSRs e entra em um stub privilegiado. A ABI do SO define registers; a instrução sozinha não sabe read ou write.",
      interrupts: "Hardware interrupts são assíncronos; exceptions/traps surgem da execução; system calls são entradas síncronas intencionais. Todos exigem salvar contexto e escolher handler.",
      "user mode": "User mode não pode executar instruções privilegiadas nem mapear arbitrary physical memory. Pages e handles limitam o que o processo alcança.",
      "kernel mode": "Kernel valida ponteiros, tamanhos, handles e permissions antes de operar. Um bug kernel tem impacto maior, por isso a boundary é estreita.",
      "Native API": "Native API é a camada de serviços exposta por ntdll a componentes Windows; parte é documentada para usos específicos, mas Win32 permanece o contrato preferido da aplicação."
    },
    code: { language: "asm", filename: "linux-write.asm", source: `; Linux x86-64, demonstrativo
mov eax, 1          ; __NR_write for this target/build contract
mov edi, 1          ; fd
lea rsi, [rel msg]  ; buffer
mov edx, msg_len    ; count
syscall
test rax, rax
js .error`, explanation: "O exemplo é específico de Linux x86-64. Em código portável, prefira libc; no Windows, não codifique IDs fixos de syscall." },
    mechanics: [{ title: "Empacotar", detail: "Wrapper converte tipos de API para registers/structures da ABI de serviço." }, { title: "Transicionar", detail: "syscall muda nível e salta a um entry point kernel controlado." }, { title: "Validar/executar", detail: "Kernel captura argumentos, autoriza e chama subsistema/driver apropriado." }, { title: "Retornar", detail: "Status volta ao wrapper, que pode traduzi-lo em errno, BOOL/GetLastError ou exceção de runtime." }],
    invariants: ["Nenhum ponteiro user é confiado sem captura/validação pelo kernel.", "Aplicação usa API documentada e não IDs Windows fixos.", "Erro é interpretado no domínio correto e no momento correto."],
    pitfalls: [{ title: "Confundir syscall com função", detail: "call não muda privilégio; syscall é uma instrução de transição com ABI especial." }, { title: "Usar GetLastError tarde", detail: "No Win32, leia imediatamente após uma API que documenta seu uso; outra chamada pode sobrescrever o valor." }],
    practice: { prompt: "Siga uma operação de arquivo pelas camadas.", tasks: ["Trace libc/Linux com strace.", "Trace Win32 conceitualmente sem IDs fixos.", "Compare status kernel e erro da API."], evidence: "Dois diagramas com registers/arguments, boundary e ponto de validação." }
  }),

  "asm-simd": guide({
    thesis: "SIMD executa a mesma operação sobre várias lanes; o ganho surge quando dados, alinhamento, branches e largura de trabalho alimentam as unidades vetoriais sem criar gargalo de memória.",
    context: [
      "SSE/SSE2 usam XMM de 128 bits; AVX/AVX2 introduzem VEX e YMM de 256 bits; AVX-512 amplia para ZMM, masks e recursos que variam por CPU. Dispatch deve verificar suporte de hardware e sistema operacional.",
      "Auto-vectorization depende de aliasing, trip count, alignment e matemática permitida. Vetorizar aumenta throughput potencial, mas pode elevar pressão de registers, frequência, code size e tail handling."
    ],
    flow: ["scalar data", "contiguous lanes", "vector load", "SIMD operation", "horizontal/tail", "vector store"],
    topicNotes: {
      SIMD: "Uma instrução trata um register como lanes de bytes, ints ou floats. Não é paralelismo de threads; acontece dentro do fluxo de uma core.",
      "SSE/SSE2": "SSE foca floats e SSE2 acrescenta double/integer amplamente, baseline em x86-64. Instruções legacy podem criar dependências diferentes das formas VEX.",
      "AVX/AVX2": "AVX estende floating a 256 bits; AVX2 amplia integer. vzeroupper evita penalidades de transição em alguns caminhos que misturam AVX e SSE legacy.",
      "AVX-512": "AVX-512 é um conjunto de subsets, não uma feature única universal. Masks e 512 bits são poderosos, mas exigem runtime dispatch e medição de frequência/energia.",
      "aligned memory": "Loads modernos frequentemente aceitam unaligned, porém cruzar cache line/page pode custar. Alinhamento continua obrigatório para algumas instruções e útil para layout."
    },
    code: { language: "cpp", filename: "vector-add.cpp", source: `void add(float *out, const float *a, const float *b, std::size_t n) {
    for (std::size_t i = 0; i < n; ++i)
        out[i] = a[i] + b[i];
}

// Compile com -O3 -march=native -fopt-info-vec
// e confirme vector loop, remainder e alias checks.`, explanation: "Comece com C++ claro, consulte o relatório do vectorizer e o disassembly. Intrinsics entram quando o compiler não expressa a estratégia medida." },
    mechanics: [{ title: "Provar independência", detail: "Compiler verifica que iterações e pointers não têm aliases conflitantes." }, { title: "Carregar lanes", detail: "Dados contíguos entram em XMM/YMM/ZMM, alinhados ou com estratégia unaligned." }, { title: "Executar", detail: "Unidades SIMD processam lanes; throughput depende de ports e dependencies." }, { title: "Finalizar tail", detail: "Resto escalar, masked operation ou loop peel cobre elementos fora do múltiplo vetorial." }],
    invariants: ["Runtime só executa ISA suportada por CPU e estado do SO.", "Aliasing/alignment assumptions são verdadeiras e expressas ao compiler.", "Resultado respeita precisão e regras floating exigidas."],
    pitfalls: [{ title: "Assumir 2× largura = 2× rápido", detail: "Memory bandwidth, downclock e dependencies podem dominar; meça ciclos e bytes." }, { title: "Ler além do buffer no tail", detail: "Mesmo que lanes extras sejam ignoradas, o load pode cruzar página inválida." }],
    practice: { prompt: "Vetorize soma e dot product progressivamente.", tasks: ["Meça scalar, auto-vectorized e intrinsic.", "Teste aligned/unaligned e tails.", "Implemente runtime dispatch para baseline/AVX2."], evidence: "Disassembly, relatório do compiler e benchmark com tamanhos dentro/fora de cache." }
  }),

  "asm-capstone": guide({
    thesis: "Otimização e ferramentas binárias confiáveis nascem de um ciclo: medir, formular hipótese, construir um modelo pequeno, comparar com referência e preservar casos de regressão.",
    context: [
      "Microarquitetura implementa a ISA com caches, predictors, decoders, execution ports, reorder buffer e speculation. A ISA diz o resultado; performance counters e benchmarks revelam como uma CPU específica chegou lá.",
      "Uma VM ou emulator educacional torna fetch/decode/execute explícito. Um disassembler é só o decoder e formatter; ele não executa nem prova intenção. Limite o subset e teste cada opcode exaustivamente."
    ],
    flow: ["measurement", "hypothesis", "instruction model", "experiment", "counter evidence", "regression"],
    topicNotes: {
      profiling: "Perfis amostrais encontram onde tempo é gasto; tracing explica sequência; counters estimam stalls/misses. Otimize o hot path representativo, não o trecho visualmente complexo.",
      microarchitecture: "Latency mede dependência; throughput mede ritmo independente. Cache misses, branch mispredicts e frontend/backend pressure exigem evidências diferentes.",
      VM: "VM define bytecode, registers/stack, memory, traps e deterministic stepping. O formato deve ser validado antes de executar instruções do laboratório.",
      emulator: "Emulator mantém estado arquitetural e aplica semântica opcode por opcode. Flags, largura, faults e endianness fazem parte do resultado testável.",
      disassembler: "Decoder retorna endereço, bytes, mnemonic, operands e tamanho. Inputs truncados ou inválidos produzem erro sem avançar de modo inconsistente."
    },
    code: { language: "cpp", filename: "tiny-vm.cpp", source: `enum class Op : uint8_t { mov_ri = 0x10, add_rr = 0x20, halt = 0xff };

StepResult step(Cpu &cpu, std::span<const uint8_t> code) {
    if (cpu.ip >= code.size()) return Fault::fetch;
    switch (static_cast<Op>(code[cpu.ip++])) {
      case Op::halt: return StepResult::halted;
      case Op::add_rr: return decode_add(cpu, code);
      case Op::mov_ri: return decode_mov(cpu, code);
      default: return Fault::invalid_opcode;
    }
}`, explanation: "Decode helpers validam todos os bytes antes de commit. O visualizer pode exibir um StepResult com registers, flags e memória modificados." },
    mechanics: [{ title: "Medir", detail: "Colete distribuição, ambiente, counters e variância antes de alterar." }, { title: "Modelar", detail: "Defina ISA pequena e estado com semântica inequívoca." }, { title: "Executar/decodificar", detail: "Valide, produza efeitos temporários e commit atomicamente ou retorne fault." }, { title: "Comparar", detail: "Differential tests confrontam emulator/disassembler com fixtures ou referência conhecida." }],
    invariants: ["Decoder nunca lê além do buffer.", "Fault não deixa estado parcialmente alterado sem documentação.", "Toda otimização mantém resultado e melhora uma métrica relevante repetidamente."],
    pitfalls: [{ title: "Emular x86 inteiro de início", detail: "O espaço é enorme; use uma ISA didática e expanda com testes." }, { title: "Benchmark sem baseline estável", detail: "Turbo, background load, warmup e otimização do compiler podem dominar pequenas diferenças." }],
    practice: { prompt: "Construa CPU emulator e opcode explorer integrados.", tasks: ["Implemente 8 opcodes, flags e faults.", "Mostre address/bytes/instruction/operands/size.", "Adicione step, reset, trace e differential tests."], evidence: "Suite por opcode, snapshots de estado e relatório de profile antes/depois de uma otimização." }
  })
};
