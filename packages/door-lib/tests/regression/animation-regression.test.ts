import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { collectTimeline, differences, verifyBaseline, repositoryRoot, sha256 } from "./timeline.ts";

const baselineDir = new URL("./baseline/", import.meta.url);

test("runtime texture, model and audio bytes still match the reference commit", () => {
  const provenance = verifyBaseline(baselineDir);
  const assets = provenance.capture.sourceFiles.filter((line: string) => /\.(mp3|glb|jpe?g|png|webp)$/.test(line));
  assert.ok(assets.length > 0, "Reference must identify its source assets");
  for (const line of assets) {
    const [metadata, file] = line.split("\t");
    const expected = metadata.split(" ")[2];
    const bytes = readFileSync(path.join(repositoryRoot, file));
    const actual = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    assert.equal(actual, expected, `Reference asset changed: ${file}`);
  }
});

test("all registered animation outputs match the frozen old-commit oracle", async () => {
  const provenance = verifyBaseline(baselineDir);
  const expected = JSON.parse(readFileSync(new URL("timeline.json", baselineDir), "utf8"));
  const actual = await collectTimeline();
  const failures = differences(expected, actual);
  const report = path.join(repositoryRoot, "packages/door-lib/test-results/animation-numeric/timeline-diff.json");
  if (failures.length) {
    mkdirSync(path.dirname(report), { recursive: true });
    writeFileSync(report, JSON.stringify({ sourceCommit: provenance.sourceCommit, failures }, null, 2));
  } else rmSync(report, { force: true });
  assert.equal(failures.length, 0,
    `Animation changed since ${provenance.sourceCommit}:\n${failures.slice(0, 40).join("\n")}\nDo not update the oracle to hide an unintended regression.`);
});

test("comparison detects camera, handle, fade, timing, audio and registry changes with paths", () => {
  const before = { duration: 5000, soundStartProgress: 0.4, presets: ["iron"], samples: [{ ms: 40,
    state: { cameraPosition: [0, 0, 8], handleAngle: 0, fadeOut: 0 } }] };
  for (const change of [
    (x: typeof before) => { x.samples[0].state.cameraPosition[2] += 0.01; },
    (x: typeof before) => { x.samples[0].state.handleAngle = 1; },
    (x: typeof before) => { x.samples[0].state.fadeOut = 0.5; },
    (x: typeof before) => { x.duration += 1; },
    (x: typeof before) => { x.soundStartProgress = 0.5; },
    (x: typeof before) => { x.presets.push("new-door"); },
  ]) {
    const after = structuredClone(before); change(after);
    assert.ok(differences(before, after).length > 0);
  }
  assert.deepEqual(differences({ x: 1 }, { x: 1 + 1e-12 }), []);
  assert.match(differences(before, { ...before, duration: 6000 })[0], /duration/);
});


test("ordinary baseline verification rejects modified artifacts", () => {
  const temporary = mkdtempSync(path.join(tmpdir(), "animation-integrity-"));
  const directory = pathToFileURL(temporary + path.sep);
  try {
    writeFileSync(new URL("timeline.json", directory), "old output");
    writeFileSync(new URL("manifest.json", directory), JSON.stringify({ formatVersion: 1,
      sourceCommit: "a".repeat(40), files: { "timeline.json": sha256("old output") } }));
    assert.equal(verifyBaseline(directory).sourceCommit, "a".repeat(40));
    writeFileSync(new URL("timeline.json", directory), "changed output");
    assert.throws(() => verifyBaseline(directory), /baseline was modified/);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
