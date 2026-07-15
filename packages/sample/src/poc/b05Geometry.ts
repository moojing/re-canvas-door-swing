export type B05Vector3 = readonly [number, number, number];

export const B05_LEAF_WIDTH = 2.7;
export const B05_PANEL_HEIGHT = 1.55;
export const B05_DIVIDER_HEIGHT = 0.18;
export const B05_ARCH_CENTER_X = B05_LEAF_WIDTH;
export const B05_ARCH_CENTER_Y = 2.65;
export const B05_ARCH_RADIUS = B05_LEAF_WIDTH;
export const B05_TOTAL_HEIGHT = B05_ARCH_CENTER_Y + B05_ARCH_RADIUS;
export const B05_BAR_RADIUS = 0.065;
export const B05_MEMBER_DEPTH = 0.16;
export const B05_BAR_COUNT = 4;
export const B05_STILE_WIDTH = 0.2;
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
  rotation?: B05Vector3;
}

export interface B05VerticalBar extends B05BoxMember {
  x: number;
  bottomY: number;
  topY: number;
  height: number;
}

export interface B05Collar {
  position: B05Vector3;
  radius: number;
  height: number;
}

export interface B05LeafGeometry {
  bounds: B05Bounds;
  lowerPanel: B05BoxMember;
  panelInset: B05BoxMember;
  lowerRail: B05BoxMember;
  middleRail: B05BoxMember;
  outerStile: B05BoxMember;
  centerStile: B05BoxMember;
  panelTrim: B05BoxMember[];
  barCollars: B05Collar[];
  plaqueTrim: B05BoxMember[];
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
  if (!Number.isFinite(x) || x < 0 || x > B05_LEAF_WIDTH) {
    throw new RangeError(`Arch x must be within 0..${B05_LEAF_WIDTH}`);
  }

  const localArchX = x - B05_ARCH_CENTER_X;
  const heightSquared = B05_ARCH_RADIUS ** 2 - localArchX ** 2;

  return B05_ARCH_CENTER_Y + Math.sqrt(heightSquared);
};

const createBars = (): B05VerticalBar[] => {
  const inset = 0.48;
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
    if (index === 0) {
      return [0, B05_ARCH_CENTER_Y, 0];
    }
    if (index === B05_ARCH_SEGMENTS) {
      return [B05_LEAF_WIDTH, B05_TOTAL_HEIGHT, 0];
    }

    const angle = Math.PI - (index / B05_ARCH_SEGMENTS) * (Math.PI / 2);
    return [
      B05_ARCH_CENTER_X + B05_ARCH_RADIUS * Math.cos(angle),
      B05_ARCH_CENTER_Y + B05_ARCH_RADIUS * Math.sin(angle),
      0,
    ];
  });

const createPlaqueTrim = (): B05BoxMember[] => {
  const centerX = B05_LEAF_WIDTH / 2;
  const centerY = 0.76;
  const halfWidth = 0.58;
  const shoulderX = 0.38;
  const halfHeight = 0.29;
  const vertices = [
    [-shoulderX, halfHeight],
    [shoulderX, halfHeight],
    [halfWidth, 0],
    [shoulderX, -halfHeight],
    [-shoulderX, -halfHeight],
    [-halfWidth, 0],
  ] as const;

  return vertices.map(([startX, startY], index) => {
    const [endX, endY] = vertices[(index + 1) % vertices.length];
    const deltaX = endX - startX;
    const deltaY = endY - startY;

    return {
      position: [
        centerX + (startX + endX) / 2,
        centerY + (startY + endY) / 2,
        B05_MEMBER_DEPTH / 2 + 0.1,
      ],
      size: [Math.hypot(deltaX, deltaY), 0.075, 0.1],
      rotation: [0, 0, Math.atan2(deltaY, deltaX)],
    };
  });
};

export const createB05LeafGeometry = (): B05LeafGeometry => ({
  bounds: {
    minX: 0,
    maxX: B05_LEAF_WIDTH,
    minY: 0,
    maxY: B05_TOTAL_HEIGHT,
  },
  lowerPanel: {
    position: [B05_LEAF_WIDTH / 2, B05_PANEL_HEIGHT / 2, 0],
    size: [B05_LEAF_WIDTH - B05_STILE_WIDTH * 2, B05_PANEL_HEIGHT - 0.08, B05_MEMBER_DEPTH],
  },
  panelInset: {
    position: [B05_LEAF_WIDTH / 2, 0.77, B05_MEMBER_DEPTH / 2 + 0.035],
    size: [2.08, 1.04, 0.07],
  },
  lowerRail: {
    position: [
      B05_LEAF_WIDTH / 2,
      B05_PANEL_HEIGHT + B05_DIVIDER_HEIGHT / 2,
      0,
    ],
    size: [B05_LEAF_WIDTH - B05_STILE_WIDTH, B05_DIVIDER_HEIGHT, B05_MEMBER_DEPTH * 1.25],
  },
  middleRail: {
    position: [B05_LEAF_WIDTH / 2, B05_ARCH_CENTER_Y, 0],
    size: [B05_LEAF_WIDTH - B05_STILE_WIDTH, 0.16, B05_MEMBER_DEPTH * 1.2],
  },
  outerStile: {
    position: [B05_STILE_WIDTH / 2, B05_ARCH_CENTER_Y / 2, 0],
    size: [B05_STILE_WIDTH, B05_ARCH_CENTER_Y, B05_MEMBER_DEPTH * 1.35],
  },
  centerStile: {
    position: [B05_LEAF_WIDTH - B05_STILE_WIDTH / 2, B05_TOTAL_HEIGHT / 2, 0],
    size: [B05_STILE_WIDTH, B05_TOTAL_HEIGHT, B05_MEMBER_DEPTH * 1.35],
  },
  panelTrim: [
    {
      position: [B05_LEAF_WIDTH / 2, 0.2, B05_MEMBER_DEPTH / 2 + 0.05],
      size: [2.18, 0.08, 0.1],
    },
    {
      position: [B05_LEAF_WIDTH / 2, 1.34, B05_MEMBER_DEPTH / 2 + 0.05],
      size: [2.18, 0.08, 0.1],
    },
    {
      position: [0.26, 0.77, B05_MEMBER_DEPTH / 2 + 0.05],
      size: [0.08, 1.22, 0.1],
    },
    {
      position: [B05_LEAF_WIDTH - 0.26, 0.77, B05_MEMBER_DEPTH / 2 + 0.05],
      size: [0.08, 1.22, 0.1],
    },
  ],
  barCollars: [
    {
      position: [1.06, 3.72, 0],
      radius: 0.13,
      height: 0.1,
    },
    {
      position: [1.06, 3.82, 0],
      radius: 0.105,
      height: 0.12,
    },
    {
      position: [1.06, 3.92, 0],
      radius: 0.13,
      height: 0.1,
    },
  ],
  plaqueTrim: createPlaqueTrim(),
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
