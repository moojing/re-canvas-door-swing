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
  expectedDependencyFiles: readonly string[];
  trackedTextureDirectories: readonly string[];
  allowSplitImageFragments: boolean;
}>;

const createPocProvenancePolicy = (
  entryFile: string,
  allowedImagePaths: readonly string[],
  expectedDependencyFiles: readonly string[],
  trackedTextureDirectories: readonly string[] = [],
  allowSplitImageFragments = false,
): PocProvenancePolicy =>
  Object.freeze({
    entryPath: path.join(HERE, entryFile),
    allowedImagePaths: Object.freeze([...allowedImagePaths]),
    expectedDependencyFiles: Object.freeze([...expectedDependencyFiles]),
    trackedTextureDirectories: Object.freeze([...trackedTextureDirectories]),
    allowSplitImageFragments,
  });

const POC_PROVENANCE_POLICIES = Object.freeze({
  GALLERY: createPocProvenancePolicy(
    "PocGallery.tsx",
    [
      "poc-thumbnails/a11.png",
      "poc-thumbnails/b10.png",
      "poc-thumbnails/c03.png",
      "poc-thumbnails/b05.png",
      "poc-thumbnails/b06.png",
      "poc-thumbnails/a04.png",
      "poc-thumbnails/c06.png",
    ],
    [
      "packages/sample/src/poc/PocGallery.tsx",
      "packages/sample/src/poc/pocGalleryData.ts",
    ],
  ),
  A04: createPocProvenancePolicy(
    "A04DoorPoC.tsx",
    [
      "textures/a04/metal-plate-02-diffuse.jpg",
      "textures/a04/metal-plate-02-roughness.jpg",
      "textures/a04/green-metal-rust-diffuse.jpg",
      "textures/a04/green-metal-rust-roughness.jpg",
    ],
    [
      "packages/sample/src/poc/A04DoorPoC.tsx",
      "packages/sample/src/poc/a04TextureUrls.ts",
      "packages/sample/src/poc/textureColorSpace.ts",
      "packages/sample/src/poc/textureUrls.ts",
    ],
    ["packages/sample/public/textures/a04"],
  ),
  A11: createPocProvenancePolicy(
    "HeavyWaterDoorA11.tsx",
    [],
    [
      "packages/sample/src/poc/HeavyWaterDoorA11.tsx",
      "packages/sample/src/poc/a11ProceduralMaterials.ts",
    ],
    [
      "packages/sample/public/textures/poc-a11",
      "packages/sample/public/textures/a11",
    ],
  ),
  B10: createPocProvenancePolicy(
    "SewerGateB10.tsx",
    [
      "/textures/b10",
      "door.png",
      "lower.png",
      "lever-sign.png",
      "lever-box.png",
    ],
    [
      "packages/sample/src/poc/SewerGateB10.tsx",
      "packages/sample/src/poc/b10TextureUrls.ts",
      "packages/sample/src/poc/textureColorSpace.ts",
    ],
    [],
    true,
  ),
  C03: createPocProvenancePolicy(
    "LiftPlatformC03.tsx",
    [],
    [
      "packages/sample/src/poc/LiftPlatformC03.tsx",
      "packages/sample/src/poc/c03Motion.ts",
      "packages/sample/src/poc/c03ProceduralMaterials.ts",
      "packages/sample/src/poc/c03Playback.ts",
      "packages/sample/src/poc/pocMotionUtils.ts",
    ],
    [
      "packages/sample/public/textures/c03",
      "packages/sample/public/textures/poc-c03",
    ],
  ),
  B05: createPocProvenancePolicy(
    "ArchedGateB05.tsx",
    ["textures/b05/generated-gate-front.png"],
    [
      "packages/sample/src/poc/ArchedGateB05.tsx",
      "packages/sample/src/poc/b05BoxMaterialSlots.ts",
      "packages/sample/src/poc/b05FrontImage.ts",
      "packages/sample/src/poc/b05FrontLoader.ts",
      "packages/sample/src/poc/b05FrontResources.ts",
      "packages/sample/src/poc/b05FrontScene.ts",
      "packages/sample/src/poc/b05Geometry.ts",
      "packages/sample/src/poc/b05Motion.ts",
      "packages/sample/src/poc/b05ProceduralMaterials.ts",
      "packages/sample/src/poc/b05TextureMapping.ts",
    ],
  ),
  B06: createPocProvenancePolicy(
    "HeavyWaterDoubleDoorB06.tsx",
    ["textures/b06/normal.png", "textures/b06/frozen.png"],
    [
      "packages/sample/src/poc/HeavyWaterDoubleDoorB06.tsx",
      "packages/sample/src/poc/b06Assets.ts",
      "packages/sample/src/poc/b06FrontLoader.ts",
      "packages/sample/src/poc/b06FrontResources.ts",
      "packages/sample/src/poc/b06Motion.ts",
      "packages/sample/src/poc/b06Scene.ts",
      "packages/sample/src/poc/pocMotionUtils.ts",
    ],
  ),
  C06: createPocProvenancePolicy(
    "C06DrilledHolePoC.tsx",
    [
      "textures/c06/aged-brick-albedo.png",
      "textures/c06/broken-brick-core-albedo.png",
    ],
    [
      "packages/sample/src/poc/C06DrilledHolePoC.tsx",
      "packages/sample/src/poc/c06TextureUrls.ts",
      "packages/sample/src/poc/c06SceneModel.ts",
      "packages/sample/src/poc/textureColorSpace.ts",
      "packages/sample/src/poc/textureUrls.ts",
    ],
    ["packages/sample/public/textures/c06"],
  ),
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
type StaticBinding = Readonly<{
  declaration: ts.Node;
  initializer: ts.Expression | null;
}>;
type StaticScope = {
  parent: StaticScope | null;
  bindings: Map<string, StaticBinding | null>;
};
type StaticBindingContext = Readonly<{
  nodeScopes: WeakMap<ts.Node, StaticScope>;
}>;

const addStaticBinding = (
  scope: StaticScope,
  name: string,
  binding: StaticBinding,
): void => {
  scope.bindings.set(name, scope.bindings.has(name) ? null : binding);
};

const forEachBindingName = (
  name: ts.BindingName,
  callback: (identifier: ts.Identifier) => void,
): void => {
  if (ts.isIdentifier(name)) {
    callback(name);
    return;
  }
  for (const element of name.elements) {
    if (!ts.isOmittedExpression(element)) {
      forEachBindingName(element.name, callback);
    }
  }
};

const createStaticBindingContext = (
  sourceFile: ts.SourceFile,
): StaticBindingContext => {
  const nodeScopes = new WeakMap<ts.Node, StaticScope>();
  const rootScope: StaticScope = { parent: null, bindings: new Map() };

  const visit = (node: ts.Node, enclosingScope: StaticScope): void => {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isEnumDeclaration(node)) &&
      node.name
    ) {
      addStaticBinding(enclosingScope, node.name.text, {
        declaration: node,
        initializer: null,
      });
    }

    const createsScope =
      node !== sourceFile &&
      (ts.isFunctionLike(node) ||
        ts.isBlock(node) ||
        ts.isModuleBlock(node) ||
        ts.isCatchClause(node));
    const scope = createsScope
      ? { parent: enclosingScope, bindings: new Map<string, StaticBinding | null>() }
      : enclosingScope;
    nodeScopes.set(node, scope);

    if (ts.isParameter(node)) {
      forEachBindingName(node.name, (identifier) =>
        addStaticBinding(scope, identifier.text, {
          declaration: node,
          initializer: null,
        }),
      );
    }

    if (ts.isVariableDeclaration(node)) {
      const isImmutable =
        ts.isVariableDeclarationList(node.parent) &&
        (node.parent.flags & ts.NodeFlags.Const) !== 0;
      forEachBindingName(node.name, (identifier) =>
        addStaticBinding(scope, identifier.text, {
          declaration: node,
          initializer:
            isImmutable && ts.isIdentifier(node.name)
              ? (node.initializer ?? null)
              : null,
        }),
      );
    }

    if (
      ts.isImportClause(node) &&
      node.name
    ) {
      addStaticBinding(scope, node.name.text, {
        declaration: node,
        initializer: null,
      });
    } else if (ts.isImportSpecifier(node) || ts.isNamespaceImport(node)) {
      addStaticBinding(scope, node.name.text, {
        declaration: node,
        initializer: null,
      });
    }

    ts.forEachChild(node, (child) => visit(child, scope));
  };

  visit(sourceFile, rootScope);
  return { nodeScopes };
};

const resolveStaticBinding = (
  identifier: ts.Identifier,
  context: StaticBindingContext,
): StaticBinding | null => {
  let scope = context.nodeScopes.get(identifier) ?? null;
  while (scope) {
    if (scope.bindings.has(identifier.text)) {
      return scope.bindings.get(identifier.text) ?? null;
    }
    scope = scope.parent;
  }
  return null;
};

const isStaticExpressionWrapper = (
  expression: ts.Expression,
): expression is
  | ts.ParenthesizedExpression
  | ts.AsExpression
  | ts.TypeAssertion
  | ts.NonNullExpression
  | ts.SatisfiesExpression =>
  ts.isParenthesizedExpression(expression) ||
  ts.isAsExpression(expression) ||
  ts.isTypeAssertionExpression(expression) ||
  ts.isNonNullExpression(expression) ||
  ts.isSatisfiesExpression(expression);

