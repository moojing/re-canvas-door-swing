import { test, expect } from "@playwright/test";
import { realpathSync } from "node:fs";
import { installAssetReadiness } from "./asset-readiness.ts";
import { repositoryRoot } from "./timeline.ts";

test("asset guard catches an HTTP200 GLB parse failure hidden by runtime fallback", async ({ page }) => {
  await installAssetReadiness(page, realpathSync(process.env.ANIMATION_REFERENCE_ROOT || repositoryRoot));
  await page.route(/\.glb(\?|$)/, route => new URL(route.request().url()).searchParams.has("import")
    ? route.continue()
    : route.fulfill({ status: 200, contentType: "model/gltf-binary", body: "invalid glb" }));
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  await page.evaluate(() => {
    const id = "biohazard-1996-b02-blue-panel-double-door";
    const select = document.querySelector<HTMLSelectElement>("#door-preset")!;
    select.add(new Option(id, id)); select.value = id; select.dispatchEvent(new Event("change"));
  });
  await expect.poll(() => page.evaluate(() => (window as any).__animationAssets.errors.join("\n")))
    .toContain("GLB decode failed");
  const assets = await page.evaluate(() => (window as any).__animationAssets);
  expect(assets.models).toBe(0);
  expect(assets.attached).toBe(0);
});
