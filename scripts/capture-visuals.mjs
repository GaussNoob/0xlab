import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://host.docker.internal:3000";
const outputDirectory = process.env.VISUAL_OUTPUT_DIR ?? "/artifacts";
const routes = [
  ["home", "/"],
  ["learn", "/learn"],
  ["lesson", "/learn/c/pointers"],
  ["assembly-track", "/learn/assembly"],
  ["assembly-abi-module", "/learn/assembly/asm-abi"],
  ["assembly-windows-x64-lesson", "/learn/assembly/asm-abi/windows-x64"],
  ["windows-memory-lesson", "/learn/windows/win-memory/virtualalloc"],
  ["graphics-vulkan-lesson", "/learn/graphics/gfx-vulkan/commandbuffer"],
  ["networking-tcp-lesson", "/learn/networking/net-sockets/sockets"],
  ["playground", "/playground"],
  ["memory", "/labs/memory"],
  ["memory-stack-heap", "/labs/memory?tool=stack-heap"],
  ["memory-allocator", "/labs/memory?tool=allocator"],
  ["memory-bugs", "/labs/memory?tool=bugs"],
  ["network", "/labs/network"],
  ["assembly", "/labs/assembly?scenario=stack"],
  ["low-level-lab", "/labs/low-level"],
  ["compiler", "/labs/compiler#abi"],
  ["windows-pe", "/labs/windows?view=pe"],
  ["windows-messages", "/labs/windows?view=messages"],
  ["graphics-playground", "/labs/graphics?view=playground"],
  ["graphics-pipeline", "/labs/graphics?view=pipeline"],
  ["graphics-frame", "/labs/graphics?view=frame"],
  ["graphics-math", "/labs/graphics?view=math"],
  ["projects", "/projects"]
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {})
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const browserErrors = [];

page.on("pageerror", (error) => browserErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) browserErrors.push(message.text());
});
page.on("response", (response) => {
  if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) browserErrors.push(`${response.status()} ${response.url()}`);
});

for (const [name, route] of routes) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  if (name === "graphics-playground") {
    const valid = await page.locator(".graphics-code-pane > footer").getAttribute("data-valid");
    const shaderLog = await page.locator(".graphics-log code").textContent();
    if (valid !== "true") throw new Error(`Default graphics shader failed: ${shaderLog}`);
    console.log(`graphics shader valid=${valid} · ${shaderLog}`);
  }
  if (name.startsWith("graphics")) await page.waitForTimeout(500);
  await page.screenshot({ path: `${outputDirectory}/${name}.png`, fullPage: false });
  if (name === "playground") {
    await page.getByRole("button", { name: "C++", exact: true }).click();
    const editorInput = page.getByRole("textbox", { name: "Editor content" });
    await editorInput.focus();
    await page.keyboard.press("Control+A");
    await page.keyboard.insertText("std::ve");
    await page.getByRole("button", { name: "Mostrar sugestões do IntelliSense C++", exact: true }).click();
    await page.locator(".suggest-widget.visible").waitFor({ state: "visible" });
    await page.screenshot({ path: `${outputDirectory}/playground-intellisense.png`, fullPage: false });
  }
  if (name === "networking-tcp-lesson") {
    await page.getByRole("heading", { name: "Servidor TCP echo completo" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${outputDirectory}/networking-tcp-project.png`, fullPage: false });
  }
  if (name === "graphics-playground") {
    await page.locator(".graphics-code-pane textarea").fill("void main() { gl_FragColor = vec4(; }");
    await page.waitForFunction(() => document.querySelector(".graphics-code-pane > footer")?.getAttribute("data-valid") === "false");
    await page.screenshot({ path: `${outputDirectory}/graphics-shader-error.png`, fullPage: false });
    await page.getByRole("button", { name: "Reset shader" }).click();
    await page.waitForFunction(() => document.querySelector(".graphics-code-pane > footer")?.getAttribute("data-valid") === "true");
  }
}

await page.setViewportSize({ width: 680, height: 900 });
for (const [name, route] of [["assembly-narrow", "/labs/assembly?scenario=branch"], ["graphics-narrow", "/labs/graphics?view=pipeline"], ["curriculum-lesson-narrow", "/learn/assembly/asm-abi/windows-x64"]]) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${outputDirectory}/${name}.png`, fullPage: false });
}

await browser.close();

if (browserErrors.length > 0) {
  throw new Error(`Browser errors during visual capture:\n${[...new Set(browserErrors)].join("\n")}`);
}
