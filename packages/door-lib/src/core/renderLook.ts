import type { DoorEntrancePresetId } from "./types.ts";

/** Presentation belongs to a released preset, not to public mix-and-match options. */
export const usesRetroLook = (preset: DoorEntrancePresetId) =>
  preset === "biohazard-1996-a02-yellow-panel-knob-door";

export const getDrawingBufferSize = (
  width: number,
  height: number,
  pixelRatio: number,
  retro: boolean
): [number, number] => {
  const w = Math.max(width, 1);
  const h = Math.max(height, 1);
  const scale = retro ? Math.min(1, 360 / h) : Math.min(Math.max(pixelRatio, 1), 2);
  return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
};
