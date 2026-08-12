import type {
  DoorEntranceVariant,
  DoorEntranceVariantId,
  DoorEntranceVariantSelection,
  LegacyDoorEntrancePresetId,
} from "./types.ts";

const DEFAULT_VARIANT_ID: DoorEntranceVariantId = "single-lever-wood";

export const doorEntranceVariantMap: Record<
  DoorEntranceVariantId,
  DoorEntranceVariant
> = {
  "single-lever-wood": {
    id: "single-lever-wood",
    label: "Single Lever Wood",
    type: "single",
    motion: "hinge-single",
    material: "wood-panel-aged",
    animation: "direct-entry",
    variant: "direct-entry",
    handleProfileId: "lever-l",
  },
  "single-overhead-lever-wood": {
    id: "single-overhead-lever-wood",
    label: "Single Overhead Lever Wood",
    type: "single",
    motion: "hinge-single-overhead",
    material: "wood-panel-aged",
    animation: "single-top-down-entry",
    variant: "single-top-down-entry",
    handleProfileId: "lever-l",
  },
  "double-lever-wood": {
    id: "double-lever-wood",
    label: "Double Lever Wood",
    type: "double",
    motion: "hinge-double",
    material: "wood-panel-aged",
    animation: "double-swing",
    variant: "double-swing",
    handleProfileId: "lever-l",
  },
};

const legacyPresetAliasMap: Record<LegacyDoorEntrancePresetId, DoorEntranceVariantId> = {
  "door-single": "single-lever-wood",
  "door-single-overhead": "single-overhead-lever-wood",
  "door-double": "double-lever-wood",
};

export const doorEntranceVariants: DoorEntranceVariant[] = Object.values(
  doorEntranceVariantMap
);

export const resolveDoorEntranceVariantId = (
  variant?: DoorEntranceVariantId | LegacyDoorEntrancePresetId
): DoorEntranceVariantId => {
  if (!variant) return DEFAULT_VARIANT_ID;

  return (
    doorEntranceVariantMap[variant as DoorEntranceVariantId]?.id ??
    legacyPresetAliasMap[variant as LegacyDoorEntrancePresetId] ??
    DEFAULT_VARIANT_ID
  );
};

export const getDoorEntranceVariant = (
  variant?: DoorEntranceVariantId | LegacyDoorEntrancePresetId
) => doorEntranceVariantMap[resolveDoorEntranceVariantId(variant)];

const hasFilterFields = (selection: DoorEntranceVariantSelection) =>
  selection.type !== undefined ||
  selection.motion !== undefined ||
  selection.handle !== undefined ||
  selection.material !== undefined;

export const resolveDoorEntranceVariantSelection = (
  selection: DoorEntranceVariantSelection = {},
  random = Math.random
): DoorEntranceVariant => {
  if (selection.variant) {
    if (hasFilterFields(selection)) {
      throw new Error(
        "variant already defines type, motion, handle, and material. Remove filter fields or use random selection."
      );
    }

    return getDoorEntranceVariant(selection.variant);
  }

  if (!selection.random) {
    return getDoorEntranceVariant();
  }

  const candidates = doorEntranceVariants.filter((variant) => {
    if (selection.type && variant.type !== selection.type) return false;
    if (selection.motion && variant.motion !== selection.motion) return false;
    if (selection.handle && variant.handleProfileId !== selection.handle) {
      return false;
    }
    if (selection.material && variant.material !== selection.material) {
      return false;
    }

    return true;
  });

  if (candidates.length === 0) {
    throw new Error("No door entrance variants match the requested filters.");
  }

  const index = Math.min(
    Math.floor(Math.max(random(), 0) * candidates.length),
    candidates.length - 1
  );

  return candidates[index];
};
