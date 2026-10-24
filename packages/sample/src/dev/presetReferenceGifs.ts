import type { DoorEntrancePreset, DoorEntrancePresetId } from "retro-horror-door";

// Sample-only reference links. Source media and evaluation metadata must not
// enter the published runtime library. Paths verified against the gallery index.
const referencePaths: Partial<Record<DoorEntrancePresetId, string>> = {
  "biohazard-1996-a01-iron-door": "1-1/a01-001.gif",
  "biohazard-1998-a01-no-handle-door": "1-2/a01-001.gif",
  "biohazard-1999-a01-parking-door": "1-3/a01-002.gif",
  "biohazard-1998-a03-grid-knob-door": "1-2/a03-002.gif",
  "biohazard-1996-b02-blue-panel-double-door": "1-1/b02-003.gif",
  "biohazard-1996-b07-automatic-sliding-door": "1-1/b07-001.gif",
  "biohazard-1996-a02-red-cross-running-door": "1-1/a02-009.gif",
  "biohazard-1999-a02-iron-window-door": "1-3/a02-001.gif",
};

export const getPresetReferenceGifUrl = (preset: DoorEntrancePreset): string | undefined => {
  const path = referencePaths[preset.variantOf ?? preset.id];
  return path ? `https://github.com/moojing/re-door-gallery/blob/main/selection-gifs/${path}` : undefined;
};
