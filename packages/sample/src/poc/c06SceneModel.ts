export type C06EdgeSide = "top" | "right" | "bottom" | "left";

export type C06EdgeBrick = {
  readonly id: string;
  readonly side: C06EdgeSide;
  readonly position: readonly [number, number, number];
  readonly size: readonly [number, number, number];
  readonly rotationZ?: number;
};

export type C06CameraState = {
  progress: number;
  z: number;
  fadeOpacity: number;
};

export const C06_DURATION_SECONDS = 5.2;

const EDGE_BRICK_SIZE = [0.55, 0.24, 1.08] as const;

export const C06_EDGE_BRICKS: readonly C06EdgeBrick[] = [
  ...[-1.76, -1.32, -0.88, -0.44, 0, 0.44, 0.88, 1.32, 1.76].map((x, index) => ({
    id: `top-${index + 1}`,
    side: "top" as const,
    position: [x, index % 3 === 1 ? 1.38 : 1.5, (index % 3 - 1) * 0.035] as const,
    size: EDGE_BRICK_SIZE,
  })),
  ...[1.18, 0.84, 0.5, 0.16, -0.18, -0.52, -0.86, -1.2].map((y, index) => ({
    id: `right-${index + 1}`,
    side: "right" as const,
    position: [index % 2 === 0 ? 1.9 : 1.78, y, (index % 3 - 1) * 0.035] as const,
    size: EDGE_BRICK_SIZE,
  })),
  ...[-1.65, -1.21, -0.77, -0.33, 0.11, 0.55, 0.99, 1.43].map((x, index) => ({
    id: `bottom-${index + 1}`,
    side: "bottom" as const,
    position: [x, index % 3 === 0 ? -1.48 : -1.38, (index % 3 - 1) * 0.035] as const,
    size: EDGE_BRICK_SIZE,
  })),
  ...[1.16, 0.82, 0.48, 0.14, -0.2, -0.54, -0.88, -1.22].map((y, index) => ({
    id: `left-${index + 1}`,
    side: "left" as const,
    position: [index % 2 === 0 ? -1.9 : -1.76, y, (index % 3 - 1) * 0.035] as const,
    size: EDGE_BRICK_SIZE,
  })),
] as const;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const smoothstep = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

const easeInOutCubic = (value: number) => {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const getC06CameraState = (elapsedSeconds: number): C06CameraState => {
  const elapsed = Math.min(C06_DURATION_SECONDS, Math.max(0, elapsedSeconds));
  const travel = easeInOutCubic((elapsed - 0.75) / 3.5);
  const introFade = 1 - smoothstep(elapsed / 0.45);
  const outroFade = smoothstep((elapsed - 4.45) / 0.75);

  return {
    progress: travel,
    z: 8 - travel * 13.6,
    fadeOpacity: Math.max(introFade, outroFade),
  };
};