const evaluateStaticArrayExpression = (
  expression: ts.Expression,
  context: StaticBindingContext,
  resolvingBindings: ReadonlySet<ts.Node>,
): StaticPrimitive[] | undefined => {
  if (isStaticExpressionWrapper(expression)) {
    return evaluateStaticArrayExpression(
      expression.expression,
      context,
      resolvingBindings,
    );
  }

  if (ts.isIdentifier(expression)) {
    const binding = resolveStaticBinding(expression, context);
    if (
      !binding?.initializer ||
      resolvingBindings.has(binding.declaration)
    ) {
      return undefined;
    }
    return evaluateStaticArrayExpression(
      binding.initializer,
      context,
      new Set([...resolvingBindings, binding.declaration]),
    );
  }

  if (!ts.isArrayLiteralExpression(expression)) return undefined;
  const values: StaticPrimitive[] = [];
  for (const element of expression.elements) {
    if (ts.isSpreadElement(element) || ts.isOmittedExpression(element)) {
      return undefined;
    }
    const value = evaluateStaticExpression(element, context, resolvingBindings);
    if (value === undefined) return undefined;
    values.push(value);
  }
  return values;
};

const evaluateStaticExpression = (
  expression: ts.Expression,
  context: StaticBindingContext,
  resolvingBindings: ReadonlySet<ts.Node> = new Set(),
): StaticPrimitive | undefined => {
  if (isStaticExpressionWrapper(expression)) {
    return evaluateStaticExpression(
      expression.expression,
      context,
      resolvingBindings,
    );
  }

  if (ts.isIdentifier(expression)) {
    const binding = resolveStaticBinding(expression, context);
    if (
      !binding?.initializer ||
      resolvingBindings.has(binding.declaration)
    ) {
      return undefined;
    }
    return evaluateStaticExpression(
      binding.initializer,
      context,
      new Set([...resolvingBindings, binding.declaration]),
    );
  }

  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  if (ts.isNumericLiteral(expression)) return Number(expression.text);
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (expression.kind === ts.SyntaxKind.NullKeyword) return null;

  if (ts.isPrefixUnaryExpression(expression)) {
    const operand = evaluateStaticExpression(
      expression.operand,
      context,
      resolvingBindings,
    );
    if (typeof operand !== "number") return undefined;
    if (expression.operator === ts.SyntaxKind.PlusToken) return operand;
    if (expression.operator === ts.SyntaxKind.MinusToken) return -operand;
    return undefined;
  }

  if (ts.isTemplateExpression(expression)) {
    let value = expression.head.text;
    for (const span of expression.templateSpans) {
      const interpolation = evaluateStaticExpression(
        span.expression,
        context,
        resolvingBindings,
      );
      if (interpolation === undefined) return undefined;
      value += `${String(interpolation)}${span.literal.text}`;
    }
    return value;
  }

  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = evaluateStaticExpression(
      expression.left,
      context,
      resolvingBindings,
    );
    const right = evaluateStaticExpression(
      expression.right,
      context,
      resolvingBindings,
    );
    if (left === undefined || right === undefined) return undefined;
    if (typeof left === "string" || typeof right === "string") {
      return String(left) + String(right);
    }
    if (typeof left === "number" && typeof right === "number") {
      return left + right;
    }
  }

  if (
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    expression.expression.name.text === "join" &&
    expression.arguments.length <= 1
  ) {
    const values = evaluateStaticArrayExpression(
      expression.expression.expression,
      context,
      resolvingBindings,
    );
    if (!values) return undefined;
    const separatorExpression = expression.arguments[0];
    const separator = separatorExpression
      ? evaluateStaticExpression(separatorExpression, context, resolvingBindings)
      : ",";
    if (separator === undefined) return undefined;
    return values.map(String).join(String(separator));
  }

  return undefined;
};

