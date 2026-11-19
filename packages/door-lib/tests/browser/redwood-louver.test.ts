import { expect, test } from "@playwright/test";

const base = "biohazard-1998-b04-redwood-louver-door";

test("redwood catalog, both passages, seek, play, reset and mobile layout", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("link", { name: "View details for 1-2 B-4 S2 Redwood Louver Double Door" }).click();
  await expect(page).toHaveURL(new RegExp(`double-swing\\?preset=${base}$`));
  const progress = page.getByRole("slider", { name: "Animation progress" });
  for (const variant of ["Enter", "Leave"]) {
    await page.getByRole("button", { name: variant, exact: true }).click();
    await expect(progress).toHaveValue("0");
    for (const value of ["0", "44", "48", "70", "90"]) {
      await progress.fill(value);
      await expect(progress).toHaveValue(value);
      await page.locator("main canvas").first().screenshot({ path: testInfo.outputPath(`${variant}-${value}.png`) });
    }
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(progress).toHaveValue("100", { timeout: 10_000 });
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(progress).toHaveValue("0");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole("link", { name: "Back to catalog" }).click();
  await page.getByRole("button", { name: "Preview 1-2 B-4 S2 Redwood Louver Double Door full-screen" }).click();
  const overlay = page.getByRole("status", { name: "Full-screen preview in progress", includeHidden: true });
  await expect(overlay).toBeVisible();
  await expect(overlay.locator("canvas")).toBeVisible();
  await expect(overlay).toHaveAttribute("aria-hidden", "true", { timeout: 10_000 });
  expect(errors).toEqual([]);
});
