import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  dirname,
  extname,
  join,
  normalize,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

type PackageJson = {
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  exports?: {
    [path: string]:
      | string
      | {
          types?: string;
          import?: string;
          require?: string;
        };
  };
};

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const distRoot = join(packageRoot, "dist");
const dist = (...parts: string[]) => join(distRoot, ...parts);
const bannedPackages = ["react", "react-dom", "@react-three/fiber"] as const;
const textOutputExtensions = new Set([".js", ".cjs", ".mjs", ".ts", ".cts"]);

const importSpecifierPattern =
  /(?:\b(?:import|export)\b(?:\s+type)?(?:[^"']*?\sfrom)?\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|require\(\s*["']([^"']+)["']\s*\)|\/\/\/\s*<reference\s+(?:path|types)=["']([^"']+)["']\s*\/>)/g;

const packageJson = () =>
  JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as PackageJson;

const formatOutputPath = (path: string) => relative(packageRoot, path);

const isInsideDist = (path: string) =>
  path === distRoot || path.startsWith(`${distRoot}${sep}`);

const isTextOutputFile = (path: string) => {
  if (path.endsWith(".d.ts") || path.endsWith(".d.cts")) return true;
  return textOutputExtensions.has(extname(path));
};

const collectImportSpecifiers = (source: string) =>
  Array.from(source.matchAll(importSpecifierPattern)).flatMap((match) => {
    const specifier = match[1] ?? match[2] ?? match[3] ?? match[4];
    return specifier ? [specifier] : [];
  });

const collectRelativeImports = (source: string) =>
  collectImportSpecifiers(source).filter((specifier) => specifier.startsWith("."));

const withKnownExtensions = (path: string) => {
  if (existsSync(path)) return [path];

  const extension = extname(path);
  const candidates =
    extension === ".js"
      ? [path.replace(/\.js$/, ".d.ts")]
      : extension === ".cjs"
        ? [path.replace(/\.cjs$/, ".d.cts")]
        : [".js", ".cjs", ".mjs", ".d.ts", ".d.cts"].map(
            (knownExtension) => `${path}${knownExtension}`
          );

  return candidates.filter(existsSync);
};

const collectOutputGraph = (entry: string, seen = new Set<string>()) => {
  const candidates = withKnownExtensions(entry);

  assert.notEqual(
    candidates.length,
    0,
    `Expected package output graph file to exist: ${formatOutputPath(entry)}`
  );

  for (const candidate of candidates) {
    const normalized = normalize(candidate);

    assert.equal(
      isInsideDist(normalized),
      true,
      `Expected output graph to stay inside dist: ${formatOutputPath(normalized)}`
    );

    if (seen.has(normalized)) continue;

    seen.add(normalized);

    if (!isTextOutputFile(normalized)) continue;

    const source = readFileSync(normalized, "utf8");

    for (const relativeImport of collectRelativeImports(source)) {
      collectOutputGraph(join(dirname(normalized), relativeImport), seen);
    }
  }

  return seen;
};

const referencesPackage = (specifier: string, packageName: string) =>
  specifier === packageName || specifier.startsWith(`${packageName}/`);

const collectBannedReferences = (file: string) => {
  if (!isTextOutputFile(file)) return [];

  const source = readFileSync(file, "utf8");

  return collectImportSpecifiers(source).flatMap((specifier) =>
    bannedPackages
      .filter((packageName) => referencesPackage(specifier, packageName))
      .map((packageName) => ({
        file: formatOutputPath(file),
        packageName,
        specifier,
      }))
  );
};

const assertOutputGraphReactFree = ({
  label,
  entries,
}: {
  label: string;
  entries: string[];
}) => {
  const outputGraph = new Set<string>();

  for (const entry of entries) {
    assert.equal(
      existsSync(entry),
      true,
      `Expected fresh package build output: ${formatOutputPath(entry)}`
    );
    collectOutputGraph(entry, outputGraph);
  }

  const bannedReferences = Array.from(
    new Map(
      Array.from(outputGraph)
        .flatMap(collectBannedReferences)
        .map((reference) => [
          `${reference.file}:${reference.packageName}:${reference.specifier}`,
          reference,
        ])
    ).values()
  )
    .sort((left, right) =>
      `${left.file}:${left.specifier}`.localeCompare(
        `${right.file}:${right.specifier}`
      )
    );

  assert.equal(
    bannedReferences.length,
    0,
    [
      `Expected the ${label} output graph to be React-free, but found package references:`,
      ...bannedReferences.map(
        ({ file, packageName, specifier }) =>
          `- ${file} imports ${specifier} (${packageName})`
      ),
    ].join("\n")
  );
};

describe("package boundary", () => {
  it("does not publish the removed React adapter or its peer dependencies", () => {
    const manifest = packageJson();

    for (const packageName of bannedPackages) {
      assert.equal(
        manifest.peerDependencies?.[packageName],
        undefined,
        `Expected ${packageName} to be absent after removing the React adapter`
      );
    }

    assert.equal(manifest.exports?.["./react"], undefined);
    assert.equal(existsSync(dist("react.js")), false);
    assert.equal(existsSync(dist("react.cjs")), false);
  });

  it("keeps the root package entry React-free by default", () => {
    assertOutputGraphReactFree({
      label: "root package entry",
      entries: [
        dist("index.js"),
        dist("index.cjs"),
        dist("index.d.ts"),
        dist("index.d.cts"),
      ],
    });
  });

  it("publishes the vanilla entry", () => {
    const vanillaExport = packageJson().exports?.["./vanilla"];

    assert.equal(typeof vanillaExport, "object");
    if (!vanillaExport || typeof vanillaExport !== "object") return;

    assert.equal(vanillaExport?.types, "./dist/vanilla.d.ts");
    assert.equal(vanillaExport?.import, "./dist/vanilla.js");
    assert.equal(vanillaExport?.require, "./dist/vanilla.cjs");
  });

  it("publishes the preset registry from the root entry", () => {
    const declaration = readFileSync(dist("index.d.ts"), "utf8");

    assert.match(declaration, /doorEntrancePresets/);
    assert.match(declaration, /getDoorEntrancePreset/);
    assert.match(declaration, /resolveDoorEntrancePresetSelection/);
    assert.match(declaration, /DoorEntrancePresetId/);
    assert.doesNotMatch(declaration, /doorEntranceVariants/);
    assert.doesNotMatch(declaration, /getDoorEntranceVariant/);
  });

  it("keeps the full vanilla output graph React-free", () => {
    assertOutputGraphReactFree({
      label: "vanilla",
      entries: [
        dist("vanilla.js"),
        dist("vanilla.cjs"),
        dist("vanilla.d.ts"),
        dist("vanilla.d.cts"),
      ],
    });
  });
});
