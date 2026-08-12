import {
  DoorEntrancePreset,
  DoorEntrancePresetId,
  DoorEntranceVariantId,
} from "./types";
import {
  DEFAULT_HANDLE_PROFILE_ID,
  getHandleProfile,
} from "./handles/profiles";
import { doorEntrancePresets as coreDoorEntrancePresets } from "../core/presets.ts";
import { resolveDoorEntranceVariantId } from "../core/variants.ts";
import { doorWood } from "../assets/textures";
import { doorOpenClose } from "../assets/sounds";

const DEFAULT_DOOR_TEXTURE = doorWood;
const DEFAULT_HANDLE_MODEL = getHandleProfile(
  DEFAULT_HANDLE_PROFILE_ID
).defaultModelUrl;
const DEFAULT_SINGLE_DOOR_SOUND = doorOpenClose;

export const doorEntrancePresetMap: Record<
  DoorEntranceVariantId,
  DoorEntrancePreset
> = Object.fromEntries(
  coreDoorEntrancePresets.map((preset) => [
    preset.id,
    {
      ...preset,
      textureUrl: preset.textureUrl ?? DEFAULT_DOOR_TEXTURE,
      handleModelUrl: preset.handleModelUrl ?? DEFAULT_HANDLE_MODEL,
      handleProfileId: preset.handleProfileId ?? DEFAULT_HANDLE_PROFILE_ID,
      soundUrl: preset.soundUrl ?? DEFAULT_SINGLE_DOOR_SOUND,
    },
  ])
) as Record<DoorEntranceVariantId, DoorEntrancePreset>;

export const doorEntrancePresets: DoorEntrancePreset[] = Object.values(
  doorEntrancePresetMap
);

export const getDoorEntrancePreset = (
  preset: DoorEntrancePresetId = "single-lever-wood"
) =>
  doorEntrancePresetMap[
    resolveDoorEntranceVariantId(preset) as DoorEntranceVariantId
  ] ?? doorEntrancePresets[0];
