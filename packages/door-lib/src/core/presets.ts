import type {
  DoorEntrancePreset,
  DoorEntrancePresetId,
  DoorEntrancePresetSelection,
} from "./types.ts";
import { doorHandleSingle } from "../assets/models/index.ts";
import {
  biohazard1996A01IronDoorBack,
  biohazard1996A01IronDoorFront,
  doorWood,
} from "../assets/textures/index.ts";

const DEFAULT_PRESET_ID: DoorEntrancePresetId = "single-lever-wood";

export const doorEntrancePresetMap: Record<
  DoorEntrancePresetId,
  DoorEntrancePreset
> = {
  "single-lever-wood": {
    id: "single-lever-wood",
    label: "Single Lever Wood",
    type: "single",
    motion: "hinge-single",
    material: "wood-panel-aged",
    frontTextureUrl: doorWood,
    animation: "direct-entry",
    handleProfileId: "lever-l",
    handleModelUrl: doorHandleSingle,
  },
  "single-overhead-lever-wood": {
    id: "single-overhead-lever-wood",
    label: "Single Overhead Lever Wood",
    type: "single",
    motion: "hinge-single-overhead",
    material: "wood-panel-aged",
    frontTextureUrl: doorWood,
    animation: "single-top-down-entry",
    handleProfileId: "lever-l",
    handleModelUrl: doorHandleSingle,
  },
  "double-lever-wood": {
    id: "double-lever-wood",
    label: "Double Lever Wood",
    type: "double",
    motion: "hinge-double",
    material: "wood-panel-aged",
    frontTextureUrl: doorWood,
    animation: "double-swing",
    handleProfileId: "lever-l",
    handleModelUrl: doorHandleSingle,
  },
  "biohazard-1996-a01-iron-door": {
    id: "biohazard-1996-a01-iron-door",
    label: "1-1 A-1 Iron Door",
    type: "single",
    motion: "hinge-single",
    material: "rusted-iron-riveted-panel",
    frontTextureUrl: biohazard1996A01IronDoorFront,
    edgeTextureUrl: biohazard1996A01IronDoorFront,
    backTextureUrl: biohazard1996A01IronDoorBack,
    animation: "direct-entry",
  },
};

export const doorEntrancePresets: DoorEntrancePreset[] = Object.values(
  doorEntrancePresetMap
);

export const resolveDoorEntrancePresetId = (
  preset?: DoorEntrancePresetId
): DoorEntrancePresetId => {
  if (!preset) return DEFAULT_PRESET_ID;

  if (doorEntrancePresetMap[preset]) return preset;

  throw new Error(`Unknown door entrance preset: ${preset}`);
};

export const getDoorEntrancePreset = (preset?: DoorEntrancePresetId) =>
  doorEntrancePresetMap[resolveDoorEntrancePresetId(preset)];

const hasFilterFields = (selection: DoorEntrancePresetSelection) =>
  selection.type !== undefined ||
  selection.motion !== undefined ||
  selection.handle !== undefined ||
  selection.material !== undefined;

export const resolveDoorEntrancePresetSelection = (
  selection: DoorEntrancePresetSelection = {},
  random = Math.random
): DoorEntrancePreset => {
  if (selection.preset) {
    if (hasFilterFields(selection)) {
      throw new Error(
        "preset already defines type, motion, handle, and material. Remove filter fields or use random selection."
      );
    }

    return getDoorEntrancePreset(selection.preset);
  }

  if (!selection.random) {
    return getDoorEntrancePreset();
  }

  const candidates = doorEntrancePresets.filter((preset) => {
    if (selection.type && preset.type !== selection.type) return false;
    if (selection.motion && preset.motion !== selection.motion) return false;
    if (selection.handle && preset.handleProfileId !== selection.handle) {
      return false;
    }
    if (selection.material && preset.material !== selection.material) {
      return false;
    }

    return true;
  });

  if (candidates.length === 0) {
    throw new Error("No door entrance presets match the requested filters.");
  }

  const index = Math.min(
    Math.floor(Math.max(random(), 0) * candidates.length),
    candidates.length - 1
  );

  return candidates[index];
};
