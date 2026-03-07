export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const easeOutExpo = (t: number) => {
  const x = clamp(t, 0, 1);
  if (x >= 1) return 1;
  return 1 - Math.pow(2, -10 * x);
};

export const easeOutBack = (t: number, overshoot = 1.2) => {
  const x = clamp(t, 0, 1) - 1;
  return 1 + x * x * ((overshoot + 1) * x + overshoot);
};

export const lerp = (
  from: [number, number, number],
  to: [number, number, number],
  t: number
): [number, number, number] => [
  from[0] + (to[0] - from[0]) * t,
  from[1] + (to[1] - from[1]) * t,
  from[2] + (to[2] - from[2]) * t,
];

export const getHandlePressWithBounce = (
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

  if (p < options.releaseStart) {
    return 1;
  }

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

export const getHandlePressProgress = (
  progress: number,
  timing: {
    pressEnd: number;
    holdEnd: number;
    releaseEnd: number;
  }
) => {
  const p = clamp(progress, 0, 1);

  if (p <= 0) return 0;
  if (p < timing.pressEnd) {
    return easeInOutCubic(p / timing.pressEnd);
  }
  if (p < timing.holdEnd) {
    return 1;
  }
  if (p < timing.releaseEnd) {
    return 1 - easeInOutCubic((p - timing.holdEnd) / (timing.releaseEnd - timing.holdEnd));
  }
  return 0;
};
