import type { Vector3Tuple } from "./types.ts";

export type TimelineValue = number | Vector3Tuple;
export type TimelineEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out";

export interface TimelineKeyframe<T extends TimelineValue> {
  atMs: number;
  value: T;
  easing?: TimelineEasing;
}

const finiteValue = (value: TimelineValue) =>
  typeof value === "number"
    ? Number.isFinite(value)
    : value.length === 3 && value.every(Number.isFinite);

export const validateTrack = <T extends TimelineValue>(
  track: readonly TimelineKeyframe<T>[],
  durationMs: number
) => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error("Timeline duration must be a positive finite number");
  }
  if (track.length < 2 || track[0].atMs !== 0) {
    throw new Error("Timeline track must start at zero and contain two keyframes");
  }
  if (track.at(-1)?.atMs !== durationMs) {
    throw new Error("Timeline track must end at duration");
  }
  let previousTime = -1;
  for (const frame of track) {
    if (!Number.isFinite(frame.atMs) || frame.atMs <= previousTime) {
      throw new Error("Timeline keyframes must be in strict time order");
    }
    if (!finiteValue(frame.value)) {
      throw new Error("Timeline keyframe values must be finite");
    }
    previousTime = frame.atMs;
  }
};

const ease = (value: number, easing: TimelineEasing = "linear") => {
  if (easing === "ease-in") return value * value;
  if (easing === "ease-out") return value * (2 - value);
  if (easing === "ease-in-out") {
    return value < 0.5 ? 2 * value * value : 1 - 2 * (1 - value) ** 2;
  }
  return value;
};

const interpolate = <T extends TimelineValue>(from: T, to: T, t: number): T => {
  if (typeof from === "number" && typeof to === "number") {
    return (from + (to - from) * t) as T;
  }
  if (Array.isArray(from) && Array.isArray(to)) {
    return from.map((part, index) => part + (to[index] - part) * t) as T;
  }
  throw new Error("Timeline track value types must match");
};

export const sampleTrack = <T extends TimelineValue>(
  track: readonly TimelineKeyframe<T>[],
  durationMs: number,
  timeMs: number
): T => {
  validateTrack(track, durationMs);
  const time = Math.min(Math.max(Number.isFinite(timeMs) ? timeMs : 0, 0), durationMs);
  if (time === 0) return track[0].value;
  for (let index = 1; index < track.length; index += 1) {
    const end = track[index];
    if (time <= end.atMs) {
      const start = track[index - 1];
      const progress = (time - start.atMs) / (end.atMs - start.atMs);
      return interpolate(start.value, end.value, ease(progress, start.easing));
    }
  }
  return track.at(-1)!.value;
};

export const warpTime = (
  timeMs: number,
  oldAnchors: readonly number[],
  newAnchors: readonly number[]
) => {
  if (
    oldAnchors.length < 2 ||
    oldAnchors.length !== newAnchors.length ||
    oldAnchors[0] !== 0 ||
    newAnchors[0] !== 0
  ) {
    throw new Error("Timeline warp needs matching anchors starting at zero");
  }
  for (const anchors of [oldAnchors, newAnchors]) {
    for (let index = 1; index < anchors.length; index += 1) {
      if (!Number.isFinite(anchors[index]) || anchors[index] <= anchors[index - 1]) {
        throw new Error("Timeline warp anchors must be in strict time order");
      }
    }
  }
  const time = Math.min(Math.max(timeMs, 0), oldAnchors.at(-1)!);
  for (let index = 1; index < oldAnchors.length; index += 1) {
    if (time <= oldAnchors[index]) {
      const fraction =
        (time - oldAnchors[index - 1]) /
        (oldAnchors[index] - oldAnchors[index - 1]);
      return newAnchors[index - 1] +
        fraction * (newAnchors[index] - newAnchors[index - 1]);
    }
  }
  return newAnchors.at(-1)!;
};
