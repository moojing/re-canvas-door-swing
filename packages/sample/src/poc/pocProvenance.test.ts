import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(HERE, "../../../..");
const SAMPLE_SOURCE_ROOT = path.resolve(HERE, "..");

type PocProvenancePolicy = Readonly<{
  entryPath: string;
  allowedImagePaths: readonly string[];
}>;

const createPocProvenancePolicy = (
  entryFile: string,
  allowedImagePaths: readonly string[],
): PocProvenancePolicy =>
  Object.freeze({
    entryPath: path.join(HERE, entryFile),
    allowedImagePaths: Object.freeze([...allowedImagePaths]),
  });

const POC_PROVENANCE_POLICIES = Object.freeze({
  A11: createPocProvenancePolicy("HeavyWaterDoorA11.tsx", []),
  B10: createPocProvenancePolicy("SewerGateB10.tsx", [
    "/textures/b10/door.png",
    "/textures/b10/lower.png",
    "/textures/b10/lever-sign.png",
    "/textures/b10/lever-box.png",
  ]),
  C03: createPocProvenancePolicy("LiftPlatformC03.tsx", []),
  B05: createPocProvenancePolicy("ArchedGateB05.tsx", [
    "textures/b05/generated-gate-front.png",
  ]),
  B06: createPocProvenancePolicy("HeavyWaterDoubleDoorB06.tsx", [
    "textures/b06/normal.png",
    "textures/b06/frozen.png",
  ]),
});

const A11_ENTRY = POC_PROVENANCE_POLICIES.A11.entryPath;

const FORBIDDEN_RUNTIME_STRINGS = [
  {
    label: "PoC texture path",
    pattern: /(?:^|[\\/])textures[\\/]poc-/i,
  },
  {
    label: "gallery or materials path",
    pattern: /(?:^|[\\/])(?:gallery|materials)(?:[\\/]|$)/i,
  },
  {
    label: "source frame or video path",
    pattern: /(?:^|[\\/])(?:frames?|frame-extracts?|source-videos?)(?:[\\/]|$)/i,
  },
  { label: "embedded image", pattern: /data:image/i },
  { label: "remote URL", pattern: /https?:\/\//i },
] as const;

const createSourceFile = (filePath: string, source: string): ts.SourceFile =>
  ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

const stripSourceComments = (
  source: string,
  filePath = "provenance-source.tsx",
): string => {
  const sourceFile = createSourceFile(filePath, source);
  return ts
    .createPrinter({
      newLine: ts.NewLineKind.LineFeed,
      removeComments: true,
    })
    .printFile(sourceFile);
};

type StaticPrimitive = string | number | boolean | null;

const evaluateStaticExpression = (
  expression: ts.Expression,
): StaticPrimitive | undefined => {
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  ) {
    return evaluateStaticExpression(expression.expression);
  }

  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  if (ts.isNumericLiteral(expression)) return Number(expression.text);
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (expression.kind === ts.SyntaxKind.NullKeyword) return null;

  if (ts.isPrefixUnaryExpression(expression)) {
    const operand = evaluateStaticExpression(expression.operand);
    if (typeof operand !== "number") return undefined;
    if (expression.operator === ts.SyntaxKind.PlusToken) return operand;
    if (expression.operator === ts.SyntaxKind.MinusToken) return -operand;
    return undefined;
  }

  if (ts.isTemplateExpression(expression)) {
    let value = expression.head.text;
    for (const span of expression.templateSpans) {
      const interpolation = evaluateStaticExpression(span.expression);
      if (interpolation === undefined) return undefined;
      value += `${String(interpolation)}${span.literal.text}`;
    }
    return value;
  }

  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = evaluateStaticExpression(expression.left);
    const right = evaluateStaticExpression(expression.right);
    if (left === undefined || right === undefined) return undefined;
    if (typeof left === "string" || typeof right === "string") {
      return String(left) + String(right);
    }
    if (typeof left === "number" && typeof right === "number") {
      return left + right;
    }
  }

  return undefined;
};

const collectStaticStringValues = (sourceFile: ts.SourceFile): Set<string> => {
  const values = new Set<string>();

  const visit = (node: ts.Node): void => {
    if (ts.isExpression(node)) {
      const value = evaluateStaticExpression(node);
      if (typeof value === "string") values.add(value);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return values;
};

const collectImportSpecifiers = (sourceFile: ts.SourceFile): Set<string> => {
  const specifiers = new Set<string>();

  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.add(node.moduleSpecifier.text);
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const [specifier] = node.arguments;
      const value = specifier && evaluateStaticExpression(specifier);
      if (typeof value === "string") specifiers.add(value);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return specifiers;
};

const resolveTypeScriptImport = async (
  importerPath: string,
  specifier: string,
  aliasRoot: string,
): Promise<string | null> => {
  let unresolvedPath: string;
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    unresolvedPath = path.resolve(path.dirname(importerPath), specifier);
  } else if (specifier.startsWith("@/")) {
    unresolvedPath = path.resolve(aliasRoot, specifier.slice(2));
  } else {
    return null;
  }

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
      // Continue through the local TypeScript resolution candidates.
    }
  }

  throw new Error(`Unable to resolve ${specifier} imported by ${importerPath}`);
};

