import { expect, test } from "@playwright/test";

test("preset catalog opens and closes a vanilla detail modal", async ({
  page,
}) => {
  await page.goto("/");

  const panelPreview = page.getByRole("img", {
    name: "Single Lever Wood animation preview",
  });
  await expect(panelPreview).toBeVisible();
  await expect(panelPreview.locator("canvas")).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Double Lever Wood animation preview" })
  ).toHaveCount(1);

  await page
    .getByRole("button", { name: "Open Single Lever Wood" })
    .click();

  const dialog = page.getByRole("dialog", { name: "Single Lever Wood" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("canvas")).toBeVisible();

  await page.getByRole("button", { name: "Close preset detail" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveCount(3);
});

test("preset detail lets users scrub the animation timeline", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open Single Lever Wood" })
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
    .getByRole("button", { name: "Open Single Lever Wood" })
    .click();

  const closeButton = page.getByRole("button", {
    name: "Close preset detail",
  });
  const bounds = await closeButton.boundingBox();

  expect(bounds).not.toBeNull();
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(390);
});
