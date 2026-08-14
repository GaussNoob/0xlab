import { expect, test } from "@playwright/test";

const representativeRoutes = [
  "/",
  "/learn",
  "/learn/c/c-pointers/pointers",
  "/playground",
  "/labs",
  "/labs/low-level",
  "/labs/memory",
  "/labs/network",
  "/labs/assembly",
  "/labs/compiler",
  "/labs/windows",
  "/labs/graphics",
  "/projects",
  "/projects/c-calculator",
  "/progress",
  "/settings"
] as const;

test("keeps functional text readable across every major product area", async ({ page }) => {
  for (const route of representativeRoutes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const undersized = await page.locator("body *").evaluateAll((elements) => elements.flatMap((element) => {
      if (!(element instanceof HTMLElement)) return [];
      const hasDirectText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
      if (!hasDirectText || element.classList.contains("sr-only")) return [];
      const rect = element.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return [];
      const size = Number.parseFloat(getComputedStyle(element).fontSize);
      return size < 10.9 ? [`${element.tagName.toLowerCase()}.${element.className}: ${size}px · ${element.textContent?.trim().slice(0, 36)}`] : [];
    }).slice(0, 20));
    expect(undersized, `Undersized text on ${route}`).toEqual([]);
  }
});
