import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const ref = args[args.indexOf('--ref') + 1];
const reason = args[args.indexOf('--reason') + 1];
if (!args.includes('--ref') || !/^[a-f0-9]{40}$/.test(ref || '') || !args.includes('--reason') || !reason?.trim()) {
  throw new Error('Usage: npm run baseline:animation -- --ref <full old commit SHA> --reason <intentional reason>');
}
const git = (...argv) => execFileSync('git', argv, { cwd: root, encoding: 'utf8' }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('Reference must identify an existing exact commit');
const temporary = mkdtempSync(path.join(tmpdir(), 'door-animation-oracle-'));
const source = path.join(temporary, 'source'), staging = path.join(temporary, 'baseline');
mkdirSync(source); mkdirSync(staging);
const cleanEnvironment = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !/^(DOOR_|VITE_|ANIMATION_)/.test(key) && !['NODE_OPTIONS', 'NODE_PATH'].includes(key)));
const run = (cmd, argv, cwd, env = {}) => execFileSync(cmd, argv, { cwd, env: { ...cleanEnvironment, ...env }, stdio: 'inherit' });
const hash = data => createHash('sha256').update(data).digest('hex');
try {
  execFileSync('git', ['archive', '--format=tar', '--output', path.join(temporary, 'source.tar'), ref], { cwd: root });
  run('tar', ['-xf', path.join(temporary, 'source.tar')], source);
  // The oracle must never resolve this checkout's workspaces or dependencies.
  run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], source);
  const helper = path.join(root, 'packages/door-lib/tests/regression');
  run(process.execPath, ['--experimental-strip-types', '--import', path.join(root, 'packages/door-lib/src/__tests__/asset-loader.mjs'),
    path.join(helper, 'capture-timeline.ts'), source, path.join(staging, 'timeline.json')], root);
  run('npx', ['playwright', 'test', '--config', path.join(helper, 'playwright.config.ts')], root, {
    ANIMATION_REFERENCE_ROOT: source, ANIMATION_CAPTURE_DIR: staging, ANIMATION_CAPTURE_SHA: ref,
    ANIMATION_TEST_PORT: process.env.ANIMATION_TEST_PORT || '5193',
  });
  const timeline = JSON.parse(readFileSync(path.join(staging, 'timeline.json'), 'utf8'));
  const images = readdirSync(staging).filter(f => f.endsWith('.png'));
  if (images.length !== Object.keys(timeline.presets).length * 3) throw new Error('Incomplete visual capture; existing baseline preserved');
  const renderer = JSON.parse(readFileSync(path.join(staging, 'renderer.json'), 'utf8'));
  rmSync(path.join(staging, 'renderer.json'));
  const files = Object.fromEntries(readdirSync(staging).sort().map(f => [f, hash(readFileSync(path.join(staging, f)))]));
  const sourceFiles = git('ls-tree', '-r', ref).split('\n').filter(line =>
    /\t(packages\/door-lib\/src\/|packages\/door-assets\/|packages\/sample\/src\/sample\/|packages\/sample\/vite.config|package(-lock)?\.json)/.test(line));
  writeFileSync(path.join(staging, 'manifest.json'), JSON.stringify({
    formatVersion: 1, sourceCommit: ref, sourceTree: git('rev-parse', `${ref}^{tree}`),
    reason, createdAt: new Date().toISOString(), node: process.version,
    playwright: JSON.parse(readFileSync(path.join(root, 'node_modules/@playwright/test/package.json'), 'utf8')).version,
    renderer, capture: { columns: 4, numericIntervalMs: 40, numericTolerance: 1e-10,
      toolingHashes: Object.fromEntries(['timeline.ts', 'visual.test.ts', 'playwright.config.ts'].map(f =>
        [f, hash(readFileSync(path.join(helper, f)))])),
      pixelThreshold: 0.1, allowedDifferentPixels: 0, renderMode: 'ANGLE SwiftShader; sRGB; DPR1',
      viewports: timeline.viewports, visualPresets: Object.keys(timeline.presets), sourceFiles }, files,
  }, null, 2) + '\n');
  const destination = path.join(helper, 'baseline');
  const backup = path.join(temporary, 'previous');
  renameSync(destination, backup);
  try { renameSync(staging, destination); }
  catch (error) { renameSync(backup, destination); throw error; }
  console.log(`Captured immutable ${ref}: ${Object.keys(timeline.presets).length} presets / ${images.length} PNG sheets. Review and commit the baseline diff intentionally.`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
