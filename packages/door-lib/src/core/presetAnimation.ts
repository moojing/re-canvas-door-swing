import { authoredCameraSampler, cameraAuthoringInfo, validateCameraDraft, type DoorCameraDraft } from "./cameraAuthoring.ts";
import { validateCameraPath, retimeCameraPath } from "./cameraPath.ts";
import { sampleProfileState } from "./profileState.ts";
import { getDoorAnimationConfig } from "./animationState.ts";
import type { EraAnimationProfile } from "./animationStyles.ts";
import { getAnimationSetProfile } from "./animationSets.ts";
import { validateTrack, warpTime, type TimelineKeyframe, type TimelineValue } from "./animationTimeline.ts";
import type { DoorAnimationConfig, DoorEntrancePreset } from "./types.ts";

export type DoorTimingEvents = Record<string, number>;

const validateProfile = (profile: EraAnimationProfile) => {
  const duration = profile.durationMs;
  validateTrack(profile.doorAngle, duration);
  if (profile.rightDoorAngle) validateTrack(profile.rightDoorAngle, duration);
  if (profile.leftDoorOffset) validateTrack(profile.leftDoorOffset, duration);
  if (profile.rightDoorOffset) validateTrack(profile.rightDoorOffset, duration);
  validateTrack(profile.handleAngle, duration);
  if (profile.rightHandleAngle) validateTrack(profile.rightHandleAngle, duration);
  validateCameraPath(profile.cameraPath, duration);
  validateTrack(profile.fadeOut, duration);
  if (
    profile.events.length < 2 ||
    profile.events[0].atMs !== 0 ||
    profile.events.at(-1)?.atMs !== duration
  ) {
    throw new Error("Animation events must begin at zero and end at duration");
  }
  if (
    profile.soundFadeOutStartMs !== undefined &&
    (!Number.isFinite(profile.soundFadeOutStartMs) ||
      profile.soundFadeOutStartMs < profile.soundStartMs ||
      profile.soundFadeOutStartMs >= profile.soundEndMs)
  ) {
    throw new Error("Sound fade must start inside the sound window");
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
    profile.soundEndMs < profile.soundStartMs
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
  timingEvents: DoorTimingEvents,
  openingWaitMs = 0,
  width = 3
): EraAnimationProfile => {
  if (Object.keys(timingEvents).length === 0 && !openingWaitMs) return profile;
  const oldAnchors = profile.events.map(({ atMs }) => atMs);
  const waitStart = cameraAuthoringInfo(profile, width).waitStartMs;
  const newAnchors = profile.events.map(({ id, atMs }) => (timingEvents[id] ?? atMs) +
    (openingWaitMs && waitStart !== undefined && atMs > waitStart ? openingWaitMs : 0));
  const known = new Set(profile.events.map(({ id }) => id));
  for (const id of Object.keys(timingEvents)) {
    if (!known.has(id) || id === "start" || id === "end") {
      throw new Error(`Cannot edit animation event: ${id}`);
    }
  }
  // The warp checks ordering, while the two fixed endpoints preserve duration.
  warpTime(0, oldAnchors, newAnchors);
  if (newAnchors.at(-1) !== profile.durationMs + openingWaitMs) {
    throw new Error("Preview timing cannot change the preset duration");
  }
  return {
    ...profile,
    durationMs: profile.durationMs + openingWaitMs,
    events: profile.events.map((event, index) => ({ ...event, atMs: newAnchors[index] })),
    doorAngle: retimeTrack(profile.doorAngle, oldAnchors, newAnchors),
    rightDoorAngle: profile.rightDoorAngle
      ? retimeTrack(profile.rightDoorAngle, oldAnchors, newAnchors)
      : undefined,
    leftDoorOffset: profile.leftDoorOffset ? retimeTrack(profile.leftDoorOffset, oldAnchors, newAnchors) : undefined,
    rightDoorOffset: profile.rightDoorOffset ? retimeTrack(profile.rightDoorOffset, oldAnchors, newAnchors) : undefined,
    handleAngle: retimeTrack(profile.handleAngle, oldAnchors, newAnchors),
    rightHandleAngle: profile.rightHandleAngle ? retimeTrack(profile.rightHandleAngle, oldAnchors, newAnchors) : undefined,
    cameraPath: retimeCameraPath(profile.cameraPath, oldAnchors, newAnchors),
    fadeOut: retimeTrack(profile.fadeOut, oldAnchors, newAnchors),
    soundStartMs: warpTime(profile.soundStartMs, oldAnchors, newAnchors),
    soundEndMs: warpTime(profile.soundEndMs, oldAnchors, newAnchors),
    soundFadeOutStartMs: profile.soundFadeOutStartMs === undefined ? undefined : warpTime(profile.soundFadeOutStartMs, oldAnchors, newAnchors),
  };
};

export const getDoorEntranceAnimationConfig = (
  preset: DoorEntrancePreset,
  timingEvents: DoorTimingEvents = {},
  cameraDraft: DoorCameraDraft = {}
): DoorAnimationConfig => {
  const legacy = getDoorAnimationConfig(preset.animation);
  if (!preset.animationStyle && !preset.animationSet) {
    if (Object.keys(timingEvents).length || Object.keys(cameraDraft).length) {
      throw new Error("Legacy animation does not support timing edits");
    }
    return legacy;
  }

  const width = preset.type === "single" ? 3 : 6;
  const source = getAnimationSetProfile(preset);
  validateCameraDraft(cameraDraft, source, width);
  const profile = retimeProfile(source, timingEvents, cameraDraft.openingWaitMs ?? 0, width);
  validateProfile(profile);
  const duration = profile.durationMs;
  const sampleCamera = Object.keys(cameraDraft).some(key => key !== "openingWaitMs")
    ? authoredCameraSampler(profile, width, cameraDraft) : undefined;
  return {
    id: preset.animation,
    label: legacy.label,
    description: legacy.description,
    duration,
    timelineEvents: profile.events.map((event) => ({ ...event })),
    progressMarkers: profile.events.map(({ atMs }) => atMs / duration),
    soundStartProgress: profile.soundStartMs / duration,
    soundEndProgress: profile.soundEndMs / duration,
    soundFadeOutStartProgress: profile.soundFadeOutStartMs === undefined ? undefined : profile.soundFadeOutStartMs / duration,
    soundSourceStartProgress: profile.soundSourceStartProgress,
    soundSourceEndProgress: profile.soundSourceEndProgress,
    getState: (progress) => {
      const state = sampleProfileState(profile, progress);
      return sampleCamera ? { ...state, ...sampleCamera(Math.max(0, Math.min(1, progress)) * duration) } : state;
    },
  };
};

export const getDoorEntranceCameraAuthoringInfo = (preset: DoorEntrancePreset) =>
  cameraAuthoringInfo(getAnimationSetProfile(preset), preset.type === "single" ? 3 : 6);
