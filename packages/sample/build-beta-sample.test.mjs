import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runBetaBuild, verifyBetaBuildOutput } from "./build-beta-sample.mjs";

test("installs the requested registry version in an isolated prefix and builds with CDN assets", () => {
  const calls = [];
  const result = runBetaBuild("0.2.0-beta.0", {
    mkdtempSync: prefix => {
      assert.match(prefix, /door-beta-build-$/);
      return "/tmp/door-beta-build-test";
    },
    writeFileSync: (path, contents) => calls.push(["write", path, contents]),
    spawnSync: (command, args, options) => {
      calls.push(["spawn", command, args, options]);
      return { status: 0 };
    },
    tmpdir: () => "/tmp",
    join: (...parts) => parts.join("/"),
    env: { CI: "true" },
    cwd: () => "/sample",
    verifyBuildOutput: (...args) => calls.push(["verify", ...args]),
  });

  assert.equal(result, 0);
  assert.deepEqual(calls[0], ["write", "/tmp/door-beta-build-test/package.json", '{"private":true}']);
  assert.deepEqual(calls[1].slice(0, 3), [
    "spawn",
    "npm",
    [
      "install",
      "--prefix",
      "/tmp/door-beta-build-test",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
      "retro-horror-door@0.2.0-beta.0",
    ],
  ]);
  assert.deepEqual(calls[2].slice(0, 3), ["spawn", "npm", ["run", "build"]]);
  assert.equal(
    calls[2][3].env.DOOR_PACKAGE_ENTRY,
    "/tmp/door-beta-build-test/node_modules/retro-horror-door/dist/index.js"
  );
  assert.equal(calls[2][3].env.VITE_DOOR_ASSET_MODE, "cdn");
  assert.equal(calls[2][3].env.DOOR_BETA_BUILD_MODULE_IDS_FILE, "/tmp/door-beta-build-test/module-ids.json");
  assert.equal(calls[2][3].env.CI, "true");
  assert.deepEqual(calls[3], ["verify", "/sample/dist", "/tmp/door-beta-build-test/module-ids.json"]);
});

test("rejects non-exact versions before running npm", () => {
  assert.throws(
    () => runBetaBuild("beta", { spawnSync: () => assert.fail("npm should not run") }),
    /Expected an exact npm version/
  );
});

test("propagates an installation failure without starting a build", () => {
  const calls = [];
  const result = runBetaBuild("0.2.0-beta.0", {
    mkdtempSync: () => "/tmp/door-beta-build-test",
    writeFileSync: () => {},
    spawnSync: (...args) => {
      calls.push(args);
      return { status: 23 };
    },
    tmpdir: () => "/tmp",
    join: (...parts) => parts.join("/"),
  });

  assert.equal(result, 23);
  assert.equal(calls.length, 1);
});

test("treats a failed build process without an exit status as a failure", () => {
  const result = runBetaBuild("0.2.0-beta.0", {
    mkdtempSync: () => "/tmp/door-beta-build-test",
    writeFileSync: () => {},
    spawnSync: (_command, args) =>
      args[0] === "install" ? { status: 0 } : { status: null, error: new Error("spawn failed") },
    tmpdir: () => "/tmp",
    join: (...parts) => parts.join("/"),
  });

  assert.equal(result, 1);
});

test("treats a signal-terminated build process as a failure", () => {
  const result = runBetaBuild("0.2.0-beta.0", {
    mkdtempSync: () => "/tmp/door-beta-build-test",
    writeFileSync: () => {},
    spawnSync: (_command, args) =>
      args[0] === "install" ? { status: 0 } : { status: null, signal: "SIGTERM" },
    tmpdir: () => "/tmp",
    join: (...parts) => parts.join("/"),
  });

  assert.equal(result, 1);
});

async function writeValidBetaOutput(directory, moduleIds = []) {
  await mkdir(join(directory, "assets"));
  await writeFile(join(directory, "index.html"), "<div id=\"root\"></div>");
  await writeFile(
    join(directory, "assets/index.js"),
    "https://cdn.jsdelivr.net/npm/retro-horror-door-assets@0.1.0-beta.0"
  );
  const moduleIdsPath = join(directory, "module-ids.json");
  await writeFile(moduleIdsPath, JSON.stringify(moduleIds));
  return moduleIdsPath;
}

test("rejects beta build output that contains development-only source modules", async () => {
  const directory = await mkdtemp(join(tmpdir(), "door-beta-output-"));
  try {
    const moduleIdsPath = await writeValidBetaOutput(directory, ["/repo/packages/door-lib/src/handleModel.ts"]);
    assert.throws(() => verifyBetaBuildOutput(directory, moduleIdsPath), /workspace source module/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects beta output without the required CDN assets", async () => {
  const directory = await mkdtemp(join(tmpdir(), "door-beta-output-"));
  try {
    const moduleIdsPath = await writeValidBetaOutput(directory);
    await writeFile(join(directory, "assets/index.js"), "console.log('missing CDN assets')");
    assert.throws(() => verifyBetaBuildOutput(directory, moduleIdsPath), /CDN asset prefix/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects beta output without its required entry files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "door-beta-output-"));
  try {
    const moduleIdsPath = await writeValidBetaOutput(directory);
    await rm(join(directory, "index.html"));
    assert.throws(() => verifyBetaBuildOutput(directory, moduleIdsPath), /index\.html/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects empty beta output", async () => {
  const directory = await mkdtemp(join(tmpdir(), "door-beta-output-"));
  try {
    assert.throws(() => verifyBetaBuildOutput(directory, join(directory, "module-ids.json")), /index\.html/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects beta output without a JavaScript bundle", async () => {
  const directory = await mkdtemp(join(tmpdir(), "door-beta-output-"));
  try {
    await writeFile(join(directory, "index.html"), "<div id=\"root\"></div>");
    const moduleIdsPath = join(directory, "module-ids.json");
    await writeFile(moduleIdsPath, "[]");
    assert.throws(() => verifyBetaBuildOutput(directory, moduleIdsPath), /JavaScript bundle/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("accepts complete beta output with only published modules", async () => {
  const directory = await mkdtemp(join(tmpdir(), "door-beta-output-"));
  try {
    const moduleIdsPath = await writeValidBetaOutput(directory, ["/tmp/door-beta/node_modules/retro-horror-door/dist/index.js"]);
    assert.doesNotThrow(() => verifyBetaBuildOutput(directory, moduleIdsPath));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("GitHub Pages builds the published beta sample without building the workspace library", async () => {
  const workflow = await readFile(new URL("../../.github/workflows/deploy-gh-pages.yml", import.meta.url), "utf8");

  assert.match(
    workflow,
    /npm run build:beta --workspace retro-horror-door-sample -- 0\.2\.0-beta\.0/
  );
  assert.doesNotMatch(workflow, /npm run build:lib/);
  assert.match(workflow, /folder: packages\/sample\/dist/);
});
