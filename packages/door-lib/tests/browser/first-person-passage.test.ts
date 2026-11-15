import { expect, test } from "@playwright/test";

test("iron-window Enter passes the opening instead of following its back on narrow screens", async ({ page }, testInfo) => {
  const audit = [];
  for (const [name, width, height] of [["desktop", 1440, 900], ["tablet", 768, 1024], ["phone", 390, 844]] as const) {
    await page.goto("/samples/vanilla.html?testMode");
    await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
    await page.evaluate(({ width, height }) => {
      const select = document.querySelector<HTMLSelectElement>("#door-preset")!;
      const id = "biohazard-1999-a02-iron-window-door";
      select.add(new Option(id, id)); select.value = id; select.dispatchEvent(new Event("change"));
      const root = document.querySelector<HTMLElement>("#door-root > div")!;
      root.style.width = `${width}px`; root.style.height = `${height}px`; root.style.maxWidth = "none";
    }, { width, height });
    await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
    await page.waitForLoadState("networkidle");
    const capture = () => page.evaluate(() => {
      window.__doorEntranceTestApi__!.seek(.96);
      const canvas = document.querySelector("canvas")!;
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      if (!gl) throw new Error("WebGL unavailable");
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let left = canvas.width, right = -1;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 24) {
          left = Math.min(left, x); right = Math.max(right, x);
        }
      }
      return { width: Math.max(0, right - left + 1) / canvas.width, left, right, bufferWidth: canvas.width };
    });
    const result = await capture();
    audit.push({ name, ...result });
    if (name === "phone") expect(result.width, "the leaf must leave the narrow forward view, not expose its back").toBeLessThan(.08);
    await page.locator("canvas").screenshot({ path: testInfo.outputPath(`${name}-enter-96.png`) });
    await page.evaluate(() => window.__doorEntranceTestApi__!.reset());
    expect(await capture()).toEqual(result);
  }
  await testInfo.attach("late-passage-bounds", { body: JSON.stringify(audit), contentType: "application/json" });
});