const collectStaticStringValues = (sourceFile: ts.SourceFile): Set<string> => {
  const values = new Set<string>();
  const context = createStaticBindingContext(sourceFile);

  const visit = (node: ts.Node): void => {
    if (ts.isExpression(node)) {
      const value = evaluateStaticExpression(node, context);
      if (typeof value === "string") values.add(value);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return values;
};

const collectImportSpecifiers = (sourceFile: ts.SourceFile): Set<string> => {
  const specifiers = new Set<string>();
  const context = createStaticBindingContext(sourceFile);

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
      const value = specifier && evaluateStaticExpression(specifier, context);
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
  const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
  const isAlias = specifier.startsWith("@/");
  if (!isRelative && !isAlias) return null;

  const compilerOptions: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowImportingTsExtensions: true,
    baseUrl: aliasRoot,
    paths: { "@/*": ["*"] },
  };
  const resolved = ts.resolveModuleName(
    specifier,
    importerPath,
    compilerOptions,
    ts.sys,
  ).resolvedModule?.resolvedFileName;
  if (resolved && /(?<!\.d)\.tsx?$/.test(resolved)) return path.resolve(resolved);

  const unresolvedPath = isRelative
    ? path.resolve(path.dirname(importerPath), specifier)
    : path.resolve(aliasRoot, specifier.slice(2));
  const extension = path.extname(unresolvedPath);
  const fallbackStem = extension === ".js"
    ? unresolvedPath.slice(0, -extension.length)
    : unresolvedPath;
  const candidates = extension === ".ts" || extension === ".tsx"
    ? [unresolvedPath]
    : [
        `${fallbackStem}.ts`,
        `${fallbackStem}.tsx`,
        path.join(fallbackStem, "index.ts"),
        path.join(fallbackStem, "index.tsx"),
      ];
  const fallback = candidates.find((candidate) => ts.sys.fileExists(candidate));
  if (fallback) return fallback;

  throw new Error(
    `Unable to resolve local module ${specifier} imported by ${importerPath}`,
  );
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
  /(?:textures[\\/]|poc-thumbnails[\\/]|\.(?:png|jpe?g|webp|gif|avif|svg)(?:[?#][^\s]*)?$)/i;

const collectImagePathCandidates = (sourceFile: ts.SourceFile): Set<string> =>
  new Set(
    [...collectStaticStringValues(sourceFile)].filter((value) =>
      IMAGE_PATH_PATTERN.test(value),
    ),
  );

const normalizeImagePathFragment = (value: string): string =>
  value
    .split("\\")
    .join("/")
    .replace(/^\/+/, "");

const isAllowedImagePathFragment = (
  candidate: string,
  allowedImagePaths: readonly string[],
  allowSplitImageFragments = false,
): boolean => {
  const normalizedCandidate = normalizeImagePathFragment(candidate);
  const normalizedAllowed = allowedImagePaths.map(normalizeImagePathFragment);
  if (normalizedAllowed.includes(normalizedCandidate)) return true;
  if (!allowSplitImageFragments) return false;

  const directories = normalizedAllowed.filter(
    (fragment) => fragment.includes("textures/") && !fragment.includes("."),
  );
  const fileNames = normalizedAllowed.filter(
    (fragment) => !fragment.includes("/") && /\.[a-z0-9]+$/i.test(fragment),
  );
  return directories.some((directory) =>
    fileNames.some(
      (fileName) => normalizedCandidate === `${directory}/${fileName}`,
    ),
  );
};

const isTextureLoaderConstruction = (expression: ts.Expression): boolean => {
  if (!ts.isNewExpression(expression)) return false;
  const constructor = expression.expression;
  return (
    (ts.isIdentifier(constructor) && constructor.text === "TextureLoader") ||
    (ts.isPropertyAccessExpression(constructor) &&
      constructor.name.text === "TextureLoader")
  );
};

const getSplitComposedImagePaths = (
  policy: PocProvenancePolicy,
): readonly string[] => {
  if (!policy.allowSplitImageFragments) return [];
  const normalizedAllowed = policy.allowedImagePaths.map(
    normalizeImagePathFragment,
  );
  const directories = normalizedAllowed.filter(
    (fragment) => fragment.includes("textures/") && !fragment.includes("."),
  );
  const fileNames = normalizedAllowed.filter(
    (fragment) => !fragment.includes("/") && /\.[a-z0-9]+$/i.test(fragment),
  );
  return directories.flatMap((directory) =>
    fileNames.map((fileName) => `${directory}/${fileName}`),
  );
};

const isImmutableLiteralStringExpression = (
  expression: ts.Expression,
  context: StaticBindingContext,
  resolvingBindings: ReadonlySet<ts.Node> = new Set(),
): boolean => {
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  ) {
    return isImmutableLiteralStringExpression(
      expression.expression,
      context,
      resolvingBindings,
    );
  }
  if (ts.isAsExpression(expression)) {
    return (
      expression.type.getText() === "const" &&
      isImmutableLiteralStringExpression(
        expression.expression,
        context,
        resolvingBindings,
      )
    );
  }
  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    return true;
  }
  if (!ts.isIdentifier(expression)) return false;

  const binding = resolveStaticBinding(expression, context);
  if (
    !binding?.initializer ||
    resolvingBindings.has(binding.declaration) ||
    !ts.isVariableDeclaration(binding.declaration) ||
    binding.declaration.type !== undefined
  ) {
    return false;
  }
  return isImmutableLiteralStringExpression(
    binding.initializer,
    context,
    new Set([...resolvingBindings, binding.declaration]),
  );
};

const collectB10TexturePathTupleValues = (
  sourceFile: ts.SourceFile,
): readonly string[] | null => {
  const declarations = sourceFile.statements.flatMap((statement) => {
    if (
      !ts.isVariableStatement(statement) ||
      (statement.declarationList.flags & ts.NodeFlags.Const) === 0
    ) {
      return [];
    }
    return statement.declarationList.declarations.filter(
      (declaration) =>
        statement.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
        ) === true &&
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === "B10_TEXTURE_PATHS",
    );
  });
  if (declarations.length !== 1) return null;

  const declaration = declarations[0];
  const initializer = declaration.initializer;
  if (
    declaration.type !== undefined ||
    !initializer ||
    !ts.isCallExpression(initializer) ||
    initializer.typeArguments !== undefined ||
    initializer.arguments.length !== 1 ||
    !ts.isPropertyAccessExpression(initializer.expression) ||
    !ts.isIdentifier(initializer.expression.expression) ||
    initializer.expression.expression.text !== "Object" ||
    initializer.expression.name.text !== "freeze"
  ) {
    return null;
  }

  const frozenValue = initializer.arguments[0];
  if (
    !ts.isAsExpression(frozenValue) ||
    frozenValue.type.getText(sourceFile) !== "const" ||
    !ts.isArrayLiteralExpression(frozenValue.expression)
  ) {
    return null;
  }

  const context = createStaticBindingContext(sourceFile);
  const values: string[] = [];
  for (const element of frozenValue.expression.elements) {
    if (ts.isSpreadElement(element) || ts.isOmittedExpression(element)) {
      return null;
    }
    const value = evaluateStaticExpression(element, context);
    if (
      typeof value !== "string" ||
      !isImmutableLiteralStringExpression(element, context)
    ) {
      return null;
    }
    values.push(value);
  }
  return values;
};

const hasApprovedB10TexturePathContract = (
  sourceFile: ts.SourceFile,
  policy: PocProvenancePolicy,
): boolean => {
  if (!policy.allowSplitImageFragments) return false;
  const typeAlias = sourceFile.statements.find(
    (statement): statement is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === "B10TexturePath",
  );
  if (
    !typeAlias ||
    typeAlias.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    ) !== true ||
    typeAlias.type.getText(sourceFile).replace(/\s/g, "") !==
      "(typeofB10_TEXTURE_PATHS)[number]"
  ) {
    return false;
  }

  const tupleValues = collectB10TexturePathTupleValues(sourceFile);
  const expectedCompletePaths = getSplitComposedImagePaths(policy);
  const sortedExpectedPaths = [...expectedCompletePaths].sort();
  return (
    tupleValues !== null &&
    expectedCompletePaths.length > 0 &&
    tupleValues.length === expectedCompletePaths.length &&
    new Set(tupleValues).size === tupleValues.length &&
    [...tupleValues].sort().every(
      (value, index) => value === sortedExpectedPaths[index],
    )
  );
};

type TypedTextureUrlContract = Readonly<{
  typeName: string;
  resolverName: string;
  moduleSpecifier: string;
}>;

const TYPED_TEXTURE_URL_CONTRACTS = Object.freeze({
  A04: {
    typeName: "A04TexturePath",
    resolverName: "resolveA04TextureUrl",
    moduleSpecifier: "./a04TextureUrls",
  },
  C06: {
    typeName: "C06TexturePath",
    resolverName: "resolveC06TextureUrl",
    moduleSpecifier: "./c06TextureUrls",
  },
} as const satisfies Record<string, TypedTextureUrlContract>);

const getTypedTextureUrlContract = (
  policy: PocProvenancePolicy,
): TypedTextureUrlContract | null => {
  const entryName = path.basename(policy.entryPath, ".tsx");
  if (entryName === "A04DoorPoC") return TYPED_TEXTURE_URL_CONTRACTS.A04;
  if (entryName === "C06DrilledHolePoC") return TYPED_TEXTURE_URL_CONTRACTS.C06;
  return null;
};

const isApprovedTypedTexturePath = (
  expression: ts.Expression,
  context: StaticBindingContext,
  contract: TypedTextureUrlContract,
): boolean => {
  if (!ts.isIdentifier(expression)) return false;
  const declaration = resolveStaticBinding(expression, context)?.declaration;
  const parameterType =
    declaration !== undefined && ts.isParameter(declaration)
      ? declaration.type
      : undefined;
  return (
    parameterType !== undefined &&
    ts.isTypeReferenceNode(parameterType) &&
    parameterType.typeArguments === undefined &&
    ts.isIdentifier(parameterType.typeName) &&
    isNamedImportFrom(
      parameterType.typeName,
      contract.typeName,
      contract.moduleSpecifier,
      context,
    )
  );
};

const isApprovedTypedTextureResolverCall = (
  expression: ts.Expression,
  context: StaticBindingContext,
  contract: TypedTextureUrlContract,
): boolean =>
  ts.isCallExpression(expression) &&
  expression.arguments.length === 2 &&
  ts.isIdentifier(expression.expression) &&
  isNamedImportFrom(
    expression.expression,
    contract.resolverName,
    contract.moduleSpecifier,
    context,
  ) &&
  isImportMetaBaseUrl(expression.arguments[0]) &&
  isApprovedTypedTexturePath(expression.arguments[1], context, contract);

const isApprovedResolvedTypedTextureUrl = (
  expression: ts.Expression,
  context: StaticBindingContext,
  contract: TypedTextureUrlContract | null,
): boolean => {
  if (!contract || !ts.isIdentifier(expression)) return false;
  const binding = resolveStaticBinding(expression, context);
  return (
    binding?.initializer !== null &&
    binding?.initializer !== undefined &&
    isApprovedTypedTextureResolverCall(binding.initializer, context, contract)
  );
};

const isApprovedTypedB10TexturePath = (
  expression: ts.Expression,
  context: StaticBindingContext,
): boolean => {
  if (!ts.isIdentifier(expression)) return false;
  const declaration = resolveStaticBinding(expression, context)?.declaration;
  const parameterType =
    declaration !== undefined && ts.isParameter(declaration)
      ? declaration.type
      : undefined;
  return (
    parameterType !== undefined &&
    ts.isTypeReferenceNode(parameterType) &&
    parameterType.typeArguments === undefined &&
    ts.isIdentifier(parameterType.typeName) &&
    isNamedImportFrom(
      parameterType.typeName,
      "B10TexturePath",
      "./b10TextureUrls",
      context,
    )
  );
};

const isApprovedB10TextureResolverCall = (
  expression: ts.Expression,
  context: StaticBindingContext,
): boolean =>
  ts.isCallExpression(expression) &&
  expression.arguments.length === 2 &&
  ts.isIdentifier(expression.expression) &&
  isNamedImportFrom(
    expression.expression,
    "resolveB10TextureUrl",
    "./b10TextureUrls",
    context,
  ) &&
  isImportMetaBaseUrl(expression.arguments[0]) &&
  isApprovedTypedB10TexturePath(expression.arguments[1], context);

const isApprovedResolvedB10TextureUrl = (
  expression: ts.Expression,
  context: StaticBindingContext,
  hasApprovedPathContract: boolean,
): boolean => {
  if (!hasApprovedPathContract || !ts.isIdentifier(expression)) return false;
  const binding = resolveStaticBinding(expression, context);
  return (
    binding?.initializer !== null &&
    binding?.initializer !== undefined &&
    isApprovedB10TextureResolverCall(binding.initializer, context)
  );
};

const collectFlatReliefTexturePathContractViolations = (
  sourceFile: ts.SourceFile,
): string[] => {
  const declarations = sourceFile.statements.flatMap((statement) =>
    ts.isVariableStatement(statement)
      ? statement.declarationList.declarations.filter(
          (declaration) =>
            ts.isIdentifier(declaration.name) &&
            declaration.name.text === "FlatReliefPart",
        )
      : [],
  );
  if (declarations.length !== 1) {
    return ["FlatReliefPart must have exactly one declaration"];
  }

  const initializer = declarations[0].initializer;
  if (!initializer || !ts.isArrowFunction(initializer)) {
    return ["FlatReliefPart must remain an arrow function"];
  }

  const parameter = initializer.parameters[0];
  if (!parameter || !ts.isObjectBindingPattern(parameter.name)) {
    return ["FlatReliefPart must destructure its props"];
  }

  const violations: string[] = [];
  const texturePathBindings = parameter.name.elements.filter(
    (element) =>
      element.propertyName === undefined &&
      ts.isIdentifier(element.name) &&
      element.name.text === "texturePath",
  );
  if (texturePathBindings.length !== 1) {
    violations.push("FlatReliefPart must destructure texturePath exactly once");
  }
  if (
    parameter.name.elements.some(
      (element) =>
        element.propertyName === undefined &&
        ts.isIdentifier(element.name) &&
        element.name.text === "textureUrl",
    )
  ) {
    violations.push("FlatReliefPart must not destructure stale textureUrl");
  }

  const typedTexturePathProperties =
    parameter.type && ts.isTypeLiteralNode(parameter.type)
      ? parameter.type.members.filter(
          (member) =>
            ts.isPropertySignature(member) &&
            member.type !== undefined &&
            ts.isIdentifier(member.name) &&
            member.name.text === "texturePath" &&
            member.type.getText(sourceFile) === "B10TexturePath",
        )
      : [];
  if (typedTexturePathProperties.length !== 1) {
    violations.push("FlatReliefPart must type texturePath as B10TexturePath");
  }

  const flatTextureCalls: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "useFlatTexture"
    ) {
      flatTextureCalls.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(initializer.body);
  if (
    flatTextureCalls.length !== 1 ||
    flatTextureCalls[0].arguments.length !== 1 ||
    !ts.isIdentifier(flatTextureCalls[0].arguments[0]) ||
    flatTextureCalls[0].arguments[0].text !== "texturePath"
  ) {
    violations.push("FlatReliefPart must pass texturePath to useFlatTexture");
  }

  return violations;
};

const collectUnapprovedDynamicTextureLoads = (
  sourceFile: ts.SourceFile,
  hasApprovedB10PathContract = false,
  typedTextureUrlContract: TypedTextureUrlContract | null = null,
): string[] => {
  const context = createStaticBindingContext(sourceFile);
  const violations: string[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "load" &&
      isTextureLoaderConstruction(node.expression.expression)
    ) {
      const [pathExpression] = node.arguments;
      if (
        pathExpression &&
        evaluateStaticExpression(pathExpression, context) === undefined &&
        !isApprovedResolvedB10TextureUrl(
          pathExpression,
          context,
          hasApprovedB10PathContract,
        ) &&
        !isApprovedResolvedTypedTextureUrl(
          pathExpression,
          context,
          typedTextureUrlContract,
        )
      ) {
        violations.push(pathExpression.getText(sourceFile));
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
};

const getImportDeclaration = (
  node: ts.Node,
): ts.ImportDeclaration | null => {
  let current: ts.Node | undefined = node;
  while (current) {
    if (ts.isImportDeclaration(current)) return current;
    current = current.parent;
  }
  return null;
};

const isNamedImportFrom = (
  identifier: ts.Identifier,
  importedName: string,
  moduleSpecifier: string,
  context: StaticBindingContext,
): boolean => {
  const declaration = resolveStaticBinding(identifier, context)?.declaration;
  if (!declaration || !ts.isImportSpecifier(declaration)) return false;
  const importDeclaration = getImportDeclaration(declaration);
  return (
    (declaration.propertyName?.text ?? declaration.name.text) === importedName &&
    importDeclaration !== null &&
    ts.isStringLiteral(importDeclaration.moduleSpecifier) &&
    importDeclaration.moduleSpecifier.text === moduleSpecifier
  );
};

const isImportMetaBaseUrl = (expression: ts.Expression): boolean =>
  ts.isPropertyAccessExpression(expression) &&
  expression.name.text === "BASE_URL" &&
  ts.isPropertyAccessExpression(expression.expression) &&
  expression.expression.name.text === "env" &&
  ts.isMetaProperty(expression.expression.expression) &&
  expression.expression.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
  expression.expression.expression.name.text === "meta";

const isMappedGalleryThumbnailPath = (
  expression: ts.Expression,
  context: StaticBindingContext,
): boolean => {
  if (
    !ts.isPropertyAccessExpression(expression) ||
    expression.name.text !== "thumbnailPath" ||
    !ts.isIdentifier(expression.expression)
  ) {
    return false;
  }

  const itemIdentifier = expression.expression;
  const parameter = resolveStaticBinding(itemIdentifier, context)?.declaration;
  if (!parameter || !ts.isParameter(parameter)) return false;
  const callback = parameter.parent;
  if (
    (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback)) ||
    callback.parameters[0] !== parameter ||
    !ts.isCallExpression(callback.parent) ||
    !callback.parent.arguments.includes(callback) ||
    !ts.isPropertyAccessExpression(callback.parent.expression) ||
    callback.parent.expression.name.text !== "map" ||
    !ts.isIdentifier(callback.parent.expression.expression)
  ) {
    return false;
  }

  return isNamedImportFrom(
    callback.parent.expression.expression,
    "POC_GALLERY_ITEMS",
    "./pocGalleryData",
    context,
  );
};

const isApprovedGalleryThumbnailResolverCall = (
  expression: ts.Expression,
  context: StaticBindingContext,
): boolean =>
  ts.isCallExpression(expression) &&
  expression.arguments.length === 2 &&
  ts.isIdentifier(expression.expression) &&
  isNamedImportFrom(
    expression.expression,
    "resolvePocThumbnailUrl",
    "./pocGalleryData",
    context,
  ) &&
  isImportMetaBaseUrl(expression.arguments[0]) &&
  isMappedGalleryThumbnailPath(expression.arguments[1], context);

const collectGalleryJsxSourceViolations = (
  sourceFile: ts.SourceFile,
  policy: PocProvenancePolicy,
): string[] => {
  const violations: string[] = [];
  const context = createStaticBindingContext(sourceFile);

  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile);
      if (tagName === "img") {
        for (const attribute of node.attributes.properties) {
          if (ts.isJsxSpreadAttribute(attribute)) {
            violations.push(
              `unresolved JSX image spread ${attribute.getText(sourceFile)}`,
            );
          }
        }
      }
    }

    if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "src"
    ) {
      const initializer = node.initializer;
      const expression =
        initializer && ts.isJsxExpression(initializer)
          ? initializer.expression
          : undefined;
      const staticValue = initializer && ts.isStringLiteral(initializer)
        ? initializer.text
        : expression
          ? evaluateStaticExpression(expression, context)
          : undefined;

      if (typeof staticValue === "string") {
        if (!isAllowedImagePathFragment(staticValue, policy.allowedImagePaths)) {
          violations.push(`unapproved JSX src ${JSON.stringify(staticValue)}`);
        }
      } else if (
        !expression ||
        !isApprovedGalleryThumbnailResolverCall(expression, context)
      ) {
        violations.push(
          `unresolved JSX src ${expression?.getText(sourceFile) ?? node.getText(sourceFile)}`,
        );
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations.sort();
};

const GALLERY_DETAIL_POC_MODULES = new Set([
  "A04DoorPoC",
  "HeavyWaterDoorA11",
  "SewerGateB10",
  "LiftPlatformC03",
  "ArchedGateB05",
  "HeavyWaterDoubleDoorB06",
  "C06DrilledHolePoC",
]);

const isDetailPocImport = (specifier: string): boolean => {
  const fileName = specifier.split("\\").join("/").split("/").pop() ?? "";
  const moduleName = fileName.replace(/\.(?:[cm]?[jt]sx?)$/i, "");
  return GALLERY_DETAIL_POC_MODULES.has(moduleName);
};

const isThreeImportDeclaration = (
  declaration: ts.ImportDeclaration,
): boolean =>
  ts.isStringLiteral(declaration.moduleSpecifier) &&
  declaration.moduleSpecifier.text === "three";

const isRuntimeThreeNamedImport = (
  declaration: ts.Node,
  importedName: string,
): declaration is ts.ImportSpecifier => {
  if (!ts.isImportSpecifier(declaration) || declaration.isTypeOnly) return false;
  const importDeclaration = getImportDeclaration(declaration);
  return (
    importDeclaration !== null &&
    isThreeImportDeclaration(importDeclaration) &&
    importDeclaration.importClause?.isTypeOnly !== true &&
    (declaration.propertyName?.text ?? declaration.name.text) === importedName
  );
};

const isRuntimeThreeNamespaceIdentifier = (
  identifier: ts.Identifier,
  context: StaticBindingContext,
): boolean => {
  const declaration = resolveStaticBinding(identifier, context)?.declaration;
  if (!declaration) return false;
  const importDeclaration = getImportDeclaration(declaration);
  if (
    importDeclaration === null ||
    !isThreeImportDeclaration(importDeclaration) ||
    importDeclaration.importClause?.isTypeOnly === true
  ) {
    return false;
  }
  return (
    ts.isNamespaceImport(declaration) ||
    (ts.isImportClause(declaration) &&
      declaration.name?.text === identifier.text)
  );
};

const isRuntimeThreeWebGLRendererReference = (
  expression: ts.Expression,
  context: StaticBindingContext,
): boolean => {
  if (ts.isIdentifier(expression)) {
    const declaration = resolveStaticBinding(expression, context)?.declaration;
    return (
      declaration !== undefined &&
      isRuntimeThreeNamedImport(declaration, "WebGLRenderer")
    );
  }
  if (
    ts.isPropertyAccessExpression(expression) &&
    expression.name.text === "WebGLRenderer" &&
    ts.isIdentifier(expression.expression)
  ) {
    return isRuntimeThreeNamespaceIdentifier(expression.expression, context);
  }
  if (
    ts.isElementAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.argumentExpression &&
    evaluateStaticExpression(expression.argumentExpression, context) ===
      "WebGLRenderer"
  ) {
    return isRuntimeThreeNamespaceIdentifier(expression.expression, context);
  }
  return false;
};

const collectThreeWebGLRendererViolations = (
  sourceFile: ts.SourceFile,
): string[] => {
  const violations = new Set<string>();
  const context = createStaticBindingContext(sourceFile);

  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      isThreeImportDeclaration(statement) &&
      statement.importClause?.isTypeOnly !== true &&
      statement.importClause?.namedBindings &&
      ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      for (const specifier of statement.importClause.namedBindings.elements) {
        if (
          !specifier.isTypeOnly &&
          (specifier.propertyName?.text ?? specifier.name.text) ===
            "WebGLRenderer"
        ) {
          violations.add(
            `forbidden Three.js WebGLRenderer import ${specifier.getText(sourceFile)}`,
          );
        }
      }
    }

    if (
      ts.isExportDeclaration(statement) &&
      statement.isTypeOnly !== true &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === "three" &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const specifier of statement.exportClause.elements) {
        if (
          !specifier.isTypeOnly &&
          (specifier.propertyName?.text ?? specifier.name.text) ===
            "WebGLRenderer"
        ) {
          violations.add(
            `forbidden Three.js WebGLRenderer export ${specifier.getText(sourceFile)}`,
          );
        }
      }
    }
  }

  const visit = (node: ts.Node): void => {
    if (
      ts.isNewExpression(node) &&
      isRuntimeThreeWebGLRendererReference(node.expression, context)
    ) {
      violations.add(
        `forbidden Three.js WebGLRenderer construction ${node.expression.getText(sourceFile)}`,
      );
    } else if (
      (ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node)) &&
      isRuntimeThreeWebGLRendererReference(node, context)
    ) {
      violations.add(
        `forbidden Three.js WebGLRenderer reference ${node.getText(sourceFile)}`,
      );
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return [...violations].sort();
};