const collectLocalTypeScriptDependencies = async (
  entryPath: string,
  aliasRoot = SAMPLE_SOURCE_ROOT,
): Promise<Map<string, ts.SourceFile>> => {
  const dependencies = new Map<string, ts.SourceFile>();

  const visit = async (filePath: string): Promise<void> => {
    if (dependencies.has(filePath)) return;

    const source = await readFile(filePath, "utf8");
    const executableSource = stripSourceComments(source, filePath);
    const sourceFile = createSourceFile(filePath, executableSource);
    dependencies.set(filePath, sourceFile);

    for (const specifier of collectImportSpecifiers(sourceFile)) {
      const dependencyPath = await resolveTypeScriptImport(
        filePath,
        specifier,
        aliasRoot,
      );
      if (dependencyPath) await visit(dependencyPath);
    }
  };

  await visit(entryPath);
  return dependencies;
};

const hasForbiddenRuntimeString = (value: string): boolean =>
  FORBIDDEN_RUNTIME_STRINGS.some(({ pattern }) => pattern.test(value));

const IMAGE_PATH_PATTERN =
  /(?:textures[\\/]|poc-thumbnails[\\/]|\.(?:png|jpe?g|webp|gif|avif|svg)\b)/i;

const collectImagePathCandidates = (sourceFile: ts.SourceFile): Set<string> =>
  new Set(
    [...collectStaticStringValues(sourceFile)].filter((value) =>
      IMAGE_PATH_PATTERN.test(value),
    ),
  );

const normalizeImagePathFragment = (value: string): string =>
  value
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/^\//, "")
    .replace(/[?#].*$/, "")
    .toLowerCase();

const isAllowedImagePathFragment = (
  candidate: string,
  allowedImagePaths: readonly string[],
): boolean => {
  const normalizedCandidate = normalizeImagePathFragment(candidate);
  return allowedImagePaths.some((allowedImagePath) => {
    const normalizedAllowed = normalizeImagePathFragment(allowedImagePath);
    return (
      normalizedCandidate === normalizedAllowed ||
      normalizedAllowed.startsWith(`${normalizedCandidate}/`) ||
      normalizedAllowed.endsWith(`/${normalizedCandidate}`)
    );
  });
};

const collectProvenanceViolations = (
  dependencies: ReadonlyMap<string, ts.SourceFile>,
  policy: PocProvenancePolicy,
): string[] => {
  const violations = new Set<string>();

  for (const [filePath, sourceFile] of dependencies) {
    for (const value of collectStaticStringValues(sourceFile)) {
      for (const forbidden of FORBIDDEN_RUNTIME_STRINGS) {
        if (forbidden.pattern.test(value)) {
          violations.add(
            `${path.relative(REPOSITORY_ROOT, filePath)}: ${forbidden.label} in ${JSON.stringify(value)}`,
          );
        }
      }
    }

    for (const candidate of collectImagePathCandidates(sourceFile)) {
      if (!isAllowedImagePathFragment(candidate, policy.allowedImagePaths)) {
        violations.add(
          `${path.relative(REPOSITORY_ROOT, filePath)}: unapproved image path in ${JSON.stringify(candidate)}`,
        );
      }
    }
  }

  return [...violations].sort();
};

test("comment stripping excludes forbidden text without changing executable strings", () => {
  const source = [
    '// "/gallery/comment.png"',
    'const visible = "gallery prose";',
    '/* const hidden = "https://example.test/image.png"; */',
  ].join("\n");
  const executableSource = stripSourceComments(source);
  const values = collectStaticStringValues(
    createSourceFile("comment-fixture.ts", executableSource),
  );

  assert.deepEqual([...values], ["gallery prose"]);
});

test("dependency collection recognizes every supported local import form", async (t) => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "poc-provenance-"));
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const sourceRoot = path.join(fixtureRoot, "src");
  const entryPath = path.join(sourceRoot, "entry.ts");
  await mkdir(sourceRoot, { recursive: true });
  await Promise.all([
    writeFile(
      entryPath,
      [
        'import "./static";',
        'export { value } from "./exported";',
        "void import(`./dynamic`);",
        'import "@/aliased";',
        'import "door-entrance";',
        'import "third-party";',
      ].join("\n"),
    ),
    writeFile(path.join(sourceRoot, "static.ts"), "export {};"),
    writeFile(path.join(sourceRoot, "exported.ts"), "export const value = 1;"),
    writeFile(path.join(sourceRoot, "dynamic.ts"), "export {};"),
    writeFile(path.join(sourceRoot, "aliased.ts"), "export {};"),
  ]);

  const dependencies = await collectLocalTypeScriptDependencies(
    entryPath,
    sourceRoot,
  );

  assert.deepEqual(
    [...dependencies.keys()].map((filePath) => path.basename(filePath)).sort(),
    ["aliased.ts", "dynamic.ts", "entry.ts", "exported.ts", "static.ts"],
  );
});

