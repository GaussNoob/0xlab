import { describe, expect, it } from "vitest";
import { validateExecutionRequest } from "./validation.js";

describe("validateExecutionRequest", () => {
  it("accepts a minimal safe C request", () => {
    const result = validateExecutionRequest({
      language: "c",
      compiler: "gcc",
      target: "linux",
      files: [{ name: "main.c", content: "int main(void) { return 0; }" }],
      flags: ["-Wall", "-std=c17"]
    });
    expect(result.compiler).toBe("gcc");
  });

  it("rejects arbitrary compiler arguments", () => {
    expect(() => validateExecutionRequest({
      language: "c",
      compiler: "gcc",
      target: "linux",
      files: [{ name: "main.c", content: "int main(void) { return 0; }" }],
      flags: ["-wrapper", "/host/attack"]
    })).toThrow(/not allowed/);
  });

  it("rejects path traversal", () => {
    expect(() => validateExecutionRequest({
      language: "c",
      compiler: "gcc",
      target: "linux",
      files: [{ name: "../main.c", content: "" }],
      flags: []
    })).toThrow(/filename/);
  });
});

