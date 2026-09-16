import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const exactVersionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const forbiddenOutputReferences = [
  "packages/door-lib/src",
  "packages/door-assets",
  "DevHandleMaterialVerifier",
  "door-lib/src/handleModel",
];
const publishedAssetPrefix = "https://cdn.jsdelivr.net/npm/retro-horror-door-assets@0.1.0-beta.0";
const workspaceSourceSegments = ["/packages/door-lib/src/", "/packages/door-assets/"];

function commandExitCode(result) {
  return result?.status === 0 ? 0 : typeof result?.status === "number" ? result.status : 1;
}

function outputFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? outputFiles(path) : [path];
  });
}

export function verifyBetaBuildOutput(directory, moduleIdsPath) {
  if (!existsSync(join(directory, "index.html"))) {
    throw new Error("Beta build output is missing dist/index.html");
  }

  const files = outputFiles(directory);
  const bundlePaths = files.filter(path => path.endsWith(".js"));
  if (bundlePaths.length === 0) {
    throw new Error("Beta build output is missing a JavaScript bundle");
  }

  const bundleContents = bundlePaths.map(path => readFileSync(path, "utf8"));
  if (!bundleContents.some(contents => contents.includes(publishedAssetPrefix))) {
    throw new Error(`Beta build output is missing CDN asset prefix ${publishedAssetPrefix}`);
  }

  if (!moduleIdsPath || !existsSync(moduleIdsPath)) {
    throw new Error("Beta build output is missing the resolved module ID report");
  }
  const moduleIds = JSON.parse(readFileSync(moduleIdsPath, "utf8"));
  const workspaceSourceModule = moduleIds.find(moduleId =>
    typeof moduleId === "string" && workspaceSourceSegments.some(segment => moduleId.replaceAll("\\\\", "/").includes(segment))
  );
  if (workspaceSourceModule) {
    throw new Error(`Beta build includes workspace source module ${workspaceSourceModule}`);
  }

  for (const path of files) {
    const contents = readFileSync(path, "utf8");
    const forbiddenReference = forbiddenOutputReferences.find(reference => contents.includes(reference));
    if (forbiddenReference) {
      throw new Error(`Beta build output contains forbidden reference ${forbiddenReference} in ${path}`);
    }
  }
}

export function runBetaBuild(version, dependencies = {}) {
  if (!exactVersionPattern.test(version)) {
    throw new Error("Expected an exact npm version, such as 0.2.0-beta.0");
  }

  const {
    mkdtempSync: makeTemporaryDirectory = mkdtempSync,
    writeFileSync: writeFile = writeFileSync,
    spawnSync: run = spawnSync,
    tmpdir: temporaryDirectory = tmpdir,
    join: joinPath = join,
    env = process.env,
    cwd = process.cwd,
    verifyBuildOutput = verifyBetaBuildOutput,
  } = dependencies;
  const directory = makeTemporaryDirectory(joinPath(temporaryDirectory(), "door-beta-build-"));
  const moduleIdsPath = joinPath(directory, "module-ids.json");
  writeFile(joinPath(directory, "package.json"), '{"private":true}');

  const install = run(
    "npm",
    [
      "install",
      "--prefix",
      directory,
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
      `retro-horror-door@${version}`,
    ],
    { stdio: "inherit" }
  );
  const installExitCode = commandExitCode(install);
  if (installExitCode !== 0) return installExitCode;

  const build = run("npm", ["run", "build"], {
    stdio: "inherit",
    env: {
      ...env,
      DOOR_PACKAGE_ENTRY: joinPath(directory, "node_modules/retro-horror-door/dist/index.js"),
      VITE_DOOR_ASSET_MODE: "cdn",
      DOOR_BETA_BUILD_MODULE_IDS_FILE: moduleIdsPath,
    },
  });
  const buildExitCode = commandExitCode(build);
  if (buildExitCode !== 0) return buildExitCode;
  verifyBuildOutput(joinPath(cwd(), "dist"), moduleIdsPath);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runBetaBuild(process.argv[2] ?? "");
}
