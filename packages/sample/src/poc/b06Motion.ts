import {
  clampProgress,
  segmentProgress,
  type Vector3,
} from "./pocMotionUtils.ts";

export const B06_DURATION_MS = 6500;
export const B06_CAMERA_START_Z = 8;
export const B06_MAX_SWING_RADIANS = (85 * Math.PI) / 180;
export const B06_WHEEL_MAX_RADIANS = -1.25 * Math.PI;

export type B06MotionState = Readonly<{
  progress: number;
  wheelAngle: number;
  leftAngle: number;
  rightAngle: number;
  cameraPosition: Vector3;
  cameraTarget: Vector3;
  fadeOut: number;
}>;

const WHEEL_START = 0.03;
const WHEEL_END = 0.18;
const OPEN_START = 0.2;
const OPEN_END = 0.65;
const CAMERA_END = 0.92;
const CAMERA_END_Z = -2.5;

export const getB06MotionState = (rawProgress: number): B06MotionState => {
  const progress = clampProgress(rawProgress);
  const wheel = segmentProgress(progress, WHEEL_START, WHEEL_END);
  const opening = segmentProgress(progress, OPEN_START, OPEN_END);
  const cameraTravel = segmentProgress(progress, OPEN_END, CAMERA_END);
  const fadeOut = segmentProgress(progress, CAMERA_END, 1);
  const leftAngle = B06_MAX_SWING_RADIANS * opening;
  const cameraZ =
    B06_CAMERA_START_Z +
    (CAMERA_END_Z - B06_CAMERA_START_Z) * cameraTravel;

  return {
    progress,
    wheelAngle: wheel === 0 ? 0 : B06_WHEEL_MAX_RADIANS * wheel,
    leftAngle,
    rightAngle: leftAngle === 0 ? 0 : -leftAngle,
    cameraPosition: [0, 0, cameraZ],
    cameraTarget: [0, 0, -3],
    fadeOut,
  };
};
