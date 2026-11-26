import { test, expect } from "@playwright/test";

for (const suffix of ["", "-leave"]) {
  test(`clocktower${suffix} playback, seek, reset and source link`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(`/dev/animations/double-swing?preset=biohazard-1999-b03-clocktower-door${suffix}`);
    await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
    const slider = page.getByRole("slider", { name: "Animation progress" });
    for (const value of ["0", "45", "55", "70", "82", "92"]) {
      await slider.fill(value);
      await expect(slider).toHaveValue(value);
      await page.locator("main canvas").first().screenshot({ path: testInfo.outputPath(`stage-${value}.png`) });
    }
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(slider).toHaveValue("0");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(slider).toHaveValue("100", { timeout: 10000 });
    await page.getByRole("button", { name: suffix ? "Enter" : "Leave", exact: true }).click();
    await expect(slider).toHaveValue("0");
    await expect(page).toHaveURL(new RegExp(`clocktower-door${suffix ? "" : "-leave"}$`));
    expect(errors).toEqual([]);
  });
}

test("clocktower catalog preview and full-screen modal work", async ({ page }) => {
  await page.goto("/");
  const card = page.locator("article").filter({ hasText: "1-3 B-3 Clocktower Door" });
  await expect(card.locator("canvas")).toBeVisible();
  await expect(card.getByRole("link", { name: /View source GIF/ })).toHaveAttribute("href", /1-3\/b03-003.gif$/);
  await card.getByRole("button", { name: /full-screen/ }).click();
  await expect(page.getByRole("status", { name: "Full-screen preview in progress" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Full-screen preview in progress" }).locator("canvas")).toBeVisible();
  await expect(page.getByRole("status", { name: "Full-screen preview in progress" })).toBeHidden({ timeout: 10000 });
  await expect(card).toBeVisible();
});
