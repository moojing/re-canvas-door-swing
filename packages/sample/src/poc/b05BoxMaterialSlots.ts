export type B05BoxMaterialSlots<Material> = [
  Material,
  Material,
  Material,
  Material,
  Material,
  Material,
];

export const createB05BoxMaterialSlots = <Material>(
  agedMaterial: Material,
  hiddenFrontMaterial?: Material,
): B05BoxMaterialSlots<Material> => [
  agedMaterial,
  agedMaterial,
  agedMaterial,
  agedMaterial,
  hiddenFrontMaterial ?? agedMaterial,
  agedMaterial,
];

export const selectB05BoxMaterialSlots = <Material, Resources>(
  frontResources: Resources | null,
  variants: {
    fallback: B05BoxMaterialSlots<Material>;
    generated: B05BoxMaterialSlots<Material>;
  },
): B05BoxMaterialSlots<Material> =>
  frontResources === null ? variants.fallback : variants.generated;

export type B05HiddenFrontMaterialOwner<Material> = {
  material: Material;
  dispose(): void;
};

export const ownB05HiddenFrontMaterial = <Material extends { dispose(): void }>(
  material: Material,
): B05HiddenFrontMaterialOwner<Material> => {
  let disposed = false;

  return {
    material,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      material.dispose();
    },
  };
};
