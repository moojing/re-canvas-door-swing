import type { JSX } from "react";
import { Vector3Tuple } from "three";

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

export type DoorAnimationRenderer = (props: {
  state: DoorAnimationState;
  textureUrl: string;
  handleModelUrl?: string;
  handleProfileId?: HandleProfileId;
}) => JSX.Element;

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

export interface DoorEntranceHandle {
  play: (preset?: DoorEntrancePresetId) => void;
  stop: () => void;
  reset: (preset?: DoorEntrancePresetId) => void;
  seek: (progress: number, preset?: DoorEntrancePresetId) => void;
  seekSound: (progress: number) => void;
}

export interface DoorEntranceReadyEvent {
  ready: boolean;
}
