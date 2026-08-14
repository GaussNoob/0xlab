import { describe, expect, it } from "vitest";
import { createInitialCpuState, inferCTrace, parseAssembly, replaceRegister, snapshotAfter, stepCpu } from "./simulator";

describe("low-level CPU simulator", () => {
  it("steps deterministic arithmetic and flags without claiming native state", () => {
    const snapshots = snapshotAfter("mov rax, 10\nmov rbx, 20\nadd rax, rbx\ncmp rax, 30\nret");
    expect(snapshots.at(-1)?.state.registers.RAX).toBe(30n);
    expect(snapshots.at(-2)?.state.flags.ZF).toBe(1);
    expect(snapshots[3]?.event?.changedRegisters).toContain("RAX");
  });

  it("models the x86-64 zero-extension caused by a 32-bit register write", () => {
    const program = parseAssembly("mov eax, 1");
    const initial = replaceRegister(createInitialCpuState(), "RAX", 0xffffffffffffffffn);
    const result = stepCpu(program, initial);
    expect(result.state.registers.RAX).toBe(1n);
  });

  it("preserves snapshots through a conditional loop", () => {
    const snapshots = snapshotAfter("mov rax, 0\nmov rcx, 3\nloop:\nadd rax, rcx\ndec rcx\ncmp rcx, 0\njne loop\nret");
    expect(snapshots.at(-1)?.state.registers.RAX).toBe(6n);
    expect(snapshots.at(-1)?.state.halted).toBe(true);
    expect(snapshots.length).toBeGreaterThan(8);
  });

  it("infers only abstract C events and never emits a process address", () => {
    const events = inferCTrace("int *ptr = malloc(sizeof *ptr);\n*ptr = 42;\nfree(ptr);");
    expect(events.map((event) => event.kind)).toEqual(["allocation", "write", "free"]);
    expect(events.map((event) => event.detail).join(" ")).not.toMatch(/0x[\da-f]+/i);
  });
});
