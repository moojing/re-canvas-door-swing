export type Vector3 = readonly [number, number, number];

export const smoothstep = (value: number): number => value * value * (3 - 2 * value);

export const clampProgress = (value: number): number => {
  if (value === Number.POSITIVE_INFINITY) return 1;
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
};

export const segmentProgress = (progress: number, start: number, end: number): number => {
  const normalized = Math.min(Math.max((progress - start) / (end - start), 0), 1);
  return smoothstep(normalized);
};
