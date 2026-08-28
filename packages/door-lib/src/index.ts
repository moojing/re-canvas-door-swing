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
  resolveDoorEntrancePresetSelection,
} from "./core/presets.ts";
export { resolveDoorSurfaceTextureUrls } from "./core/surfaceTextures.ts";
export type {
  DoorAnimationConfig,
  DoorAnimationState,
  DoorAnimationId,
  DoorEntranceMotion,
  DoorEntrancePreset,
  DoorEntrancePresetId,
  DoorEntranceType,
  DoorEntrancePresetSelection,
  DoorEntranceSoundState,
  DoorSurfaceTextureUrls,
  DoorHingeSide,
  ResolvedDoorSurfaceTextureUrls,
  DoorMaterialId,
  HandleProfileId,
  Vector3Tuple,
} from "./core/types.ts";
