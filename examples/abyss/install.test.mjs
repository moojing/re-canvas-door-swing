import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('installer preserves Big5 bytes, inserts before malformed footer and is idempotent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'abyss-example-'));
  try {
    await mkdir(join(root, 'section'));
    const original = Buffer.concat([
      Buffer.from('<html><head><title>'), Buffer.from([0xb4, 0x63, 0xc6, 0x46]),
      Buffer.from('</title></head><body><script>/* legacy unclosed analytics */</body></html>'),
    ]);
    const page = join(root, 'section', 'index.html');
    await writeFile(page, original);
    const installer = fileURLToPath(new URL('./install.mjs', import.meta.url));
    execFileSync(process.execPath, [installer, root]);
    const once = await readFile(page);
    const tag = once.toString('latin1').match(/<script defer charset="utf-8" data-abyss-door-demo src="\.\.\/door-demo\/door-demo.js\?v=[a-f0-9]{12}"><\/script>\n/)[0];
    assert.ok(once.toString('latin1').includes(tag + '</head>'));
    assert.deepEqual(Buffer.from(once.toString('latin1').replace(tag, ''), 'latin1'), original);
    await access(join(root, 'door-demo', 'door-demo.js'));
    await access(join(root, 'door-demo', 'assets', 'textures'));
    execFileSync(process.execPath, [installer, root]);
    assert.deepEqual(await readFile(page), once);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
