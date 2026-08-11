import { expect, test } from "@playwright/test";

type DoorEntranceTestApi = {
  play: () => void;
  reset: () => void;
  seek: (progress: number) => void;
  unmount: () => void;
  ready: () => boolean;
};

declare global {
  interface Window {
    __doorEntranceTestApi__?: DoorEntranceTestApi;
  }
}

test("vanilla sample renders and responds to playback controls", async ({
  page,
}) => {
  await page.goto("/samples/vanilla.html?testMode");

  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();

  const initialBox = await canvas.boundingBox();
  expect(initialBox?.width).toBeGreaterThan(100);
  expect(initialBox?.height).toBeGreaterThan(100);

  await page.evaluate(() => window.__doorEntranceTestApi__?.seek(0.45));
  await page.evaluate(() => window.__doorEntranceTestApi__?.play());
  await page.evaluate(() => window.__doorEntranceTestApi__?.reset());

  const stableBox = await canvas.boundingBox();
  expect(stableBox?.width).toBeCloseTo(initialBox?.width ?? 0, 0);
  expect(stableBox?.height).toBeCloseTo(initialBox?.height ?? 0, 0);

  const screenshot = await canvas.screenshot();
  expect(screenshot.length).toBeGreaterThan(1_000);

  await page.evaluate(() => window.__doorEntranceTestApi__?.unmount());
  await expect(canvas).toHaveCount(0);
});
