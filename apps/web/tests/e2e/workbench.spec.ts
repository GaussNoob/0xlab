import { expect, test } from "@playwright/test";

test("opens the systems workbench and pointer lesson", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Continue de onde/ })).toBeVisible();
  await page.getByRole("link", { name: "Continuar lição" }).click();
  await expect(page).toHaveURL(/\/learn\/c\/c-pointers\/pointers$/);
  await expect(page.getByRole("heading", { name: "pointers", exact: true })).toBeVisible();
  await expect(page.getByLabel("Visualização interativa de ponteiro")).toBeVisible();
});

test("keeps the pointers click inside the C curriculum tab", async ({ page, context }) => {
  await page.goto("/learn/c");
  const openPages = context.pages().length;
  await page.locator(".track-module-list").getByRole("link", { name: "pointers", exact: true }).click();
  await expect(page).toHaveURL(/\/learn\/c\/c-pointers\/pointers$/);
  expect(context.pages()).toHaveLength(openPages);
  await expect(page.locator('.tree-lesson[data-current="true"]')).toContainText("pointers");
});

test("opens the real execution playground", async ({ page }) => {
  await page.goto("/playground");
  await expect(page.getByRole("button", { name: /Compilar e executar/ })).toBeVisible();
  await expect(page.getByText(/filesystem efêmero/)).toBeVisible();
});

