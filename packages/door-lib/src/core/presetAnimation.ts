import { getDoorAnimationConfig } from "./animationState.ts";
import type { EraAnimationProfile } from "./animationStyles.ts";
import { getAnimationSetProfile } from "./animationSets.ts";
import { sampleTrack, validateTrack, warpTime, type TimelineKeyframe, type TimelineValue } from "./animationTimeline.ts";
import type { DoorAnimationConfig, DoorEntrancePreset } from "./types.ts";

export type DoorTimingEvents = Record<string, number>;

const validateProfile = (profile: EraAnimationProfile) => {
  const duration = profile.durationMs;
  validateTrack(profile.doorAngle, duration);
  if (profile.rightDoorAngle) validateTrack(profile.rightDoorAngle, duration);
  validateTrack(profile.handleAngle, duration);
  validateTrack(profile.cameraPosition, duration);
  validateTrack(profile.cameraTarget, duration);
  validateTrack(profile.fadeOut, duration);
  if (
    profile.events.length < 2 ||
    profile.events[0].atMs !== 0 ||
    profile.events.at(-1)?.atMs !== duration
  ) {
    throw new Error("Animation events must begin at zero and end at duration");
  }
  const ids = new Set<string>();
  let previousTime = -1;
  for (const event of profile.events) {
    if (!Number.isFinite(event.atMs) || event.atMs <= previousTime || ids.has(event.id)) {
      throw new Error("Animation events need unique IDs and strict time order");
    }
    ids.add(event.id);
    previousTime = event.atMs;
  }
  if (
    !Number.isFinite(profile.soundStartMs) ||
    !Number.isFinite(profile.soundEndMs) ||
    profile.soundStartMs < 0 ||
    profile.soundEndMs > duration ||
    profile.soundEndMs <= profile.soundStartMs
  ) {
    throw new Error("Animation sound window must fit the duration");
  }
};

const retimeTrack = <T extends TimelineValue>(
  track: TimelineKeyframe<T>[],
  oldAnchors: number[],
  newAnchors: number[]
) => track.map((frame) => ({
  ...frame,
  atMs: warpTime(frame.atMs, oldAnchors, newAnchors),
}));

const retimeProfile = (
  profile: EraAnimationProfile,
  timingEvents: DoorTimingEvents
): EraAnimationProfile => {
  if (Object.keys(timingEvents).length === 0) return profile;
  const oldAnchors = profile.events.map(({ atMs }) => atMs);
  const newAnchors = profile.events.map(({ id, atMs }) => timingEvents[id] ?? atMs);
  const known = new Set(profile.events.map(({ id }) => id));
  for (const id of Object.keys(timingEvents)) {
    if (!known.has(id) || id === "start" || id === "end") {
      throw new Error(`Cannot edit animation event: ${id}`);
    }
  }
  // The warp checks ordering, while the two fixed endpoints preserve duration.
  warpTime(0, oldAnchors, newAnchors);
  if (newAnchors.at(-1) !== profile.durationMs) {
    throw new Error("Preview timing cannot change the preset duration");
  }
  return {
    ...profile,
    events: profile.events.map((event, index) => ({ ...event, atMs: newAnchors[index] })),
    doorAngle: retimeTrack(profile.doorAngle, oldAnchors, newAnchors),
    rightDoorAngle: profile.rightDoorAngle
      ? retimeTrack(profile.rightDoorAngle, oldAnchors, newAnchors)
      : undefined,
    handleAngle: retimeTrack(profile.handleAngle, oldAnchors, newAnchors),
    cameraPosition: retimeTrack(profile.cameraPosition, oldAnchors, newAnchors),
    cameraTarget: retimeTrack(profile.cameraTarget, oldAnchors, newAnchors),
    fadeOut: retimeTrack(profile.fadeOut, oldAnchors, newAnchors),
    soundStartMs: warpTime(profile.soundStartMs, oldAnchors, newAnchors),
    soundEndMs: warpTime(profile.soundEndMs, oldAnchors, newAnchors),
  };
};

export const getDoorEntranceAnimationConfig = (
  preset: DoorEntrancePreset,
  timingEvents: DoorTimingEvents = {}
): DoorAnimationConfig => {
  const legacy = getDoorAnimationConfig(preset.animation);
  if (!preset.animationStyle && !preset.animationSet) {
    if (Object.keys(timingEvents).length) {
      throw new Error("Legacy animation does not support timing edits");
    }
    return legacy;
  }

  const profile = retimeProfile(getAnimationSetProfile(preset), timingEvents);
  validateProfile(profile);
  const duration = profile.durationMs;
  return {
    id: preset.animation,
    label: legacy.label,
    description: legacy.description,
    duration,
    timelineEvents: profile.events,
    progressMarkers: profile.events.map(({ atMs }) => atMs / duration),
    soundStartProgress: profile.soundStartMs / duration,
    soundEndProgress: profile.soundEndMs / duration,
    soundSourceStartProgress: profile.soundSourceStartProgress,
    soundSourceEndProgress: profile.soundSourceEndProgress,
    getState: (progress) => {
      const timeMs = Math.min(Math.max(progress, 0), 1) * duration;
      return {
        doorAngle: sampleTrack(profile.doorAngle, duration, timeMs),
        rightDoorAngle: profile.rightDoorAngle
          ? sampleTrack(profile.rightDoorAngle, duration, timeMs)
          : undefined,
        handleAngle: sampleTrack(profile.handleAngle, duration, timeMs),
        cameraPosition: sampleTrack(profile.cameraPosition, duration, timeMs),
        cameraTarget: sampleTrack(profile.cameraTarget, duration, timeMs),
        fadeOut: sampleTrack(profile.fadeOut, duration, timeMs),
      };
    },
  };
};
