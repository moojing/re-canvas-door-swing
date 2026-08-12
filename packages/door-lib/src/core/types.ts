export type Vector3Tuple = [number, number, number];

export type DoorAnimationVariant =
  | "direct-entry"
  | "single-top-down-entry"
  | "double-swing";

export type HandleProfileId = "lever-l" | "knob-round";

export type DoorEntranceType = "single" | "double";

export type DoorEntranceMotion =
  | "hinge-single"
  | "hinge-single-overhead"
  | "hinge-double";

export type DoorMaterialId = "wood-panel-aged";

export type DoorEntranceVariantId =
  | "single-lever-wood"
  | "single-overhead-lever-wood"
  | "double-lever-wood";

export type LegacyDoorEntrancePresetId =
  | "door-single"
  | "door-single-overhead"
  | "door-double";

export interface DoorEntranceVariant {
  id: DoorEntranceVariantId;
  label: string;
  type: DoorEntranceType;
  motion: DoorEntranceMotion;
  material: DoorMaterialId;
  animation: DoorAnimationVariant;
  /** @deprecated Use animation. Kept for preset compatibility only. */
  variant: DoorAnimationVariant;
  textureUrl?: string;
  handleModelUrl?: string;
  handleProfileId?: HandleProfileId;
  soundUrl?: string;
  className?: string;
}

/** @deprecated Use DoorEntranceVariantId. */
export type DoorEntrancePresetId = DoorEntranceVariantId | LegacyDoorEntrancePresetId;

/** @deprecated Use DoorEntranceVariant. */
export type DoorEntrancePreset = DoorEntranceVariant;

export interface DoorEntranceVariantSelection {
  variant?: DoorEntranceVariantId;
  /** @deprecated Use variant. */
  preset?: DoorEntrancePresetId;
  random?: boolean;
  type?: DoorEntranceType;
  motion?: DoorEntranceMotion;
  handle?: HandleProfileId;
  material?: DoorMaterialId;
}

export interface DoorAnimationState {
  doorAngle: number;
  rightDoorAngle?: number;
  handleAngle?: number;
  cameraPosition: Vector3Tuple;
  cameraTarget: Vector3Tuple;
  fadeOut: number;
}

export interface DoorAnimationConfig {
  id: DoorAnimationVariant;
  label: string;
  description?: string;
  duration: number;
  progressMarkers: number[];
  soundStartProgress?: number;
  soundEndProgress?: number;
  soundSourceStartProgress?: number;
  soundSourceEndProgress?: number;
  easing?: (progress: number) => number;
  getState: (
    progress: number,
    context?: { linearProgress: number; handleProfileId?: HandleProfileId }
  ) => DoorAnimationState;
}

export interface DoorEntranceSoundState {
  enabled: boolean;
  ready: boolean;
  currentTimeMs: number;
  durationMs: number;
  progress: number;
}
