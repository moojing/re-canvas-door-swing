import { expect, test } from "@playwright/test";

for (const sample of [
  { id: "biohazard-1996-a02-red-cross-running-door", ms: 2320, duration: 4640, check: "s9" },
  { id: "biohazard-1999-a02-iron-window-door", ms: 1920, duration: 4800, check: "closed-enter" },
  { id: "biohazard-1999-a02-iron-window-door-leave", ms: 1920, duration: 5280, check: "closed-leave" },
  { id: "biohazard-1999-a02-iron-window-door", ms: 4080, duration: 4800, check: "pass-enter" },
  { id: "biohazard-1999-a02-iron-window-door-leave", ms: 4540, duration: 5280, check: "pass-leave" },
]) {
  test(`${sample.check} renders the MP4-derived silhouette and resets consistently`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1340, height: 1000 });
    await page.goto("/samples/vanilla.html?testMode");
    await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
    await page.evaluate(id => {
      const select = document.querySelector<HTMLSelectElement>("#door-preset")!;
      select.add(new Option(id, id)); select.value = id;
      select.dispatchEvent(new Event("change"));
      const scene = document.querySelector<HTMLElement>("#door-root > div")!;
      scene.style.width = "1280px"; scene.style.height = "800px";
      scene.style.maxWidth = "none";
    }, sample.id);
    await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
    await expect.poll(() => page.locator("canvas").first().evaluate(c => c.width / c.height)).toBeCloseTo(1.6, 2);
    const capture = (ms = sample.ms) => page.evaluate(({ ms, duration }) => {
      window.__doorEntranceTestApi__!.seek(ms / duration);
      const canvas = document.querySelector("canvas")!;
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      if (!gl) throw new Error("WebGL unavailable");
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let left = canvas.width, right = -1, bottom = canvas.height, top = -1;
      let scanLeft = canvas.width, scanRight = -1;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        if (pixels[i] + pixels[i + 1] + pixels[i + 2] <= 24) continue;
        left = Math.min(left, x); right = Math.max(right, x);
        bottom = Math.min(bottom, y); top = Math.max(top, y);
        if (y === Math.floor(canvas.height / 2)) {
          scanLeft = Math.min(scanLeft, x); scanRight = Math.max(scanRight, x);
        }
      }
      return { height: (top - bottom + 1) / canvas.height * 800,
        centerY: (1 - (top + bottom) / 2 / canvas.height) * 800,
        centerX: (left + right) / 2 / canvas.width * 1280,
        width: (right - left + 1) / canvas.width * 1280,
        scanLeft: scanLeft / canvas.width * 1280, scanRight: scanRight / canvas.width * 1280 };
    }, { ...sample, ms });
    const verify = (b: Awaited<ReturnType<typeof capture>>) => {
      if (sample.check === "s9") {
        expect(b.height).toBeGreaterThan(435); expect(b.height).toBeLessThan(510);
        expect(b.centerY).toBeGreaterThan(460); expect(b.centerY).toBeLessThan(510);
        expect(b.centerX).toBeGreaterThan(475); expect(b.centerX).toBeLessThan(545);
        expect(b.width).toBeLessThan(100);
      } else if (sample.check.startsWith("closed")) {
        expect(b.width).toBeGreaterThan(490); expect(b.width).toBeLessThan(620);
        const expected = sample.check === "closed-enter" ? 768 : 590;
        expect(Math.abs(b.centerX - expected)).toBeLessThan(55);
      } else if (sample.check === "pass-enter") {
        expect(b.scanLeft).toBeGreaterThan(770); expect(b.scanLeft).toBeLessThan(930);
      } else {
        expect(b.scanRight - b.scanLeft).toBeLessThan(210);
        expect(b.scanRight).toBeGreaterThan(100); expect(b.scanRight).toBeLessThan(250);
      }
    };
    // onReady can precede final texture/model callbacks. Poll the actual image,
    // then verify again after Reset instead of comparing separate async captures.
    await expect.poll(async () => { try { verify(await capture()); return true; } catch { return false; } }).toBe(true);
    await page.locator("canvas").first().screenshot({ path: testInfo.outputPath(`${sample.check}.png`) });
    await page.evaluate(() => window.__doorEntranceTestApi__!.reset());
    verify(await capture());
    const approachSamples = sample.check === "closed-enter" ? [
      [160, 502, 832], [320, 502, 832], [480, 497, 840], [640, 488, 850],
      [800, 489, 878], [960, 491, 921], [1120, 493, 943], [1280, 496, 989],
      [1440, 505, 1031], [1600, 504, 1028], [1760, 504, 1028],
    ] : sample.check === "closed-leave" ? [
      [160, 504, 831], [320, 497, 833], [480, 497, 841], [640, 490, 851],
      [800, 461, 854], [960, 434, 854], [1120, 396, 856], [1280, 356, 860],
      [1440, 335, 856], [1600, 333, 853], [1760, 333, 853], [1920, 333, 853],
    ] : [];
    for (const [ms, left, right] of approachSamples) {
      const b = await capture(ms);
      expect(Math.abs(b.scanLeft - left), `left edge at ${ms}ms`).toBeLessThan(25);
      expect(Math.abs(b.scanRight - right), `right edge at ${ms}ms`).toBeLessThan(25);
    }
  });
}
