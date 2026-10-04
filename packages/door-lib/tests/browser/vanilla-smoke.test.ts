import { expect, test } from "@playwright/test";

type DoorEntranceTestApi = {
  play: () => void;
  reset: () => void;
  seek: (progress: number) => void;
  preview: (overrides: {
    swingDirection?: "toward-viewer" | "away-from-viewer";
    maxOpenAngleDeg?: number;
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
  await page.evaluate(() => window.__doorEntranceTestApi__?.seek(0.45));
  await canvas.evaluate((element) => { element.dataset.previewCanvas = "stable"; });
  const authored = await canvas.screenshot();

  await page.evaluate(() => window.__doorEntranceTestApi__?.preview({ swingDirection: "toward-viewer" }));
  const reversed = await canvas.screenshot();
  expect(Buffer.compare(reversed, authored)).not.toBe(0);
  await expect(canvas).toHaveAttribute("data-preview-canvas", "stable");
  expect(await page.evaluate(() => window.__doorEntranceTestApi__?.progress())).toBe(0.45);

  await page.evaluate(() => window.__doorEntranceTestApi__?.preview({ swingDirection: "toward-viewer", maxOpenAngleDeg: 45 }));
  const narrower = await canvas.screenshot();
  expect(Buffer.compare(narrower, reversed)).not.toBe(0);

  await page.evaluate(() => window.__doorEntranceTestApi__?.preview({}));
  const restored = await canvas.screenshot();
  expect(Buffer.compare(restored, authored)).toBe(0);

  await page.evaluate(() => window.__doorEntranceTestApi__?.preview({ maxOpenAngleDeg: Number.NaN }));
  expect(Buffer.compare(await canvas.screenshot(), authored)).toBe(0);
  await page.evaluate(() => window.__doorEntranceTestApi__?.preview({ maxOpenAngleDeg: Number.POSITIVE_INFINITY }));
  expect(Buffer.compare(await canvas.screenshot(), authored)).toBe(0);
});
