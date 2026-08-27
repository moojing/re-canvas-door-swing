import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appPath = new URL("../App.tsx", import.meta.url);
const indexPath = new URL("./Index.tsx", import.meta.url);
const listPath = new URL("./DevAnimationList.tsx", import.meta.url);

test("registers developer animation routes before the catch-all", async () => {
  const source = await readFile(appPath, "utf8");

  assert.match(source, /path="\/dev"[\s\S]*Navigate[\s\S]*to="\/dev\/animations"/);
  assert.match(source, /path="\/dev\/animations"/);
  assert.match(source, /path="\/dev\/animations\/:animationId"/);
  assert.match(
    source,
    /path="\/dev\/animations\/:animationId"[\s\S]*path="\*"/
  );
});

test("does not register retired POC routes in the sample app", async () => {
  const source = await readFile(appPath, "utf8");

  assert.doesNotMatch(source, /from "\.\/poc\//);
  assert.doesNotMatch(source, /path="\/poc/);
});

test("catalog page mounts the shared sample header", async () => {
  const source = await readFile(indexPath, "utf8");

  assert.match(source, /<SampleHeader\s*\/>/);
});

test("animation list previews the first published preset for each animation", async () => {
  const source = await readFile(listPath, "utf8");

  assert.match(source, /<PresetAnimationPreview preset=\{preview\} progress=\{0\.4\} \/>/);
  assert.match(source, /const preview = presets\[0\]/);
});
