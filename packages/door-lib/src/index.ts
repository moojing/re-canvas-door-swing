export { DEFAULT_ASSET_BASE_URL } from "./core/assetUrls.ts";
export { mountDoorEntrance } from "./vanilla";
export type {
  DoorEntranceHandle,
  DoorPreviewOverrides,
  MountDoorEntranceOptions,
  MountedDoorEntrance,
} from "./vanilla";
export {
  doorAnimationConfigs,
  doorAnimationMap,
  easeInOutCubic,
  getDoorAnimationConfig,
} from "./core/animationState.ts";
export { getDoorEntranceAnimationConfig } from "./core/presetAnimation.ts";
export type { DoorTimingEvents } from "./core/presetAnimation.ts";
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
  DoorAnimationStyleId,
  DoorEntranceMotion,
  DoorEntrancePreset,
  DoorEntrancePresetId,
  DoorEntranceType,
  DoorEntrancePresetSelection,
  DoorEntranceSoundState,
  DoorSurfaceTextureUrls,
  DoorHingeSide,
  DoorSwingDirection,
  ResolvedDoorSurfaceTextureUrls,
  DoorMaterialId,
  HandleProfileId,
  Vector3Tuple,
} from "./core/types.ts";
