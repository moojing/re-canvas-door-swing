export type Vector3Tuple = [number, number, number];

export type DoorAnimationId =
  | "direct-entry"
  | "single-top-down-entry"
  | "double-swing"
  | "center-split-slide";

export type HandleProfileId = "lever-l" | "knob-round";

export type DoorEntranceType = "single" | "double";

export type DoorEntranceMotion =
  | "hinge-single"
  | "hinge-single-overhead"
  | "hinge-double"
  | "slide-double";

export type DoorHingeSide = "left" | "right";

export type DoorSwingDirection = "toward-viewer" | "away-from-viewer";

export type DoorAnimationStyleId =
  | "biohazard-1996"
  | "biohazard-1998"
  | "biohazard-1999";

export type DoorAnimationSetId =
  | "1996-single-open-running-pass"
  | "1999-single-knob-approach-wait-pass"
  | "1999-single-knob-approach-outward-pass"
  | "1996-double-slide-approach-hold-pass"
  | "1998-single-fixed-wait-micro-open-pass"
  | "1996-single-micro-open-advance"
  | "1996-single-micro-open-close-pass-advance"
  | "1996-single-wide-swing-advance"
  | "1996-double-micro-open-hold-advance"
  | "1998-single-micro-open-hold-advance"
  | "1999-single-closed-wait-advance";

export type DoorMaterialId =
  | "wood-panel-aged"
  | "aged-wood-panel"
  | "aged-painted-steel"
  | "rusted-iron-riveted-panel";

export type DoorEntrancePresetId =
  | "biohazard-1996-a02-red-cross-running-door"
  | "biohazard-1999-a02-iron-window-door"
  | "biohazard-1999-a02-iron-window-door-leave"
  | "biohazard-1996-b07-automatic-sliding-door"
  | "biohazard-1996-b07-automatic-sliding-door-leave"
  | "biohazard-1998-a03-grid-knob-door"
  | "biohazard-1998-a03-grid-knob-door-leave"
  | "biohazard-1996-a01-iron-door"
  | "biohazard-1996-a01-iron-door-leave"
  | "biohazard-1998-a01-no-handle-door"
  | "biohazard-1999-a01-parking-door"
  | "biohazard-1996-a02-yellow-panel-knob-door"
  | "biohazard-1996-a02-yellow-panel-knob-door-leave"
  | "biohazard-1996-b02-blue-panel-double-door";

export interface DoorSurfaceTextureUrls {
  /** Texture upload orientation; false preserves the legacy asset convention. */
  textureFlipY?: boolean;
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
  /** Traversal variants remain complete presets with their own IDs and selected animation sets. */
  variantOf?: DoorEntrancePresetId;
  traversal?: "enter" | "leave";
  type: DoorEntranceType;
  motion: DoorEntranceMotion;
  material: DoorMaterialId;
  animation: DoorAnimationId;
  animationStyle?: DoorAnimationStyleId;
  animationSet?: DoorAnimationSetId;
  hingeSide?: DoorHingeSide;
  swingDirection?: DoorSwingDirection;
  mirrorTextureX?: boolean;
  handleModelUrl?: string;
  handleProfileId?: HandleProfileId;
  /** Grip turn as seen from the front face; independent of leaf swing. */
  handleTurnDirection?: "clockwise" | "counterclockwise";
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
  /** Per-leaf displacement in scene units; sliding tracks do not rotate leaves. */
  leftDoorOffset?: Vector3Tuple;
  rightDoorOffset?: Vector3Tuple;
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
  soundFadeOutStartProgress?: number;
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
