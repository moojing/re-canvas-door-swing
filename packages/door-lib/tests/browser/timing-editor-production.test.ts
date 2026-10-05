import { expect, test } from "@playwright/test";

test("production detail ignores the timing-editor opt-in", async ({ page }) => {
  const productionUrl = process.env.DOOR_PRODUCTION_TEST_URL || "http://127.0.0.1:4176";
  await page.goto(`${productionUrl}/re-canvas-door-swing/dev/animations/direct-entry?preset=biohazard-1998-a01-no-handle-door&calibration=true`);
  await expect(page.getByRole("heading", { name: "Direct Entry" })).toBeVisible();
  await expect(page.getByRole("slider", { name: / timing$/ })).toHaveCount(0);
  await expect(page.getByText("Timing edits pause", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Seek to Pause ends" }).click();
  const progress = page.getByRole("slider", { name: "Animation progress" });
  expect(Number(await progress.inputValue())).toBeGreaterThan(60);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(progress).toHaveValue("0");
});
