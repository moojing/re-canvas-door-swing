import { mountDoorEntrance, doorEntrancePresets } from 'retro-horror-door';
import { DefaultLoadingManager } from 'three';
import { destination, choosePreset } from './navigation.mjs';

const script = document.currentScript;
const assetBaseUrl = new URL('./assets/', script.src).href;
const ids = doorEntrancePresets.map(preset => preset.id);
let busy = false;
let cancelTransition;
let previous;
try { previous = sessionStorage.getItem('abyss-door-preset'); } catch {}

const style = document.createElement('style');
style.textContent = `#abyss-door-overlay{position:fixed;inset:0;z-index:2147483647;background:#000;color:#fff;text-align:left}#abyss-door-stage,#abyss-door-stage>div{width:100%;height:100%}#abyss-door-skip{position:absolute;right:20px;bottom:20px;z-index:2;padding:10px 16px;border:1px solid #888;background:#171717;color:white;cursor:pointer;font:14px sans-serif}#abyss-door-credit{position:absolute;left:20px;bottom:24px;font:12px sans-serif;color:#bbb;pointer-events:none}`;
document.head.append(style);
document.addEventListener('click', event => {
  const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
  const next = destination(anchor, event, location.href);
  if (!next) return;
  if (busy) { event.preventDefault(); return; }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  event.preventDefault();
  busy = true;
  const preset = choosePreset(ids, previous);
  previous = preset;
  try { sessionStorage.setItem('abyss-door-preset', preset); } catch {}
  const overlay = document.createElement('div');
  overlay.id = 'abyss-door-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Opening door');
  overlay.dataset.preset = preset;
  const stage = document.createElement('div');
  stage.id = 'abyss-door-stage';
  const skip = document.createElement('button');
  skip.id = 'abyss-door-skip';
  skip.textContent = '\u7565\u904e\u52d5\u756b (Esc)';
  const credit = document.createElement('span');
  credit.id = 'abyss-door-credit';
  credit.textContent = 'retro-horror-door / Random door transition';
  overlay.append(stage, skip, credit);
  document.body.append(overlay);
  skip.focus();
  let app;
  let finished = false;
  let rendererReady = false;
  let assetsReady = true;
  const manager = DefaultLoadingManager;
  const previousCallbacks = { onStart: manager.onStart, onLoad: manager.onLoad, onError: manager.onError };
  const playWhenReady = () => {
    if (!finished && rendererReady && assetsReady) {
      overlay.dataset.ready = 'true';
      app.play();
    }
  };
  const cleanup = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    document.removeEventListener('keydown', keyboard, true);
    Object.assign(manager, previousCallbacks);
    app?.unmount();
    overlay.remove();
    cancelTransition = undefined;
    busy = false;
  };
  const finish = () => {
    if (finished) return;
    cleanup();
    location.assign(next);
  };
  cancelTransition = cleanup;
  manager.onStart = (...args) => { assetsReady = false; previousCallbacks.onStart?.(...args); };
  manager.onLoad = () => { assetsReady = true; previousCallbacks.onLoad?.(); playWhenReady(); };
  manager.onError = (...args) => { previousCallbacks.onError?.(...args); finish(); };
  const keyboard = e => {
    if (e.key === 'Escape') { e.preventDefault(); finish(); }
    if (e.key === 'Tab') { e.preventDefault(); skip.focus(); }
  };
  const timer = setTimeout(finish, 20000);
  skip.addEventListener('click', finish);
  document.addEventListener('keydown', keyboard, true);
  stage.addEventListener('webglcontextlost', finish, true);
  try {
    app = mountDoorEntrance({ target: stage, preset, assetBaseUrl, className: 'abyss-door-scene', autoPlay: false,
      onReady: () => { rendererReady = true; playWhenReady(); }, onComplete: finish });
  } catch { finish(); }
});
// Cancel suspended callbacks before a page enters the back/forward cache.
addEventListener('pagehide', () => cancelTransition?.());
// Restore a usable page when returning through the back/forward cache.
addEventListener('pageshow', event => {
  if (event.persisted) { document.getElementById('abyss-door-overlay')?.remove(); busy = false; }
});
