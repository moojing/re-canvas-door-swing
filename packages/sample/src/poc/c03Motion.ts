import { smoothstep, type Vector3 } from "./pocMotionUtils.ts";

export const C03_DURATION_MS = 6500;

type MotionKeyframe = {
  progress: number;
  cameraPosition: Vector3;
  cameraTarget: Vector3;
};

export type C03MotionState = {
  cameraPosition: Vector3;
  cameraTarget: Vector3;
};

const KEYFRAMES: readonly MotionKeyframe[] = [
  {
    progress: 0,
    cameraPosition: [-5.8, 6.8, 10.5],
    cameraTarget: [0, 0, 0],
  },
  {
    progress: 0.22,
    cameraPosition: [-3.4, 5.1, 7.2],
    cameraTarget: [0, 0, 0],
  },
  {
    progress: 0.5,
    cameraPosition: [-1.5, 4.4, 4.3],
    cameraTarget: [0.1, 0, 0],
  },
  {
    progress: 0.78,
    cameraPosition: [2.8, 5.4, 7.8],
    cameraTarget: [0, 0, 0],
  },
  {
    progress: 1,
    cameraPosition: [5.8, 6.8, 10.5],
    cameraTarget: [0, 0, 0],
  },
];

const lerpVector = (from: Vector3, to: Vector3, amount: number): Vector3 => [
  from[0] + (to[0] - from[0]) * amount,
  from[1] + (to[1] - from[1]) * amount,
  from[2] + (to[2] - from[2]) * amount,
];

export const getC03MotionState = (rawProgress: number): C03MotionState => {
  const progress = Math.min(Math.max(rawProgress, 0), 1);
  const nextIndex = Math.min(
    KEYFRAMES.findIndex((keyframe) => keyframe.progress >= progress),
    KEYFRAMES.length - 1
  );

  if (nextIndex <= 0) {
    return {
      cameraPosition: KEYFRAMES[0].cameraPosition,
      cameraTarget: KEYFRAMES[0].cameraTarget,
    };
  }

  const previous = KEYFRAMES[nextIndex - 1];
  const next = KEYFRAMES[nextIndex];
  const segmentProgress =
    (progress - previous.progress) / (next.progress - previous.progress);
  const easedProgress = smoothstep(segmentProgress);

  return {
    cameraPosition: lerpVector(
      previous.cameraPosition,
      next.cameraPosition,
      easedProgress
    ),
    cameraTarget: lerpVector(
      previous.cameraTarget,
      next.cameraTarget,
      easedProgress
    ),
  };
};
