import { Vector3Tuple } from "three";

export type DoorAnimationVariant = "direct-entry" | "top-down-entry";

export interface DoorAnimationState {
  doorAngle: number;
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
  easing?: (progress: number) => number;
  getState: (progress: number) => DoorAnimationState;
}

export interface DoorEntranceHandle {
  play: () => void;
  reset: () => void;
}
