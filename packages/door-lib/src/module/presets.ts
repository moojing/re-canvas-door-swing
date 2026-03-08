import { DoorEntrancePreset, DoorEntrancePresetId } from "./types";
import {
  DEFAULT_HANDLE_PROFILE_ID,
  getHandleProfile,
} from "./handles/profiles";

const DEFAULT_DOOR_TEXTURE = "textures/door-1.png";
const DEFAULT_HANDLE_MODEL = getHandleProfile(
  DEFAULT_HANDLE_PROFILE_ID
).defaultModelUrl;
const DEFAULT_SINGLE_DOOR_SOUND =
  "sounds/freesound_community-main-door-opening-closing-38280.mp3";

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
    handleProfileId: DEFAULT_HANDLE_PROFILE_ID,
    soundUrl: DEFAULT_SINGLE_DOOR_SOUND,
  },
  "door-single-overhead": {
    id: "door-single-overhead",
    label: "Door Single Overhead",
    variant: "single-top-down-entry",
    textureUrl: DEFAULT_DOOR_TEXTURE,
    handleModelUrl: DEFAULT_HANDLE_MODEL,
    handleProfileId: DEFAULT_HANDLE_PROFILE_ID,
    soundUrl: DEFAULT_SINGLE_DOOR_SOUND,
  },
  "door-double": {
    id: "door-double",
    label: "Door Double",
    variant: "double-swing",
    textureUrl: DEFAULT_DOOR_TEXTURE,
    handleModelUrl: DEFAULT_HANDLE_MODEL,
    handleProfileId: DEFAULT_HANDLE_PROFILE_ID,
    soundUrl: DEFAULT_SINGLE_DOOR_SOUND,
  },
};

export const doorEntrancePresets: DoorEntrancePreset[] = Object.values(
  doorEntrancePresetMap
);

export const getDoorEntrancePreset = (
  preset: DoorEntrancePresetId = "door-single"
) => doorEntrancePresetMap[preset] ?? doorEntrancePresets[0];
