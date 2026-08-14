import { describe, expect, it } from "vitest";
import { analyzeSourceVisualModel } from "./source-model";

describe("source-derived low-level visual model", () => {
  it("rebuilds pointer and heap nodes when edited C changes", () => {
    const source = `
      typedef struct { int x; int y; } Point;
      int main(void) {
        Point *point = malloc(sizeof(Point));
        point->x = 10;
        point->y = 20;
        return 0;
      }
    `;
    const first = analyzeSourceVisualModel(source, "c");
    const edited = analyzeSourceVisualModel(source.replace("point->x = 10", "point->x = 99"), "c");

    expect(first.fingerprint).not.toBe(edited.fingerprint);
    expect(first.heapNodeIds).toEqual(["heap:point"]);
    expect(first.edges).toContainEqual(expect.objectContaining({ from: "symbol:point", to: "heap:point", label: "points to" }));
    expect(first.nodes.find((node) => node.label === "point->x")?.value).toBe("10");
    expect(edited.nodes.find((node) => node.label === "point->x")?.value).toBe("99");
  });

  it("models pointer chains and array cells from arbitrary identifiers", () => {
    const model = analyzeSourceVisualModel(`
      int total = 20;
      int *cursor = &total;
      int **owner = &cursor;
      int values[3] = { 10, 20, 30 };
      values[1] = 77;
    `, "c");

    expect(model.pointerNodeIds).toEqual(["symbol:cursor", "symbol:owner"]);
    expect(model.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: "symbol:cursor", to: "symbol:total" }),
      expect.objectContaining({ from: "symbol:owner", to: "symbol:cursor" })
    ]));
    expect(model.memoryCells.filter((cell) => cell.ownerId === "symbol:values").map((cell) => cell.value)).toEqual(["10", "77", "30"]);
  });

  it("marks source-derived allocations as freed without inventing a native address", () => {
    const model = analyzeSourceVisualModel("int *buffer = malloc(sizeof(int) * 4);\nfree(buffer);", "c");
    const allocation = model.nodes.find((node) => node.id === "heap:buffer");

    expect(allocation?.status).toBe("freed");
    expect(model.memoryCells.filter((cell) => cell.ownerId === "heap:buffer")).toHaveLength(4);
    expect(model.nodes.map((node) => node.detail).join(" ")).toContain("no native address");
  });

  it("updates Assembly instructions, registers and memory operands", () => {
    const first = analyzeSourceVisualModel("mov rax, 5\nadd rax, rbx", "asm");
    const edited = analyzeSourceVisualModel("mov rcx, 9\nmov [rsp+8], rcx\nret", "asm");

    expect(first.registers).toEqual(["RAX", "RBX"]);
    expect(edited.registers).toEqual(["RCX", "RSP"]);
    expect(edited.instructionCount).toBe(3);
    expect(edited.memoryCells[0]?.label).toBe("[rsp+8]");
    expect(first.fingerprint).not.toBe(edited.fingerprint);
  });
});