const collectGalleryRuntimeViolations = (
  dependencies: ReadonlyMap<string, ts.SourceFile>,
): string[] => {
  const violations = new Set<string>();

  for (const [filePath, sourceFile] of dependencies) {
    const relativePath = path.relative(REPOSITORY_ROOT, filePath);
    for (const specifier of collectImportSpecifiers(sourceFile)) {
      if (
        specifier === "@react-three/fiber" ||
        specifier.startsWith("@react-three/fiber/")
      ) {
        violations.add(
          `${relativePath}: forbidden gallery import ${JSON.stringify(specifier)}`,
        );
      }
      if (isDetailPocImport(specifier)) {
        violations.add(
          `${relativePath}: forbidden detail POC import ${JSON.stringify(specifier)}`,
        );
      }
    }

    for (const violation of collectThreeWebGLRendererViolations(sourceFile)) {
      violations.add(`${relativePath}: ${violation}`);
    }

    const visit = (node: ts.Node): void => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = node.tagName.getText(sourceFile);
        const terminalName = tagName.split(/[.:]/).at(-1);
        if (
          terminalName === "Canvas" ||
          terminalName === "canvas" ||
          terminalName?.toLowerCase() === "iframe"
        ) {
          violations.add(
            `${relativePath}: forbidden gallery JSX element <${tagName}>`,
          );
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return [...violations].sort();
};

const collectProvenanceViolations = (
  dependencies: ReadonlyMap<string, ts.SourceFile>,
  policy: PocProvenancePolicy,
): string[] => {
  const violations = new Set<string>();
  const approvedB10ContractCount = [...dependencies.values()].filter(
    (sourceFile) => hasApprovedB10TexturePathContract(sourceFile, policy),
  ).length;
  const hasApprovedB10PathContract =
    policy.entryPath === POC_PROVENANCE_POLICIES.B10.entryPath &&
    approvedB10ContractCount === 1;

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
      if (
        !isAllowedImagePathFragment(
          candidate,
          policy.allowedImagePaths,
          policy.allowSplitImageFragments,
        )
      ) {
        violations.add(
          `${path.relative(REPOSITORY_ROOT, filePath)}: unapproved image path in ${JSON.stringify(candidate)}`,
        );
      }
    }

    for (const expression of collectUnapprovedDynamicTextureLoads(
      sourceFile,
      hasApprovedB10PathContract,
      getTypedTextureUrlContract(policy),
    )) {
      violations.add(
        `${path.relative(REPOSITORY_ROOT, filePath)}: unresolved TextureLoader image path in ${JSON.stringify(expression)}`,
      );
    }

    if (policy.entryPath === POC_PROVENANCE_POLICIES.GALLERY.entryPath) {
      for (const violation of collectGalleryJsxSourceViolations(
        sourceFile,
        policy,
      )) {
        violations.add(
          `${path.relative(REPOSITORY_ROOT, filePath)}: ${violation}`,
        );
      }
    }
  }

  if (policy.entryPath === POC_PROVENANCE_POLICIES.GALLERY.entryPath) {
    for (const violation of collectGalleryRuntimeViolations(dependencies)) {
      violations.add(violation);
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

test("dependency collection resolves dotted extensionless and bundler-style js imports", async (t) => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "poc-provenance-"));
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const entryPath = path.join(fixtureRoot, "entry.ts");
  await Promise.all([
    writeFile(
      entryPath,
      ['import "./unsafe.runtime";', 'import "./unsafe.js";'].join("\n"),
    ),
    writeFile(path.join(fixtureRoot, "unsafe.runtime.ts"), "export {};"),
    writeFile(path.join(fixtureRoot, "unsafe.tsx"), "export {};"),
  ]);

  const dependencies = await collectLocalTypeScriptDependencies(
    entryPath,
    fixtureRoot,
  );

  assert.deepEqual(
    [...dependencies.keys()].map((filePath) => path.basename(filePath)).sort(),
    ["entry.ts", "unsafe.runtime.ts", "unsafe.tsx"],
  );
});

