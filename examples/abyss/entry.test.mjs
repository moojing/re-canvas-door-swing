import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = (await readFile(new URL('./entry.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\n/gm, '');

function mountExample() {
  const listeners = new Map();
  const elements = new Map();
  const lifecycle = new Map();
  class Element {
    style = {};
    dataset = {};
    listeners = new Map();
    set id(value) { elements.set(value, this); }
    setAttribute() {}
    append() {}
    focus() {}
    removed = false;
    remove() { this.removed = true; }
    addEventListener(name, callback) { this.listeners.set(name, callback); }
    closest() { return this; }
  }
  const manager = {};
  let options;
  let plays = 0;
  let unmounts = 0;
  let navigated;
  runInNewContext(source, {
    URL, Element,
    document: {
      currentScript: { src: 'https://example.com/door-demo/door-demo.js' },
      head: new Element(), body: new Element(),
      createElement: () => new Element(),
      addEventListener: (name, callback) => listeners.set(name, callback),
      removeEventListener: (name) => listeners.delete(name),
    },
    location: { href: 'https://example.com/index.html', assign: url => { navigated = url; } },
    sessionStorage: { getItem() {}, setItem() {} },
    matchMedia: () => ({ matches: false }),
    addEventListener: (name, callback) => lifecycle.set(name, callback),
    setTimeout: () => 1, clearTimeout() {},
    destination: () => 'https://example.com/next.html',
    choosePreset: () => 'test-door', doorEntrancePresets: [{ id: 'test-door' }],
    DefaultLoadingManager: manager,
    mountDoorEntrance: value => {
      options = value;
      manager.onStart();
      return { play() { plays++; }, unmount() { unmounts++; } };
    },
  });
  listeners.get('click')({ target: new Element(), preventDefault() {} });
  return {
    elements, manager, ready: () => options.onReady(),
    complete: () => options.onComplete(),
    pagehide: () => lifecycle.get('pagehide')(),
    get plays() { return plays; }, get navigated() { return navigated; },
    get unmounts() { return unmounts; },
  };
}

test('keeps untextured door hidden until both renderer and assets are ready', () => {
  const demo = mountExample();
  const stage = demo.elements.get('abyss-door-stage');
  assert.equal(stage.style.visibility, 'hidden');
  demo.ready();
  assert.equal(stage.style.visibility, 'hidden');
  assert.equal(demo.plays, 0);
  demo.manager.onLoad();
  assert.equal(stage.style.visibility, 'visible');
  assert.equal(demo.plays, 1);
});

test('skip remains usable while the door is hidden and late assets do not play', () => {
  const demo = mountExample();
  const completeLoading = demo.manager.onLoad;
  demo.ready();
  demo.elements.get('abyss-door-skip').listeners.get('click')();
  assert.equal(demo.navigated, 'https://example.com/next.html');
  completeLoading();
  assert.equal(demo.plays, 0);
});

test('keeps a black overlay until pagehide while destination navigation is pending', () => {
  const demo = mountExample();
  demo.ready();
  demo.manager.onLoad();
  demo.complete();
  assert.equal(demo.navigated, 'https://example.com/next.html');
  assert.equal(demo.elements.get('abyss-door-overlay').removed, false);
  assert.equal(demo.elements.get('abyss-door-stage').style.visibility, 'hidden');
  demo.pagehide();
  assert.equal(demo.elements.get('abyss-door-overlay').removed, true);
});

test('skip stops playback immediately without removing the navigation cover', () => {
  const demo = mountExample();
  demo.ready();
  demo.manager.onLoad();
  demo.elements.get('abyss-door-skip').listeners.get('click')();
  assert.equal(demo.unmounts, 1);
  assert.equal(demo.elements.get('abyss-door-overlay').removed, false);
  demo.pagehide();
  assert.equal(demo.unmounts, 1);
  assert.equal(demo.elements.get('abyss-door-overlay').removed, true);
});
