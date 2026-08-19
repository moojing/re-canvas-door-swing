import type { JSX } from "react";
import { Vector3Tuple } from "three";

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

export interface DoorSurfaceTextureUrls {
  frontTextureUrl?: string;
  edgeTextureUrl?: string;
  backTextureUrl?: string;
  /** @deprecated Use frontTextureUrl, edgeTextureUrl, and backTextureUrl. */
  textureUrl?: string;
}

export interface DoorEntranceVariant extends DoorSurfaceTextureUrls {
  id: DoorEntranceVariantId;
  label: string;
  type: DoorEntranceType;
  motion: DoorEntranceMotion;
  material: DoorMaterialId;
  animation: DoorAnimationVariant;
  /** @deprecated Use animation. Kept for preset compatibility only. */
  variant: DoorAnimationVariant;
  handleModelUrl?: string;
  handleProfileId?: HandleProfileId;
  soundUrl?: string;
  className?: string;
}

/** @deprecated Use DoorEntranceVariantId. */
export type DoorEntrancePresetId = DoorEntranceVariantId | LegacyDoorEntrancePresetId;

/** @deprecated Use DoorEntranceVariant. */
export type DoorEntrancePreset = DoorEntranceVariant;

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
  frontTextureUrl: string;
  edgeTextureUrl: string;
  backTextureUrl: string;
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
  play: (variant?: DoorEntrancePresetId) => void;
  stop: () => void;
  reset: (variant?: DoorEntrancePresetId) => void;
  seek: (progress: number, variant?: DoorEntrancePresetId) => void;
  seekSound: (progress: number) => void;
}

export interface DoorEntranceReadyEvent {
  ready: boolean;
}