test("dependency collection fails closed for unresolved local runtime imports", async (t) => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "poc-provenance-"));
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const entryPath = path.join(fixtureRoot, "entry.ts");
  await writeFile(entryPath, 'import "./missing.runtime";');

  await assert.rejects(
    collectLocalTypeScriptDependencies(entryPath, fixtureRoot),
    /Unable to resolve local module \.\/missing\.runtime/,
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
    GALLERY: {
      entryFile: "PocGallery.tsx",
      allowedImagePaths: [
        "poc-thumbnails/a11.png",
        "poc-thumbnails/b10.png",
        "poc-thumbnails/c03.png",
        "poc-thumbnails/b05.png",
        "poc-thumbnails/b06.png",
        "poc-thumbnails/a04.png",
        "poc-thumbnails/c06.png",
      ],
      expectedDependencyFiles: [
        "packages/sample/src/poc/PocGallery.tsx",
        "packages/sample/src/poc/pocGalleryData.ts",
      ],
      trackedTextureDirectories: [],
      allowSplitImageFragments: false,
    },
    A04: {
      entryFile: "A04DoorPoC.tsx",
      allowedImagePaths: [
        "textures/a04/metal-plate-02-diffuse.jpg",
        "textures/a04/metal-plate-02-roughness.jpg",
        "textures/a04/green-metal-rust-diffuse.jpg",
        "textures/a04/green-metal-rust-roughness.jpg",
      ],
      expectedDependencyFiles: [
        "packages/sample/src/poc/A04DoorPoC.tsx",
        "packages/sample/src/poc/a04TextureUrls.ts",
        "packages/sample/src/poc/textureColorSpace.ts",
        "packages/sample/src/poc/textureUrls.ts",
      ],
      trackedTextureDirectories: ["packages/sample/public/textures/a04"],
      allowSplitImageFragments: false,
    },
    A11: {
      entryFile: "HeavyWaterDoorA11.tsx",
      allowedImagePaths: [],
      expectedDependencyFiles: [
        "packages/sample/src/poc/HeavyWaterDoorA11.tsx",
        "packages/sample/src/poc/a11ProceduralMaterials.ts",
      ],
      trackedTextureDirectories: [
        "packages/sample/public/textures/poc-a11",
        "packages/sample/public/textures/a11",
      ],
      allowSplitImageFragments: false,
    },
    B10: {
      entryFile: "SewerGateB10.tsx",
      allowedImagePaths: [
        "/textures/b10",
        "door.png",
        "lower.png",
        "lever-sign.png",
        "lever-box.png",
      ],
      expectedDependencyFiles: [
        "packages/sample/src/poc/SewerGateB10.tsx",
        "packages/sample/src/poc/b10TextureUrls.ts",
        "packages/sample/src/poc/textureColorSpace.ts",
      ],
      trackedTextureDirectories: [],
      allowSplitImageFragments: true,
    },
    C03: {
      entryFile: "LiftPlatformC03.tsx",
      allowedImagePaths: [],
      expectedDependencyFiles: [
        "packages/sample/src/poc/LiftPlatformC03.tsx",
      "packages/sample/src/poc/c03Motion.ts",
      "packages/sample/src/poc/c03ProceduralMaterials.ts",
      "packages/sample/src/poc/c03Playback.ts",
      "packages/sample/src/poc/pocMotionUtils.ts",
      ],
      trackedTextureDirectories: [
        "packages/sample/public/textures/c03",
        "packages/sample/public/textures/poc-c03",
      ],
      allowSplitImageFragments: false,
    },
    B05: {
      entryFile: "ArchedGateB05.tsx",
      allowedImagePaths: ["textures/b05/generated-gate-front.png"],
      expectedDependencyFiles: [
        "packages/sample/src/poc/ArchedGateB05.tsx",
        "packages/sample/src/poc/b05BoxMaterialSlots.ts",
        "packages/sample/src/poc/b05FrontImage.ts",
        "packages/sample/src/poc/b05FrontLoader.ts",
        "packages/sample/src/poc/b05FrontResources.ts",
        "packages/sample/src/poc/b05FrontScene.ts",
        "packages/sample/src/poc/b05Geometry.ts",
        "packages/sample/src/poc/b05Motion.ts",
        "packages/sample/src/poc/b05ProceduralMaterials.ts",
        "packages/sample/src/poc/b05TextureMapping.ts",
      ],
      trackedTextureDirectories: [],
      allowSplitImageFragments: false,
    },
    B06: {
      entryFile: "HeavyWaterDoubleDoorB06.tsx",
      allowedImagePaths: ["textures/b06/normal.png", "textures/b06/frozen.png"],
      expectedDependencyFiles: [
        "packages/sample/src/poc/HeavyWaterDoubleDoorB06.tsx",
        "packages/sample/src/poc/b06Assets.ts",
        "packages/sample/src/poc/b06FrontLoader.ts",
        "packages/sample/src/poc/b06FrontResources.ts",
      "packages/sample/src/poc/b06Motion.ts",
      "packages/sample/src/poc/b06Scene.ts",
      "packages/sample/src/poc/pocMotionUtils.ts",
      ],
      trackedTextureDirectories: [],
      allowSplitImageFragments: false,
    },
    C06: {
      entryFile: "C06DrilledHolePoC.tsx",
      allowedImagePaths: [
        "textures/c06/aged-brick-albedo.png",
        "textures/c06/broken-brick-core-albedo.png",
      ],
      expectedDependencyFiles: [
        "packages/sample/src/poc/C06DrilledHolePoC.tsx",
        "packages/sample/src/poc/c06TextureUrls.ts",
        "packages/sample/src/poc/c06SceneModel.ts",
        "packages/sample/src/poc/textureColorSpace.ts",
        "packages/sample/src/poc/textureUrls.ts",
      ],
      trackedTextureDirectories: ["packages/sample/public/textures/c06"],
      allowSplitImageFragments: false,
    },
  } as const;

  assert.equal(Object.isFrozen(POC_PROVENANCE_POLICIES), true);
  assert.deepEqual(Object.keys(POC_PROVENANCE_POLICIES), Object.keys(expectedPolicies));

  for (const [entryName, expectedPolicy] of Object.entries(expectedPolicies)) {
    const policy = POC_PROVENANCE_POLICIES[
      entryName as keyof typeof POC_PROVENANCE_POLICIES
    ];
    assert.equal(path.basename(policy.entryPath), expectedPolicy.entryFile);
    assert.equal(Object.isFrozen(policy), true);
    assert.equal(Object.isFrozen(policy.allowedImagePaths), true);
    assert.deepEqual(policy.allowedImagePaths, expectedPolicy.allowedImagePaths);
    assert.equal(Object.isFrozen(policy.expectedDependencyFiles), true);
    assert.deepEqual(
      policy.expectedDependencyFiles,
      expectedPolicy.expectedDependencyFiles,
    );
    assert.equal(Object.isFrozen(policy.trackedTextureDirectories), true);
    assert.deepEqual(
      policy.trackedTextureDirectories,
      expectedPolicy.trackedTextureDirectories,
    );
    assert.equal(
      policy.allowSplitImageFragments,
      expectedPolicy.allowSplitImageFragments,
    );
  }
});

