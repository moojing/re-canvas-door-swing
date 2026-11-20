import { expect, test, type Page } from "@playwright/test";

const A = "biohazard-1996-a01-iron-door";
const B = "biohazard-1998-a01-no-handle-door";
const C = "biohazard-1996-a02-yellow-panel-knob-door";

// This harness observes the real module/renderer. Long-lived accounting contains
// primitive IDs and WeakRefs only; held callbacks deliberately own pending loads.
async function setup(page: Page) {
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  await page.evaluate(async () => {
    window.__doorEntranceTestApi__!.unmount();
    const threeUrl = performance.getEntriesByType("resource").map(e => e.name).find(n => /\/deps\/three\.js\?/.test(n))!;
    const T = await import(/* @vite-ignore */ threeUrl);
    const vanillaUrl = performance.getEntriesByType("resource").map(e => e.name).find(n => /\/door-lib\/src\/vanilla\.ts/.test(n))!;
    const { mountDoorEntrance } = await import(/* @vite-ignore */ vanillaUrl);
    const records: Record<number, { disposed: number; decoded: boolean; failed: boolean }> = {};
    const disposals: Record<number, number> = {};
    const held = new Map<number, () => void>();
    const retired = new WeakSet<object>();
    const materials: Array<WeakRef<any>> = [];
    const seen = new WeakSet<object>();
    let next = 0, fail = 0, hold = false, allow = 0, draws = 0, staleAssignments = 0, handleDisposals = 0;
    const renderers = new Map<HTMLCanvasElement, any>();
    const rendererMaterials = new Map<HTMLCanvasElement, Array<WeakRef<any>>>();
    const rendererSeen = new WeakMap<HTMLCanvasElement, WeakSet<object>>();
    let allocations = 0, deletions = 0;
    for (const context of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const create = context.prototype.createTexture;
      const remove = context.prototype.deleteTexture;
      context.prototype.createTexture = function () { allocations++; return create.call(this); };
      context.prototype.deleteTexture = function (texture) { if (texture) deletions++; return remove.call(this, texture); };
    }
    const originalDispose = T.Texture.prototype.dispose;
    T.Texture.prototype.dispose = function () {
      disposals[this.id] = (disposals[this.id] ?? 0) + 1;
      if (records[this.id]) records[this.id].disposed++;
      if (this.name === "procedural-aged-handle") handleDisposals++;
      return originalDispose.call(this);
    };
    const disposeMaterial = T.Material.prototype.dispose;
    T.Material.prototype.dispose = function () { retired.add(this); return disposeMaterial.call(this); };
    T.Mesh.prototype.onBeforeRender = function (renderer: any) {
      draws++;
      const canvas = renderer.domElement;
      renderers.set(canvas, renderer);
      if (!rendererSeen.has(canvas)) { rendererSeen.set(canvas, new WeakSet()); rendererMaterials.set(canvas, []); }
      for (const material of Array.isArray(this.material) ? this.material : [this.material]) {
        if (!rendererSeen.get(canvas)!.has(material)) {
          rendererSeen.get(canvas)!.add(material); rendererMaterials.get(canvas)!.push(new WeakRef(material));
        }
        if (!seen.has(material)) { seen.add(material); materials.push(new WeakRef(material)); }
      }
    };
    const load = T.TextureLoader.prototype.load;
    T.TextureLoader.prototype.load = function (url: string, onLoad: (texture: any) => void, onProgress: any, onError: any) {
      next++;
      const texture = load.call(this, fail-- > 0 ? "/missing-surface.png" : url, (result: any) => {
        records[result.id].decoded = true;
        const complete = () => {
          const old = materials.flatMap(ref => { const m = ref.deref(); return m && retired.has(m) ? [{ ref, id: m.map?.id }] : []; });
          onLoad(result);
          for (const { ref, id } of old) { if (ref.deref()?.map?.id !== id) staleAssignments++; }
        };
        if (hold && allow-- <= 0) held.set(result.id, complete); else complete();
      }, onProgress, (error: any) => { records[texture.id].failed = true; onError?.(error); });
      records[texture.id] = { disposed: 0, decoded: false, failed: false };
      return texture;
    };
    const mounts: any[] = [];
    const completions: number[] = [];
    const targets: HTMLElement[] = [];
    const mount = (preset: string, textureUrl?: string) => {
      const target = document.createElement("div");
      target.style.cssText = "width:640px;height:460px";
      document.body.append(target); targets.push(target);
      const instance = mounts.length;
      completions[instance] = 0;
      mounts.push(mountDoorEntrance({ target, preset, textureUrl, autoPlay: false,
        onComplete: () => { completions[instance]++; },
      }));
    };
    (window as any).lifecycle = {
      mount,
      failNext: () => { fail = 3; },
      reset: (preset: string, instance = 0) => mounts[instance].reset(preset),
      seek: (instance = 0) => mounts[instance].seek(.35),
      play: (preset: string, instance = 0) => new Promise<void>(resolve => {
        const nextCompletion = completions[instance] + 1;
        mounts[instance].play(preset);
        const poll = () => { if (completions[instance] >= nextCompletion) resolve(); else setTimeout(poll, 30); }; poll();
      }),
      unmount: (instance = 0) => { const canvas = targets[instance].querySelector("canvas"); mounts[instance].unmount(); if (canvas) { renderers.delete(canvas); rendererMaterials.delete(canvas); } },
      hold: (accepted = 0) => { hold = true; allow = accepted; },
      resume: () => { hold = false; },
      release: () => { const callbacks = [...held.values()]; held.clear(); callbacks.forEach(fn => fn()); },
      stats: () => ({ completions: [...completions], loads: next, records: { ...records }, disposals: { ...disposals }, held: held.size, draws, staleAssignments, handleDisposals, allocations, deletions,
        textures: [...renderers.values()].map(r => r.info.memory.textures),
        maps: [...rendererMaterials.values()].map(refs => {
          const surfaces = new Set<number>(), shared = new Set<number>();
          for (const ref of refs) {
            const m = ref.deref();
            if (!m || retired.has(m)) continue;
            for (const value of Object.values(m) as any[]) {
              if (value?.isTexture) (records[value.id] ? surfaces : shared).add(value.id);
            }
          }
          return { surfaces: [...surfaces].sort((a, b) => a - b), shared: [...shared].sort((a, b) => a - b) };
        }) }),
    };
  });
}
const act = (page: Page, code: string) => page.evaluate(code);
const stats = (page: Page) => page.evaluate(() => (window as any).lifecycle.stats());
async function settled(page: Page, loads: number) {
  await expect.poll(async () => { const s = await stats(page); return Object.values(s.records).filter((r: any) => r.decoded || r.failed).length; }).toBe(loads);
}