test("dependency collection evaluates static dynamic import expressions", async (t) => {
  const fixtures = [
    ["static template", 'void import(`./${"unsafe"}`);'],
    ["static concatenation", 'void import("./" + "unsafe");'],
  ] as const;

  for (const [name, statement] of fixtures) {
    await t.test(name, async (fixtureTest) => {
      const fixtureRoot = await mkdtemp(path.join(tmpdir(), "poc-provenance-"));
      fixtureTest.after(() => rm(fixtureRoot, { recursive: true, force: true }));
      const sourceRoot = path.join(fixtureRoot, "src");
      const entryPath = path.join(sourceRoot, "entry.ts");
      await mkdir(sourceRoot, { recursive: true });
      await Promise.all([
        writeFile(entryPath, statement),
        writeFile(path.join(sourceRoot, "unsafe.ts"), "export {};"),
      ]);

      const dependencies = await collectLocalTypeScriptDependencies(
        entryPath,
        sourceRoot,
      );

      assert.deepEqual(
        [...dependencies.keys()].map((filePath) => path.basename(filePath)).sort(),
        ["entry.ts", "unsafe.ts"],
      );
    });
  }
});

test("string collection decodes and composes fully static expressions", () => {
  const source = [
    String.raw`const escaped = "\x74extures/POC-a11";`,
    'const concatenated = "source-" + "video/frame.png";',
    'const templated = `MATERIALS/a11/${"door"}.png`;',
  ].join("\n");
  const executableSource = stripSourceComments(source);
  const values = collectStaticStringValues(
    createSourceFile("string-fixture.ts", executableSource),
  );

  assert.ok(values.has("textures/POC-a11"));
  assert.ok(values.has("source-video/frame.png"));
  assert.ok(values.has("MATERIALS/a11/door.png"));
  assert.equal(hasForbiddenRuntimeString("textures/POC-a11"), true);
  assert.equal(hasForbiddenRuntimeString("source-video/frame.png"), true);
  assert.equal(hasForbiddenRuntimeString("MATERIALS/a11/door.png"), true);
});

test("forbidden matching is case-insensitive and path-oriented", () => {
  assert.equal(hasForbiddenRuntimeString("/GaLlErY/a11/door.png"), true);
  assert.equal(hasForbiddenRuntimeString("src/MATERIALS/a11/door.png"), true);
  assert.equal(hasForbiddenRuntimeString("gallery materials overview"), false);
});

test("POC provenance policies are immutable and explicitly allowlisted", () => {
  const expectedPolicies = {
    A11: ["HeavyWaterDoorA11.tsx", []],
    B10: [
      "SewerGateB10.tsx",
      [
        "/textures/b10/door.png",
        "/textures/b10/lower.png",
        "/textures/b10/lever-sign.png",
        "/textures/b10/lever-box.png",
      ],
    ],
    C03: ["LiftPlatformC03.tsx", []],
    B05: ["ArchedGateB05.tsx", ["textures/b05/generated-gate-front.png"]],
    B06: [
      "HeavyWaterDoubleDoorB06.tsx",
      ["textures/b06/normal.png", "textures/b06/frozen.png"],
    ],
  } as const;

  assert.equal(Object.isFrozen(POC_PROVENANCE_POLICIES), true);
  assert.deepEqual(Object.keys(POC_PROVENANCE_POLICIES), Object.keys(expectedPolicies));

  for (const [entryName, [entryFile, allowedImagePaths]] of Object.entries(
    expectedPolicies,
  )) {
    const policy = POC_PROVENANCE_POLICIES[
      entryName as keyof typeof POC_PROVENANCE_POLICIES
    ];
    assert.equal(path.basename(policy.entryPath), entryFile);
    assert.equal(Object.isFrozen(policy), true);
    assert.equal(Object.isFrozen(policy.allowedImagePaths), true);
    assert.deepEqual(policy.allowedImagePaths, allowedImagePaths);
  }
});

