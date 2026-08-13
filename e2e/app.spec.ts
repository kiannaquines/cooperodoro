import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("runs the core productivity flow", async ({ page }) => {
  await expect(page.getByRole("heading", { name: /focus session timer/i })).toBeAttached();
  await page.getByLabel("New task title").fill("Write project outline");
  await page.getByLabel("Add task").click();
  await page.getByRole("button", { name: "Write project outline", exact: true }).click();
  await page.getByRole("button", { name: /^start$/i }).click();
  await expect(page.getByRole("button", { name: /pause/i })).toBeVisible();
  await page.getByRole("button", { name: /pause/i }).click();
  await expect(page.getByRole("button", { name: /resume/i })).toBeVisible();
  const pausedTime = await page.locator(".compact-clock").textContent();
  await page.reload();
  await expect(page.getByRole("button", { name: /resume/i })).toBeVisible();
  await expect(page.locator(".compact-clock")).toHaveText(pausedTime ?? "");
});

test("opens timer and alert settings", async ({ page }) => {
  await page.getByRole("button", { name: /settings/i }).click();
  await expect(page.getByRole("heading", { name: /studio settings/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /timer preset/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /alerts & flow/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^background$/i })).toHaveCount(0);
});

test("changes Cooper for each running timer phase", async ({ page }) => {
  const mascot = page.locator(".cooper-mascot");
  await expect(page.getByRole("status")).toContainText("Ready? Let's do this!");

  await page.getByRole("button", { name: /^start$/i }).click();
  await expect(mascot).toHaveAttribute("src", "/cooper-focus-chibi.webp");
  await page.getByRole("button", { name: /pause/i }).click();

  await page.getByRole("tab", { name: /short break/i }).click();
  await page.getByRole("button", { name: /^start$/i }).click();
  await expect(mascot).toHaveAttribute("src", "/cooper-short-break-chibi.webp");
  await page.getByRole("button", { name: /pause/i }).click();

  await page.getByRole("tab", { name: /long break/i }).click();
  await page.getByRole("button", { name: /^start$/i }).click();
  await expect(mascot).toHaveAttribute("src", "/cooper-long-break-chibi.webp");
});

test("switches and persists curated color themes", async ({ page }) => {
  const app = page.locator(".app-shell");
  await expect(app).toHaveAttribute("data-theme", "blueberry-cloud");

  await page.getByRole("button", { name: /settings/i }).click();
  await expect(page.getByRole("heading", { name: /color theme/i })).toBeVisible();
  await page.getByRole("radio", { name: "Matcha Cream" }).check();
  await expect(app).toHaveAttribute("data-theme", "matcha-cream");

  await page.reload();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-theme", "matcha-cream");
});

test("presents the timer as a hero before the supporting dashboard", async ({ page }) => {
  const hero = page.locator(".center-column");
  const dashboard = page.locator(".support-dashboard");

  const viewportHeight = page.viewportSize()?.height ?? 0;
  const heroBox = await hero.boundingBox();
  const dashboardBox = await dashboard.boundingBox();

  expect(heroBox?.height ?? 0).toBeGreaterThanOrEqual(viewportHeight - 100);
  expect(dashboardBox?.y ?? 0).toBeGreaterThanOrEqual((heroBox?.y ?? 0) + (heroBox?.height ?? 0));
  await expect(page.locator(".timer-focus-layout .cooper-mascot")).toBeVisible();
  await expect(page.locator(".timer-controls-panel .clock")).toBeVisible();
});
