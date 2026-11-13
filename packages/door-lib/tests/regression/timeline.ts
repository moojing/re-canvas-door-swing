import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

export const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
export const baselineDirectory = new URL("./baseline/", import.meta.url);
export const retiredIds = ["biohazard-1996-a02-yellow-panel-knob-door", "biohazard-1996-a02-yellow-panel-knob-door-leave"];
export const viewports = { desktop: [1440, 900], tablet: [768, 1024], phone: [390, 844] } as const;
export const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const json = (value: unknown) => JSON.parse(JSON.stringify(value));

export async function collectTimeline(sourceRoot = repositoryRoot) {
  const load = (name: string) => import(pathToFileURL(path.join(sourceRoot, "packages/door-lib/src/core", name)).href);
  const { doorEntrancePresets, getDoorEntrancePreset } = await load("presets.ts");
  const { getDoorEntranceAnimationConfig } = await load("presetAnimation.ts");
  const catalogIds = doorEntrancePresets.map((p: { id: string }) => p.id).sort();
  const presets: Record<string, any> = {};
  for (const id of [...catalogIds, ...retiredIds].sort()) {
    const preset = getDoorEntrancePreset(id);
    const config = getDoorEntranceAnimationConfig(preset);
    const events = config.timelineEvents ?? [];
    const eventTimes: number[] = events.map((e: { atMs: number }) => e.atMs);
    const times = [...new Set([0, config.duration, ...Array.from({ length: Math.ceil(config.duration / 40) }, (_, i) => i * 40),
      ...eventTimes.flatMap(t => [t - 1, t, t + 1])])].filter(t => t >= 0 && t <= config.duration).sort((a, b) => a - b);
    const phases = [...new Set([0, ...eventTimes, config.duration])].sort((a, b) => a - b);
    const visualTimes = [...new Set([0, config.duration, ...eventTimes,
      ...[0.25, 0.5, 0.75].map(p => config.duration * p),
      ...phases.slice(1).map((t, i) => (phases[i] + t) / 2)])].sort((a, b) => a - b);
    presets[id] = json({ preset, config, visualTimes, samples: times.map(ms => {
      const linearProgress = ms / config.duration;
      const easedProgress = Math.min(1, Math.max(0, config.easing?.(linearProgress) ?? linearProgress));
      return { ms, easedProgress, state: config.getState(easedProgress, { linearProgress, handleProfileId: preset.handleProfileId }) };
    }) });
  }
  return { formatVersion: 1, intervalMs: 40, catalogIds, retiredIds, viewports, presets };
}

export function differences(expected: unknown, actual: unknown, prefix = "$", result: string[] = []): string[] {
  if (typeof expected === "number" && typeof actual === "number") {
    if (!Number.isFinite(actual) || Math.abs(expected - actual) > 1e-10) result.push(`${prefix}: expected ${expected}, received ${actual}`);
  } else if (expected && actual && typeof expected === "object" && typeof actual === "object") {
    if (Array.isArray(expected) !== Array.isArray(actual)) result.push(`${prefix}: array/object changed`);
    const a = expected as Record<string, unknown>, b = actual as Record<string, unknown>;
    for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])]) {
      if (!(key in a) || !(key in b)) result.push(`${prefix}.${key}: missing or added field`);
      else {
        const value = a[key];
        const label = value && typeof value === "object" && "ms" in value ? `${key}@${(value as { ms: number }).ms}ms` : key;
        differences(value, b[key], `${prefix}.${label}`, result);
      }
    }
  } else if (expected !== actual) result.push(`${prefix}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  return result;
}

export function verifyBaseline(directory = baselineDirectory) {
  const manifest = JSON.parse(readFileSync(new URL("manifest.json", directory), "utf8"));
  if (manifest.formatVersion !== 1 || !/^[a-f0-9]{40}$/.test(manifest.sourceCommit)) throw new Error("Invalid animation baseline provenance");
  for (const [file, hash] of Object.entries(manifest.files)) {
    if (sha256(readFileSync(new URL(file, directory))) !== hash) throw new Error(`Animation baseline was modified: ${file}. Use the explicit old-commit capture command for intentional changes.`);
  }
  return manifest;
}
