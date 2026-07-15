export type B05TextureUv = readonly [number, number];
type B05TextureVector3 = readonly [number, number, number];

export const B05_WORLD_UNITS_PER_TEXTURE_REPEAT = 1.1;

export const projectB05TextureUv = (
  localPosition: B05TextureVector3,
  objectPosition: B05TextureVector3,
): B05TextureUv => {
  return [
    (localPosition[0] + objectPosition[0]) / B05_WORLD_UNITS_PER_TEXTURE_REPEAT,
    (localPosition[1] + objectPosition[1]) / B05_WORLD_UNITS_PER_TEXTURE_REPEAT,
  ];
};
