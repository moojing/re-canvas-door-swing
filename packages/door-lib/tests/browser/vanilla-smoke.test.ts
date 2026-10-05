import { expect, test } from "@playwright/test";

type DoorEntranceTestApi = {
  play: () => void;
  resume: () => void;
  reset: (preset?: string) => void;
  seek: (progress: number) => void;
  preview: (overrides: {
    swingDirection?: "toward-viewer" | "away-from-viewer";
    timingEvents?: Record<string, number>;
  }) => void;
  unmount: () => void;
  ready: () => boolean;
  progress: () => number;
};

declare global {
  interface Window {
    __doorEntranceTestApi__?: DoorEntranceTestApi;
    $RefreshReg$?: () => void;
    $RefreshSig$?: () => <T>(type: T) => T;
  }
}

test("vanilla sample renders and responds to playback controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.$RefreshReg$ = () => undefined;
    window.$RefreshSig$ = () => (type) => type;
  });

  await page.goto("/samples/vanilla.html?testMode");

  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();

  const initialBox = await canvas.boundingBox();
  expect(initialBox?.width).toBeGreaterThan(100);
  expect(initialBox?.height).toBeGreaterThan(100);
  const initialScreenshot = await canvas.screenshot();

  await page.evaluate(() => window.__doorEntranceTestApi__?.seek(0.45));
  await page.waitForFunction(
    () => window.__doorEntranceTestApi__?.progress() === 0.45
  );
  const seekScreenshot = await canvas.screenshot();
  expect(Buffer.compare(initialScreenshot, seekScreenshot)).not.toBe(0);

  await page.evaluate(() => window.__doorEntranceTestApi__?.play());
  await expect(page.locator("#door-status")).toHaveText("播放中...");

  await page.evaluate(() => window.__doorEntranceTestApi__?.reset());
  await page.waitForFunction(
    () => window.__doorEntranceTestApi__?.progress() === 0
  );

  expect(seekScreenshot.length).toBeGreaterThan(1_000);

  await page.evaluate(() => window.__doorEntranceTestApi__?.unmount());
  await expect(canvas).toHaveCount(0);
});

test("vanilla sample starts the door sound after a user plays the animation", async ({
  page,
}) => {
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());

  await page.locator("#door-play").click();

  await expect
    .poll(async () =>
      page.locator("audio").evaluate((audio) => !audio.paused)
    )
    .toBe(true);
});

test("preview overrides redraw the current frame without replacing the canvas", async ({ page }) => {
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());

  const canvas = page.locator("canvas");
  await page.evaluate(() => window.__doorEntranceTestApi__?.seek(0.85));
  await canvas.evaluate((element) => { element.dataset.previewCanvas = "stable"; });
  const authored = await canvas.screenshot();

  await page.evaluate(() => window.__doorEntranceTestApi__?.preview({ swingDirection: "toward-viewer" }));
  const reversed = await canvas.screenshot();
  expect(Buffer.compare(reversed, authored)).not.toBe(0);
  await expect(canvas).toHaveAttribute("data-preview-canvas", "stable");
  expect(await page.evaluate(() => window.__doorEntranceTestApi__?.progress())).toBe(0.85);

  await page.evaluate(() => window.__doorEntranceTestApi__?.preview({}));
  const restored = await canvas.screenshot();
  expect(Buffer.compare(restored, authored)).toBe(0);
});

test("vanilla playback uses the 1996 preset's slight-open hold", async ({ page }) => {
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  const canvas = page.locator("canvas");

  await page.evaluate(() => window.__doorEntranceTestApi__?.seek(0.70));
  const first = await canvas.screenshot();
  await page.evaluate(() => window.__doorEntranceTestApi__?.seek(0.75));
  const held = await canvas.screenshot();

  expect(Buffer.compare(first, held)).toBe(0);
});

test("timing preview retimes the held frame and restores the authored state", async ({ page }) => {
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  const canvas = page.locator("canvas");
  await page.evaluate(() => window.__doorEntranceTestApi__?.seek(0.79));
  const authored = await canvas.screenshot();

  await page.evaluate(() => window.__doorEntranceTestApi__?.preview({ timingEvents: { "hold-end": 3900 } }));
  const edited = await canvas.screenshot();
  expect(Buffer.compare(authored, edited)).not.toBe(0);
  await expect(canvas).toHaveCount(1);
  expect(await page.evaluate(() => window.__doorEntranceTestApi__?.progress())).toBe(0.79);

  await page.evaluate(() => window.__doorEntranceTestApi__?.preview({}));
  const restored = await canvas.screenshot();
  expect(Buffer.compare(restored, authored)).toBe(0);
});

test("a delayed sound start cannot overwrite a newly retimed preview", async ({ page }) => {
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  await page.locator("#door-play").click();
  await expect.poll(() => page.locator("audio").evaluate((audio) => !audio.paused)).toBe(true);
  await page.evaluate(() => window.__doorEntranceTestApi__?.seek(0.75));

  await page.locator("audio").evaluate((audio) => {
    audio.play = () => new Promise<void>((resolve) => window.setTimeout(resolve, 150));
  });
  await page.evaluate(() => window.__doorEntranceTestApi__?.resume());
  await page.evaluate(() => window.__doorEntranceTestApi__?.preview({ timingEvents: { "slight-open": 3500 } }));
  const expectedTime = await page.locator("audio").evaluate((audio) => audio.currentTime);
  await page.waitForTimeout(200);
  const result = await page.locator("audio").evaluate((audio) => ({ paused: audio.paused, time: audio.currentTime }));
  expect(result.paused).toBe(true);
  expect(result.time).toBeCloseTo(expectedTime, 2);
});

test("switching presets updates the sound mapping on the same mounted door", async ({ page }) => {
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  await page.waitForFunction(() => {
    const audio = document.querySelector("audio");
    return audio && Number.isFinite(audio.duration) && audio.duration > 0;
  });
  const before = await page.locator("audio").evaluate((audio) => audio.playbackRate);

  await page.evaluate(() => window.__doorEntranceTestApi__?.reset("biohazard-1998-a01-no-handle-door"));
  const after = await page.locator("audio").evaluate((audio) => audio.playbackRate);
  const duration = await page.locator("audio").evaluate((audio) => audio.duration);
  expect(before).toBeCloseTo(duration * 0.30 / 1.38, 1);
  expect(after).toBeCloseTo(duration * 0.30 / 2.18, 1);
  expect(after).toBeLessThan(before);
});
