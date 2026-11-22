import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destination, choosePreset } from './navigation.mjs';
const base = 'http://localhost:4181/biohazard1/index.html';
const link = (href, extra = {}) => ({ href: new URL(href, base).href, hasAttribute: k => !!extra[k] });
test('only ordinary local HTML navigation is intercepted', () => {
  assert.equal(destination(link('../biohazard2/index.html'), {}, base), 'http://localhost:4181/biohazard2/index.html');
  for (const href of ['#section', 'https://example.com/index.html', 'image.jpg', 'mailto:a@b.com']) assert.equal(destination(link(href), {}, base), null);
  assert.equal(destination(link('other.html'), { ctrlKey: true }, base), null);
  assert.equal(destination(link('other.html', { download: true }), {}, base), null);
});
test('random presets exclude the previous selection', () => {
  assert.equal(choosePreset(['a', 'b', 'c'], 'a', () => 0), 'b');
  assert.equal(choosePreset(['a', 'b', 'c'], 'a', () => .999), 'c');
  assert.equal(choosePreset(['a'], 'a'), 'a');
});
test('versioned navigation bypasses cached HTML without changing native same-page links', () => {
  assert.equal(
    destination(link('per.html?section=stars#alpha'), {}, base, 'new-build'),
    'http://localhost:4181/biohazard1/per.html?section=stars&door-demo-version=new-build#alpha',
  );
  const current = base + '?door-demo-version=old-build';
  assert.equal(destination(link('index.html'), {}, current, 'new-build'), null);
  assert.equal(destination(link('#section'), {}, current, 'new-build'), null);
  assert.equal(
    destination(link('per.html?door-demo-version=old-build'), {}, current, 'new-build'),
    'http://localhost:4181/biohazard1/per.html?door-demo-version=new-build',
  );
});