for (const switches of [30, 100]) {
  test(`${switches} settled switches release surface textures`, async ({ page }) => {
    test.setTimeout(120_000);
    await setup(page);
    await act(page, `lifecycle.mount('${A}')`); await settled(page, 3);
    for (let i = 0; i < switches; i++) {
      await act(page, `lifecycle.reset('${i % 2 ? A : switches === 100 && i % 3 === 0 ? C : B}'); lifecycle.seek()`);
      await settled(page, 3 * (i + 2));
      const s = await stats(page);
      // Imported knobs retain a shared procedural map, normal map and one
      // packed roughness/metalness map; those three are outside surface ownership.
      expect(s.maps[0].surfaces).toHaveLength(3);
      expect(s.textures[0]).toBeGreaterThanOrEqual(3);
      expect(s.textures[0]).toBeLessThanOrEqual(switches === 100 ? 6 : 3);
      expect(Object.values(s.records).filter((r: any) => r.disposed === 1)).toHaveLength(3 * (i + 1));
    }
    await act(page, "lifecycle.unmount(); lifecycle.unmount()");
    expect(Object.values((await stats(page)).records).every((r: any) => r.disposed === 1)).toBe(true);
    expect((await stats(page)).handleDisposals).toBe(0);
    if (switches === 30) {
      const s = await stats(page);
      // Three.js also allocates two context placeholder textures. Compare the
      // observed balance before and after this scene rather than GPU bytes.
      expect(s.allocations - s.deletions).toBe(2);
    }
  });
}

for (const returnToA of [false, true]) {
  test(`expired decoded callbacks are rejected${returnToA ? " across A B A" : " across A B"}`, async ({ page }) => {
    await setup(page);
    // Render A first so retired materials are observed; rebuild A with held loads.
    await act(page, `lifecycle.mount('${B}')`); await settled(page, 3);
    await act(page, `lifecycle.hold(); lifecycle.reset('${A}')`); await settled(page, 6);
    await act(page, `lifecycle.resume(); lifecycle.reset('${B}')`); await settled(page, 9);
    if (returnToA) { await act(page, `lifecycle.reset('${A}')`); await settled(page, 12); }
    const before = await stats(page);
    await act(page, "lifecycle.release()");
    const after = await stats(page);
    expect(after.draws).toBe(before.draws);
    expect(after.staleAssignments).toBe(0);
    expect(after.maps).toEqual(before.maps);
    expect(Object.values(after.records).filter((r: any) => r.disposed === 1)).toHaveLength(returnToA ? 9 : 6);
  });
}