test("only B10 composes approved split image fragments", () => {
  const b10Fragments = [
    "/textures/b10",
    "door.png",
    "lower.png",
    "lever-sign.png",
    "lever-box.png",
  ];

  for (const fragment of b10Fragments) {
    assert.equal(isAllowedImagePathFragment(fragment, b10Fragments, true), true);
  }
  assert.equal(
    isAllowedImagePathFragment(
      "/textures/b10/door.png",
      b10Fragments,
      true,
    ),
    true,
  );
  assert.equal(
    isAllowedImagePathFragment(
      "/textures/b10/door-2.png",
      b10Fragments,
      true,
    ),
    false,
  );
  assert.equal(
    isAllowedImagePathFragment(
      "generated-gate-front.png",
      POC_PROVENANCE_POLICIES.B05.allowedImagePaths,
      false,
    ),
    false,
  );
  assert.equal(
    isAllowedImagePathFragment(
      "normal.png",
      POC_PROVENANCE_POLICIES.B06.allowedImagePaths,
      false,
    ),
    false,
  );
  assert.equal(
    isAllowedImagePathFragment(
      "/textures/B10/door.png",
      POC_PROVENANCE_POLICIES.B10.allowedImagePaths,
      true,
    ),
    false,
  );
  assert.equal(
    isAllowedImagePathFragment(
      "textures/B05/generated-gate-front.png",
      POC_PROVENANCE_POLICIES.B05.allowedImagePaths,
      false,
    ),
    false,
  );
  assert.equal(
    isAllowedImagePathFragment(
      "textures/b06/Normal.png",
      POC_PROVENANCE_POLICIES.B06.allowedImagePaths,
      false,
    ),
    false,
  );
});

test("image candidate collection sees static paths but ignores comments and prose", () => {
  const source = [
    '// const ignored = "/textures/comment-only.png";',
    'const template = `TEXTURES/b10/${"door"}.PNG`;',
    'const concatenated = "poc-" + "thumbnails/card.webp";',
    'const extensionOnly = "icons/door.SvG";',
    'const queried = "icons/door.png?v=1#preview";',
    'const imageProse = "Generated from door.png for documentation";',
    'const prose = "gallery materials overview";',
  ].join("\n");
  const executableSource = stripSourceComments(source);
  const candidates = collectImagePathCandidates(
    createSourceFile("image-candidate-fixture.ts", executableSource),
  );

  assert.ok(candidates.has("TEXTURES/b10/door.PNG"));
  assert.ok(candidates.has("poc-thumbnails/card.webp"));
  assert.ok(candidates.has("icons/door.SvG"));
  assert.ok(candidates.has("icons/door.png?v=1#preview"));
  assert.equal(candidates.has("/textures/comment-only.png"), false);
  assert.equal(
    candidates.has("Generated from door.png for documentation"),
    false,
  );
  assert.equal(candidates.has("gallery materials overview"), false);
});

test("immutable const bindings expose composed unknown B10 image paths", () => {
  const source = [
    'const base = "/textures/b10";',
    'const stem = "door-2";',
    'const ext = "png";',
    'const first = second;',
    'const second = first;',
    'export const image = `${base}/${stem}.${ext}`;',
  ].join("\n");
  const sourceFile = createSourceFile("const-image-fixture.ts", source);
  const dependencies = new Map([[sourceFile.fileName, sourceFile]]);
  const violations = collectProvenanceViolations(
    dependencies,
    POC_PROVENANCE_POLICIES.B10,
  );

  assert.ok(
    violations.some((violation) =>
      violation.includes("/textures/b10/door-2.png"),
    ),
    `Expected composed unknown image path to fail, received: ${violations.join("\n")}`,
  );
});

