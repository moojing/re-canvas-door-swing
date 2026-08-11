import type { DoorEntrancePreset, DoorEntrancePresetId } from "./types.ts";

export const doorEntrancePresetMap: Record<
  DoorEntrancePresetId,
  DoorEntrancePreset
> = {
  "door-single": {
    id: "door-single",
    label: "Door Single",
    variant: "direct-entry",
  },
  "door-single-overhead": {
    id: "door-single-overhead",
    label: "Door Single Overhead",
    variant: "single-top-down-entry",
  },
  "door-double": {
    id: "door-double",
    label: "Door Double",
    variant: "double-swing",
  },
};

export const doorEntrancePresets: DoorEntrancePreset[] = Object.values(
  doorEntrancePresetMap
);

export const getDoorEntrancePreset = (
  preset: DoorEntrancePresetId = "door-single"
) => doorEntrancePresetMap[preset] ?? doorEntrancePresets[0];
