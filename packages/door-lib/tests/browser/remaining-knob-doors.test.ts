import { expect, test } from "@playwright/test";

for (const id of ["biohazard-1996-a02-red-cross-running-door", "biohazard-1999-a02-iron-window-door", "biohazard-1999-a02-iron-window-door-leave"]) {
  test(`${id} plays, seeks and resets`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`/dev/animations/direct-entry?preset=${id}`);
    const progress = page.getByRole("slider", { name: "Animation progress" });
    await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
    for (const value of ["0", "60", "69", "85"]) {
      await progress.fill(value);
      await expect(progress).toHaveValue(value);
      await page.locator("main canvas").first().screenshot({ path: testInfo.outputPath(`stage-${value}.png`) });
    }
    if (!id.includes("running")) {
      const variant = id.endsWith("-leave") ? "Leave" : "Enter";
      await expect(page.getByRole("button", { name: variant, exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("main")).toContainText(id.endsWith("-leave") ? "第二段：右側旋鈕・向左外拉" : "第一段：左側旋鈕・向右內推");
      await page.getByRole("button", { name: "Seek to Slight opening", exact: true }).click();
      await expect(progress).toHaveValue(id.endsWith("-leave") ? "51.5" : "66.7");
      await page.getByRole("button", { name: "Seek to Pause ends", exact: true }).click();
      await expect(progress).toHaveValue(id.endsWith("-leave") ? "57.6" : "73.3");
    }
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(progress).toHaveValue("0");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(progress).toHaveValue("100", { timeout: 10_000 });
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(progress).toHaveValue("0");
    expect(errors).toEqual([]);
  });
}

test("iron window first and second passages have distinct deep links and can switch both ways", async ({ page }) => {
  const first = "biohazard-1999-a02-iron-window-door";
  await page.goto(`/dev/animations/direct-entry?preset=${first}`);
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${first}-leave$`));
  await expect(page.getByRole("slider", { name: "Animation progress" })).toHaveValue("0");
  await page.getByRole("button", { name: "Enter", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${first}$`));
  await expect(page.getByRole("button", { name: "Enter", exact: true })).toHaveAttribute("aria-pressed", "true");
});
