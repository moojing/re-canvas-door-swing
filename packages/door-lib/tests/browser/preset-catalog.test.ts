import { expect, test } from "@playwright/test";

const calibrationUrl = process.env.DOOR_CALIBRATION_TEST_URL || "http://127.0.0.1:5177";

test("ordinary detail keeps playback and stage seconds without timing editors", async ({ page }, testInfo) => {
  await page.goto("/dev/animations/direct-entry?preset=biohazard-1998-a01-no-handle-door&calibration=true");
  await expect(page.getByRole("heading", { name: "Direct Entry" })).toBeVisible();
  await expect(page.getByRole("slider", { name: / timing$/ })).toHaveCount(0);
  await expect(page.getByText("Stage timing", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Timing edits pause", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Seek to Pause ends" }).click();
  const progress = page.getByRole("slider", { name: "Animation progress" });
  expect(Number(await progress.inputValue())).toBeGreaterThan(60);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(progress).toHaveValue("0");
  await page.setViewportSize({ width: 1280, height: 1000 });
  await progress.fill("1");
  await progress.fill("0");
  await page.evaluate(() => window.scrollTo(0, 150));
  await page.screenshot({ path: testInfo.outputPath("normal-detail-viewport.png") });
});

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

test("animation detail controls redraw an open frame and restore authored values", async ({ page }, testInfo) => {
  await page.goto("/dev/animations/direct-entry?preset=biohazard-1998-a01-no-handle-door");
  const canvas = page.locator("main canvas");
  const timeline = page.getByRole("slider", { name: "Animation progress" });
  const direction = page.getByRole("group", { name: "Swing direction" });
  const toward = direction.getByRole("button", { name: "Toward viewer" });
  const away = direction.getByRole("button", { name: "Away from viewer" });
  await timeline.fill("85");
  await canvas.evaluate((element) => element.scrollIntoView({ block: "start" }));
  const authored = await canvas.screenshot({ path: testInfo.outputPath("direction-authored.png") });
  await expect(page.getByRole("slider", { name: "Maximum opening angle" })).toHaveCount(0);
  await expect(away).toHaveAttribute("aria-pressed", "true");

  await toward.click();
  await expect(toward).toHaveAttribute("aria-pressed", "true");
  await expect(away).toHaveAttribute("aria-pressed", "false");
  await expect(timeline).toHaveValue("85");
  await canvas.evaluate((element) => element.scrollIntoView({ block: "start" }));
  const reversed = await canvas.screenshot();
  expect(Buffer.compare(reversed, authored)).not.toBe(0);

  await page.getByRole("button", { name: "Restore preset values" }).click();
  await expect(away).toHaveAttribute("aria-pressed", "true");
  await expect(timeline).toHaveValue("85");
  await canvas.evaluate((element) => element.scrollIntoView({ block: "start" }));
  expect(Buffer.compare(await canvas.screenshot({ path: testInfo.outputPath("direction-restored.png") }), authored)).toBe(0);

  await toward.click();
  await page.reload();
  await expect(away).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "1-3 A-1 Parking Door" }).click();
  await expect(toward).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("slider", { name: "Animation progress" })).toHaveValue("0");
  await page.getByRole("button", { name: "1-2 A-1 No-Handle Door" }).click();
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
  const catalogCanvasCount = await page.locator("main canvas").count();

  await page
    .getByRole("link", { name: "View details for 1-1 A-1 Iron Door" })
    .click();

  await expect(page).toHaveURL(/\/dev\/animations\/direct-entry\?preset=biohazard-1996-a01-iron-door$/);
  await expect(page.locator("main canvas")).toBeVisible();
  await page.getByRole("link", { name: "Back to catalog" }).click();
  await expect(page.locator("main canvas")).toHaveCount(catalogCanvasCount);
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
  const canvas = page.locator("main canvas");
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
  await expect(page.locator("main canvas")).toHaveCSS("image-rendering", "auto");
  expect(errors).toEqual([]);
});

