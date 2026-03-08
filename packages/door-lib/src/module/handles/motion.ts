import { getHandlePressWithBounce } from "../animations/shared";
import {
  DoorAnimationVariant,
  HandleProfileId,
} from "../types";
import { DEFAULT_HANDLE_PROFILE_ID } from "./profiles";

export interface HandlePressTiming {
  pressStart?: number;
  pressEnd: number;
  bounceEnd: number;
  releaseStart: number;
  releaseEnd: number;
  downBounce?: number;
  releaseBounce?: number;
  motionSpeed?: number;
}

interface HandleMotionProfile {
  maxPressAngleDeg: number;
  timingsByVariant: Record<DoorAnimationVariant, HandlePressTiming>;
}

const LEVER_MOTION: HandleMotionProfile = {
  maxPressAngleDeg: 60,
  timingsByVariant: {
    "direct-entry": {
      pressStart: 0.27,
      pressEnd: 0.36,
      bounceEnd: 0.46,
      releaseStart: 0.9,
      releaseEnd: 1,
      downBounce: 0.1,
      releaseBounce: 0.12,
      motionSpeed: 1,
    },
    "single-top-down-entry": {
      pressStart: 0.49,
      pressEnd: 0.58,
      bounceEnd: 0.68,
      releaseStart: 0.9,
      releaseEnd: 1,
      downBounce: 0.09,
      releaseBounce: 0.12,
      motionSpeed: 1,
    },
    "double-swing": {
      pressStart: 0.27,
      pressEnd: 0.36,
      bounceEnd: 0.46,
      releaseStart: 0.9,
      releaseEnd: 1,
      downBounce: 0.1,
      releaseBounce: 0.12,
      motionSpeed: 1,
    },
  },
};

const KNOB_MOTION: HandleMotionProfile = {
  maxPressAngleDeg: 38,
  timingsByVariant: {
    "direct-entry": {
      pressStart: 0.3,
      pressEnd: 0.4,
      bounceEnd: 0.5,
      releaseStart: 0.9,
      releaseEnd: 1,
      downBounce: 0.06,
      releaseBounce: 0.08,
      motionSpeed: 0.9,
    },
    "single-top-down-entry": {
      pressStart: 0.5,
      pressEnd: 0.62,
      bounceEnd: 0.72,
      releaseStart: 0.9,
      releaseEnd: 1,
      downBounce: 0.05,
      releaseBounce: 0.08,
      motionSpeed: 0.85,
    },
    "double-swing": {
      pressStart: 0.3,
      pressEnd: 0.4,
      bounceEnd: 0.5,
      releaseStart: 0.9,
      releaseEnd: 1,
      downBounce: 0.06,
      releaseBounce: 0.08,
      motionSpeed: 0.9,
    },
  },
};

const HANDLE_MOTION_MAP: Record<HandleProfileId, HandleMotionProfile> = {
  "lever-l": LEVER_MOTION,
  "knob-round": KNOB_MOTION,
};

export const getHandlePressAngle = ({
  profileId = DEFAULT_HANDLE_PROFILE_ID,
  variant,
  progress,
}: {
  profileId?: HandleProfileId;
  variant: DoorAnimationVariant;
  progress: number;
}) => {
  const profile = HANDLE_MOTION_MAP[profileId] ?? HANDLE_MOTION_MAP[DEFAULT_HANDLE_PROFILE_ID];
  const timing = profile.timingsByVariant[variant];
  const normalized = getHandlePressWithBounce(progress, timing);
  return normalized * ((profile.maxPressAngleDeg * Math.PI) / 180);
};

