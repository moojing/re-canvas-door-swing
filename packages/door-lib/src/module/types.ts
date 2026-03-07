import type { JSX } from "react";
import { Vector3Tuple } from "three";

export type DoorAnimationVariant =
  | "direct-entry"
  | "top-down-entry"
  | "double-swing";

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
}) => JSX.Element;

export interface DoorAnimationConfig {
  id: DoorAnimationVariant;
  label: string;
  description?: string;
  duration: number;
  progressMarkers: number[];
  easing?: (progress: number) => number;
  getState: (
    progress: number,
    context?: { linearProgress: number }
  ) => DoorAnimationState;
}

export interface DoorEntranceHandle {
  play: (preset?: DoorEntrancePresetId) => void;
  stop: () => void;
  reset: (preset?: DoorEntrancePresetId) => void;
  seek: (progress: number, preset?: DoorEntrancePresetId) => void;
}

export interface DoorEntranceReadyEvent {
  ready: boolean;
}