test("B10 TextureLoader paths use the exact typed basename-aware contract", async () => {
  const dependencies = await collectLocalTypeScriptDependencies(
    POC_PROVENANCE_POLICIES.B10.entryPath,
  );
  const sourceFile = dependencies.get(POC_PROVENANCE_POLICIES.B10.entryPath);
  assert.ok(sourceFile);
  const approvedPaths = [
    "textures/b10/door.png",
    "textures/b10/lower.png",
    "textures/b10/lever-sign.png",
    "textures/b10/lever-box.png",
  ];
  const staticValues = new Set(
    [...dependencies.values()].flatMap((dependency) => [
      ...collectStaticStringValues(dependency),
    ]),
  );

  for (const approvedPath of approvedPaths) {
    assert.equal(
      staticValues.has(`/${approvedPath}`),
      false,
      `Root-relative /${approvedPath} bypasses the production base path`,
    );
    assert.ok(staticValues.has(approvedPath), `Missing immutable ${approvedPath}`);
    assert.equal(
      isAllowedImagePathFragment(
        approvedPath,
        POC_PROVENANCE_POLICIES.B10.allowedImagePaths,
        true,
      ),
      true,
    );
  }

  const contractSources = [...dependencies.values()].filter((dependency) =>
    hasApprovedB10TexturePathContract(
      dependency,
      POC_PROVENANCE_POLICIES.B10,
    ),
  );
  assert.equal(contractSources.length, 1);

  const loaderArguments: ts.Expression[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "load" &&
      isTextureLoaderConstruction(node.expression.expression) &&
      node.arguments[0]
    ) {
      loaderArguments.push(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  assert.equal(loaderArguments.length, 2);
  for (const loaderArgument of loaderArguments) {
    assert.ok(ts.isIdentifier(loaderArgument));
    assert.equal(loaderArgument.text, "textureUrl");
  }
  assert.deepEqual(
    collectUnapprovedDynamicTextureLoads(
      sourceFile,
      true,
    ),
    [],
  );
  assert.deepEqual(
    collectProvenanceViolations(dependencies, POC_PROVENANCE_POLICIES.B10),
    [],
  );
});

const createB10TexturePathContractFixture = (
  elements: readonly string[],
  typeExpression = "(typeof B10_TEXTURE_PATHS)[number]",
  prefix = "",
): ts.SourceFile =>
  createSourceFile(
    "b10-texture-path-contract.ts",
    [
      prefix,
      "export const B10_TEXTURE_PATHS = Object.freeze([",
      ...elements.map((element) => `  ${element},`),
      "] as const);",
      `export type B10TexturePath = ${typeExpression};`,
    ].join("\n"),
  );

test("B10 texture path contract rejects extra, dynamic, and widened entries", () => {
  const approvedElements = [
    '"textures/b10/door.png"',
    '"textures/b10/lower.png"',
    '"textures/b10/lever-sign.png"',
    '"textures/b10/lever-box.png"',
  ];
  const fixtures = [
    createB10TexturePathContractFixture([
      ...approvedElements,
      '"textures/b10/extra.png"',
    ]),
    createB10TexturePathContractFixture(
      [...approvedElements, "dynamicTexturePath"],
      undefined,
      "declare const dynamicTexturePath: string;",
    ),
    createB10TexturePathContractFixture(approvedElements, "string"),
  ];

  for (const fixture of fixtures) {
    assert.equal(
      hasApprovedB10TexturePathContract(
        fixture,
        POC_PROVENANCE_POLICIES.B10,
      ),
      false,
    );
  }
});

test("B10 TextureLoader provenance only approves the typed BASE_URL resolver", () => {
  const approvedSource = [
    'import { resolveB10TextureUrl, type B10TexturePath } from "./b10TextureUrls";',
    "const loadTexture = (texturePath: B10TexturePath) => {",
    "  const textureUrl = resolveB10TextureUrl(import.meta.env.BASE_URL, texturePath);",
    "  new THREE.TextureLoader().load(textureUrl);",
    "};",
  ].join("\n");
  const rejectedSources = [
    approvedSource.replace(
      "new THREE.TextureLoader().load(textureUrl);",
      "new THREE.TextureLoader().load(texturePath);",
    ),
    approvedSource.replace(
      "import.meta.env.BASE_URL, texturePath",
      '"/", texturePath',
    ),
    approvedSource
      .replace("texturePath: B10TexturePath", "texturePath: string")
      .replace("type B10TexturePath", "B10TexturePath"),
    approvedSource.replace(
      'import { resolveB10TextureUrl, type B10TexturePath } from "./b10TextureUrls";',
      [
        'import { resolveB10TextureUrl } from "./b10TextureUrls";',
        "type B10TexturePath = string;",
      ].join("\n"),
    ),
  ];

  assert.deepEqual(
    collectUnapprovedDynamicTextureLoads(
      createSourceFile("approved-b10-loader.ts", approvedSource),
      true,
    ),
    [],
  );
  for (const rejectedSource of rejectedSources) {
    assert.equal(
      collectUnapprovedDynamicTextureLoads(
        createSourceFile("rejected-b10-loader.ts", rejectedSource),
        true,
      ).length,
      1,
    );
  }
});

test("B10 FlatReliefPart binds its typed texturePath before loading it", async () => {
  const source = await readFile(POC_PROVENANCE_POLICIES.B10.entryPath, "utf8");
  const sourceFile = createSourceFile(
    POC_PROVENANCE_POLICIES.B10.entryPath,
    stripSourceComments(source, POC_PROVENANCE_POLICIES.B10.entryPath),
  );
  const staleSourceFile = createSourceFile(
    "stale-b10-flat-relief.tsx",
    [
      "const FlatReliefPart = ({ textureUrl }: {",
      "  texturePath: B10TexturePath;",
      "}) => {",
      "  const tex = useFlatTexture(texturePath);",
      "  return <mesh />;",
      "};",
    ].join("\n"),
  );

  assert.deepEqual(
    collectFlatReliefTexturePathContractViolations(sourceFile),
    [],
  );
  assert.deepEqual(
    collectFlatReliefTexturePathContractViolations(staleSourceFile),
    [
      "FlatReliefPart must destructure texturePath exactly once",
      "FlatReliefPart must not destructure stale textureUrl",
    ],
  );
});

test("join-produced unknown B10 filenames resolve and fail provenance", () => {
  const source = [
    'const base = "/textures/b10";',
    'const filename = ["door-2", "png"].join(".");',
    'const textureUrl = [base, filename].join("/");',
    "new THREE.TextureLoader().load(textureUrl);",
  ].join("\n");
  const sourceFile = createSourceFile("joined-image-fixture.ts", source);
  const violations = collectProvenanceViolations(
    new Map([[sourceFile.fileName, sourceFile]]),
    POC_PROVENANCE_POLICIES.B10,
  );

  assert.ok(
    violations.some((violation) =>
      violation.includes("/textures/b10/door-2.png"),
    ),
    `Expected joined unknown image path to fail, received: ${violations.join("\n")}`,
  );
});

test("function parameters shadow same-named approved outer const bindings", () => {
  const source = [
    'const textureUrl = "/textures/b10/door.png";',
    "const loadTexture = (textureUrl: string) =>",
    "  new THREE.TextureLoader().load(textureUrl);",
  ].join("\n");
  const sourceFile = createSourceFile("shadowed-image-fixture.ts", source);
  const violations = collectProvenanceViolations(
    new Map([[sourceFile.fileName, sourceFile]]),
    POC_PROVENANCE_POLICIES.B10,
  );

  assert.ok(
    violations.some((violation) =>
      violation.includes("unresolved TextureLoader image path"),
    ),
    `Expected shadowed parameter to remain unresolved, received: ${violations.join("\n")}`,
  );
});

test("opaque TextureLoader paths fail closed without flagging unrelated loaders", () => {
  const source = [
    "declare const dynamicPath: string;",
    "declare const cache: { load(path: string): void };",
    "new THREE.TextureLoader().load(dynamicPath);",
    "cache.load(dynamicPath);",
  ].join("\n");
  const sourceFile = createSourceFile("dynamic-image-load-fixture.ts", source);
  const dependencies = new Map([[sourceFile.fileName, sourceFile]]);
  const violations = collectProvenanceViolations(
    dependencies,
    POC_PROVENANCE_POLICIES.A11,
  );

  assert.equal(violations.length, 1);
  assert.match(violations[0], /unresolved TextureLoader image path/);
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

test("gallery policy rejects image paths outside its approved thumbnails", () => {
  const sourceFile = createSourceFile(
    "gallery-image-fixture.ts",
    'export const image = "poc-thumbnails/unknown.png";',
  );
  const violations = collectProvenanceViolations(
    new Map([[sourceFile.fileName, sourceFile]]),
    POC_PROVENANCE_POLICIES.GALLERY,
  );

  assert.ok(
    violations.some((violation) =>
      violation.includes("poc-thumbnails/unknown.png"),
    ),
  );
});

test("gallery JSX source analysis fails closed for runtime expressions", () => {
  const filePath = path.join(HERE, "dynamic-gallery-image.tsx");
  const sourceFile = createSourceFile(
    filePath,
    [
      "declare const runtimeValue: string;",
      "export const Card = () => <img src={runtimeValue} />;",
    ].join("\n"),
  );

  assert.deepEqual(
    collectProvenanceViolations(
      new Map([[filePath, sourceFile]]),
      POC_PROVENANCE_POLICIES.GALLERY,
    ),
    [
      "packages/sample/src/poc/dynamic-gallery-image.tsx: unresolved JSX src runtimeValue",
    ],
  );
});

test("gallery JSX source analysis rejects unapproved literals", () => {
  const filePath = path.join(HERE, "literal-gallery-image.tsx");
  const sourceFile = createSourceFile(
    filePath,
    'export const Card = () => <img src="/not-approved" />;',
  );

  assert.deepEqual(
    collectProvenanceViolations(
      new Map([[filePath, sourceFile]]),
      POC_PROVENANCE_POLICIES.GALLERY,
    ),
    [
      'packages/sample/src/poc/literal-gallery-image.tsx: unapproved JSX src "/not-approved"',
    ],
  );
});

test("gallery JSX source analysis only permits the registry-driven resolver call", () => {
  const approvedSource = createSourceFile(
    "approved-gallery-image.tsx",
    [
      'import { POC_GALLERY_ITEMS, resolvePocThumbnailUrl } from "./pocGalleryData";',
      "export const Cards = () => POC_GALLERY_ITEMS.map((item) => (",
      "  <img src={resolvePocThumbnailUrl(import.meta.env.BASE_URL, item.thumbnailPath)} />",
      "));",
    ].join("\n"),
  );
  const arbitrarySource = createSourceFile(
    "arbitrary-gallery-image.tsx",
    [
      'import { resolvePocThumbnailUrl } from "./pocGalleryData";',
      "declare const runtimeValue: string;",
      "export const Card = () => (",
      "  <img src={resolvePocThumbnailUrl(import.meta.env.BASE_URL, runtimeValue)} />",
      ");",
    ].join("\n"),
  );

  assert.deepEqual(
    collectGalleryJsxSourceViolations(
      approvedSource,
      POC_PROVENANCE_POLICIES.GALLERY,
    ),
    [],
  );
  assert.deepEqual(
    collectGalleryJsxSourceViolations(
      arbitrarySource,
      POC_PROVENANCE_POLICIES.GALLERY,
    ),
    [
      "unresolved JSX src resolvePocThumbnailUrl(import.meta.env.BASE_URL, runtimeValue)",
    ],
  );
});

test("gallery JSX image spreads fail closed", async (t) => {
  const fixtures = [
    [
      "runtime props",
      "declare const props: object; export const Card = () => <img {...props} />;",
      "{...props}",
    ],
    [
      "inline object with runtime src",
      [
        "declare const runtimeValue: string;",
        "export const Card = () => <img {...{ src: runtimeValue }} />;",
      ].join("\n"),
      "{...{ src: runtimeValue }}",
    ],
  ] as const;

  for (const [name, source, spreadText] of fixtures) {
    await t.test(name, () => {
      const sourceFile = createSourceFile(`${name}.tsx`, source);

      assert.deepEqual(
        collectGalleryJsxSourceViolations(
          sourceFile,
          POC_PROVENANCE_POLICIES.GALLERY,
        ),
        [`unresolved JSX image spread ${spreadText}`],
      );
    });
  }
});

test("gallery runtime analysis rejects forbidden imports in reachable helpers", async (t) => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "poc-provenance-"));
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const entryPath = path.join(fixtureRoot, "entry.tsx");
  const helperPath = path.join(fixtureRoot, "helper.tsx");
  await Promise.all([
    writeFile(entryPath, 'import { Helper } from "./helper"; export { Helper };'),
    writeFile(
      helperPath,
      'import { Canvas } from "@react-three/fiber"; export const Helper = () => <Canvas />;',
    ),
  ]);
  const dependencies = await collectLocalTypeScriptDependencies(
    entryPath,
    fixtureRoot,
  );

  assert.deepEqual(
    collectProvenanceViolations(
      dependencies,
      POC_PROVENANCE_POLICIES.GALLERY,
    ),
    [
      `${path.relative(REPOSITORY_ROOT, helperPath)}: forbidden gallery JSX element <Canvas>`,
      `${path.relative(REPOSITORY_ROOT, helperPath)}: forbidden gallery import "@react-three/fiber"`,
    ],
  );
});

test("gallery runtime analysis rejects canvas, iframe, and detail POC imports", () => {
  const sourceFile = createSourceFile(
    "forbidden-gallery-runtime.tsx",
    [
      'import HeavyWaterDoorA11 from "./HeavyWaterDoorA11";',
      "export const Runtime = () => (",
      "  <><canvas /><iframe title=\"embedded\" /></>",
      ");",
    ].join("\n"),
  );
  const violations = collectGalleryRuntimeViolations(
    new Map([[sourceFile.fileName, sourceFile]]),
  );

  assert.ok(
    violations.some((violation) =>
      violation.includes('forbidden detail POC import "./HeavyWaterDoorA11"'),
    ),
  );
  assert.ok(
    violations.some((violation) =>
      violation.includes("forbidden gallery JSX element <canvas>"),
    ),
  );
  assert.ok(
    violations.some((violation) =>
      violation.includes("forbidden gallery JSX element <iframe>"),
    ),
  );
});

test("gallery runtime analysis rejects transitive aliased WebGLRenderer construction", async (t) => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "poc-provenance-"));
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const entryPath = path.join(fixtureRoot, "entry.ts");
  const helperPath = path.join(fixtureRoot, "helper.ts");
  const rendererPath = path.join(fixtureRoot, "renderer.ts");
  await Promise.all([
    writeFile(entryPath, 'export { helper } from "./helper";'),
    writeFile(helperPath, 'export { renderer as helper } from "./renderer";'),
    writeFile(
      rendererPath,
      [
        'import { WebGLRenderer as Renderer } from "three";',
        "export const renderer = new Renderer();",
      ].join("\n"),
    ),
  ]);
  const dependencies = await collectLocalTypeScriptDependencies(
    entryPath,
    fixtureRoot,
  );
  const violations = collectProvenanceViolations(
    dependencies,
    POC_PROVENANCE_POLICIES.GALLERY,
  );

  assert.ok(
    violations.some(
      (violation) =>
        violation.includes(path.relative(REPOSITORY_ROOT, rendererPath)) &&
        violation.includes("WebGLRenderer"),
    ),
    `Expected transitive WebGLRenderer violation, received: ${violations.join("\n")}`,
  );
});

