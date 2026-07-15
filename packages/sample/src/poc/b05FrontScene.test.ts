import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { B05_FRONT_IMAGE, B05_FRONT_PLANE } from "./b05FrontImage.ts";
import {
  B05_LEAF_WIDTH,
  B05_TOTAL_HEIGHT,
} from "./b05Geometry.ts";
import { createB05FrontSceneDescriptor } from "./b05FrontScene.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSET_DIRECTORY = path.resolve(HERE, "../../public/textures/b05");

const collectLocalTypeScriptDependencies = async (
  entryPath: string,
): Promise<Map<string, string>> => {
  const dependencies = new Map<string, string>();

  const resolveImport = async (
    importerPath: string,
    specifier: string,
  ): Promise<string | null> => {
    const unresolvedPath = path.resolve(path.dirname(importerPath), specifier);
    const extension = path.extname(unresolvedPath);
    if (extension && extension !== ".ts" && extension !== ".tsx") return null;

    const candidates = extension
      ? [unresolvedPath]
      : [
          `${unresolvedPath}.ts`,
          `${unresolvedPath}.tsx`,
          path.join(unresolvedPath, "index.ts"),
          path.join(unresolvedPath, "index.tsx"),
        ];
    for (const candidate of candidates) {
      try {
        await readFile(candidate, "utf8");
        return candidate;
      } catch {
        // Try the next TypeScript resolution candidate.
      }
    }
    throw new Error(`Unable to resolve ${specifier} imported by ${importerPath}`);
  };

  const visit = async (filePath: string): Promise<void> => {
    if (dependencies.has(filePath)) return;
    const source = await readFile(filePath, "utf8");
    dependencies.set(filePath, source);

    const importPattern =
      /\b(?:import|export)\s+(?:type\s+)?(?:[^"'`;]*?\s+from\s+)?["'](\.[^"']+)["']/g;
    const specifiers = [...source.matchAll(importPattern)].map((match) => match[1]);
    for (const specifier of specifiers) {
      const dependencyPath = await resolveImport(filePath, specifier);
      if (dependencyPath) await visit(dependencyPath);
    }
  };

  await visit(entryPath);
  return dependencies;
};

test("always describes exactly two procedural leaves with no stationary environment", () => {
  const scene = createB05FrontSceneDescriptor(null);

  assert.equal(scene.leaves.length, 2);
  assert.deepEqual(scene.leaves.map((leaf) => leaf.side), ["left", "right"]);
  assert.ok(scene.leaves.every((leaf) => leaf.procedural));
  assert.ok(scene.leaves.every((leaf) => leaf.front === null));
  assert.equal(
    /(sidePost|side_post|threshold|floor|wall)/i.test(JSON.stringify(scene)),
    false,
  );
});

test("assigns each material only to its corresponding transformed leaf", () => {
  const leftMaterial = { id: "left-material" };
  const rightMaterial = { id: "right-material" };
  const scene = createB05FrontSceneDescriptor({ leftMaterial, rightMaterial });
  const [left, right] = scene.leaves;

  assert.equal(left.mirrorX, false);
  assert.equal(left.front?.material, leftMaterial);
  assert.notEqual(left.front?.material, rightMaterial);
  assert.equal(right.mirrorX, true);
  assert.equal(right.front?.material, rightMaterial);
  assert.notEqual(right.front?.material, leftMaterial);
  assert.deepEqual(left.front?.parents, ["hinge", "mirror", "leaf"]);
  assert.deepEqual(right.front?.parents, ["hinge", "mirror", "leaf"]);
});

test("front planes fill canonical local leaf bounds and meet at the closed seam", () => {
  const scene = createB05FrontSceneDescriptor({
    leftMaterial: { id: "left" },
    rightMaterial: { id: "right" },
  });

  for (const leaf of scene.leaves) {
    assert.deepEqual(leaf.front?.size, [B05_LEAF_WIDTH, B05_TOTAL_HEIGHT]);
    assert.deepEqual(leaf.front?.size, B05_FRONT_PLANE.size);
    assert.deepEqual(leaf.front?.localBounds, {
      minX: 0,
      maxX: B05_LEAF_WIDTH,
      minY: 0,
      maxY: B05_TOTAL_HEIGHT,
    });
  }

  const worldBounds = scene.leaves.map((leaf) => {
    const bounds = leaf.front!.localBounds;
    const points = [bounds.minX, bounds.maxX].map(
      (localX) => leaf.hingeX + (leaf.mirrorX ? -localX : localX),
    );
    return { minX: Math.min(...points), maxX: Math.max(...points) };
  });
  assert.ok(Math.abs(worldBounds[0].maxX) <= 0.01);
  assert.ok(Math.abs(worldBounds[1].minX) <= 0.01);
  assert.ok(Math.abs(worldBounds[0].maxX - worldBounds[1].minX) <= 0.01);
});

test("composes crop reversal and leaf mirroring exactly once", () => {
  const scene = createB05FrontSceneDescriptor({
    leftMaterial: { id: "left" },
    rightMaterial: { id: "right" },
  });
  const [left, right] = scene.leaves;
  const leftLocalOuterToCenter = [
    B05_FRONT_IMAGE.leftCrop.x,
    B05_FRONT_IMAGE.leftCrop.x + B05_FRONT_IMAGE.leftCrop.width - 1,
  ];
  const rightLocalOuterToCenter = [
    B05_FRONT_IMAGE.rightCrop.x + B05_FRONT_IMAGE.rightCrop.width - 1,
    B05_FRONT_IMAGE.rightCrop.x,
  ];
  const orientInWorld = (endpoints: number[], mirrorX: boolean) =>
    mirrorX ? [...endpoints].reverse() : endpoints;

  assert.deepEqual(leftLocalOuterToCenter, [44, 367]);
  assert.deepEqual(rightLocalOuterToCenter, [691, 368]);
  assert.deepEqual(orientInWorld(leftLocalOuterToCenter, left.mirrorX), [44, 367]);
  assert.deepEqual(orientInWorld(rightLocalOuterToCenter, right.mirrorX), [368, 691]);
});

test("the generated B05 asset directory contains only the approved front", async () => {
  assert.deepEqual(await readdir(ASSET_DIRECTORY), ["generated-gate-front.png"]);
});

test("recursively scans every local TypeScript dependency for prohibited provenance", async () => {
  const dependencies = await collectLocalTypeScriptDependencies(
    path.join(HERE, "ArchedGateB05.tsx"),
  );
  const dependencyNames = [...dependencies.keys()].map((filePath) =>
    path.basename(filePath),
  );
  for (const expectedName of [
    "b05FrontLoader.ts",
    "b05FrontResources.ts",
    "b05FrontImage.ts",
    "b05FrontScene.ts",
  ]) {
    assert.ok(dependencyNames.includes(expectedName), `${expectedName} was not traversed`);
  }
  const forbidden = [
    /gallery/i,
    /game[-_/ ]?frames?/i,
    /data:image\//i,
    /https?:\/\//i,
  ];

  for (const [filePath, source] of dependencies) {
    for (const pattern of forbidden) {
      assert.equal(pattern.test(source), false, `${path.basename(filePath)} matched ${pattern}`);
    }
  }
});
