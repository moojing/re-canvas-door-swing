export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const lerp = (
  from: [number, number, number],
  to: [number, number, number],
  t: number
): [number, number, number] => [
  from[0] + (to[0] - from[0]) * t,
  from[1] + (to[1] - from[1]) * t,
  from[2] + (to[2] - from[2]) * t,
];

export const getDoorSwingWithBounce = (
  progress: number,
  options: {
    start: number;
    end: number;
    bounce?: number;
    damping?: number;
    frequency?: number;
  }
) => {
  const p = clamp(progress, 0, 1);
  const bounce = options.bounce ?? 0.08;
  const damping = options.damping ?? 18;
  const frequency = options.frequency ?? 32;

  if (p <= options.start) return 0;
  if (p < options.end) {
    const t = (p - options.start) / (options.end - options.start);
    return easeInOutCubic(t);
  }

  const settleT = p - options.end;
  return 1 + bounce * Math.exp(-damping * settleT) * Math.sin(frequency * settleT);
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
