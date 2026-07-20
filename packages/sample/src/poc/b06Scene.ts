import {
  B06_HANDLE,
  B06_LEAF_HEIGHT,
  B06_LEAF_WIDTH,
  B06_MEMBER_DEPTH,
  B06_WHEEL_COVER,
} from "./b06Assets.ts";

export type B06Vector3 = readonly [number, number, number];

type B06LocalBounds = Readonly<{
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}>;

export type B06FrontDescriptor<Material> = Readonly<{
  material: Material;
  size: readonly [number, number];
  position: B06Vector3;
  localBounds: B06LocalBounds;
  uv: Readonly<{ minU: 0; maxU: 1; increasingU: true }>;
  parents: readonly ["hinge", "leaf"];
}>;

type B06CylinderDescriptor = Readonly<{
  position: B06Vector3;
  radius: number;
  depth: number;
  parents: readonly ["hinge", "leaf"] | readonly ["hinge", "leaf", "wheel"];
}>;

type B06HandleDescriptor = Readonly<{
  center: B06Vector3;
  barSize: B06Vector3;
  mounts: readonly [
    Readonly<{ position: B06Vector3; size: B06Vector3 }>,
    Readonly<{ position: B06Vector3; size: B06Vector3 }>,
  ];
  parents: readonly ["hinge", "leaf"];
}>;

export type B06LeafDescriptor<Material> = Readonly<{
  side: "left" | "right";
  hingeX: number;
  scale: readonly [1, 1, 1];
  parents: readonly ["hinge", "leaf"];
  localBounds: B06LocalBounds;
  box: Readonly<{ size: B06Vector3; position: B06Vector3 }>;
  front: B06FrontDescriptor<Material> | null;
  wheelBacking: B06CylinderDescriptor | null;
  wheel: B06CylinderDescriptor | null;
  handle: B06HandleDescriptor | null;
}>;

export type B06SceneResources<Material> = Readonly<{
  leftMaterial: Material;
  rightMaterial: Material;
}>;

export type B06SceneDescriptor<Material> = Readonly<{
  leaves: readonly [B06LeafDescriptor<Material>, B06LeafDescriptor<Material>];
}>;

const PARENTS = Object.freeze(["hinge", "leaf"] as const);
const WHEEL_PARENTS = Object.freeze(["hinge", "leaf", "wheel"] as const);
const SCALE = Object.freeze([1, 1, 1] as const);
const FRONT_UV = Object.freeze({ minU: 0, maxU: 1, increasingU: true } as const);

const leftBounds = Object.freeze({
  minX: 0,
  maxX: B06_LEAF_WIDTH,
  minY: -B06_LEAF_HEIGHT / 2,
  maxY: B06_LEAF_HEIGHT / 2,
});

const rightBounds = Object.freeze({
  minX: -B06_LEAF_WIDTH,
  maxX: 0,
  minY: -B06_LEAF_HEIGHT / 2,
  maxY: B06_LEAF_HEIGHT / 2,
});

const createFront = <Material>(
  material: Material | undefined,
  side: "left" | "right",
): B06FrontDescriptor<Material> | null => {
  if (material === undefined) return null;
  const direction = side === "left" ? 1 : -1;
  return {
    material,
    size: [B06_LEAF_WIDTH, B06_LEAF_HEIGHT],
    position: [
      (direction * B06_LEAF_WIDTH) / 2,
      0,
      B06_MEMBER_DEPTH / 2 + 0.002,
    ],
    localBounds: side === "left" ? leftBounds : rightBounds,
    uv: FRONT_UV,
    parents: PARENTS,
  };
};

const wheelBacking = Object.freeze({
  position: B06_WHEEL_COVER.center,
  radius: B06_WHEEL_COVER.radius,
  depth: 0.08,
  parents: PARENTS,
} as const);

const wheel = Object.freeze({
  position: B06_WHEEL_COVER.center,
  radius: B06_WHEEL_COVER.wheelRadius,
  depth: 0.14,
  parents: WHEEL_PARENTS,
} as const);

const handle = Object.freeze({
  center: B06_HANDLE.localCenter,
  barSize: B06_HANDLE.barSize,
  mounts: Object.freeze([
    Object.freeze({
      position: Object.freeze([
        B06_HANDLE.localCenter[0],
        B06_HANDLE.localCenter[1] + B06_HANDLE.mountOffsetY,
        B06_HANDLE.localCenter[2],
      ] as const),
      size: B06_HANDLE.mountSize,
    }),
    Object.freeze({
      position: Object.freeze([
        B06_HANDLE.localCenter[0],
        B06_HANDLE.localCenter[1] - B06_HANDLE.mountOffsetY,
        B06_HANDLE.localCenter[2],
      ] as const),
      size: B06_HANDLE.mountSize,
    }),
  ] as const),
  parents: PARENTS,
} as const);

export const createB06SceneDescriptor = <Material>(
  resources: B06SceneResources<Material> | null,
): B06SceneDescriptor<Material> => ({
  leaves: [
    {
      side: "left",
      hingeX: -B06_LEAF_WIDTH,
      scale: SCALE,
      parents: PARENTS,
      localBounds: leftBounds,
      box: {
        size: [B06_LEAF_WIDTH, B06_LEAF_HEIGHT, B06_MEMBER_DEPTH],
        position: [B06_LEAF_WIDTH / 2, 0, 0],
      },
      front: createFront(resources?.leftMaterial, "left"),
      wheelBacking,
      wheel,
      handle: null,
    },
    {
      side: "right",
      hingeX: B06_LEAF_WIDTH,
      scale: SCALE,
      parents: PARENTS,
      localBounds: rightBounds,
      box: {
        size: [B06_LEAF_WIDTH, B06_LEAF_HEIGHT, B06_MEMBER_DEPTH],
        position: [-B06_LEAF_WIDTH / 2, 0, 0],
      },
      front: createFront(resources?.rightMaterial, "right"),
      wheelBacking: null,
      wheel: null,
      handle,
    },
  ],
});
