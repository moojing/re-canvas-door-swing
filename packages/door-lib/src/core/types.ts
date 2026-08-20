export type Vector3Tuple = [number, number, number];

export type DoorAnimationId =
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

export type DoorEntrancePresetId =
  | "single-lever-wood"
  | "single-overhead-lever-wood"
  | "double-lever-wood";

export interface DoorSurfaceTextureUrls {
  frontTextureUrl?: string;
  edgeTextureUrl?: string;
  backTextureUrl?: string;
  /** @deprecated Use frontTextureUrl, edgeTextureUrl, and backTextureUrl. */
  textureUrl?: string;
}

export interface ResolvedDoorSurfaceTextureUrls {
  frontTextureUrl: string;
  edgeTextureUrl: string;
  backTextureUrl: string;
}

export interface DoorEntrancePreset extends DoorSurfaceTextureUrls {
  id: DoorEntrancePresetId;
  label: string;
  type: DoorEntranceType;
  motion: DoorEntranceMotion;
  material: DoorMaterialId;
  animation: DoorAnimationId;
  handleModelUrl?: string;
  handleProfileId?: HandleProfileId;
  soundUrl?: string;
  className?: string;
}

export interface DoorEntrancePresetSelection {
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
  id: DoorAnimationId;
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
