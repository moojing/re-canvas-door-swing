export const B05_DURATION_MS = 6500;
export const B05_CAMERA_START_Z = 8;
export const B05_MAX_SWING_RADIANS = (85 * Math.PI) / 180;

type Vector3 = readonly [number, number, number];

export interface B05MotionState {
  progress: number;
  leftAngle: number;
  rightAngle: number;
  cameraPosition: Vector3;
  cameraTarget: Vector3;
  fadeOut: number;
}

const OPEN_START = 0.16;
const OPEN_END = 0.66;
const CAMERA_END = 0.92;
const CAMERA_END_Z = -2.5;

const clamp = (value: number, minimum = 0, maximum = 1) =>
  Math.min(Math.max(value, minimum), maximum);

const smoothstep = (value: number) => value * value * (3 - 2 * value);

const segmentProgress = (progress: number, start: number, end: number) =>
  smoothstep(clamp((progress - start) / (end - start)));

export const getB05MotionState = (rawProgress: number): B05MotionState => {
  const progress = clamp(rawProgress);
  const opening = segmentProgress(progress, OPEN_START, OPEN_END);
  const cameraTravel = segmentProgress(progress, OPEN_END, CAMERA_END);
  const fadeOut = segmentProgress(progress, CAMERA_END, 1);
  const leftAngle = B05_MAX_SWING_RADIANS * opening;
  const cameraZ =
    B05_CAMERA_START_Z + (CAMERA_END_Z - B05_CAMERA_START_Z) * cameraTravel;

  return {
    progress,
    leftAngle,
    rightAngle: leftAngle === 0 ? 0 : -leftAngle,
    cameraPosition: [0, 1.7, cameraZ],
    cameraTarget: [0, 1.5, -3],
    fadeOut,
  };
};
