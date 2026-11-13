import { sampleTrack, validateTrack, warpTime, type TimelineKeyframe } from "./animationTimeline.ts";
import type { Vector3Tuple } from "./types.ts";

/** Internal authored camera data. Duration/events remain owned by the complete set. */
export interface CameraPath {
  readonly position: readonly TimelineKeyframe<Vector3Tuple>[];
  readonly target: readonly TimelineKeyframe<Vector3Tuple>[];
}

export const validateCameraPath = (path: CameraPath, durationMs: number) => {
  for (const track of [path.position, path.target]) {
    validateTrack(track, durationMs);
    for (const frame of track) {
      if (!Array.isArray(frame.value) || frame.value.length !== 3 || !frame.value.every(Number.isFinite)) {
        throw new Error("Camera path keyframes require finite three-coordinate vectors");
      }
    }
  }
};

export const sampleCameraPath = (path: CameraPath, durationMs: number, timeMs: number) => ({
  cameraPosition: sampleTrack(path.position, durationMs, timeMs),
  cameraTarget: sampleTrack(path.target, durationMs, timeMs),
});

/** Retime with the same phase anchors as every other set track, without aliasing vectors. */
export const retimeCameraPath = (
  path: CameraPath,
  oldAnchors: readonly number[],
  newAnchors: readonly number[]
): CameraPath => {
  const retime = (track: CameraPath["position"]) => track.map(frame => ({
    ...frame,
    atMs: warpTime(frame.atMs, oldAnchors, newAnchors),
    value: [...frame.value] as Vector3Tuple,
  }));
  return { position: retime(path.position), target: retime(path.target) };
};
