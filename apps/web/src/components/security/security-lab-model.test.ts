import { describe, expect, it } from "vitest";
import { parseLabFrame, runC2, simulateStackOverflow } from "./security-lab-model";

describe("security lab educational models", () => {
  it("marks saved RBP and return address only after the 8-byte buffer in the vulnerable model", () => {
    const short = simulateStackOverflow("ABCD", false);
    expect(short.rbpHit).toBe(false);
    expect(short.retHit).toBe(false);
    expect(short.asan).toBeNull();

    const rbp = simulateStackOverflow("AAAAAAAAA", false);
    expect(rbp.rbpHit).toBe(true);
    expect(rbp.retHit).toBe(false);

    const ret = simulateStackOverflow("A".repeat(17), false);
    expect(ret.retHit).toBe(true);
    expect(ret.asan).toContain("stack-buffer-overflow");
  });

  it("keeps the secure copy inside the object", () => {
    const secure = simulateStackOverflow("A".repeat(24), true);
    expect(secure.rbpHit).toBe(false);
    expect(secure.retHit).toBe(false);
    expect(secure.asan).toBeNull();
    expect(secure.slots.filter((slot) => slot.region !== "buffer" && slot.byte).length).toBe(0);
  });

  it("rejects oversized lab frames only after the educational patch", () => {
    const bytes = Uint8Array.from([0x00, 0x80, 0x41, 0x41]);
    expect(parseLabFrame(bytes, false).status).toBe("CRASH");
    expect(parseLabFrame(bytes, true).status).toBe("REJECT");
  });

  it("allowlists only benign C2 commands", () => {
    expect(runC2("PING")).toBe("PONG");
    expect(runC2("ECHO")).toBe("lab-ok");
    expect(runC2("shell")).toContain("REJECT");
  });
});
