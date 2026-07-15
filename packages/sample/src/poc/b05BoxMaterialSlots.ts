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
