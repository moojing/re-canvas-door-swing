import assert from "node:assert/strict";
import { it } from "node:test";
import { getDoorEntrancePreset } from "../core/presets.ts";

it("development imports media directly from the local assets module", () => {
  const preset = getDoorEntrancePreset("biohazard-1996-a02-yellow-panel-knob-door");
  assert.match(preset.frontTextureUrl!, /\/door-assets\/textures\/.*\.webp$/);
  assert.match(preset.handleModelUrl!, /\/door-assets\/models\/door_knob\.glb$/);
  assert.ok(preset.frontTextureUrl!.startsWith("file:"));
});

it("local and CDN modules expose identical assets and every local file exists", async () => {
  const local = await import("retro-horror-door-assets");
  const cdn = await import("retro-horror-door-assets/cdn");
  const { DEFAULT_ASSET_BASE_URL } = await import("retro-horror-door-assets/base");
  const { access } = await import("node:fs/promises");
  assert.deepEqual(Object.keys(local).sort(), Object.keys(cdn).sort());
  for (const [name, url] of Object.entries(local)) {
    assert.ok(typeof url === "string");
    await access(new URL(url));
    const relativePath = url.split("/door-assets/")[1];
    assert.equal(cdn[name as keyof typeof cdn], `${DEFAULT_ASSET_BASE_URL}/${relativePath}`);
  }
});
