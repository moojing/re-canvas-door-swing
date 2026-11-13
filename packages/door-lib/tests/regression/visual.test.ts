import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installAssetReadiness } from "./asset-readiness.ts";
import { baselineDirectory, verifyBaseline, viewports, repositoryRoot } from "./timeline.ts";

const captureDir = process.env.ANIMATION_CAPTURE_DIR;
const directory = captureDir || fileURLToPath(baselineDirectory);
const timeline = JSON.parse(readFileSync(path.join(directory, "timeline.json"), "utf8"));

test.beforeAll(async ({ browser }, info) => {
  if (info.config.updateSnapshots !== "none") throw new Error("Snapshot updates are forbidden. Use baseline:animation -- --ref <old commit> --reason <reason>.");
  if (!captureDir) {
    const manifest = verifyBaseline();
    expect({ platform: process.platform, arch: process.arch, browserVersion: browser.version() },
      "Use the recorded renderer environment; do not regenerate to conceal an environment mismatch")
      .toEqual(manifest.renderer);
  } else {
    if (!process.env.ANIMATION_REFERENCE_ROOT || !process.env.ANIMATION_CAPTURE_SHA) throw new Error("Capture requires the isolated old-commit runner");
    writeFileSync(path.join(directory, "renderer.json"), JSON.stringify({ platform: process.platform, arch: process.arch, browserVersion: browser.version() }));
  }
});

for (const [id, entry] of Object.entries(timeline.presets) as [string, any][]) {
  for (const [device, [width, height]] of Object.entries(viewports)) {
    test(`${id} ${device} matches the frozen phase sheet`, async ({ page }, info) => {
      const errors: string[] = [];
      const requests = new Set<string>();
      page.on("pageerror", error => errors.push(error.message));
      page.on("requestfailed", r => errors.push(`${r.url()}: ${r.failure()?.errorText}`));
      page.on("request", r => {
        if (/\.(glb|webp|png|jpe?g|mp3)(\?|$)/i.test(r.url())) requests.add(r.url());
      });
      page.on("response", r => { if (r.status() >= 400 && !r.url().includes("favicon")) errors.push(`${r.status()} ${r.url()}`); });
      const sourceRoot = realpathSync(process.env.ANIMATION_REFERENCE_ROOT || repositoryRoot);
      await installAssetReadiness(page, sourceRoot);
      await page.goto("/samples/vanilla.html?testMode");
      await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
      await page.evaluate(({ id, width, height }) => {
        const s = document.querySelector<HTMLSelectElement>("#door-preset")!;
        s.add(new Option(id, id)); s.value = id; s.dispatchEvent(new Event("change"));
        const root = document.querySelector<HTMLElement>("#door-root > div")!;
        root.style.width = `${width}px`; root.style.height = `${height}px`; root.style.maxWidth = "none";
      }, { id, width, height });
      await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
      await page.waitForLoadState("networkidle");
      await expect.poll(() => page.evaluate(() => (window as any).__animationAssets.pending)).toBe(0);
      const assets = await page.evaluate(() => (window as any).__animationAssets);
      expect(assets.errors, "Silent texture/GLB decoding failures must fail the test").toEqual([]);
      expect(assets.textures).toBeGreaterThan(0);
      if (entry.preset.handleModelUrl) {
        expect(assets.models, "Required imported handle must decode").toBeGreaterThan(0);
        expect(assets.attached, "Decoded handle geometry must attach to the rendered scene").toBeGreaterThan(0);
      }
      // Successful network completion plus repeated identical rendered frames:
      // onReady by itself does not await asynchronous textures/imported handles.
      await page.evaluate(async () => {
        let previous = "", equal = 0;
        for (let i = 0; i < 120; i++) {
          window.__doorEntranceTestApi__!.seek(0);
          const canvas = document.querySelector("canvas")!;
          const copy = document.createElement("canvas"); copy.width = canvas.width; copy.height = canvas.height;
          copy.getContext("2d")!.drawImage(canvas, 0, 0);
          const value = copy.toDataURL();
          equal = value === previous ? equal + 1 : 0; previous = value;
          if (equal >= 3) return;
          await new Promise(requestAnimationFrame);
        }
        throw new Error("Assets/rendered pixels never stabilized");
      });
      expect(errors, "Asset/browser failures cannot become a reference frame").toEqual([]);
      expect(requests.size).toBeGreaterThan(0);
      for (const url of requests) expect(new URL(url).origin, "All reference assets must come from the isolated source server").toBe(new URL(page.url()).origin);
      const capture = () => page.evaluate(({ times, duration }) => {
        const canvas = document.querySelector("canvas")!;
        const sheet = document.createElement("canvas");
        const columns = 4;
        sheet.width = canvas.width * columns; sheet.height = canvas.height * Math.ceil(times.length / columns);
        const context = sheet.getContext("2d")!;
        context.fillStyle = "black"; context.fillRect(0, 0, sheet.width, sheet.height);
        times.forEach((ms: number, i: number) => {
          window.__doorEntranceTestApi__!.seek(ms / duration);
          const x = i % columns * canvas.width, y = Math.floor(i / columns) * canvas.height;
          context.drawImage(canvas, x, y);
          // Include the actual CSS fade overlay, not just the WebGL canvas.
          const fade = Number(getComputedStyle(canvas.nextElementSibling!).opacity);
          context.fillStyle = `rgba(0,0,0,${fade})`; context.fillRect(x, y, canvas.width, canvas.height);
        });
        return sheet.toDataURL("image/png").split(",")[1];
      }, { times: entry.visualTimes, duration: entry.config.duration });
      const image = Buffer.from(await capture(), "base64");
      expect(Buffer.from(await capture(), "base64").equals(image), "Repeated seeks must be deterministic").toBe(true);
      expect(errors).toEqual([]);
      const name = `${id}-${device}.png`;
      await info.attach("frame-times", { body: JSON.stringify({ id, device, width, height, times: entry.visualTimes }), contentType: "application/json" });
      if (captureDir) writeFileSync(path.join(directory, name), image);
      else expect(image).toMatchSnapshot(name);
    });
  }
}
