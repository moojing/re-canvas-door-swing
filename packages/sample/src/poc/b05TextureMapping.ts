import type { BufferGeometry } from "three";

export type B05TextureUv = readonly [number, number];
type B05TextureVector3 = readonly [number, number, number];

export const B05_WORLD_UNITS_PER_TEXTURE_REPEAT = 1.1;

export const projectB05TextureUv = (
  localPosition: B05TextureVector3,
  objectPosition: B05TextureVector3,
  localNormal: B05TextureVector3 = [0, 0, 1],
  objectRotationZ = 0,
): B05TextureUv => {
  const cosine = Math.cos(objectRotationZ);
  const sine = Math.sin(objectRotationZ);
  const worldPosition: B05TextureVector3 = [
    objectPosition[0] + localPosition[0] * cosine - localPosition[1] * sine,
    objectPosition[1] + localPosition[0] * sine + localPosition[1] * cosine,
    objectPosition[2] + localPosition[2],
  ];
  const worldNormal: B05TextureVector3 = [
    localNormal[0] * cosine - localNormal[1] * sine,
    localNormal[0] * sine + localNormal[1] * cosine,
    localNormal[2],
  ];
  const absoluteNormal = worldNormal.map(Math.abs);
  const projectedPosition =
    absoluteNormal[2] >= absoluteNormal[0] && absoluteNormal[2] >= absoluteNormal[1]
      ? [worldPosition[0], worldPosition[1]]
      : absoluteNormal[1] >= absoluteNormal[0]
        ? [worldPosition[0], worldPosition[2]]
        : [worldPosition[2], worldPosition[1]];

  return [
    projectedPosition[0] / B05_WORLD_UNITS_PER_TEXTURE_REPEAT,
    projectedPosition[1] / B05_WORLD_UNITS_PER_TEXTURE_REPEAT,
  ];
};

export const applyB05WorldScaleUv = (
  geometry: BufferGeometry,
  objectPosition: B05TextureVector3,
  objectRotationZ = 0,
): void => {
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const uvs = geometry.getAttribute("uv");

  for (let index = 0; index < positions.count; index += 1) {
    const [u, v] = projectB05TextureUv(
      [positions.getX(index), positions.getY(index), positions.getZ(index)],
      objectPosition,
      [normals.getX(index), normals.getY(index), normals.getZ(index)],
      objectRotationZ,
    );
    uvs.setXY(index, u, v);
  }
  uvs.needsUpdate = true;
};