for (const action of ["rebuild", "unmount"]) {
  for (const accepted of [0, 1, 3]) {
    test(`${action} closes a batch with ${accepted} accepted surfaces exactly once`, async ({ page }) => {
      await setup(page);
      await act(page, `lifecycle.hold(${accepted}); lifecycle.mount('${A}')`); await settled(page, 3);
      const before = await stats(page);
      expect(before.held).toBe(3 - accepted);
      await act(page, action === "rebuild" ? `lifecycle.resume(); lifecycle.reset('${B}')` : "lifecycle.unmount(); lifecycle.unmount()");
      if (action === "rebuild") await settled(page, 6);
      const closed = await stats(page);
      expect(Object.values(closed.records).slice(0, 3).map((r: any) => r.disposed).sort()).toEqual([...Array(3 - accepted).fill(0), ...Array(accepted).fill(1)]);
      await act(page, "lifecycle.release()");
      const after = await stats(page);
      expect(after.draws).toBe(closed.draws);
      expect(Object.values(after.records).slice(0, 3).map((r: any) => r.disposed)).toEqual([1, 1, 1]);
    });
  }
}

test("same preset replay does not load and separate instances retain shared handles", async ({ page }) => {
  await setup(page);
  await act(page, `lifecycle.mount('${C}'); lifecycle.mount('${C}')`); await settled(page, 6);
  await expect.poll(async () => (await stats(page)).maps.map((m: any) => m.shared.length)).toEqual([3, 3]);
  const before = await stats(page);
  const released = before.maps[0].surfaces;
  const surviving = before.maps[1].surfaces;
  const shared = before.maps[1].shared;
  expect(before.maps[0].shared).toEqual(shared);
  expect(released).toHaveLength(3);
  expect(surviving).toHaveLength(3);
  expect(released.some((id: number) => surviving.includes(id))).toBe(false);
  await act(page, `lifecycle.seek(); lifecycle.reset('${C}'); lifecycle.seek(1)`);
  expect((await stats(page)).loads).toBe(6);
  await act(page, "lifecycle.unmount(); lifecycle.seek(1)");
  const s = await stats(page);
  expect(Object.values(s.records).filter((r: any) => r.disposed === 1)).toHaveLength(3);
  expect(released.map((id: number) => s.records[id].disposed)).toEqual([1, 1, 1]);
  expect(surviving.map((id: number) => s.records[id].disposed)).toEqual([0, 0, 0]);
  expect(s.maps[0].surfaces).toEqual(surviving);
  expect(shared.map((id: number) => s.disposals[id] ?? 0)).toEqual([0, 0, 0]);
  expect(s.textures).toEqual([6]);
  expect(s.handleDisposals).toBe(0);
});

test("failed surfaces keep fallback and a valid switch recovers", async ({ page }) => {
  await setup(page);
  await page.route("**/missing-surface.png", route => route.fulfill({ status: 404, body: "missing" }));
  await act(page, `lifecycle.failNext(); lifecycle.mount('${A}')`); await settled(page, 3);
  expect((await stats(page)).textures).toEqual([0]);
  await act(page, `lifecycle.reset('${B}')`); await settled(page, 6);
  expect((await stats(page)).textures).toEqual([3]);
  await act(page, "lifecycle.unmount()");
  expect(Object.values((await stats(page)).records).filter((r: any) => r.decoded).every((r: any) => r.disposed === 1)).toBe(true);
});

test("real complete plays and remount release each finished surface batch", async ({ page }) => {
  test.setTimeout(120_000);
  await setup(page);
  await act(page, `lifecycle.mount('${A}')`); await settled(page, 3);
  for (const preset of [A, B, C]) {
    await act(page, `lifecycle.play('${preset}')`);
    const s = await stats(page);
    expect(s.maps[0].surfaces).toHaveLength(3);
    expect(s.textures[0]).toBeLessThanOrEqual(preset === C ? 6 : 3);
  }
  await act(page, `lifecycle.unmount(); lifecycle.mount('${B}')`); await settled(page, 12);
  await act(page, `lifecycle.play('${B}', 1);`);
  expect((await stats(page)).completions).toEqual([3, 1]);
  await act(page, "lifecycle.unmount(1)");
  expect(Object.values((await stats(page)).records).every((r: any) => r.disposed === 1)).toBe(true);
});
