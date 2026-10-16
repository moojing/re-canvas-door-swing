import type { DoorEntrancePresetId } from "./types.ts";

export const usesCompactWindowLayout = (preset: DoorEntrancePresetId) =>
  preset === "biohazard-1999-a02-iron-window-door" ||
  preset === "biohazard-1999-a02-iron-window-door-leave";

/** Compress the upper 65% of the authored face into the top 45% of the leaf.
 * The window remains top-aligned; the rail clears the mid-height handle. */
export const compactWindowTextureV = (v: number): number => {
  const fromTop = 1 - v;
  const sourceFromTop = fromTop <= 0.45
    ? fromTop * 0.65 / 0.45
    : 0.65 + (fromTop - 0.45) * 0.35 / 0.55;
  return 1 - sourceFromTop;
};

/** Front-view signed grip rotation; the back face reverses the same shaft. */
export const getHandleTurnMultiplier = (
  direction: "clockwise" | "counterclockwise",
  face: "front" | "back"
): 1 | -1 => (direction === "clockwise") === (face === "front") ? -1 : 1;

/** Presentation belongs to a released preset, not to public mix-and-match options. */
export const usesAgedWoodLook = (preset: DoorEntrancePresetId) =>
  preset === "biohazard-1996-a02-yellow-panel-knob-door" ||
  preset === "biohazard-1996-a02-yellow-panel-knob-door-leave";

export const usesSteelKnobLook = (preset: DoorEntrancePresetId) =>
  preset === "biohazard-1999-a02-iron-window-door" ||
  preset === "biohazard-1999-a02-iron-window-door-leave" ||
  preset === "biohazard-1998-a03-grid-knob-door" ||
  preset === "biohazard-1998-a03-grid-knob-door-leave";

export const usesRectangularKnobPlate = (preset: DoorEntrancePresetId) =>
  preset === "biohazard-1996-a02-red-cross-running-door" ||
  preset === "biohazard-1996-b02-blue-panel-double-door" ||
  preset === "biohazard-1998-a03-grid-knob-door" ||
  preset === "biohazard-1998-a03-grid-knob-door-leave";

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
