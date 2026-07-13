export type B05Vector3 = readonly [number, number, number];

export const B05_LEAF_WIDTH = 2.7;
export const B05_PANEL_HEIGHT = 1.45;
export const B05_DIVIDER_HEIGHT = 0.2;
export const B05_ARCH_CENTER_X = B05_LEAF_WIDTH;
export const B05_ARCH_CENTER_Y = 2.4;
export const B05_ARCH_RADIUS = B05_LEAF_WIDTH;
export const B05_TOTAL_HEIGHT = B05_ARCH_CENTER_Y + B05_ARCH_RADIUS;
export const B05_BAR_RADIUS = 0.065;
export const B05_MEMBER_DEPTH = 0.16;
export const B05_BAR_COUNT = 7;
export const B05_ARCH_SEGMENTS = 16;

export interface B05Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface B05BoxMember {
  position: B05Vector3;
  size: B05Vector3;
}

export interface B05VerticalBar extends B05BoxMember {
  x: number;
  bottomY: number;
  topY: number;
  height: number;
}

export interface B05LeafGeometry {
  bounds: B05Bounds;
  lowerPanel: B05BoxMember;
  divider: B05BoxMember;
  reliefBlocks: B05BoxMember[];
  bars: B05VerticalBar[];
  archPath: B05Vector3[];
}

export interface B05LeafTransform {
  hingeX: number;
  mirrorX: boolean;
  rotationSign: 1 | -1;
}

export interface B05GateGeometry {
  left: B05LeafTransform;
  right: B05LeafTransform;
}

export const archYAtX = (x: number): number => {
  const localArchX = x - B05_ARCH_CENTER_X;
  const heightSquared = B05_ARCH_RADIUS ** 2 - localArchX ** 2;

  return B05_ARCH_CENTER_Y + Math.sqrt(Math.max(0, heightSquared));
};

const createBars = (): B05VerticalBar[] => {
  const inset = 0.24;
  const spacing = (B05_LEAF_WIDTH - inset * 2) / (B05_BAR_COUNT - 1);
  const bottomY = B05_PANEL_HEIGHT + B05_DIVIDER_HEIGHT;

  return Array.from({ length: B05_BAR_COUNT }, (_, index) => {
    const x = inset + spacing * index;
    const topY = archYAtX(x) - B05_BAR_RADIUS;
    const height = topY - bottomY;

    return {
      x,
      bottomY,
      topY,
      height,
      position: [x, bottomY + height / 2, 0],
      size: [B05_BAR_RADIUS * 2, height, B05_MEMBER_DEPTH],
    };
  });
};

const createArchPath = (): B05Vector3[] =>
  Array.from({ length: B05_ARCH_SEGMENTS + 1 }, (_, index) => {
    const x = (index / B05_ARCH_SEGMENTS) * B05_LEAF_WIDTH;
    return [x, archYAtX(x), 0];
  });

export const createB05LeafGeometry = (): B05LeafGeometry => ({
  bounds: {
    minX: 0,
    maxX: B05_LEAF_WIDTH,
    minY: 0,
    maxY: B05_TOTAL_HEIGHT,
  },
  lowerPanel: {
    position: [B05_LEAF_WIDTH / 2, B05_PANEL_HEIGHT / 2, 0],
    size: [B05_LEAF_WIDTH, B05_PANEL_HEIGHT, B05_MEMBER_DEPTH],
  },
  divider: {
    position: [
      B05_LEAF_WIDTH / 2,
      B05_PANEL_HEIGHT + B05_DIVIDER_HEIGHT / 2,
      0,
    ],
    size: [B05_LEAF_WIDTH, B05_DIVIDER_HEIGHT, B05_MEMBER_DEPTH * 1.25],
  },
  reliefBlocks: [
    {
      position: [0.52, 0.72, B05_MEMBER_DEPTH / 2],
      size: [0.3, 0.44, 0.08],
    },
    {
      position: [1.35, 0.72, B05_MEMBER_DEPTH / 2],
      size: [0.38, 0.3, 0.08],
    },
    {
      position: [2.18, 0.72, B05_MEMBER_DEPTH / 2],
      size: [0.26, 0.5, 0.08],
    },
  ],
  bars: createBars(),
  archPath: createArchPath(),
});

export const createB05GateGeometry = (): B05GateGeometry => ({
  left: {
    hingeX: -B05_LEAF_WIDTH,
    mirrorX: false,
    rotationSign: 1,
  },
  right: {
    hingeX: B05_LEAF_WIDTH,
    mirrorX: true,
    rotationSign: -1,
  },
});
