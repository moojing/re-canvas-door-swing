import { expect, test } from "@playwright/test";

test("unified animation navigation keeps the selected catalog preset and returns home", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "View details for 1-2 A-1 No-Handle Door" }).click();

  await expect(page).toHaveURL(/\/dev\/animations\/direct-entry\?preset=biohazard-1998-a01-no-handle-door$/);
  await expect(page.getByRole("heading", { name: "Direct Entry" })).toBeVisible();
  await expect(page.getByText("biohazard-1998-a01-no-handle-door", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "1-1 A-1 Iron Door", exact: true }).click();
  await expect(page).toHaveURL(/preset=biohazard-1996-a01-iron-door$/);

  await page.getByRole("link", { name: "Back to catalog" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("unified animation navigation returns to the animation list and handles direct visits", async ({ page }) => {
  await page.goto("/dev/animations");
  await page.getByRole("link", { name: /Direct Entry/ }).click();
  await page.getByRole("link", { name: "Back to Animations" }).click();
  await expect(page).toHaveURL(/\/dev\/animations$/);

  await page.goto("/dev/animations/direct-entry?preset=biohazard-1996-b02-blue-panel-double-door");
  await expect(page.getByText("biohazard-1996-a01-iron-door", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to Animations" }).click();
  await expect(page).toHaveURL(/\/dev\/animations$/);
});

test("animation detail controls redraw the held frame and restore authored values", async ({ page }) => {
  await page.goto("/dev/animations/direct-entry?preset=biohazard-1996-a01-iron-door");
  const canvas = page.locator("canvas");
  const timeline = page.getByRole("slider", { name: "Animation progress" });
  const direction = page.getByRole("group", { name: "Swing direction" });
  const toward = direction.getByRole("button", { name: "Toward viewer" });
  const away = direction.getByRole("button", { name: "Away from viewer" });
  await timeline.fill("45");
  const authored = await canvas.screenshot();
  await expect(page.getByRole("slider", { name: "Maximum opening angle" })).toHaveCount(0);
  await expect(away).toHaveAttribute("aria-pressed", "true");

  await toward.click();
  await expect(toward).toHaveAttribute("aria-pressed", "true");
  await expect(away).toHaveAttribute("aria-pressed", "false");
  await expect(timeline).toHaveValue("45");
  const reversed = await canvas.screenshot();
  expect(Buffer.compare(reversed, authored)).not.toBe(0);

  await page.getByRole("button", { name: "Restore preset values" }).click();
  await expect(away).toHaveAttribute("aria-pressed", "true");
  await expect(timeline).toHaveValue("45");
  expect(Buffer.compare(await canvas.screenshot(), authored)).toBe(0);

  await toward.click();
  await page.reload();
  await expect(away).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "1-3 A-1 Parking Door" }).click();
  await expect(toward).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("slider", { name: "Animation progress" })).toHaveValue("0");
  await page.getByRole("button", { name: "1-1 A-1 Iron Door" }).click();
  await expect(away).toHaveAttribute("aria-pressed", "true");

  await page.goto("/dev/animations/double-swing?preset=biohazard-1996-b02-blue-panel-double-door");
  await expect(direction).toHaveCount(0);
  await expect(page.getByRole("slider", { name: "Maximum opening angle" })).toHaveCount(0);
});

test("preset catalog opens the shared animation detail page", async ({
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
    .getByRole("link", { name: "View details for 1-1 A-1 Iron Door" })
    .click();

  await expect(page).toHaveURL(/\/dev\/animations\/direct-entry\?preset=biohazard-1996-a01-iron-door$/);
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("link", { name: "Back to catalog" }).click();
  await expect(page.locator("canvas")).toHaveCount(catalogCanvasCount);
});

test("every preset card makes details primary and full-screen preview secondary", async ({ page }) => {
  await page.goto("/");

  const cards = page.locator("article");
  expect(await cards.count()).toBeGreaterThan(0);
  for (const card of await cards.all()) {
    const label = await card.getByRole("heading").innerText();
    const detail = card.getByRole("link", { name: `View details for ${label}` });
    const preview = card.getByRole("button", { name: `Preview ${label} full-screen` });
    await expect(detail).toHaveAttribute("href", /\/dev\/animations\/[^?]+\?preset=/);
    await expect(detail).toHaveText("View details");
    await expect(detail).toHaveCSS("background-color", "rgb(201, 141, 72)");
    await expect(preview).toBeVisible();
    await expect(preview).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  }
});

test("shared detail page lets users scrub the animation timeline", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "View details for 1-1 A-1 Iron Door" })
    .click();

  const timeline = page.getByRole("slider", {
    name: "Animation progress",
  });
  await expect(timeline).toHaveValue("0");

  await timeline.fill("50");
  await expect(timeline).toHaveValue("50");
  await expect(page.getByText("50%", { exact: true })).toBeVisible();
});

