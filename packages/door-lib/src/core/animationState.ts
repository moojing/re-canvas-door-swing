import type {
  DoorAnimationConfig,
  DoorAnimationState,
  DoorAnimationVariant,
  HandleProfileId,
} from "./types.ts";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

const easeOutExpo = (t: number) => {
  const x = clamp(t, 0, 1);
  if (x >= 1) return 1;
  return 1 - Math.pow(2, -10 * x);
};

const easeOutBack = (t: number, overshoot = 1.2) => {
  const x = clamp(t, 0, 1) - 1;
  return 1 + x * x * ((overshoot + 1) * x + overshoot);
};

const lerp = (
  from: [number, number, number],
  to: [number, number, number],
  t: number
): [number, number, number] => [
  from[0] + (to[0] - from[0]) * t,
  from[1] + (to[1] - from[1]) * t,
  from[2] + (to[2] - from[2]) * t,
];

const getHandlePressWithBounce = (
  progress: number,
  options: {
    pressStart?: number;
    pressEnd: number;
    bounceEnd: number;
    releaseStart: number;
    releaseEnd: number;
    downBounce?: number;
    releaseBounce?: number;
    motionSpeed?: number;
  }
) => {
  const p = clamp(progress, 0, 1);
  const pressStart = clamp(options.pressStart ?? 0, 0, 1);
  const downBounce = options.downBounce ?? 0.1;
  const releaseBounce = options.releaseBounce ?? 0.12;
  const motionSpeed = Math.max(options.motionSpeed ?? 1, 0.01);

  if (p <= pressStart) return 0;
  if (p < options.pressEnd) {
    const pressDuration = Math.max(options.pressEnd - pressStart, Number.EPSILON);
    const t = clamp(((p - pressStart) / pressDuration) * motionSpeed, 0, 1);
    return easeOutExpo(t);
  }

  if (p < options.bounceEnd) {
    const bounceDuration = Math.max(
      options.bounceEnd - options.pressEnd,
      Number.EPSILON
    );
    const t = clamp(
      ((p - options.pressEnd) / bounceDuration) * motionSpeed,
      0,
      1
    );
    return 1 + downBounce * Math.exp(-6 * t) * Math.sin(t * Math.PI * 3);
  }

  if (p < options.releaseStart) return 1;

  if (p < options.releaseEnd) {
    const releaseDuration = Math.max(
      options.releaseEnd - options.releaseStart,
      Number.EPSILON
    );
    const t = clamp(
      ((p - options.releaseStart) / releaseDuration) * motionSpeed,
      0,
      1
    );
    const base = 1 - clamp(easeOutBack(t, 1.15), 0, 1.12);
    const bounce = releaseBounce * Math.exp(-6 * t) * Math.sin(t * Math.PI * 4);
    return clamp(base + bounce, -0.12, 1.2);
  }

  return 0;
};

const DEFAULT_HANDLE_PROFILE_ID: HandleProfileId = "lever-l";

const handleMotionByProfile: Record<
  HandleProfileId,
  {
    maxPressAngleDeg: number;
    timingsByVariant: Record<
      DoorAnimationVariant,
      {
        pressStart?: number;
        pressEnd: number;
        bounceEnd: number;
        releaseStart: number;
        releaseEnd: number;
        downBounce?: number;
        releaseBounce?: number;
        motionSpeed?: number;
      }
    >;
  }
> = {
  "lever-l": {
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
  },
  "knob-round": {
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
  },
};

const getHandlePressAngle = ({
  profileId = DEFAULT_HANDLE_PROFILE_ID,
  variant,
  progress,
}: {
  profileId?: HandleProfileId;
  variant: DoorAnimationVariant;
  progress: number;
}) => {
  const profile =
    handleMotionByProfile[profileId] ??
    handleMotionByProfile[DEFAULT_HANDLE_PROFILE_ID];
  const timing = profile.timingsByVariant[variant];
  const normalized = getHandlePressWithBounce(progress, timing);
  return normalized * ((profile.maxPressAngleDeg * Math.PI) / 180);
};

export const directEntryConfig: DoorAnimationConfig = {
  id: "direct-entry",
  label: "Direct Entry",
  description: "正面開門並往前推進",
  duration: 5000,
  progressMarkers: [0, 0.2, 0.4, 0.6, 0.8, 1],
  soundStartProgress: 0.37,
  soundEndProgress: 0.88,
  soundSourceStartProgress: 0.06,
  easing: easeInOutCubic,
  getState: (rawProgress, context) => {
    const progress = clamp(rawProgress, 0, 1);
    const handleProgress = clamp(context?.linearProgress ?? rawProgress, 0, 1);
    let doorAngle = 0;
    let cameraDistance = 1;
    let fadeOut = 0;
    const handleAngle = getHandlePressAngle({
      profileId: context?.handleProfileId,
      variant: "direct-entry",
      progress: handleProgress,
    });

    if (progress <= 0.18) {
      doorAngle = 0;
      cameraDistance = 1;
    } else if (progress <= 0.62) {
      const doorProgress = (progress - 0.18) / 0.44;
      doorAngle = doorProgress;
      cameraDistance = 1 + doorProgress * 0.3;
    } else if (progress <= 0.9) {
      const forwardProgress = (progress - 0.62) / 0.28;
      doorAngle = 1;
      cameraDistance = 1.3 + forwardProgress * 1.2;
    } else {
      const fadeProgress = (progress - 0.9) / 0.1;
      doorAngle = 1;
      cameraDistance = 2.5;
      fadeOut = clamp(fadeProgress, 0, 1);
    }

    const cameraZ = 8 - (cameraDistance - 1) * 5;

    return {
      doorAngle,
      handleAngle,
      cameraPosition: [0, 0, cameraZ],
      cameraTarget: [0, 0, 0],
      fadeOut,
    };
  },
};

