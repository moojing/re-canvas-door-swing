import {
  doorEntranceVariantMap,
  doorEntranceVariants,
  getDoorEntranceVariant,
  legacyDoorEntrancePresetAliasMap,
  resolveDoorEntrancePresetId,
} from "./variants.ts";
import type { DoorEntrancePreset, DoorEntrancePresetId } from "./types.ts";

/** @deprecated Use doorEntranceVariantMap. */
export const doorEntrancePresetMap: Record<
  DoorEntrancePresetId,
  DoorEntrancePreset
> = {
  ...doorEntranceVariantMap,
  "door-single":
    doorEntranceVariantMap[legacyDoorEntrancePresetAliasMap["door-single"]],
  "door-single-overhead":
    doorEntranceVariantMap[
      legacyDoorEntrancePresetAliasMap["door-single-overhead"]
    ],
  "door-double":
    doorEntranceVariantMap[legacyDoorEntrancePresetAliasMap["door-double"]],
};

/** @deprecated Use doorEntranceVariants. */
export const doorEntrancePresets = doorEntranceVariants;

/** @deprecated Use getDoorEntranceVariant. */
export const getDoorEntrancePreset = (preset?: DoorEntrancePresetId) =>
  getDoorEntranceVariant(resolveDoorEntrancePresetId(preset));