test("gallery runtime analysis rejects namespace-aliased WebGLRenderer references", () => {
  const sourceFile = createSourceFile(
    "namespace-webgl-renderer.ts",
    [
      'import * as Engine from "three";',
      "export const Renderer = Engine.WebGLRenderer;",
    ].join("\n"),
  );
  const violations = collectGalleryRuntimeViolations(
    new Map([[sourceFile.fileName, sourceFile]]),
  );

  assert.ok(
    violations.some((violation) => violation.includes("WebGLRenderer")),
    `Expected namespace WebGLRenderer violation, received: ${violations.join("\n")}`,
  );
});

test("gallery runtime analysis permits Three.js WebGLRenderer type-only imports", () => {
  const sourceFile = createSourceFile(
    "type-only-webgl-renderer.ts",
    [
      'import type { WebGLRenderer } from "three";',
      'import { type WebGLRenderer as RendererType } from "three";',
      'import type * as THREE from "three";',
      "export type Renderer = WebGLRenderer | RendererType | THREE.WebGLRenderer;",
    ].join("\n"),
  );

  assert.deepEqual(
    collectGalleryRuntimeViolations(
      new Map([[sourceFile.fileName, sourceFile]]),
    ),
    [],
  );
});

test("gallery dependency graph remains a static index without detail POC runtimes", async () => {
  const dependencies = await collectLocalTypeScriptDependencies(
    POC_PROVENANCE_POLICIES.GALLERY.entryPath,
  );

  assert.deepEqual(collectGalleryRuntimeViolations(dependencies), []);
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
      const dependencyFiles = [...dependencies.keys()]
        .map((filePath) =>
          path.relative(REPOSITORY_ROOT, filePath).split(path.sep).join("/"),
        )
        .sort();
      assert.deepEqual(
        dependencyFiles,
        [...policy.expectedDependencyFiles].sort(),
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

test("A04 and C06 tracked textures exactly match their approved files and hashes", async () => {
  const expectedTextureSets = {
    "packages/sample/public/textures/a04": {
      "README.md": "e76e1e7e33472adf63ad40a0eb4b3e0e40956240eb3a850bae238f5e9bd9d888",
      "green-metal-rust-diffuse.jpg": "4509ab0cb1cf6bf9b9f970450a41f83ebd9bff178006deae568ff34b404856fc",
      "green-metal-rust-roughness.jpg": "f214f22608dd75aa3e7b4da8bffac97c344cbacbc50f49ba0beb0236701a622c",
      "metal-plate-02-diffuse.jpg": "6e80877d0e9d5973d96298c6091df7ace906b0a6760afc4f3592e4855f3f1d4c",
      "metal-plate-02-roughness.jpg": "73a6bd6393f6de7be42058584c2d382f2a3e9148ceabc2d02e748e2c860e74d1",
      "sewer-gate-aged-albedo.png": "db09b3fdbb940b18281202782ea8df774e012806c3f6876003b8e4c864a0951b",
    },
    "packages/sample/public/textures/c06": {
      "README.md": "8a2fa71769239c027c3da6bea32fb54456a063f5bae3962c40dd8479a3e668dc",
      "aged-brick-albedo.png": "27c2c350b402f807209f214d8c053069fd78215544db6e53c1a6f165420e6a24",
      "broken-brick-core-albedo.png": "939056b60fe94b649a2778af5ce7ff5c5bca704eed6ab1938d2d8413418ade95",
    },
  } as const;

  for (const [textureDirectory, expectedHashes] of Object.entries(
    expectedTextureSets,
  )) {
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

    assert.deepEqual(trackedTextures, expectedTrackedTextures, textureDirectory);

    for (const [fileName, expectedHash] of Object.entries(expectedHashes)) {
      const contents = await readFile(
        path.join(REPOSITORY_ROOT, textureDirectory, fileName),
      );
      const actualHash = createHash("sha256").update(contents).digest("hex");
      assert.equal(actualHash, expectedHash, `${textureDirectory}/${fileName}`);
    }
  }
});

test("A11 has no committed texture directory", () => {
  const textureDirectories =
    POC_PROVENANCE_POLICIES.A11.trackedTextureDirectories;
  const trackedTextures = execFileSync(
    "git",
    ["ls-files", "--", ...textureDirectories],
    { cwd: REPOSITORY_ROOT, encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter(Boolean);

  assert.deepEqual(trackedTextures, []);
});

test("C03 has no committed texture directory", () => {
  const textureDirectories =
    POC_PROVENANCE_POLICIES.C03.trackedTextureDirectories;
  const trackedTextures = execFileSync(
    "git",
    ["ls-files", "--", ...textureDirectories],
    { cwd: REPOSITORY_ROOT, encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter(Boolean);

  assert.deepEqual(trackedTextures, []);
});
