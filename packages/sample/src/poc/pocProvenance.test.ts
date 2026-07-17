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
    ],
    [
      "packages/sample/src/poc/PocGallery.tsx",
      "packages/sample/src/poc/pocGalleryData.ts",
    ],
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
    ["packages/sample/src/poc/SewerGateB10.tsx"],
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
    ],
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
    .replaceAll("\\", "/")
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

const collectB10TextureUrlTupleValues = (
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
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === "B10_TEXTURE_URLS",
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

const hasApprovedB10TextureUrlContract = (
  sourceFile: ts.SourceFile,
  policy: PocProvenancePolicy,
): boolean => {
  if (!policy.allowSplitImageFragments) return false;
  const typeAlias = sourceFile.statements.find(
    (statement): statement is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === "B10TextureUrl",
  );
  if (
    !typeAlias ||
    typeAlias.type.getText(sourceFile).replaceAll(/\s/g, "") !==
      "(typeofB10_TEXTURE_URLS)[number]"
  ) {
    return false;
  }

  const tupleValues = collectB10TextureUrlTupleValues(sourceFile);
  const expectedCompletePaths = getSplitComposedImagePaths(policy).map(
    (value) => `/${value}`,
  );
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

const isApprovedTypedTextureUrl = (
  expression: ts.Expression,
  context: StaticBindingContext,
  sourceFile: ts.SourceFile,
  policy: PocProvenancePolicy,
): boolean => {
  if (!ts.isIdentifier(expression)) return false;
  const declaration = resolveStaticBinding(expression, context)?.declaration;
  return (
    declaration !== undefined &&
    ts.isParameter(declaration) &&
    declaration.type !== undefined &&
    declaration.type.getText(sourceFile) === "B10TextureUrl" &&
    hasApprovedB10TextureUrlContract(sourceFile, policy)
  );
};

const collectUnapprovedDynamicTextureLoads = (
  sourceFile: ts.SourceFile,
  policy: PocProvenancePolicy,
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
        !isApprovedTypedTextureUrl(
          pathExpression,
          context,
          sourceFile,
          policy,
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
  "HeavyWaterDoorA11",
  "SewerGateB10",
  "LiftPlatformC03",
  "ArchedGateB05",
  "HeavyWaterDoubleDoorB06",
]);

const isDetailPocImport = (specifier: string): boolean => {
  const fileName = specifier.replaceAll("\\", "/").split("/").at(-1) ?? "";
  const moduleName = fileName.replace(/\.(?:[cm]?[jt]sx?)$/i, "");
  return GALLERY_DETAIL_POC_MODULES.has(moduleName);
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
      policy,
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
      ],
      expectedDependencyFiles: [
        "packages/sample/src/poc/PocGallery.tsx",
        "packages/sample/src/poc/pocGalleryData.ts",
      ],
      trackedTextureDirectories: [],
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
      expectedDependencyFiles: ["packages/sample/src/poc/SewerGateB10.tsx"],
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
      ],
      trackedTextureDirectories: [],
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

test("B10 TextureLoader paths use the complete approved URL contract", async () => {
  const source = await readFile(POC_PROVENANCE_POLICIES.B10.entryPath, "utf8");
  const executableSource = stripSourceComments(
    source,
    POC_PROVENANCE_POLICIES.B10.entryPath,
  );
  const sourceFile = createSourceFile(
    POC_PROVENANCE_POLICIES.B10.entryPath,
    executableSource,
  );
  const approvedUrls = [
    "/textures/b10/door.png",
    "/textures/b10/lower.png",
    "/textures/b10/lever-sign.png",
    "/textures/b10/lever-box.png",
  ];
  const staticValues = collectStaticStringValues(sourceFile);

  for (const approvedUrl of approvedUrls) {
    assert.ok(staticValues.has(approvedUrl), `Missing immutable ${approvedUrl}`);
    assert.equal(
      isAllowedImagePathFragment(
        approvedUrl,
        POC_PROVENANCE_POLICIES.B10.allowedImagePaths,
        true,
      ),
      true,
    );
  }

  const urlType = sourceFile.statements.find(
    (statement): statement is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === "B10TextureUrl",
  );
  assert.ok(urlType, "B10TextureUrl must derive from the immutable URL constants");
  assert.equal(
    urlType.type.getText(sourceFile).replaceAll(/\s/g, ""),
    "(typeofB10_TEXTURE_URLS)[number]",
  );

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
    collectProvenanceViolations(
      new Map([[sourceFile.fileName, sourceFile]]),
      POC_PROVENANCE_POLICIES.B10,
    ),
    [],
  );
});

test("B10 texture URL contract rejects a dynamic fifth tuple element", () => {
  const source = [
    'const B10_DOOR_TEXTURE_URL = "/textures/b10/door.png" as const;',
    'const B10_LOWER_TEXTURE_URL = "/textures/b10/lower.png" as const;',
    'const B10_LEVER_SIGN_TEXTURE_URL = "/textures/b10/lever-sign.png" as const;',
    'const B10_LEVER_BOX_TEXTURE_URL = "/textures/b10/lever-box.png" as const;',
    "declare const dynamicTextureUrl: string;",
    "const B10_TEXTURE_URLS = Object.freeze([",
    "  B10_DOOR_TEXTURE_URL,",
    "  B10_LOWER_TEXTURE_URL,",
    "  B10_LEVER_SIGN_TEXTURE_URL,",
    "  B10_LEVER_BOX_TEXTURE_URL,",
    "  dynamicTextureUrl,",
    "] as const);",
    "type B10TextureUrl = (typeof B10_TEXTURE_URLS)[number];",
    "const loadTexture = (textureUrl: B10TextureUrl) =>",
    "  new THREE.TextureLoader().load(textureUrl);",
  ].join("\n");
  const sourceFile = createSourceFile("widened-b10-contract.ts", source);

  assert.equal(
    hasApprovedB10TextureUrlContract(
      sourceFile,
      POC_PROVENANCE_POLICIES.B10,
    ),
    false,
  );
  assert.ok(
    collectProvenanceViolations(
      new Map([[sourceFile.fileName, sourceFile]]),
      POC_PROVENANCE_POLICIES.B10,
    ).some((violation) =>
      violation.includes("unresolved TextureLoader image path"),
    ),
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

test("gallery policy rejects image paths outside its five thumbnails", () => {
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
          path.relative(REPOSITORY_ROOT, filePath).replaceAll(path.sep, "/"),
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
