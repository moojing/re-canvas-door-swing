import type { JSX } from "react";
import { Vector3Tuple } from "three";

export type DoorAnimationVariant =
  | "direct-entry"
  | "top-down-entry"
  | "double-swing"
  | "single-handle-turn";

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
}) => JSX.Element;

export interface DoorAnimationConfig {
  id: DoorAnimationVariant;
  label: string;
  description?: string;
  duration: number;
  progressMarkers: number[];
  easing?: (progress: number) => number;
  getState: (progress: number) => DoorAnimationState;
}

export interface DoorEntranceHandle {
  play: () => void;
  reset: () => void;
}
