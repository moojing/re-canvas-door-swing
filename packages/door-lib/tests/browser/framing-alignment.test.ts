import { expect, test } from "@playwright/test";

// Stable CLOSED bounds from the source review; bottom is deliberately excluded
// from size matching because several references crop it or shade it to black.
const cases = [
  ["biohazard-1996-a01-iron-door", 1200, 5000, 410, 104, 638],
  ["biohazard-1996-a01-iron-door-leave", 1350, 4700, 411, 104, 638],
  ["biohazard-1996-a02-yellow-panel-knob-door", 1200, 5000, 410, 104, 638],
  ["biohazard-1996-a02-yellow-panel-knob-door-leave", 1200, 5000, 411, 104, 638],
  ["biohazard-1998-a01-no-handle-door", 1000, 4400, 404, 54, 678],
  ["biohazard-1998-a03-grid-knob-door", 1000, 4800, 404, 46, 676],
  ["biohazard-1998-a03-grid-knob-door-leave", 1000, 4800, 404, 46, 676],
  ["biohazard-1996-b02-blue-panel-double-door", 1200, 5350, 824, 103, 638],
  ["biohazard-1996-b07-automatic-sliding-door", 1900, 5650, 811, 107, 638],
  ["biohazard-1996-b07-automatic-sliding-door-leave", 1900, 5650, 811, 107, 638],
  ["biohazard-1999-a01-parking-door", 2300, 4800, 576, 0, 590],
] as const;

test("all registered traversals match closed framing with the actual materials and handles", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  for (const [id, ms, duration, width, top, center] of cases) {
    await page.evaluate((id) => {
      const select = document.querySelector<HTMLSelectElement>("#door-preset")!;
      if (![...select.options].some(o => o.value === id)) select.add(new Option(id, id));
    }, id);
    await page.selectOption("#door-preset", id);
    await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
    await page.evaluate(() => {
      const scene = document.querySelector("#door-root")!.firstElementChild as HTMLElement;
      Object.assign(scene.style, { position: "fixed", left: "0px", top: "0px",
        width: "1280px", height: "800px", border: "0", borderRadius: "0" });
    });
    await expect.poll(() => page.locator("canvas").evaluate(c => c.getBoundingClientRect().height)).toBe(800);
    const capture = () => page.evaluate(({ ms, duration }) => {
      window.__doorEntranceTestApi__!.seek(ms / duration);
      const canvas = document.querySelector("canvas")!;
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      if (!gl) throw new Error("WebGL unavailable");
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const rows = new Uint32Array(canvas.height), columns = new Uint32Array(canvas.width);
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) <= 25) continue;
        rows[canvas.height - 1 - y]++; columns[x]++;
      }
      const xs = [...columns.keys()].filter(x => columns[x] >= canvas.height / 16);
      const ys = [...rows.keys()].filter(y => rows[y] >= canvas.width / 16);
      if (!xs.length || !ys.length) return null;
      return { width: (xs.at(-1)! - xs[0] + 1) / canvas.width * 1280,
        top: ys[0] / canvas.height * 800,
        center: (xs[0] + xs.at(-1)! + 1) / 2 / canvas.width * 1280 };
    }, { ms, duration });
    await expect.poll(async () => {
      const b = await capture();
      return b !== null && Math.abs(b.width - width) < width * 0.035 &&
        Math.abs(b.top - top) < 12 && Math.abs(b.center - center) < 12;
    }, { message: `${id}: actual closed width/top/center` }).toBe(true);
    const before = await capture();
    await page.evaluate(() => window.__doorEntranceTestApi__!.reset());
    const after = await capture();
    expect(after).toEqual(before);
  }
});
