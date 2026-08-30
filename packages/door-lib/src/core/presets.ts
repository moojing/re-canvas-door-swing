import type {
  DoorEntrancePreset,
  DoorEntrancePresetId,
  DoorEntrancePresetSelection,
} from "./types.ts";
import {
  biohazard1996A01IronDoorBack,
  biohazard1996A01IronDoorFront,
  biohazard1996A02YellowPanelKnobDoorBack,
  biohazard1996A02YellowPanelKnobDoorFront,
} from "../assets/textures/index.ts";
import { doorKnob } from "../assets/models/index.ts";

const DEFAULT_PRESET_ID: DoorEntrancePresetId = "biohazard-1996-a01-iron-door";

export const doorEntrancePresetMap: Record<
  DoorEntrancePresetId,
  DoorEntrancePreset
> = {
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
    hingeSide: "left",
    mirrorTextureX: false,
  },
  "biohazard-1998-a01-no-handle-door": {
    id: "biohazard-1998-a01-no-handle-door",
    label: "1-2 A-1 No-Handle Door",
    type: "single",
    motion: "hinge-single",
    material: "rusted-iron-riveted-panel",
    frontTextureUrl: biohazard1996A01IronDoorFront,
    edgeTextureUrl: biohazard1996A01IronDoorFront,
    backTextureUrl: biohazard1996A01IronDoorBack,
    animation: "direct-entry",
    hingeSide: "right",
    mirrorTextureX: true,
  },
  "biohazard-1996-a02-yellow-panel-knob-door": {
    id: "biohazard-1996-a02-yellow-panel-knob-door",
    label: "1-1 A-2 Yellow Panel Knob Door",
    type: "single",
    motion: "hinge-single",
    material: "aged-wood-panel",
    frontTextureUrl: biohazard1996A02YellowPanelKnobDoorFront,
    edgeTextureUrl: biohazard1996A02YellowPanelKnobDoorFront,
    backTextureUrl: biohazard1996A02YellowPanelKnobDoorBack,
    animation: "direct-entry",
    hingeSide: "left",
    mirrorTextureX: false,
    handleProfileId: "knob-round",
    handleModelUrl: doorKnob,
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