test("image candidate collection sees static paths but ignores comments and prose", () => {
  const source = [
    '// const ignored = "/textures/comment-only.png";',
    'const template = `TEXTURES/b10/${"door"}.PNG`;',
    'const concatenated = "poc-" + "thumbnails/card.webp";',
    'const extensionOnly = "icons/door.SvG";',
    'const prose = "gallery materials overview";',
  ].join("\n");
  const executableSource = stripSourceComments(source);
  const candidates = collectImagePathCandidates(
    createSourceFile("image-candidate-fixture.ts", executableSource),
  );

  assert.ok(candidates.has("TEXTURES/b10/door.PNG"));
  assert.ok(candidates.has("poc-thumbnails/card.webp"));
  assert.ok(candidates.has("icons/door.SvG"));
  assert.equal(candidates.has("/textures/comment-only.png"), false);
  assert.equal(candidates.has("gallery materials overview"), false);
});

test("unknown shared image fixture violates the no-image A11 policy", async (t) => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "poc-provenance-"));
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const entryPath = path.join(fixtureRoot, "entry.ts");
  const sharedPath = path.join(fixtureRoot, "shared.ts");
  await Promise.all([
    writeFile(entryPath, 'import "./shared";'),
    writeFile(sharedPath, 'export const image = "/textures/" + "door-2.png";'),
  ]);

  const dependencies = await collectLocalTypeScriptDependencies(
    entryPath,
    fixtureRoot,
  );
  const violations = collectProvenanceViolations(
    dependencies,
    POC_PROVENANCE_POLICIES.A11,
  );

  assert.ok(
    violations.some((violation) => violation.includes("/textures/door-2.png")),
    `Expected /textures/door-2.png to fail, received: ${violations.join("\n")}`,
  );
});

test("A11 procedural textures clamp instead of repeating", async () => {
  const source = await readFile(A11_ENTRY, "utf8");

  assert.equal(source.includes("THREE.RepeatWrapping"), false);
  assert.equal(source.includes("THREE.ClampToEdgeWrapping"), true);
  assert.equal(source.includes("texture.repeat.set(1, 1)"), true);
});

test("A11 runtime dependencies contain no original-image source strings", async () => {
  const dependencies = await collectLocalTypeScriptDependencies(A11_ENTRY);
  const violations = collectProvenanceViolations(
    dependencies,
    POC_PROVENANCE_POLICIES.A11,
  );

  assert.deepEqual(violations, []);
  assert.ok(
    dependencies.has(path.join(HERE, "a11ProceduralMaterials.ts")),
    "A11 must reach a11ProceduralMaterials.ts through local imports",
  );
});

test("all POC entry points comply with their asset provenance policy", async (t) => {
  for (const [entryName, policy] of Object.entries(POC_PROVENANCE_POLICIES)) {
    await t.test(entryName, async () => {
      const dependencies = await collectLocalTypeScriptDependencies(
        policy.entryPath,
      );
      assert.deepEqual(collectProvenanceViolations(dependencies, policy), []);
    });
  }
});

test("B10 tracked textures exactly match the approved files and hashes", async () => {
  const expectedHashes = Object.freeze({
    "door.png": "09f57fd7f8a6d994d75b27b2d63e1483a87db4eefabb2d63d1e63b575b3f3a14",
    "lever-box.png": "33c9b346ab720afe5d7aecc36898d73dbcc361d07cb3bee330f8cf4102af465d",
    "lever-sign.png": "243df5381f5f10fafa50e287afeea81c88faa03e5a846aad6297c5c7d5420e3f",
    "lower.png": "d5df4859e9ac156bc20c05d47f2bab8473afaf7e8d94a061b4068fb31896300a",
  });
  const textureDirectory = "packages/sample/public/textures/b10";
  const expectedTrackedTextures = Object.keys(expectedHashes)
    .map((fileName) => `${textureDirectory}/${fileName}`)
    .sort();
  const trackedTextures = execFileSync(
    "git",
    ["ls-files", "--", textureDirectory],
    { cwd: REPOSITORY_ROOT, encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter(Boolean)
    .sort();

  assert.deepEqual(trackedTextures, expectedTrackedTextures);

  for (const [fileName, expectedHash] of Object.entries(expectedHashes)) {
    const contents = await readFile(
      path.join(REPOSITORY_ROOT, textureDirectory, fileName),
    );
    const actualHash = createHash("sha256").update(contents).digest("hex");
    assert.equal(actualHash, expectedHash, fileName);
  }
});

test("A11 has no committed texture directory", () => {
  const trackedTextures = execFileSync(
    "git",
    [
      "ls-files",
      "--",
      "packages/sample/public/textures/poc-a11",
      "packages/sample/public/textures/a11",
    ],
    { cwd: REPOSITORY_ROOT, encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter(Boolean);

  assert.deepEqual(trackedTextures, []);
});
