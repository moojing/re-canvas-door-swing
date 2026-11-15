import { expect, test } from "@playwright/test";
import { doorEntrancePresets, getDoorEntrancePreset } from "../../src/core/presets.ts";
import { getPortraitProtectionEnd } from "../../src/responsiveFraming.ts";
import { getDoorEntranceAnimationConfig } from "../../src/core/presetAnimation.ts";

test.describe.configure({ mode: "parallel" });

const presets = [...doorEntrancePresets,
  getDoorEntrancePreset("biohazard-1996-a02-yellow-panel-knob-door"),
  getDoorEntrancePreset("biohazard-1996-a02-yellow-panel-knob-door-leave")];

for (const preset of presets) {
  test(`${preset.id} all-device passage face audit`, async ({ page }, info) => {
    test.setTimeout(120000);
    const config = getDoorEntranceAnimationConfig(preset);
    const start = config.timelineEvents?.find(e => ["hold-end", "opening-resumes", "closed-hold-end", "advance-start", "run-start"].includes(e.id))?.atMs ?? 0;
    const fade = config.timelineEvents?.find(e => e.id === "fade-start")?.atMs ?? config.duration;
    const times = [...new Set([0, ...Array.from({ length: Math.ceil(config.duration / 40) }, (_, i) => i * 40),
      ...config.timelineEvents!.flatMap(e => [e.atMs - 1, e.atMs, e.atMs + 1])])].filter(ms => ms >= 0 && ms < config.duration).sort((a, b) => a - b);
    const frames = [...new Set([start, start + (fade - start) / 3, start + (fade - start) * 2 / 3, fade - 1, config.duration * .96])].sort((a, b) => a - b);
    const protectionEnd = getPortraitProtectionEnd(config.timelineEvents);
    const states = times.map(ms => {
      const progress = ms / config.duration;
      return config.getState(config.easing?.(progress) ?? progress);
    });
    const report = [];
    for (const [device, width, height] of [["desktop", 1440, 900], ["tablet", 768, 1024], ["phone", 390, 844]] as const) {
      await page.goto("/samples/vanilla.html?testMode");
      await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
      await page.evaluate(async ({ id, width, height }) => {
        const url = performance.getEntriesByType("resource").map(e => e.name).find(n => /\/deps\/three\.js\?/.test(n));
        if (!url) throw new Error("Renderer Three module not observed");
        const T = await import(/* @vite-ignore */ url);
        const beforeRender = T.Mesh.prototype.onBeforeRender;
        T.Mesh.prototype.onBeforeRender = function(renderer: any, scene: any, camera: any, ...rest: any[]) {
          (window as any).__faceAudit = { renderer, scene, camera, original: renderer.render, T };
          return beforeRender.call(this, renderer, scene, camera, ...rest);
        };
        const select = document.querySelector<HTMLSelectElement>("#door-preset")!;
        select.add(new Option(id, id)); select.value = id; select.dispatchEvent(new Event("change"));
        const root = document.querySelector<HTMLElement>("#door-root > div")!;
        root.style.width = `${width}px`; root.style.height = `${height}px`; root.style.maxWidth = "none";
      }, { id: preset.id, width, height });
      await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
      await page.waitForLoadState("networkidle");
      const observed = await page.evaluate(({ times, frames, duration, states, protectionEnd }) => {
        const ctx = (window as any).__faceAudit;
        if (!ctx) throw new Error("Actual renderer not captured");
        const { renderer, scene, camera, original, T } = ctx;
        const canvas = renderer.domElement as HTMLCanvasElement;
        const pixels = new Uint8Array(canvas.width * canvas.height * 4);
        const gl = renderer.getContext();
        const records: any[] = [];
        const swapped: { mesh: any; material: any; diagnostic: any }[] = [];
        const diagnostic: any[] = [];
        scene.traverse((mesh: any) => {
          if (!mesh.isMesh) return;
          const material = mesh.material;
          const plane = mesh.geometry.type === "PlaneGeometry";
          const back = plane && Math.abs(Math.abs(mesh.rotation.y) - Math.PI) < .001;
          const make = (old: any) => {
            const basic = new T.MeshBasicMaterial({ color: plane ? (back ? 0xff00ff : 0x00ff00) : 0x000000,
              side: old.side, depthTest: old.depthTest, depthWrite: old.depthWrite });
            diagnostic.push(basic); return basic;
          };
          swapped.push({ mesh, material, diagnostic: Array.isArray(material) ? material.map(make) : make(material) });
        });
        const probe = () => {
          for (const { mesh, diagnostic } of swapped) mesh.material = diagnostic;
          original.call(renderer, scene, camera);
          gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          let front = 0, back = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i] > 100 && pixels[i + 2] > 100 && pixels[i + 1] < 30) back++;
            if (pixels[i + 1] > 100 && pixels[i] < 30 && pixels[i + 2] < 30) front++;
          }
          for (const { mesh, material } of swapped) mesh.material = material;
          original.call(renderer, scene, camera);
          return { front, back, area: canvas.width * canvas.height };
        };
        const offsets: number[][] = [];
        let maxOrientationError = 0;
        for (const [index, ms] of times.entries()) {
          window.__doorEntranceTestApi__!.seek(ms / duration);
          const reference = new T.PerspectiveCamera(60, camera.aspect, .1, 100);
          reference.position.set(...states[index].cameraPosition);
          reference.lookAt(...states[index].cameraTarget);
          maxOrientationError = Math.max(maxOrientationError, 1 - Math.abs(reference.quaternion.dot(camera.quaternion)));
          if (ms >= protectionEnd) offsets.push(camera.position.clone().sub(reference.position).toArray());
          const fade = Number((canvas.nextElementSibling as HTMLElement).style.opacity);
          if (fade >= .99) continue;
          const result = probe();
          records.push({ ms, fade, ...result });
        }
        diagnostic.forEach(m => m.dispose());
        const sheet = document.createElement("canvas");
        sheet.width = canvas.width * 3; sheet.height = (canvas.height + 24) * Math.ceil(frames.length / 3);
        const context = sheet.getContext("2d")!;
        context.fillStyle = "black"; context.fillRect(0, 0, sheet.width, sheet.height);
        frames.forEach((ms, index) => {
          window.__doorEntranceTestApi__!.seek(ms / duration);
          const x = index % 3 * canvas.width, y = Math.floor(index / 3) * (canvas.height + 24);
          context.drawImage(canvas, x, y + 24);
          const fade = Number((canvas.nextElementSibling as HTMLElement).style.opacity);
          context.fillStyle = `rgba(0,0,0,${fade})`; context.fillRect(x, y + 24, canvas.width, canvas.height);
          context.fillStyle = "white"; context.font = "14px sans-serif"; context.fillText(`${Math.round(ms)}ms`, x + 4, y + 18);
        });
        const first = offsets[0];
        const maxOffsetDrift = Math.max(0, ...offsets.map(offset => Math.hypot(...offset.map((n, i) => n - first[i]))));
        return { maxOffsetDrift, maxOrientationError, records, image: sheet.toDataURL("image/png").split(",")[1] };
      }, { times, frames, duration: config.duration, states, protectionEnd });
      expect(observed.maxOffsetDrift, "no extra post-hold orbit or lateral door tracking").toBeLessThan(1e-8);
      expect(observed.maxOrientationError, "responsive framing retains authored look direction").toBeLessThan(1e-10);
      expect(observed.records.length).toBeGreaterThan(10);
      expect(observed.records.some(r => r.front + r.back > 50)).toBe(true);
      const flags = observed.records.filter(r => r.back > 4);
      report.push({ device, maxOffsetDrift: observed.maxOffsetDrift, maxOrientationError: observed.maxOrientationError, samples: observed.records.length, firstBackMs: flags.length ? Math.min(...flags.map(r => r.ms)) : null,
        lastBackMs: flags.length ? Math.max(...flags.map(r => r.ms)) : null, maxBackFraction: Math.max(0, ...flags.map(r => r.back / r.area)),
        flags });
      await info.attach(`${device}-actual-material-passage`, { body: Buffer.from(observed.image, "base64"), contentType: "image/png" });
    }
    await info.attach("all-device-face-audit", { body: JSON.stringify({ id: preset.id, type: preset.type, report }, null, 2), contentType: "application/json" });
  });
}
