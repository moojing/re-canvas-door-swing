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
import {
  legacyDoorEntrancePresetAliasMap,
  resolveDoorEntrancePresetId,
} from "../core/variants.ts";
import { resolveDoorSurfaceTextureUrls } from "../core/surfaceTextures.ts";
import { doorWood } from "../assets/textures";
import { doorOpenClose } from "../assets/sounds";

const DEFAULT_DOOR_TEXTURE = doorWood;
const DEFAULT_HANDLE_MODEL = getHandleProfile(
  DEFAULT_HANDLE_PROFILE_ID
).defaultModelUrl;
const DEFAULT_SINGLE_DOOR_SOUND = doorOpenClose;

const doorEntranceVariantPresetMap: Record<
  DoorEntranceVariantId,
  DoorEntrancePreset
> = Object.fromEntries(
  coreDoorEntrancePresets.map((preset) => [
    preset.id,
    {
      ...preset,
      ...resolveDoorSurfaceTextureUrls(preset, DEFAULT_DOOR_TEXTURE),
      textureUrl:
        preset.frontTextureUrl ?? preset.textureUrl ?? DEFAULT_DOOR_TEXTURE,
      handleModelUrl: preset.handleModelUrl ?? DEFAULT_HANDLE_MODEL,
      handleProfileId: preset.handleProfileId ?? DEFAULT_HANDLE_PROFILE_ID,
      soundUrl: preset.soundUrl ?? DEFAULT_SINGLE_DOOR_SOUND,
    },
  ])
) as Record<DoorEntranceVariantId, DoorEntrancePreset>;

export const doorEntrancePresetMap: Record<
  DoorEntrancePresetId,
  DoorEntrancePreset
> = {
  ...doorEntranceVariantPresetMap,
  "door-single":
    doorEntranceVariantPresetMap[legacyDoorEntrancePresetAliasMap["door-single"]],
  "door-single-overhead":
    doorEntranceVariantPresetMap[
      legacyDoorEntrancePresetAliasMap["door-single-overhead"]
    ],
  "door-double":
    doorEntranceVariantPresetMap[legacyDoorEntrancePresetAliasMap["door-double"]],
};

export const doorEntrancePresets: DoorEntrancePreset[] = Object.values(
  doorEntranceVariantPresetMap
);

export const getDoorEntrancePreset = (
  preset: DoorEntrancePresetId = "single-lever-wood"
) =>
  doorEntrancePresetMap[
    resolveDoorEntrancePresetId(preset) as DoorEntranceVariantId
  ] ?? doorEntrancePresets[0];
