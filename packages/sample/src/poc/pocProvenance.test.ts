import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(HERE, "../../../..");
const SAMPLE_SOURCE_ROOT = path.resolve(HERE, "..");
const A11_ENTRY = path.join(HERE, "HeavyWaterDoorA11.tsx");

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
      if (
        specifier &&
        (ts.isStringLiteral(specifier) ||
          ts.isNoSubstitutionTemplateLiteral(specifier))
      ) {
        specifiers.add(specifier.text);
      }
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

test("A11 procedural textures clamp instead of repeating", async () => {
  const source = await readFile(A11_ENTRY, "utf8");

  assert.equal(source.includes("THREE.RepeatWrapping"), false);
  assert.equal(source.includes("THREE.ClampToEdgeWrapping"), true);
  assert.equal(source.includes("texture.repeat.set(1, 1)"), true);
});

test("A11 runtime dependencies contain no original-image source strings", async () => {
  const dependencies = await collectLocalTypeScriptDependencies(A11_ENTRY);
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
  }

  assert.deepEqual([...violations].sort(), []);
  assert.ok(
    dependencies.has(path.join(HERE, "a11ProceduralMaterials.ts")),
    "A11 must reach a11ProceduralMaterials.ts through local imports",
  );
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
