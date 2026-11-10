import { expect, test } from "@playwright/test";

for (const id of [
  "biohazard-1996-b07-automatic-sliding-door",
  "biohazard-1996-b07-automatic-sliding-door-leave",
  "biohazard-1996-b02-blue-panel-double-door",
  "biohazard-1999-a02-iron-window-door",
  "biohazard-1999-a02-iron-window-door-leave",
]) {
  test(`${id} opens with a complete silhouette on a portrait viewport`, async ({ page }, testInfo) => {
    await page.goto("/samples/vanilla.html?testMode");
    await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
    await page.evaluate((id) => {
      const select = document.querySelector<HTMLSelectElement>("#door-preset")!;
      select.add(new Option(id, id)); select.value = id;
      select.dispatchEvent(new Event("change"));
      const root = document.querySelector<HTMLElement>("#door-root > div")!;
      root.style.width = "390px"; root.style.height = "844px"; root.style.maxWidth = "none";
    }, id);
    const capture = () => page.evaluate(() => {
      window.__doorEntranceTestApi__!.reset();
      const canvas = document.querySelector("canvas")!;
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      if (!gl) throw new Error("WebGL unavailable");
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let left = canvas.width, right = -1, bottom = canvas.height, top = -1;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        if (pixels[i] + pixels[i + 1] + pixels[i + 2] <= 24) continue;
        left = Math.min(left, x); right = Math.max(right, x);
        bottom = Math.min(bottom, y); top = Math.max(top, y);
      }
      return { left, right, bottom, top, width: canvas.width, height: canvas.height };
    });
    await expect.poll(async () => {
      const b = await capture();
      return b.right > b.left && b.left >= 4 && b.right <= b.width - 5 && b.bottom >= 4 && b.top <= b.height - 5;
    }).toBe(true);
    await page.locator("canvas").first().screenshot({ path: testInfo.outputPath(`${id}-portrait.png`) });
    if (id === "biohazard-1996-b07-automatic-sliding-door") {
      // Resize a paused frame without Reset/Seek: buffer resize alone clears
      // the image, so a missing ResizeObserver redraw cannot pass this check.
      await page.waitForLoadState("networkidle");
      const before = await page.locator("canvas").first().screenshot();
      await page.evaluate(() => {
        const root = document.querySelector<HTMLElement>("#door-root > div")!;
        root.style.width = "800px"; root.style.height = "500px";
      });
      await expect.poll(() => page.locator("canvas").first().evaluate((canvas) => canvas.width)).toBeGreaterThan(500);
      await page.evaluate(() => {
        const root = document.querySelector<HTMLElement>("#door-root > div")!;
        root.style.width = "390px"; root.style.height = "844px";
      });
      await expect(page.locator("canvas").first()).toHaveAttribute("width", "166");
      const after = await page.locator("canvas").first().screenshot();
      expect(after.equals(before)).toBe(true);
      expect(await page.evaluate(() => window.__doorEntranceTestApi__!.progress())).toBe(0);
    }
    await page.evaluate(() => window.__doorEntranceTestApi__!.seek(0.2));
    const reset = await capture();
    expect(reset.left).toBeGreaterThanOrEqual(4);
    expect(reset.right).toBeLessThanOrEqual(reset.width - 5);
  });
}
