import type { EraAnimationProfile } from "./animationStyles.ts";
import { sampleTrack } from "./animationTimeline.ts";
import type { DoorAnimationState } from "./types.ts";

export const sampleProfileState = (profile: EraAnimationProfile, progress: number): DoorAnimationState => {
  const duration = profile.durationMs;
  const timeMs = Math.min(Math.max(progress, 0), 1) * duration;
  return {
    doorAngle: sampleTrack(profile.doorAngle, duration, timeMs),
    rightDoorAngle: profile.rightDoorAngle ? sampleTrack(profile.rightDoorAngle, duration, timeMs) : undefined,
    leftDoorOffset: profile.leftDoorOffset ? sampleTrack(profile.leftDoorOffset, duration, timeMs) : undefined,
    rightDoorOffset: profile.rightDoorOffset ? sampleTrack(profile.rightDoorOffset, duration, timeMs) : undefined,
    handleAngle: sampleTrack(profile.handleAngle, duration, timeMs),
    rightHandleAngle: profile.rightHandleAngle ? sampleTrack(profile.rightHandleAngle, duration, timeMs) : undefined,
    cameraPosition: sampleTrack(profile.cameraPosition, duration, timeMs),
    cameraTarget: sampleTrack(profile.cameraTarget, duration, timeMs),
    fadeOut: sampleTrack(profile.fadeOut, duration, timeMs),
  };
};