test("opens the integrated Low-Level Lab and keeps simulation provenance explicit", async ({ page }) => {
  await page.goto("/labs/low-level");
  await expect(page.getByText("LOW-LEVEL LAB", { exact: true })).toBeVisible();
  await expect(page.getByText("EDUCATIONAL SIMULATION", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Code Editor", { exact: true })).toBeVisible();
  await expect(page.getByText("Assembly / Machine Code", { exact: true })).toBeVisible();
  await expect(page.locator(".ll-editor-host .monaco-editor")).toBeVisible();
  await expect(page.getByLabel("Visualização 3D interativa: pointers")).toBeVisible();
  const scaleProbe = page.locator(".ll-experiment-name strong");
  const comfortableSize = await scaleProbe.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  await page.getByRole("button", { name: /Escala de texto:/ }).click();
  await expect.poll(() => scaleProbe.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThan(comfortableSize);
  await expect(page.locator(".ll-editor-host .view-line").first()).toContainText("#include");
  await page.getByRole("button", { name: /Step/ }).click();
  await expect(page.getByText(/STEP 001/)).toBeVisible();
  await page.waitForTimeout(350);
  await page.screenshot({ path: "../../artifacts/low-level-lab.png", fullPage: false });
});

test("rebuilds the 2D and 3D Low-Level Lab models while source code is edited", async ({ page }) => {
  await page.goto("/labs/low-level");
  await page.getByRole("button", { name: "Visualizar pointers" }).click();
  await page.getByRole("button", { name: "2D", exact: true }).click();

  const editorInput = page.getByRole("textbox", { name: "Editor content" });
  const pointers2d = page.locator(".ll-2d-pointers");
  await expect(pointers2d).toBeVisible();
  const initialFingerprint = await pointers2d.getAttribute("data-model-fingerprint");

  await editorInput.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText("int main(void) {\n  int total = 7;\n  int *cursor = &total;\n  return *cursor;\n}\n");
  await expect.poll(() => pointers2d.getAttribute("data-model-fingerprint")).not.toBe(initialFingerprint);
  await expect(pointers2d).toContainText("cursor");
  await expect(pointers2d).toContainText("total");
  const firstEditedFingerprint = await pointers2d.getAttribute("data-model-fingerprint");

  await page.getByRole("button", { name: "3D", exact: true }).click();
  const pointers3d = page.getByLabel("Visualização 3D interativa: pointers");
  await expect(pointers3d).toHaveAttribute("data-model-fingerprint", firstEditedFingerprint ?? "");

  await editorInput.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText("int main(void) {\n  int answer = 91;\n  int *link = &answer;\n  return *link;\n}\n");
  await expect.poll(() => pointers3d.getAttribute("data-model-fingerprint")).not.toBe(firstEditedFingerprint);
  await expect(page.locator(".ll-visualizer-caption")).toContainText("model");
});

test("runs editable packet scenarios across every Network Lab tool", async ({ page }) => {
  await page.goto("/labs/network");
  await expect(page.getByText("NETWORK LAB", { exact: true })).toBeVisible();
  await expect(page.getByText("EDUCATIONAL SIMULATION", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Topologia interativa da rede")).toBeVisible();
  const topologyScene = page.locator(".network-topology-scene");
  await expect.poll(() => topologyScene.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(300);
  await expect(topologyScene).toHaveAttribute("data-playing", "false");
  await page.screenshot({ path: "../../artifacts/network-lab-topology.png", fullPage: false });

  await page.getByRole("button", { name: /DNS query/ }).click();
  await expect(page.locator(".network-live-summary")).toContainText("UDP");
  await page.getByRole("button", { name: "Próximo passo" }).click();
  await expect(page.locator(".network-packet-summary")).toContainText("DNS QUERY");

  await page.getByRole("button", { name: "Encapsulation", exact: true }).click();
  await expect(page.getByLabel("Inspector de encapsulamento")).toContainText("UDP");
  await page.getByRole("button", { name: /Internet.*IPv4/ }).last().click();
  await expect(page.locator(".network-layer-detail")).toContainText("198.51.100.53");

  const traceBeforeEdit = await page.locator(".network-lab-header").textContent();
  await page.getByLabel("Application payload").fill("AAAA lab.changed.example");
  await expect.poll(() => page.locator(".network-lab-header").textContent()).not.toBe(traceBeforeEdit);

  await page.getByRole("button", { name: "Packet flow", exact: true }).click();
  await expect(page.getByLabel("Fluxo temporal de pacotes")).toContainText(/DNS RESPONSE/i);
  await page.getByRole("button", { name: "Socket API", exact: true }).click();
  await page.getByRole("button", { name: "Winsock", exact: true }).click();
  await expect(page.getByLabel("Comparador de APIs de socket")).toContainText("WSAStartup");
  await page.screenshot({ path: "../../artifacts/network-lab.png", fullPage: false });
});

test("offers readable C and C++ IntelliSense in the coding editor", async ({ page }) => {
  await page.goto("/playground");
  const editor = page.locator(".monaco-editor");
  await expect(editor).toBeVisible();
  await expect(page.getByText(/IntelliSense C17\/C23/)).toBeVisible();

  const initialFont = await editor.locator(".view-lines").evaluate((element) => getComputedStyle(element).fontSize);
  expect(initialFont).toBe("16px");
  await page.getByRole("button", { name: "Aumentar fonte do editor" }).click();
  await expect.poll(() => editor.locator(".view-lines").evaluate((element) => getComputedStyle(element).fontSize)).toBe("17px");

  const editorInput = page.getByRole("textbox", { name: "Editor content" });
  await editorInput.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText("#include <std");
  await page.getByRole("button", { name: "Mostrar sugestões do IntelliSense C", exact: true }).click();
  const suggestions = page.locator(".suggest-widget.visible");
  await expect(suggestions).toBeVisible();
  const stdioSuggestion = suggestions.getByRole("listitem", { name: /stdio\.h/ });
  await expect(stdioSuggestion).toBeVisible();
  await stdioSuggestion.click();
  await expect(editor.locator(".view-lines")).toContainText("#include <stdio.h>");

  await page.getByRole("button", { name: "C++", exact: true }).click();
  await expect(page.getByText(/IntelliSense C\+\+17–23/)).toBeVisible();
  await editorInput.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText("std::ve");
  await page.getByRole("button", { name: "Mostrar sugestões do IntelliSense C++", exact: true }).click();
  await expect(suggestions).toBeVisible();
  const vectorSuggestion = suggestions.getByRole("listitem", { name: /vector/ });
  await expect(vectorSuggestion).toBeVisible();
  await vectorSuggestion.click();
  await expect(editor.locator(".view-lines")).toContainText("std::vector");
});

test("steps through the memory visualizer", async ({ page }) => {
  await page.goto("/labs/memory");
  await expect(page.getByRole("heading", { name: /Veja o endereço/ })).toBeVisible();
  await page.getByRole("button", { name: "Run trace" }).click();
  await expect(page.getByText("ptr recebe &x")).toBeVisible({ timeout: 4_000 });
});

test("loads Stack/Heap, Allocator and Memory Bugs workbenches", async ({ page }) => {
  await page.goto("/labs/memory");

  await page.getByRole("button", { name: "Stack / Heap", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Stack, heap e lifetime/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Frame de função/ })).toBeVisible();
  const architecture3d = page.getByLabel("Visualização 3D interativa da arquitetura de memória");
  await expect(architecture3d).toBeVisible();
  const sceneBounds = await architecture3d.boundingBox();
  expect(sceneBounds).not.toBeNull();
  if (sceneBounds) {
    await page.mouse.move(sceneBounds.x + sceneBounds.width * .55, sceneBounds.y + sceneBounds.height * .45);
    await page.mouse.down();
    await page.mouse.move(sceneBounds.x + sceneBounds.width * .67, sceneBounds.y + sceneBounds.height * .4, { steps: 6 });
    await page.mouse.up();
    await page.mouse.wheel(0, -120);
  }
  await page.getByRole("button", { name: "Próxima etapa" }).click();
  await expect(page.locator(".memory-step-count")).toHaveText("STEP 2 / 4");
  await expect(page.getByText("saved RBP", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Allocator", exact: true }).click();
  await expect(page.getByRole("heading", { name: /allocator decidir cada byte/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Bump allocator/ })).toBeVisible();
  await page.getByRole("button", { name: "Próxima etapa" }).click();
  await page.getByRole("button", { name: "Próxima etapa" }).click();
  await expect(page.locator(".memory-step-count")).toHaveText("STEP 3 / 4");
  await expect(page.getByText("alignment padding", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Memory bugs", exact: true }).click();
  await expect(page.getByRole("heading", { name: /primeira operação inválida/ })).toBeVisible();
  await page.getByRole("button", { name: "Ir para etapa 4: guard é corrompido" }).click();
  await expect(page.getByText("Stack buffer overflow", { exact: true })).toBeVisible();
  await expect(page.getByText("guard CORRUPTED", { exact: true })).toBeVisible();

  await page.goto("/labs/memory?tool=allocator");
  await expect(page.getByRole("button", { name: "Allocator", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("steps Assembly and exposes changed CPU state", async ({ page }) => {
  await page.goto("/labs/assembly?scenario=sum");
  await expect(page.getByRole("heading", { name: /Execute a instrução/ })).toBeVisible();
  await page.getByRole("button", { name: /Step Into/ }).click();
  await expect(page.getByText("0x000000000000000a")).toBeVisible();
  await expect(page.getByText(/STEP 1\/4/)).toBeVisible();
});

test("compares compiler output, opcodes and ABIs", async ({ page }) => {
  await page.goto("/labs/compiler#abi");
  await expect(page.getByRole("heading", { name: /Veja o que o compilador/ })).toBeVisible();
  await page.getByLabel("Níveis de otimização").getByRole("button", { name: /-O0/ }).click();
  await expect(page.locator(".compiler-metrics").getByText("stack frame", { exact: true })).toBeVisible();
  await expect(page.getByRole("table", { name: "Opcodes gerados" })).toBeVisible();
  await expect(page.locator(".abi-columns").getByText(/SYSTEM V AMD64/i)).toBeVisible();
});

test("opens deep-linked Windows and graphics inspectors", async ({ page }) => {
  await page.goto("/labs/windows?view=pe");
  await expect(page.getByText("PORTABLE EXECUTABLE STRUCTURE")).toBeVisible();
  await expect(page.getByText("Optional Header", { exact: true }).first()).toBeVisible();

  await page.goto("/labs/graphics?view=pipeline");
  await expect(page.getByText("GRAPHICS PIPELINE")).toBeVisible();
  await page.getByRole("button", { name: /Rasterization/ }).first().click();
  await expect(page.getByText(/Triangles become covered fragments/)).toBeVisible();
});

test("opens real module and topic lessons from the curriculum", async ({ page }) => {
  await page.goto("/learn/assembly");
  const moduleList = page.locator(".track-module-list");
  await moduleList.getByRole("link", { name: "Funções e calling conventions", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Funções e calling conventions", exact: true })).toBeVisible();

  await page.locator(".course-topic-grid").getByRole("link", { name: /Windows x64/ }).click();
  await expect(page.getByRole("heading", { name: "Windows x64", exact: true })).toBeVisible();
  await expect(page.getByText(/RCX, RDX, R8 e R9/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Marcar como concluída/ })).toBeVisible();
});

test("opens a deep networking lesson with a complete TCP server", async ({ page }) => {
  await page.goto("/learn/networking/net-sockets/sockets");
  await expect(page.getByRole("heading", { name: "sockets", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Definição, representação, mecanismo e prova/ })).toBeVisible();
  await expect(page.getByRole("table", { name: /Contratos entre as camadas de sockets/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Servidor TCP echo completo" })).toBeVisible();
  await expect(page.locator(".code-file").filter({ hasText: "tcp_server_posix.c" })).toBeVisible();
  await expect(page.locator(".code-file").filter({ hasText: "tcp_server_win32.cpp" })).toBeVisible();
  await expect(page.locator(".code-lines").filter({ hasText: "accept(listener" }).first()).toBeVisible();

  const checkpoint = page.locator(".topic-checkpoints details").first();
  await checkpoint.locator("summary").click();
  await expect(checkpoint.locator("p")).toBeVisible();
});

test("saves a topic completion and refreshes real sidebar progress", async ({ page }) => {
  let snapshot = {
    completedLessonIds: [] as string[],
    completedExerciseIds: [] as string[],
    completedChallengeIds: [] as string[],
    studyMinutes: 0,
    lastLessonId: null as string | null,
    updatedAt: new Date(0).toISOString()
  };

  await page.route("**/api/progress", async (route) => {
    if (route.request().method() === "PUT") {
      snapshot = JSON.parse(route.request().postData() ?? "{}") as typeof snapshot;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(snapshot) });
  });

  await page.goto("/learn/assembly/asm-abi/windows-x64");
  await page.evaluate(() => {
    const lessonId = "assembly:asm-abi:windows-x64";
    window.localStorage.setItem(`0xlab.competence.${lessonId}`, JSON.stringify({ prediction: true, attempts: ["e2e-evidence"] }));
    window.dispatchEvent(new CustomEvent("0xlab:lesson-evidence", { detail: { lessonId } }));
  });
  await page.getByRole("button", { name: /Marcar como concluída/ }).click();
  await expect(page.getByRole("button", { name: /Lição concluída/ })).toBeVisible();
  await expect(page.locator('.tree-lesson[data-current="true"] .lucide-check')).toBeVisible();
  await expect(page.locator(".sidebar-progress-line > span")).toHaveText("2%");
});

test("opens the Game Security Lab input observer, W2S HUD and fictional anti-cheat", async ({ page }) => {
  await page.goto("/labs/game-security");
  await expect(page.getByRole("heading", { name: /Understand the game/ })).toBeVisible();
  await expect(page.getByText(/Lab games only/)).toBeVisible();
  await expect(page.getByLabel("Arena educacional top-down")).toBeVisible();
  await page.getByRole("button", { name: "Mini Anti-Cheat" }).click();
  await expect(page.getByText(/Bypass research/)).toBeVisible();
  await page.getByRole("button", { name: "Teleport poke" }).click();
  await expect(page.getByText(/SuspiciousInput/).first()).toBeVisible();
  await page.getByRole("button", { name: "World / Aim" }).click();
  await expect(page.getByText(/Não há assistência contra jogadores reais/)).toBeVisible();
  await expect(page.getByLabel(/World to screen overlay for TRAINING_DRONE_A/)).toBeVisible();
  await expect(page.getByText("pitch", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Input System" }).click();
  const inputObserver = page.getByLabel("Input observer do Game Security Lab");
  await inputObserver.focus();
  await page.keyboard.down("w");
  await expect(page.getByText(/W DOWN/)).toBeVisible();
  await page.keyboard.up("w");
  await page.keyboard.press("Space");
  await expect(page.getByText(/Space reconhecido · count 1/)).toBeVisible();
});

test("opens the Security Lab overflow model and keeps the sandbox charter visible", async ({ page }) => {
  await page.goto("/labs/security");
  await expect(page.getByRole("heading", { name: /Entenda\. Quebre no lab/ })).toBeVisible();
  await expect(page.getByText(/Disposable sandbox/)).toBeVisible();
  await expect(page.getByLabel("Modelo educacional de stack overflow")).toBeVisible();
  await page.getByLabel("Input do overflow educacional").fill("AAAAAAAAAAAAAAAA");
  await expect(page.getByText(/would be affected/).first()).toBeVisible();
  await page.getByRole("button", { name: "Ver versão segura" }).click();
  await expect(page.getByText(/Nenhum store fora do objeto/)).toBeVisible();
  await page.getByRole("button", { name: "Malware Analysis" }).click();
  await expect(page.getByText("FAKE_TOKEN_123")).toBeVisible();
  await expect(page.getByText(/não implica malícia|Uma API não é maliciosa/)).toBeVisible();
});
