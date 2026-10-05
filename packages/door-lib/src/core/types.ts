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

export type DoorHingeSide = "left" | "right";

export type DoorSwingDirection = "toward-viewer" | "away-from-viewer";

export type DoorAnimationStyleId =
  | "biohazard-1996"
  | "biohazard-1998"
  | "biohazard-1999";

export type DoorMaterialId =
  | "wood-panel-aged"
  | "aged-wood-panel"
  | "aged-painted-steel"
  | "rusted-iron-riveted-panel";

export type DoorEntrancePresetId =
  | "biohazard-1996-a01-iron-door"
  | "biohazard-1998-a01-no-handle-door"
  | "biohazard-1999-a01-parking-door"
  | "biohazard-1996-a02-yellow-panel-knob-door"
  | "biohazard-1996-b02-blue-panel-double-door";

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
  animationStyle?: DoorAnimationStyleId;
  hingeSide?: DoorHingeSide;
  swingDirection?: DoorSwingDirection;
  mirrorTextureX?: boolean;
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
  timelineEvents?: Array<{ id: string; label: string; atMs: number }>;
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
