import assert from "node:assert/strict";

const baseUrl = process.env.SANDBOX_TEST_URL ?? "http://host.docker.internal:3000";

async function execute(source, flags = ["-Wall", "-Wextra", "-Wpedantic", "-std=c17"], compiler = "gcc") {
  const creation = await fetch(`${baseUrl}/api/executions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ language: "c", compiler, target: "linux", files: [{ name: "main.c", content: source }], flags, stdin: "" })
  });
  if (creation.status !== 202) throw new Error(`execution rejected (${creation.status}): ${await creation.text()}`);
  const { jobId } = await creation.json();
  for (let attempt = 0; attempt < 100; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const response = await fetch(`${baseUrl}/api/executions/${jobId}`);
    if (response.status !== 200) throw new Error(`poll failed (${response.status}): ${await response.text()}`);
    const job = await response.json();
    if (job.status === "completed" || job.status === "failed") return job;
  }
  throw new Error(`job ${jobId} did not finish`);
}

const success = await execute('#include <stdio.h>\nint main(void) { puts("sandbox-ok"); return 0; }\n');
assert.equal(success.result.runExitCode, 0);
assert.match(success.result.stdout, /sandbox-ok/);
assert.equal(success.result.analysis.category, "success");
assert.equal(success.result.artifacts?.provenance, "real-compiler-artifact");
assert.equal(success.result.artifacts?.addressSemantics, "link-time-virtual-address");
assert.match(success.result.artifacts?.disassembly ?? "", /<main>:/);
assert.match(success.result.artifacts?.sections ?? "", /\.text/);

const bounds = await execute(
  "int main(void) { int a[2] = {0}; a[2] = 7; return a[0]; }\n",
  ["-Wall", "-Wextra", "-g", "-O0", "-std=c17", "-fsanitize=address"]
);
assert.equal(bounds.result.analysis.category, "memory");
assert.match(bounds.result.stderr, /AddressSanitizer/);

const timeout = await execute("int main(void) { for (;;) {} }\n");
assert.equal(timeout.result.timedOut, true);
assert.equal(timeout.result.analysis.category, "timeout");

const memoryLimit = await execute(
  "#include <stdlib.h>\n#include <stddef.h>\nint main(void) { const size_t n = 512UL * 1024UL * 1024UL; volatile unsigned char *p = malloc(n); if (!p) return 2; for (size_t i = 0; i < n; i += 4096) p[i] = (unsigned char)i; free((void *)p); return 0; }\n"
);
assert.equal(memoryLimit.result.analysis.category, "memory");
assert.match(memoryLimit.result.analysis.headline, /limite de memória/);

const flood = await execute('#include <stdio.h>\nint main(void) { for (;;) puts("012345678901234567890123456789"); }\n');
assert.equal(flood.result.truncated, true);
assert.ok(flood.result.stdout.length < 140_000);

console.log(JSON.stringify({
  success: success.id,
  sanitizer: bounds.id,
  timeout: timeout.id,
  memoryLimit: memoryLimit.id,
  outputLimit: flood.id
}, null, 2));
