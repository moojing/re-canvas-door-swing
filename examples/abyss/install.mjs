import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, readFile, writeFile, mkdir, cp } from 'node:fs/promises';
const [siteArg] = process.argv.slice(2);
if (!siteArg || process.argv.length !== 3) throw new Error('Usage: node examples/abyss/install.mjs <site-directory>');
const site = resolve(siteArg);
const library = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(join(library, 'package.json'));
const { build } = require('esbuild');
const out = join(site, 'door-demo');
await mkdir(out, { recursive: true });
await build({ entryPoints: [join(dirname(fileURLToPath(import.meta.url)), 'entry.js')], outfile: join(out, 'door-demo.js'), bundle: true, format: 'iife', target: 'es2020', minify: true, alias: { 'retro-horror-door': join(library, 'packages/door-lib/src/index.ts') }, legalComments: 'linked' });
const assets = dirname(require.resolve('retro-horror-door-assets'));
for (const folder of ['textures', 'models', 'sounds']) await cp(join(assets, folder), join(out, 'assets', folder), { recursive: true });
const version = createHash('sha256').update(await readFile(join(out, 'door-demo.js'))).digest('hex').slice(0, 12);
let count = 0;
async function install(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory() && item.name !== 'door-demo') await install(path);
    else if (item.isFile() && /\.html?$/i.test(item.name)) {
      const original = await readFile(path);
      // Latin1 roundtrip preserves every byte of the original Big5 pages.
      const html = original.toString('latin1').replace(/<script defer charset="utf-8" data-abyss-door-demo src="[^"]*"><\/script>\n/g, '');

      if (!/<\/head\s*>/i.test(html)) continue;
      const src = relative(dir, join(out, 'door-demo.js')).split('\\').join('/');
      const tag = `<script defer charset="utf-8" data-abyss-door-demo src="${src}?v=${version}"></script>\n`;
      const updated = Buffer.from(html.replace(/<\/head\s*>/i, tag + '$&'), 'latin1');
      if (original.equals(updated)) continue;
      await writeFile(path, updated);
      count++;
    }
  }
}
await install(site);
console.log(`Installed local runtime; updated ${count} HTML pages in ${site}`);
