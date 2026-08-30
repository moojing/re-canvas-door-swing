import { expect, test } from "@playwright/test";

test("preset catalog opens and closes a vanilla detail modal", async ({
  page,
}) => {
  await page.goto("/");

  const panelPreview = page.getByRole("img", {
    name: "1-1 A-1 Iron Door animation preview",
  });
  await expect(panelPreview).toBeVisible();
  await expect(panelPreview.locator("canvas")).toBeVisible();
  await expect(
    page.getByRole("img", { name: "1-1 A-1 Iron Door animation preview" })
  ).toHaveCount(1);
  await expect(
    page.getByRole("img", { name: "1-2 A-1 No-Handle Door animation preview" })
  ).toHaveCount(1);
  await expect(
    page.getByRole("img", {
      name: "1-1 A-2 Yellow Panel Knob Door animation preview",
    })
  ).toHaveCount(1);
  await expect(page.getByText("Single Lever Wood")).toHaveCount(0);
  const catalogCanvasCount = await page.locator("canvas").count();

  await page
    .getByRole("button", { name: "Open 1-1 A-1 Iron Door" })
    .click();

  const dialog = page.getByRole("dialog", { name: "1-1 A-1 Iron Door" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("canvas")).toBeVisible();

  await page.getByRole("button", { name: "Close preset detail" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveCount(catalogCanvasCount);
});

test("preset detail lets users scrub the animation timeline", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open 1-1 A-1 Iron Door" })
    .click();

  const timeline = page.getByRole("slider", {
    name: "Animation progress",
  });
  await expect(timeline).toHaveValue("0");

  await timeline.fill("50");
  await expect(timeline).toHaveValue("50");
  await expect(page.getByText("50%", { exact: true })).toBeVisible();
});

test("mobile preset detail keeps its close control within the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open 1-1 A-1 Iron Door" })
    .click();

  const closeButton = page.getByRole("button", {
    name: "Close preset detail",
  });
  const bounds = await closeButton.boundingBox();

  expect(bounds).not.toBeNull();
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(390);
});

test("full-screen transition plays the selected preset before navigating", async ({
  page,
}) => {
  await page.goto("/");

  await page
    .getByRole("button", {
      name: "Start full-screen transition with 1-1 A-1 Iron Door",
    })
    .click();

  const transition = page.getByRole("status", {
    name: "Page transition in progress",
  });
  await expect(transition).toBeVisible();
  await expect(transition).toBeFocused();
  await expect(transition.locator("canvas")).toBeVisible();
  await expect(page.getByRole("main")).toHaveAttribute("inert", "");
  await expect(transition.locator("audio")).toHaveJSProperty("paused", false);

  await expect(page).toHaveURL(/\/transition-complete$/, { timeout: 10_000 });
  await expect(
    page.getByRole("heading", { name: "Destination reached" })
  ).toBeVisible();
  await expect(page.getByText("1-1 A-1 Iron Door", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Return to preset catalog" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("full-screen transition does not start a second run", async ({ page }) => {
  await page.goto("/");
  const startButton = page.getByRole("button", {
    name: "Start full-screen transition with 1-1 A-1 Iron Door",
  });
  await startButton.click();

  await expect(startButton).toBeDisabled();
  await expect(
    page.getByRole("status", { name: "Page transition in progress" })
  ).toHaveCount(1);
  await expect(
    page.getByRole("status", { name: "Page transition in progress" }).locator("canvas")
  ).toHaveCount(1);
});

test("transition destination has a direct-visit fallback", async ({ page }) => {
  await page.goto("/transition-complete");

  await expect(
    page.getByRole("heading", { name: "Destination reached" })
  ).toBeVisible();
  await expect(page.getByText("No preset was selected", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Return to preset catalog" }).click();
  await expect(page).toHaveURL(/\/$/);
});
