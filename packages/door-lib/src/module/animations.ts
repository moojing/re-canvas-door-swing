import { DoorAnimationConfig, DoorAnimationVariant } from "./types";

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const lerp = (
  from: [number, number, number],
  to: [number, number, number],
  t: number
): [number, number, number] => [
  from[0] + (to[0] - from[0]) * t,
  from[1] + (to[1] - from[1]) * t,
  from[2] + (to[2] - from[2]) * t,
];

const directEntryConfig: DoorAnimationConfig = {
  id: "direct-entry",
  label: "Direct Entry",
  description: "正面開門並往前推進",
  duration: 5000,
  progressMarkers: [0, 0.2, 0.4, 0.6, 0.8, 1],
  easing: easeInOutCubic,
  getState: (rawProgress: number) => {
    const progress = clamp(rawProgress, 0, 1);
    let doorAngle = 0;
    let cameraDistance = 1;
    let fadeOut = 0;

    if (progress <= 0.6) {
      const doorProgress = progress / 0.6;
      doorAngle = doorProgress;
      cameraDistance = 1 + doorProgress * 0.3;
    } else if (progress <= 0.9) {
      const forwardProgress = (progress - 0.6) / 0.3;
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
      cameraPosition: [0, 0, cameraZ],
      cameraTarget: [0, 0, 0],
      fadeOut,
    };
  },
};

const topDownConfig: DoorAnimationConfig = {
  id: "top-down-entry",
  label: "Overhead Entry",
  description: "俯視下降後靠近門再淡出",
  duration: 6500,
  progressMarkers: [0, 0.2, 0.35, 0.6, 0.85, 1],
  easing: easeInOutCubic,
  getState: (rawProgress: number) => {
    const progress = clamp(rawProgress, 0, 1);
    let doorAngle = 0;
    let fadeOut = 0;

    const startPosition: [number, number, number] = [-3.8, 6, 5.2];
    const midHoverPosition: [number, number, number] = [-2.6, 3.8, 5];
    const frontPrepPosition: [number, number, number] = [-1.2, 2, 4.6];
    const closeApproachPosition: [number, number, number] = [-0.4, 0.8, 3.4];
    const finalFadePosition: [number, number, number] = [0, 0, 0.8];

    let cameraPosition: [number, number, number] = [...startPosition];

    if (progress <= 0.35) {
      const t = progress / 0.35;
      cameraPosition = lerp(startPosition, midHoverPosition, t);
      doorAngle = 0;
    } else if (progress <= 0.6) {
      const t = (progress - 0.35) / 0.25;
      cameraPosition = lerp(midHoverPosition, frontPrepPosition, t);
      doorAngle = 0;
    } else if (progress <= 0.85) {
      const t = (progress - 0.6) / 0.25;
      const easedDoor = easeInOutCubic(t);
      doorAngle = easedDoor;
      cameraPosition = lerp(frontPrepPosition, closeApproachPosition, t);
    } else {
      const t = (progress - 0.85) / 0.15;
      doorAngle = 1;
      cameraPosition = lerp(closeApproachPosition, finalFadePosition, t);
      fadeOut = clamp(t, 0, 1);
    }

    return {
      doorAngle,
      cameraPosition,
      cameraTarget: [0, 0, 0],
      fadeOut,
    };
  },
};

export const doorAnimationConfigs: DoorAnimationConfig[] = [
  directEntryConfig,
  topDownConfig,
];

export const doorAnimationMap: Record<DoorAnimationVariant, DoorAnimationConfig> =
  doorAnimationConfigs.reduce(
    (acc, config) => ({ ...acc, [config.id]: config }),
    {} as Record<DoorAnimationVariant, DoorAnimationConfig>
  );

export const getDoorAnimationConfig = (
  variant: DoorAnimationVariant = "direct-entry"
) => doorAnimationMap[variant] ?? doorAnimationConfigs[0];
