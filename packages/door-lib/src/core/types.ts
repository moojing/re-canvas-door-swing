export type Vector3Tuple = [number, number, number];

export type DoorAnimationVariant =
  | "direct-entry"
  | "single-top-down-entry"
  | "double-swing";

export type HandleProfileId = "lever-l" | "knob-round";

export type DoorEntrancePresetId =
  | "door-single"
  | "door-single-overhead"
  | "door-double";

export interface DoorEntrancePreset {
  id: DoorEntrancePresetId;
  label: string;
  variant: DoorAnimationVariant;
  textureUrl?: string;
  handleModelUrl?: string;
  handleProfileId?: HandleProfileId;
  soundUrl?: string;
  className?: string;
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