test("mobile animation detail keeps Back within the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("link", { name: "View details for 1-1 A-1 Iron Door" })
    .click();

  const back = page.getByRole("link", { name: "Back to catalog" });
  const bounds = await back.boundingBox();

  expect(bounds).not.toBeNull();
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(390);
});

test("full-screen preview plays the selected preset then returns to the catalog", async ({
  page,
}) => {
  await page.goto("/");

  const previewButton = page.getByRole("button", {
    name: "Preview 1-1 A-1 Iron Door full-screen",
  });
  await previewButton.click();

  const transition = page.getByRole("status", {
    name: "Full-screen preview in progress",
  });
  await expect(transition).toBeVisible();
  await expect(transition).toBeFocused();
  await expect(transition.locator("canvas")).toBeVisible();
  await expect(page.getByRole("main")).toHaveAttribute("inert", "");
  await expect(transition.locator("audio")).toHaveJSProperty("paused", false);

  await expect(
    page.getByRole("status", { name: "Full-screen preview in progress", includeHidden: true })
  ).toHaveAttribute("aria-hidden", "true", { timeout: 10_000 });
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("main")).not.toHaveAttribute("inert", "");
  await expect(previewButton).toBeFocused();
});

test("full-screen preview does not start a second run", async ({ page }) => {
  await page.goto("/");
  const startButton = page.getByRole("button", {
    name: "Preview 1-1 A-1 Iron Door full-screen",
  });
  await startButton.click();

  await expect(startButton).toBeDisabled();
  await expect(
    page.getByRole("status", { name: "Full-screen preview in progress" })
  ).toHaveCount(1);
  await expect(
    page.getByRole("status", { name: "Full-screen preview in progress" }).locator("canvas")
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

test("yellow panel uses a coarse drawing buffer and survives timeline seeking", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await page.getByRole("link", { name: "View details for 1-1 A-2 Yellow Panel Knob Door" }).click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveCSS("image-rendering", "auto");
  await expect(canvas).toHaveAttribute("height", "360");
  const timeline = page.getByRole("slider", { name: "Animation progress" });
  for (const progress of ["0", "50", "80"]) {
    await timeline.fill(progress);
    await expect(timeline).toHaveValue(progress);
    await expect(canvas).toBeVisible();
  }
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(timeline).toHaveValue("0");
  await page.getByRole("link", { name: "Back to catalog" }).click();
  await page.getByRole("link", { name: "View details for 1-1 A-1 Iron Door" }).click();
  await expect(page.locator("canvas")).toHaveCSS("image-rendering", "auto");
  expect(errors).toEqual([]);
});

for (const name of ["1-1 A-1 Iron Door", "1-2 A-1 No-Handle Door"]) {
  test(`${name} shares the soft 360p pixel treatment`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await page.getByRole("link", { name: `View details for ${name}`, exact: true }).click();
    const canvas = page.locator("canvas");
    await expect(canvas).toHaveAttribute("height", "360");
    await expect(canvas).toHaveCSS("image-rendering", "auto");
    await page.getByRole("slider", { name: "Animation progress" }).fill("55");
    await expect(canvas).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("blue double door has a playable catalog preset", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.getByRole("img", { name: "1-1 B-2 Blue Panel Double Door animation preview" }).locator("canvas")).toBeVisible();
  await page.getByRole("link", { name: "View details for 1-1 B-2 Blue Panel Double Door", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("height", "360");
  const slider = page.getByRole("slider", { name: "Animation progress" });
  for (const progress of ["30", "55", "75"]) {
    await slider.fill(progress);
    await expect(slider).toHaveValue(progress);
  }
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(slider).toHaveValue("0");
  await page.getByRole("link", { name: "Back to catalog" }).click();
  expect(errors).toEqual([]);
});

test("parking door shares Direct Entry and supports playback, seek, and reset", async ({ page }, testInfo) => {
  await page.goto("/dev/animations");
  await expect(page.getByRole("link", { name: /Approach and Enter/ })).toHaveCount(0);
  await page.getByRole("link", { name: /Direct Entry/ }).click();
  await page.getByRole("button", { name: "1-3 A-1 Parking Door", exact: true }).click();
  await expect(page).toHaveURL(/direct-entry\?preset=biohazard-1999-a01-parking-door/);
  const play = page.getByRole("button", { name: "Play", exact: true });
  const timeline = page.getByRole("slider", { name: "Animation progress" });
  await expect(play).toBeEnabled();
  await expect(page.locator("canvas")).toBeVisible();
  await timeline.fill("50");
  await expect(timeline).toHaveValue("50");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("parking-direct-entry-half.png"), fullPage: true });
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(timeline).toHaveValue("0");
  await play.click();
  await expect(timeline).toHaveValue("100", { timeout: 10000 });
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(timeline).toHaveValue("0");
});
