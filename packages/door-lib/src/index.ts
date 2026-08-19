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
export { resolveDoorSurfaceTextureUrls } from "./core/surfaceTextures.ts";
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
  DoorSurfaceTextureUrls,
  ResolvedDoorSurfaceTextureUrls,
  DoorMaterialId,
  HandleProfileId,
  Vector3Tuple,
} from "./core/types.ts";
