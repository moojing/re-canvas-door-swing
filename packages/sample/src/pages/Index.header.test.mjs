import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const indexPath = new URL("./Index.tsx", import.meta.url);
const headerPath = new URL("../components/SampleHeader.tsx", import.meta.url);

const requiredLinks = [
  {
    label: "GitHub README",
    href: "https://github.com/moojing/re-canvas-door-swing#readme",
  },
  {
    label: "Stakeholder picker",
    href: "https://re-door-gallery.pages.dev/stakeholder-selection",
  },
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const anchorPattern = ({ label, href }) =>
  new RegExp(
    `<a\\b(?=[^>]*\\bhref=["']${escapeRegExp(href)}["'])(?=[^>]*\\btarget=["']_blank["'])(?=[^>]*\\brel=["']noreferrer["'])[^>]*>[\\s\\S]*?${escapeRegExp(label)}[\\s\\S]*?<\\/a>`
  );

test("catalog uses the shared sample header", async () => {
  const source = await readFile(indexPath, "utf8");
  assert.match(source, /<SampleHeader\s*\/>/);
});

test("header exposes the required external links", async () => {
  const source = await readFile(headerPath, "utf8");

  for (const { label, href } of requiredLinks) {
    assert.match(source, anchorPattern({ label, href }), `expected a complete external anchor for ${label}`);
  }
});

test("anchor matcher rejects a near-match URL", () => {
  const [{ label, href }] = requiredLinks;
  const malformedAnchor = `<a href="${href.replace("github.com", "githubXcom")}" target="_blank" rel="noreferrer">${label}</a>`;

  assert.doesNotMatch(malformedAnchor, anchorPattern({ label, href }));
});

test("header stays at the top while the page scrolls", async () => {
  const source = await readFile(headerPath, "utf8");

  assert.match(
    source,
    /<header className="[^\"]*\bsticky\b[^\"]*\btop-0\b[^\"]*">/
  );
});

test("header lists animations and collapses overflow into a dropdown", async () => {
  const source = await readFile(headerPath, "utf8");

  assert.match(source, /shouldCollapseAnimationLinks\(doorAnimationConfigs\.length\)/);
  assert.match(source, /\/dev\/animations\/\$\{animation\.id\}/);
  assert.match(source, /<details/);
  assert.match(source, /to="\/dev\/animations"/);
});
