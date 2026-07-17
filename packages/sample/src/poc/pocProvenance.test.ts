import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(HERE, "../../../..");
const A11_ENTRY = path.join(HERE, "HeavyWaterDoorA11.tsx");

const FORBIDDEN_RUNTIME_STRINGS = [
  { label: "PoC texture path", pattern: /textures\/poc-/ },
  { label: "gallery path", pattern: /gallery/ },
  { label: "materials path", pattern: /materials/ },
  {
    label: "source frame or video path",
    pattern: /(?:^|[/_.-])(?:frames?|frame-extracts?|source-videos?)(?:[/_.-]|$)/,
  },
  { label: "embedded image", pattern: /data:image/ },
  { label: "remote URL", pattern: /https?:\/\// },
] as const;

const stripSourceComments = (source: string): string => {
  let result = "";
  let state: "code" | "line" | "block" | "single" | "double" | "template" =
    "code";

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (state === "line") {
      if (character === "\n") {
        result += character;
        state = "code";
      } else {
        result += " ";
      }
      continue;
    }

    if (state === "block") {
      if (character === "*" && next === "/") {
        result += "  ";
        index += 1;
        state = "code";
      } else {
        result += character === "\n" ? "\n" : " ";
      }
      continue;
    }

    if (state === "code") {
      if (character === "/" && next === "/") {
        result += "  ";
        index += 1;
        state = "line";
      } else if (character === "/" && next === "*") {
        result += "  ";
        index += 1;
        state = "block";
      } else {
        result += character;
        if (character === "'") state = "single";
        if (character === '"') state = "double";
        if (character === "`") state = "template";
      }
      continue;
    }

    result += character;
    if (character === "\\") {
      result += next ?? "";
      index += 1;
      continue;
    }
    if (
      (state === "single" && character === "'") ||
      (state === "double" && character === '"') ||
      (state === "template" && character === "`")
    ) {
      state = "code";
    }
  }

  return result;
};

const resolveTypeScriptImport = async (
  importerPath: string,
  specifier: string,
): Promise<string> => {
  const unresolvedPath = path.resolve(path.dirname(importerPath), specifier);
  const extension = path.extname(unresolvedPath);
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
      // Continue through TypeScript's supported local resolution candidates.
    }
  }

  throw new Error(`Unable to resolve ${specifier} imported by ${importerPath}`);
};

const collectRelativeTypeScriptDependencies = async (
  entryPath: string,
): Promise<Map<string, string>> => {
  const dependencies = new Map<string, string>();

  const visit = async (filePath: string): Promise<void> => {
    if (dependencies.has(filePath)) return;

    const source = await readFile(filePath, "utf8");
    const executableSource = stripSourceComments(source);
    dependencies.set(filePath, executableSource);

    const staticImportPattern =
      /\b(?:import|export)\s+(?:type\s+)?(?:[^"'`;]*?\s+from\s+)?["'](\.[^"']+)["']/g;
    const dynamicImportPattern = /\bimport\s*\(\s*["'](\.[^"']+)["']\s*\)/g;
    const specifiers = new Set([
      ...[...executableSource.matchAll(staticImportPattern)].map((match) => match[1]),
      ...[...executableSource.matchAll(dynamicImportPattern)].map((match) => match[1]),
    ]);

    for (const specifier of specifiers) {
      const dependencyPath = await resolveTypeScriptImport(filePath, specifier);
      await visit(dependencyPath);
    }
  };

  await visit(entryPath);
  return dependencies;
};

const collectStringLiterals = (source: string): string[] => {
  const stringPattern = /(["'`])((?:\\[\s\S]|(?!\1)[\s\S])*)\1/g;
  return [...source.matchAll(stringPattern)].map((match) => match[2]);
};

test("A11 runtime dependencies contain no original-image source strings", async () => {
  const dependencies = await collectRelativeTypeScriptDependencies(A11_ENTRY);
  const violations: string[] = [];

  for (const [filePath, source] of dependencies) {
    for (const value of collectStringLiterals(source)) {
      for (const forbidden of FORBIDDEN_RUNTIME_STRINGS) {
        if (forbidden.pattern.test(value)) {
          violations.push(
            `${path.relative(REPOSITORY_ROOT, filePath)}: ${forbidden.label} in ${JSON.stringify(value)}`,
          );
        }
      }
    }
  }

  assert.deepEqual(violations, []);
  assert.ok(
    dependencies.has(path.join(HERE, "a11ProceduralMaterials.ts")),
    "A11 must reach a11ProceduralMaterials.ts through relative imports",
  );
});

test("A11 has no committed PoC texture directory", () => {
  const trackedTextures = execFileSync(
    "git",
    ["ls-files", "--", "packages/sample/public/textures/poc-a11"],
    { cwd: REPOSITORY_ROOT, encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter(Boolean);

  assert.deepEqual(trackedTextures, []);
});
