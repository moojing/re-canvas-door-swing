import { B05_FRONT_PLANE } from "./b05FrontImage.ts";
import {
  B05_LEAF_WIDTH,
  B05_TOTAL_HEIGHT,
  createB05GateGeometry,
  type B05LeafTransform,
  type B05Vector3,
} from "./b05Geometry.ts";

export type B05FrontSceneResources<Material> = Readonly<{
  leftMaterial: Material;
  rightMaterial: Material;
}>;

export type B05FrontPlaneDescriptor<Material> = Readonly<{
  material: Material;
  size: readonly [number, number];
  position: B05Vector3;
  localBounds: Readonly<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }>;
  parents: readonly ["hinge", "mirror", "leaf"];
}>;

export type B05FrontLeafDescriptor<Material> = Readonly<
  B05LeafTransform & {
    side: "left" | "right";
    procedural: true;
    front: B05FrontPlaneDescriptor<Material> | null;
  }
>;

export type B05FrontSceneDescriptor<Material> = Readonly<{
  leaves: readonly [
    B05FrontLeafDescriptor<Material>,
    B05FrontLeafDescriptor<Material>,
  ];
}>;

const createFront = <Material>(
  material: Material | undefined,
): B05FrontPlaneDescriptor<Material> | null =>
  material === undefined
    ? null
    : {
        material,
        size: B05_FRONT_PLANE.size,
        position: B05_FRONT_PLANE.position,
        localBounds: {
          minX: 0,
          maxX: B05_LEAF_WIDTH,
          minY: 0,
          maxY: B05_TOTAL_HEIGHT,
        },
        parents: ["hinge", "mirror", "leaf"],
      };

export const createB05FrontSceneDescriptor = <Material>(
  resources: B05FrontSceneResources<Material> | null,
): B05FrontSceneDescriptor<Material> => {
  const gate = createB05GateGeometry();

  return {
    leaves: [
      {
        side: "left",
        procedural: true,
        ...gate.left,
        front: createFront(resources?.leftMaterial),
      },
      {
        side: "right",
        procedural: true,
        ...gate.right,
        front: createFront(resources?.rightMaterial),
      },
    ],
  };
};
