export { mountDoorEntrance } from "./vanilla";
export type {
  DoorEntranceHandle,
  MountDoorEntranceOptions,
  MountedDoorEntrance,
} from "./vanilla";
export {
  doorAnimationConfigs,
  doorAnimationMap,
  easeInOutCubic,
  getDoorAnimationConfig,
} from "./core/animationState.ts";
export {
  doorEntrancePresets,
  doorEntrancePresetMap,
  getDoorEntrancePreset,
} from "./core/presets.ts";
export {
  doorEntranceVariantMap,
  doorEntranceVariants,
  getDoorEntranceVariant,
  resolveDoorEntranceVariantSelection,
} from "./core/variants.ts";
export type {
  DoorAnimationConfig,
  DoorAnimationState,
  DoorAnimationVariant,
  DoorEntranceMotion,
  DoorEntrancePreset,
  DoorEntrancePresetId,
  DoorEntranceType,
  DoorEntranceVariant,
  DoorEntranceVariantId,
  DoorEntranceVariantSelection,
  DoorEntranceSoundState,
  DoorMaterialId,
  HandleProfileId,
  Vector3Tuple,
} from "./core/types.ts";