for (const name of ["1-1 A-1 Iron Door", "1-2 A-1 No-Handle Door"]) {
  test(`${name} shares the soft 360p pixel treatment`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await page.getByRole("link", { name: `View details for ${name}`, exact: true }).click();
    const canvas = page.locator("main canvas");
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
  await expect(page.locator("main canvas")).toHaveAttribute("height", "360");
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
  await expect(page.locator("main canvas")).toBeVisible();
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

test("animation detail shows era markers and retimes a preview locally", async ({ page }, testInfo) => {
  await page.goto(`${calibrationUrl}/dev/animations/direct-entry?preset=biohazard-1998-a01-no-handle-door`);
  await expect(page.getByText("biohazard-1998", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Seek to Pause ends" })).toBeVisible();
  await page.getByRole("button", { name: "Seek to Pause ends" }).click();
  const progress = page.getByRole("slider", { name: "Animation progress" });
  expect(Number(await progress.inputValue())).toBeGreaterThan(60);

  await progress.fill("70");
  const canvas = page.locator("main canvas");
  await canvas.evaluate((element) => element.scrollIntoView({ block: "start" }));
  const authored = await canvas.screenshot({ path: testInfo.outputPath("timing-authored.png") });
  await page.getByRole("slider", { name: "Pause ends timing" }).fill("3150");
  await canvas.evaluate((element) => element.scrollIntoView({ block: "start" }));
  const edited = await canvas.screenshot();
  expect(Buffer.compare(authored, edited)).not.toBe(0);
  await page.getByRole("button", { name: "Restore preset values" }).click();
  await canvas.evaluate((element) => element.scrollIntoView({ block: "start" }));
  const restored = await canvas.screenshot({ path: testInfo.outputPath("timing-restored.png") });
  expect(Buffer.compare(restored, authored)).toBe(0);
  await page.setViewportSize({ width: 1280, height: 1000 });
  await progress.fill("69");
  await progress.fill("70");
  await page.evaluate(() => window.scrollTo(0, 150));
  await page.screenshot({ path: testInfo.outputPath("era-detail-viewport.png") });
});

test("a timing edit pauses playback at the current time and Play resumes", async ({ page }) => {
  await page.goto(`${calibrationUrl}/dev/animations/direct-entry?preset=biohazard-1998-a01-no-handle-door`);
  const progress = page.getByRole("slider", { name: "Animation progress" });
  await progress.fill("65");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(async () => Number(await progress.inputValue())).toBeGreaterThan(65);

  await page.getByRole("slider", { name: "Pause ends timing" }).fill("3150");
  const pausedAt = Number(await progress.inputValue());
  await page.waitForTimeout(200);
  expect(Number(await progress.inputValue())).toBe(pausedAt);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(async () => Number(await progress.inputValue())).toBeGreaterThan(pausedAt);
});

test("styled sound stays aligned after Play and timeline seeking", async ({ page }) => {
  await page.goto("/dev/animations/direct-entry?preset=biohazard-1996-a01-iron-door");
  const timeline = page.getByRole("slider", { name: "Animation progress" });
  await timeline.fill("70");
  await page.waitForFunction(() => {
    const audio = document.querySelector("audio");
    return audio && Number.isFinite(audio.duration) && audio.duration > 0;
  });

  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => page.locator("main audio").evaluate((audio) => !audio.paused && !audio.muted)).toBe(true);
  const rate = await page.locator("main audio").evaluate((audio) => audio.playbackRate);
  const sourceDuration = await page.locator("main audio").evaluate((audio) => audio.duration);
  expect(rate).toBeCloseTo(sourceDuration * 0.30 / 1.9, 1);

  await timeline.fill("75");
  await expect(timeline).toHaveValue("75");
  const soundState = await page.locator("main audio").evaluate((audio) => ({ paused: audio.paused, at: audio.currentTime, duration: audio.duration }));
  const expectedAt = soundState.duration * (0.06 + ((0.75 * 5.0 - 2.6) / 1.9) * 0.30);
  expect(soundState.paused).toBe(true);
  expect(soundState.at).toBeCloseTo(expectedAt, 1);

  await timeline.fill("95");
  await page.locator("main audio").evaluate((audio) => {
    (audio as HTMLAudioElement & { audibleStarts?: number }).audibleStarts = 0;
    audio.addEventListener("play", () => {
      if (!audio.muted) (audio as HTMLAudioElement & { audibleStarts?: number }).audibleStarts! += 1;
    });
  });
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForTimeout(100);
  expect(await page.locator("main audio").evaluate((audio) => (audio as HTMLAudioElement & { audibleStarts?: number }).audibleStarts)).toBe(0);
});

test("unsupported preview sound rates keep parking controls usable and recover on Restore", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${calibrationUrl}/dev/animations/direct-entry?preset=biohazard-1999-a01-parking-door`);
  await page.waitForFunction(() => {
    const audio = document.querySelector("audio");
    return audio && Number.isFinite(audio.duration) && audio.duration > 0;
  });

  await page.getByRole("slider", { name: "Door opens timing" }).fill("3110");
  await page.getByRole("slider", { name: "Passage timing" }).fill("3120");
  expect(errors).toEqual([]);

  const timeline = page.getByRole("slider", { name: "Animation progress" });
  await timeline.fill("64");
  await expect(timeline).toHaveValue("64");
  await page.locator("main audio").evaluate((audio) => {
    audio.dataset.audibleStarts = "0";
    audio.addEventListener("play", () => {
      if (!audio.muted) audio.dataset.audibleStarts = String(Number(audio.dataset.audibleStarts) + 1);
    });
  });
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(timeline).toHaveValue("100", { timeout: 10000 });
  await expect(page.locator("main audio")).toHaveAttribute("data-audible-starts", "0");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(timeline).toHaveValue("0");
  expect(errors).toEqual([]);

  await page.getByRole("button", { name: "Restore preset values" }).click();
  const sound = await page.locator("main audio").evaluate((audio) => ({ rate: audio.playbackRate, duration: audio.duration }));
  expect(sound.rate).toBeCloseTo(sound.duration * 0.30 / 1.20, 1);
  await timeline.fill("70");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => page.locator("main audio").evaluate((audio) => !audio.paused && !audio.muted)).toBe(true);
  expect(errors).toEqual([]);
});


test("detail full-screen preview returns to the selected preset and preserves its timeline", async ({ page }) => {
  await page.goto("/dev/animations/direct-entry?preset=biohazard-1998-a01-no-handle-door");
  await page.getByRole("button", { name: "Seek to Pause ends" }).click();
  const progress = page.getByRole("slider", { name: "Animation progress" });
  const before = await progress.inputValue();
  const expectedSound = await page.locator("main audio").evaluate((audio: HTMLAudioElement) => audio.src);
  const button = page.getByRole("button", { name: "Full-screen preview", exact: true });
  await button.click();
  const overlay = page.getByRole("status", { name: "Full-screen preview in progress" });
  await expect(overlay).toBeFocused();
  await expect(page.getByRole("main")).toHaveAttribute("inert", "");
  await expect(overlay.locator("audio")).toHaveJSProperty("src", expectedSound);
  const bounds = await overlay.boundingBox();
  expect(bounds?.width).toBe(1280);
  expect(bounds?.height).toBe(720);
  await expect(overlay).toBeHidden({ timeout: 10_000 });
  await expect(page.getByRole("main")).not.toHaveAttribute("inert", "");
  await expect(progress).toHaveValue(before);
  await expect(button).toBeFocused();
  await expect(page).toHaveURL(/preset=biohazard-1998-a01-no-handle-door$/);
});


test("detail full-screen preview applies calibration timing and clears restored overrides", async ({ page }) => {
  await page.goto(`${calibrationUrl}/dev/animations/direct-entry?preset=biohazard-1998-a01-no-handle-door`);
  const audio = page.locator("main audio");
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => Number.isFinite(element.duration))).toBe(true);
  const authoredRate = await audio.evaluate((element: HTMLAudioElement) => element.playbackRate);
  const timing = page.getByRole("slider", { name: "Opening starts timing", exact: true });
  await timing.fill("1500");
  const editedRate = await audio.evaluate((element: HTMLAudioElement) => element.playbackRate);
  expect(editedRate).not.toBe(authoredRate);
  const button = page.getByRole("button", { name: "Full-screen preview", exact: true });
  await button.click();
  const overlay = page.getByRole("status", { name: "Full-screen preview in progress" });
  await expect(overlay.locator("audio")).toHaveJSProperty("playbackRate", editedRate);
  await expect(overlay).toBeHidden({ timeout: 10_000 });
  await expect(timing).toHaveValue("1500");
  await page.getByRole("button", { name: "Restore preset values" }).click();
  await button.click();
  await expect(overlay.locator("audio")).toHaveJSProperty("playbackRate", authoredRate);
  await expect(overlay).toBeHidden({ timeout: 10_000 });
});


test("iron door uses one catalog card and switches actual Enter/Leave preset IDs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "View details for 1-1 A-1 Iron Door", exact: true })).toHaveCount(1);
  await expect(page.locator("main article")).toHaveCount(5);
  await page.getByRole("link", { name: "View details for 1-1 A-1 Iron Door", exact: true }).click();
  const variants = page.getByRole("group", { name: "Traversal variant" });
  await expect(variants.getByRole("button", { name: "Enter", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("slider", { name: "Animation progress" }).fill("85");
  await variants.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(page).toHaveURL(/preset=biohazard-1996-a01-iron-door-leave$/);
  await expect(page.getByRole("slider", { name: "Animation progress" })).toHaveValue("0");
  await expect(variants.getByRole("button", { name: "Leave", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("main code")).toContainText('preset: "biohazard-1996-a01-iron-door-leave"');
  await expect(page.getByRole("group", { name: "Swing direction" })).toHaveCount(0);
  await page.reload();
  await expect(variants.getByRole("button", { name: "Leave", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Full-screen preview", exact: true }).click();
  const overlay = page.getByRole("status", { name: "Full-screen preview in progress" });
  await expect(overlay).toBeVisible();
  await expect(overlay).toBeHidden({ timeout: 10_000 });
  await expect(page).toHaveURL(/preset=biohazard-1996-a01-iron-door-leave$/);
  await variants.getByRole("button", { name: "Enter", exact: true }).click();
  await expect(page).toHaveURL(/preset=biohazard-1996-a01-iron-door$/);
  await expect(page.locator("main code")).toContainText('preset: "biohazard-1996-a01-iron-door"');
});


test("changing traversal variants clears temporary calibration timing", async ({ page }) => {
  await page.goto(`${calibrationUrl}/dev/animations/direct-entry?preset=biohazard-1996-a01-iron-door`);
  const timing = page.getByRole("slider", { name: "Slight opening timing", exact: true });
  await timing.fill("3200");
  await expect(timing).toHaveValue("3200");
  const variants = page.getByRole("group", { name: "Traversal variant" });
  await variants.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(timing).toHaveValue("3550");
  await variants.getByRole("button", { name: "Enter", exact: true }).click();
  await expect(timing).toHaveValue("3300");
  await expect(page.getByRole("slider", { name: "Animation progress" })).toHaveValue("0");
});


test("yellow door groups Enter/Leave and switches preset-backed camera and knob timelines", async ({ page }) => {
  await page.goto("/");
  const detail = page.getByRole("link", { name: "View details for 1-1 A-2 Yellow Panel Knob Door", exact: true });
  await expect(detail).toHaveCount(1);
  await expect(page.locator("main article")).toHaveCount(5);
  await detail.click();
  const variants = page.getByRole("group", { name: "Traversal variant" });
  await expect(variants.getByRole("button", { name: "Enter", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("group", { name: "Swing direction" })).toHaveCount(0);
  await expect(page.getByText("Swing direction", { exact: true })).toHaveCount(0);
  await variants.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(page).toHaveURL(/preset=biohazard-1996-a02-yellow-panel-knob-door-leave$/);
  await expect(page.locator("main code")).toContainText('preset: "biohazard-1996-a02-yellow-panel-knob-door-leave"');
  await page.reload();
  await expect(variants.getByRole("button", { name: "Leave", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Seek to Handle starts" }).click();
  await expect(page.getByRole("slider", { name: "Animation progress" })).toHaveValue("52");
  await page.getByRole("button", { name: "Full-screen preview", exact: true }).click();
  const overlay = page.getByRole("status", { name: "Full-screen preview in progress" });
  await expect(overlay).toBeVisible();
  await expect(overlay).toBeHidden({ timeout: 10_000 });
  await variants.getByRole("button", { name: "Enter", exact: true }).click();
  await expect(page).toHaveURL(/preset=biohazard-1996-a02-yellow-panel-knob-door$/);
  await expect(page.getByRole("slider", { name: "Animation progress" })).toHaveValue("0");
});

test("detail resolves animation sets and traversal switching selects the actual path", async ({ page }) => {
  await page.goto("/dev/animations/direct-entry?preset=biohazard-1996-a01-iron-door");
  await expect(page.getByText("套用動畫組", { exact: true })).toBeVisible();
  await expect(page.getByText("1996-single-micro-open-advance", { exact: true })).toBeVisible();
  const variants = page.getByRole("group", { name: "Traversal variant" });
  await variants.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(page).toHaveURL(/preset=biohazard-1996-a01-iron-door-leave$/);
  await expect(page.getByText("1996-single-wide-swing-advance", { exact: true })).toBeVisible();
  await expect(page.getByText("1996-single-micro-open-advance", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("1996-single-wide-swing-advance", { exact: true })).toBeVisible();
  await page.goto("/dev/animations/direct-entry?preset=biohazard-1996-a02-yellow-panel-knob-door");
  await expect(page.getByText("1996-single-micro-open-close-pass-advance", { exact: true })).toBeVisible();
  await variants.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(page).toHaveURL(/preset=biohazard-1996-a02-yellow-panel-knob-door-leave$/);
  await expect(page.getByText("1996-single-micro-open-advance", { exact: true })).toBeVisible();
});
