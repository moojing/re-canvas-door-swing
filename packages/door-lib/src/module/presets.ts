import { DoorEntrancePreset, DoorEntrancePresetId } from "./types";

const DEFAULT_DOOR_TEXTURE = "textures/door-1.png";
const DEFAULT_HANDLE_MODEL = "models/door_handle_single.glb";

export const doorEntrancePresetMap: Record<
  DoorEntrancePresetId,
  DoorEntrancePreset
> = {
  "door-single": {
    id: "door-single",
    label: "Door Single",
    variant: "direct-entry",
    textureUrl: DEFAULT_DOOR_TEXTURE,
    handleModelUrl: DEFAULT_HANDLE_MODEL,
  },
  "door-single-overhead": {
    id: "door-single-overhead",
    label: "Door Single Overhead",
    variant: "top-down-entry",
    textureUrl: DEFAULT_DOOR_TEXTURE,
    handleModelUrl: DEFAULT_HANDLE_MODEL,
  },
  "door-double": {
    id: "door-double",
    label: "Door Double",
    variant: "double-swing",
    textureUrl: DEFAULT_DOOR_TEXTURE,
    handleModelUrl: DEFAULT_HANDLE_MODEL,
  },
};

export const doorEntrancePresets: DoorEntrancePreset[] = Object.values(
  doorEntrancePresetMap
);

export const getDoorEntrancePreset = (
  preset: DoorEntrancePresetId = "door-single"
) => doorEntrancePresetMap[preset] ?? doorEntrancePresets[0];

