import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sampleUrl = new URL("./", import.meta.url);
const rootUrl = new URL("../../", import.meta.url);

const metadata = {
  "og:title": "Retro Horror Door — Playable Door Animation Presets",
  "og:description":
    "Browse and play reusable retro-horror 3D door entrance presets built with Three.js.",
  "og:image":
    "https://moojing.github.io/re-canvas-door-swing/social-preview.png",
  "og:image:alt": "Retro Horror Door preset catalog",
  "twitter:image":
    "https://moojing.github.io/re-canvas-door-swing/social-preview.png",
  "twitter:image:alt": "Retro Horror Door preset catalog",
};

function metaContent(html, name) {
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = new Map();
    const pattern = /\s*([^\s=/>]+)\s*=\s*(["'])(.*?)\2/gy;
    pattern.lastIndex = tag[0].match(/^<meta\b/i)[0].length;

    for (let match; (match = pattern.exec(tag[0])); ) {
      attributes.set(match[1].toLowerCase(), match[3]);
    }
    if (attributes.get("name") === name || attributes.get("property") === name) {
      return attributes.get("content");
    }
  }
}

test("declares the exact social preview metadata", async () => {
  const html = await readFile(new URL("index.html", sampleUrl), "utf8");

  for (const [name, content] of Object.entries(metadata)) {
    assert.equal(metaContent(html, name), content, name);
  }
});

test("provides a 1200x630 PNG social preview", async () => {
  const png = await readFile(
    new URL("public/social-preview.png", sampleUrl)
  );

  assert.deepEqual(
    png.subarray(0, 8),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    "PNG signature"
  );
  assert.equal(png.subarray(12, 16).toString("ascii"), "IHDR", "IHDR chunk");
  assert.equal(png.readUInt32BE(16), 1200, "IHDR width");
  assert.equal(png.readUInt32BE(20), 630, "IHDR height");
});

test("contains no Lovable references in sample or root configuration", async () => {
  const files = [
    new URL("index.html", sampleUrl),
    new URL("vite.config.ts", sampleUrl),
    new URL("package.json", sampleUrl),
    new URL("package.json", rootUrl),
    new URL("package-lock.json", rootUrl),
  ];
  const offenders = [];

  for (const file of files) {
    if (/lovable/i.test(await readFile(file, "utf8"))) {
      offenders.push(file.pathname.replace(rootUrl.pathname, ""));
    }
  }

  assert.deepEqual(offenders, []);
});
