import type { LabFile, LabPreset } from "./types";

const POINTER_BASICS = `#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int x;
    int y;
} Point;

int main(void) {
    Point *point = malloc(sizeof *point);
    if (point == NULL) return EXIT_FAILURE;

    point->x = 10;
    point->y = 20;
    printf("Point(%d, %d) @ %p\\n", point->x, point->y, (void *)point);

    free(point);
    point = NULL;
    return EXIT_SUCCESS;
}`;

export const LAB_PRESETS: readonly LabPreset[] = [
  {
    id: "pointer-basics",
    title: "Pointer Basics",
    group: "C / Memory",
    description: "Alocação, indireção e lifetime de uma struct.",
    architecture: "x86-64",
    files: [{ name: "main.c", language: "c", content: POINTER_BASICS }],
    watches: ["point", "point->x", "point->y"]
  },
  {
    id: "pointer-arithmetic",
    title: "Pointer Arithmetic",
    group: "C / Memory",
    description: "Endereçamento de arrays e escala por sizeof(int).",
    architecture: "x86-64",
    files: [{ name: "main.c", language: "c", content: `#include <stdio.h>

int main(void) {
    int values[5] = {10, 20, 30, 40, 50};
    int *cursor = values;
    for (int i = 0; i < 5; ++i) {
        printf("%d\\n", *(cursor + i));
    }
    return 0;
}` }],
    watches: ["values", "cursor", "*(cursor + 2)"]
  },
  {
    id: "stack-frames",
    title: "Stack Frames",
    group: "C / Memory",
    description: "Parâmetros, locais e endereços de retorno.",
    architecture: "x86-64",
    files: [{ name: "main.c", language: "c", content: `#include <stdio.h>

static int sum(int a, int b) {
    int result = a + b;
    return result;
}

int main(void) {
    printf("%d\\n", sum(10, 20));
    return 0;
}` }],
    watches: ["a", "b", "result"]
  },
  {
    id: "recursion",
    title: "Recursion",
    group: "C / Memory",
    description: "Crescimento e remoção de frames recursivos.",
    architecture: "x86-64",
    files: [{ name: "main.c", language: "c", content: `#include <stdio.h>

static unsigned factorial(unsigned n) {
    return n < 2 ? 1 : n * factorial(n - 1);
}

int main(void) {
    printf("%u\\n", factorial(5));
    return 0;
}` }],
    watches: ["n"]
  },
  {
    id: "struct-alignment",
    title: "Struct Alignment",
    group: "C / Memory",
    description: "Offsets, padding, alignment e representação em bytes.",
    architecture: "x86-64",
    files: [{ name: "main.c", language: "c", content: `#include <stddef.h>
#include <stdio.h>

typedef struct {
    char tag;
    int health;
    double position;
} Player;

int main(void) {
    printf("size=%zu tag=%zu health=%zu position=%zu\\n",
           sizeof(Player), offsetof(Player, tag),
           offsetof(Player, health), offsetof(Player, position));
    return 0;
}` }],
    watches: ["sizeof(Player)", "offsetof(Player, health)"]
  },
  {
    id: "buffer-overflow",
    title: "Buffer Overflow",
    group: "C / Memory",
    description: "Escrita fora do limite observada com AddressSanitizer.",
    architecture: "x86-64",
    files: [{ name: "main.c", language: "c", content: `#include <stdio.h>

int main(void) {
    char buffer[4] = {0};
    buffer[4] = 'A'; /* índice inválido: use ASan */
    puts(buffer);
    return 0;
}` }],
    watches: ["buffer", "buffer[4]"]
  },
  {
    id: "use-after-free",
    title: "Use After Free",
    group: "C / Memory",
    description: "Lifetime inválido detectado pelo sanitizer.",
    architecture: "x86-64",
    files: [{ name: "main.c", language: "c", content: `#include <stdlib.h>

int main(void) {
    int *value = malloc(sizeof *value);
    if (value == NULL) return 1;
    *value = 7;
    free(value);
    *value = 10; /* use-after-free intencional */
    return 0;
}` }],
    watches: ["value", "*value"]
  },
  {
    id: "assembly-basics",
    title: "Assembly Playground",
    group: "Assembly",
    description: "Movimentação de dados e ALU sem executável completo.",
    architecture: "x86-64",
    files: [{ name: "playground.asm", language: "asm", content: `; CPU Simulation · Intel syntax
mov rax, 10
mov rbx, 20
add rax, rbx
push rax
pop rcx
cmp rcx, 30
ret` }],
    watches: ["RAX", "RBX", "RCX", "ZF"]
  },
  {
    id: "assembly-loop",
    title: "Assembly Loops",
    group: "Assembly",
    description: "Branches e flags em um loop controlado.",
    architecture: "x86-64",
    files: [{ name: "loop.asm", language: "asm", content: `mov rax, 0
mov rcx, 5
loop_start:
add rax, rcx
dec rcx
cmp rcx, 0
jne loop_start
ret` }],
    watches: ["RAX", "RCX", "ZF"]
  },
  {
    id: "calling-convention",
    title: "Calling Convention",
    group: "Assembly",
    description: "CALL, RET, stack e registradores de argumentos System V.",
    architecture: "x86-64",
    files: [{ name: "calls.asm", language: "asm", content: `mov rdi, 12
mov rsi, 30
call sum
ret

sum:
mov rax, rdi
add rax, rsi
ret` }],
    watches: ["RDI", "RSI", "RAX", "RSP"]
  }
] as const;

export function instantiatePreset(preset: LabPreset): LabFile[] {
  return preset.files.map((file, index) => ({ ...file, id: `${preset.id}-${index}-${Date.now()}` }));
}

export function createBlankFile(language: "c" | "cpp" | "asm", index: number): LabFile {
  const extension = language === "cpp" ? "cpp" : language === "asm" ? "asm" : "c";
  const content = language === "asm"
    ? "; CPU Simulation · Intel syntax\nmov rax, 1\nret"
    : language === "cpp"
      ? "#include <iostream>\n\nint main() {\n    return 0;\n}"
      : "#include <stdio.h>\n\nint main(void) {\n    return 0;\n}";
  return { id: `file-${Date.now()}-${index}`, name: index === 1 ? `main.${extension}` : `module_${index}.${extension}`, language, content };
}
