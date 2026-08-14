import { expect, test } from "@playwright/test";

test("turns the pointer topic into a deep interactive course lesson", async ({ page }) => {
  await page.goto("/learn/c/c-pointers/pointers");
  await expect(page.getByRole("heading", { name: "pointers", exact: true })).toBeVisible();
  await expect(page.getByText("Essential", { exact: true })).toBeVisible();
  await expect(page.getByText("Deep Dive", { exact: true })).toBeVisible();
  await expect(page.getByText("Low-Level", { exact: true })).toBeVisible();

  await expect(page.getByRole("heading", { name: /O ponteiro guarda onde o valor está/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Modifique o alvo por indireção/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Permita que uma função altere estado do chamador/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Percorra um array/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /lifetime dinâmico/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Acesse estado composto/ })).toBeVisible();

  const addressExample = page.locator(".lesson-example").filter({ hasText: "01_address.c" });
  await expect(addressExample.locator(".code-line-explanation")).toContainText("Crie o objeto alvo");
  await addressExample.locator('.code-line[data-selectable="true"]').filter({ hasText: "int *ptr = &value" }).click();
  await expect(addressExample.locator(".code-line-explanation")).toContainText("Declare e inicialize o ponteiro");

  const prediction = page.locator(".prediction-panel");
  await expect(prediction.getByRole("button", { name: "Conferir meu modelo" })).toBeDisabled();
  await prediction.locator("textarea").fill("x será 10 porque *ptr designa o mesmo objeto que x; o endereço não muda.");
  await prediction.getByRole("button", { name: "Conferir meu modelo" }).click();
  await expect(prediction.locator(".prediction-answer")).toContainText("x=10");

  const guided = page.locator(".exercise-card").filter({ hasText: "Trace uma escrita indireta" });
  await guided.getByRole("button", { name: "Abrir hint 1" }).click();
  await expect(guided.getByText("HINT 1", { exact: true })).toBeVisible();
  await expect(guided.getByRole("button", { name: "Show Solution" })).toBeDisabled();
  await guided.locator("textarea").fill("Vou validar NULL, registrar endereço e valor, incrementar o alvo e comparar memória antes e depois.");
  await guided.getByRole("button", { name: "Show Solution" }).click();
  await expect(guided.getByText("Solução comentada", { exact: true })).toBeVisible();

  await page.getByRole("heading", { name: "Dois objetos, um endereço que cria a ligação" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "../../artifacts/deep-pointer-lesson.png", fullPage: false });
});

test("hands executable lesson code to the playground", async ({ page }) => {
  await page.goto("/learn/c/c-pointers/pointers");
  const addressExample = page.locator(".lesson-example").filter({ hasText: "01_address.c" });
  await addressExample.getByRole("button", { name: "Open in Playground" }).click();
  await expect(page).toHaveURL(/\/playground\?source=lesson/);
  await expect(page.locator(".explorer-files")).toContainText("01_address.c");
  await expect(page.locator(".monaco-editor .view-lines")).toContainText("int value = 10");
});

test("opens a complete SQLite project blueprint", async ({ page }) => {
  await page.goto("/projects/c-sqlite-crud");
  await expect(page.getByRole("heading", { name: "CRUD SQLite em C", exact: true })).toBeVisible();
  await expect(page.getByText("Schema e migration 001", { exact: true })).toBeVisible();
  await expect(page.getByText("Connection e statements com lifetime", { exact: true })).toBeVisible();
  await expect(page.getByText("Transactions e rollback", { exact: true })).toBeVisible();
  await expect(page.getByText("Índices e query plans", { exact: true })).toBeVisible();
  await expect(page.getByText("Testes ocultos", { exact: true })).toBeVisible();
  await expect(page.getByText("EXPLAIN QUERY PLAN", { exact: true })).toBeVisible();
  await page.locator(".project-milestones").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "../../artifacts/project-sqlite-blueprint.png", fullPage: false });
});

test("requires active recall before scheduling a spaced review", async ({ page }) => {
  await page.goto("/review");
  await expect(page.getByRole("heading", { name: "Pointer arithmetic", exact: true })).toBeVisible();
  const reveal = page.getByRole("button", { name: "Revelar modelo técnico" });
  await expect(reveal).toBeDisabled();
  await page.getByPlaceholder(/Desenhe o estado/).fill("ptr + 2 avança dois elementos do array; o endereço one-past não pode sofrer dereference.");
  await reveal.click();
  await expect(page.getByText("MODELO DE RESPOSTA", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Consegui explicar/ }).click();
  await expect(page.getByRole("heading", { name: "Struct alignment", exact: true })).toBeVisible();
});

test("keeps deep lesson and project layouts usable on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 680, height: 900 });
  await page.goto("/learn/assembly/asm-flags/mov-lea");
  await expect(page.getByRole("heading", { name: "mov / lea", exact: true })).toBeVisible();
  await page.getByRole("heading", { name: /mov eax, 10/ }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "../../artifacts/deep-assembly-narrow.png", fullPage: false });

  await page.goto("/projects/cpp-thread-pool");
  await expect(page.getByRole("heading", { name: "Thread pool com shutdown verificável", exact: true })).toBeVisible();
  await page.locator(".project-architecture").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "../../artifacts/project-thread-pool-narrow.png", fullPage: false });
});

test("renders graphics comparison tables without duplicate React keys", async ({ page }) => {
  const duplicateKeyErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("same key")) duplicateKeyErrors.push(message.text());
  });

  await page.goto("/learn/graphics");
  await expect(page.getByRole("table", { name: "Comparação de APIs gráficas" })).toBeVisible();

  await page.goto("/labs/graphics?view=compare");
  await expect(page.getByRole("table", { name: "Comparador de APIs gráficas" })).toBeVisible();
  expect(duplicateKeyErrors).toEqual([]);
});