export const singleTopDownConfig: DoorAnimationConfig = {
  id: "single-top-down-entry",
  label: "Overhead Entry",
  description: "俯視下降後靠近門再淡出",
  duration: 6500,
  progressMarkers: [0, 0.2, 0.35, 0.6, 0.85, 1],
  soundStartProgress: 0.5,
  soundEndProgress: 0.88,
  soundSourceStartProgress: 0.06,
  easing: easeInOutCubic,
  getState: (rawProgress, context) => {
    const progress = clamp(rawProgress, 0, 1);
    const handleProgress = clamp(context?.linearProgress ?? rawProgress, 0, 1);
    let doorAngle = 0;
    let fadeOut = 0;
    const handleAngle = getHandlePressAngle({
      profileId: context?.handleProfileId,
      variant: "single-top-down-entry",
      progress: handleProgress,
    });

    const startPosition: [number, number, number] = [-3.8, 6, 5.2];
    const midHoverPosition: [number, number, number] = [-2.6, 3.8, 5];
    const frontPrepPosition: [number, number, number] = [-1.2, 2, 4.6];
    const closeApproachPosition: [number, number, number] = [-0.4, 0.8, 3.4];
    const finalFadePosition: [number, number, number] = [0, 0, -1.2];

    let cameraPosition: [number, number, number] = [...startPosition];

    if (progress <= 0.35) {
      const t = progress / 0.35;
      cameraPosition = lerp(startPosition, midHoverPosition, t);
      doorAngle = 0;
    } else if (progress <= 0.62) {
      const t = (progress - 0.35) / 0.27;
      cameraPosition = lerp(midHoverPosition, frontPrepPosition, t);
      doorAngle = 0;
    } else if (progress <= 0.87) {
      const t = (progress - 0.62) / 0.25;
      doorAngle = t;
      cameraPosition = lerp(frontPrepPosition, closeApproachPosition, t);
    } else {
      const t = (progress - 0.87) / 0.13;
      doorAngle = 1;
      cameraPosition = lerp(closeApproachPosition, finalFadePosition, t);
      fadeOut = clamp(t, 0, 1);
    }

    return {
      doorAngle,
      handleAngle,
      cameraPosition,
      cameraTarget: [0, 0, 0],
      fadeOut,
    };
  },
};

export const doubleSwingConfig: DoorAnimationConfig = {
  id: "double-swing",
  label: "Double Swing",
  description: "雙扇門同步向外開啟",
  duration: 5500,
  progressMarkers: [0, 0.2, 0.4, 0.6, 0.8, 1],
  soundStartProgress: 0.27,
  soundEndProgress: 1,
  soundSourceStartProgress: 0.06,
  easing: easeInOutCubic,
  getState: (rawProgress, context) => {
    const progress = clamp(rawProgress, 0, 1);
    const handleProgress = clamp(context?.linearProgress ?? rawProgress, 0, 1);
    let left = 0;
    let right = 0;
    let cameraDistance = 1;
    let fadeOut = 0;
    const handleAngle = getHandlePressAngle({
      profileId: context?.handleProfileId,
      variant: "double-swing",
      progress: handleProgress,
    });

    if (progress <= 0.18) {
      left = 0;
      right = 0;
      cameraDistance = 1;
    } else if (progress <= 0.68) {
      const doorProgress = (progress - 0.18) / 0.5;
      left = doorProgress;
      right = doorProgress;
      cameraDistance = 1 + doorProgress * 0.35;
    } else if (progress <= 0.9) {
      const forward = (progress - 0.68) / 0.22;
      left = 1;
      right = 1;
      cameraDistance = 1.35 + forward * 1.1;
    } else {
      const fadeProgress = (progress - 0.9) / 0.1;
      left = 1;
      right = 1;
      cameraDistance = 2.45;
      fadeOut = clamp(fadeProgress, 0, 1);
    }

    const cameraZ = 8 - (cameraDistance - 1) * 5.2;

    return {
      doorAngle: left,
      rightDoorAngle: right,
      handleAngle,
      cameraPosition: [0, 0, cameraZ],
      cameraTarget: [0, 0, 0],
      fadeOut,
    };
  },
};

export const doorAnimationConfigs: DoorAnimationConfig[] = [
  directEntryConfig,
  singleTopDownConfig,
  doubleSwingConfig,
];

export const doorAnimationMap: Record<DoorAnimationVariant, DoorAnimationConfig> =
  doorAnimationConfigs.reduce(
    (acc, config) => ({ ...acc, [config.id]: config }),
    {} as Record<DoorAnimationVariant, DoorAnimationConfig>
  );

export const getDoorAnimationConfig = (
  variant: DoorAnimationVariant = "direct-entry"
) => doorAnimationMap[variant] ?? doorAnimationConfigs[0];
