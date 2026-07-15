import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

import {
  B05_WORLD_UNITS_PER_TEXTURE_REPEAT,
  applyB05WorldScaleUv,
  projectB05TextureUv,
} from "./b05TextureMapping.ts";

type Vector3 = readonly [number, number, number];

const triangleUvArea = (
  uvs: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  first: number,
  second: number,
  third: number,
): number => {
  const abU = uvs.getX(second) - uvs.getX(first);
  const abV = uvs.getY(second) - uvs.getY(first);
  const acU = uvs.getX(third) - uvs.getX(first);
  const acV = uvs.getY(third) - uvs.getY(first);
  return Math.abs(abU * acV - abV * acU) / 2;
};

test("gives every BoxGeometry triangle non-zero world-scale UV area", () => {
  const geometry = new THREE.BoxGeometry(2, 3, 0.4);
  applyB05WorldScaleUv(geometry, [1.25, -0.75, 0.5]);

  const uvs = geometry.getAttribute("uv");
  const indices = geometry.getIndex();
  assert.ok(indices);

  for (let offset = 0; offset < indices.count; offset += 3) {
    const area = triangleUvArea(
      uvs,
      indices.getX(offset),
      indices.getX(offset + 1),
      indices.getX(offset + 2),
    );
    assert.ok(area > 1e-9, `triangle ${offset / 3} has collapsed UVs`);
  }
});

test("rotates and translates BoxGeometry coordinates before dominant-axis projection", () => {
  const geometry = new THREE.BoxGeometry(2, 3, 0.4);
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const translation: Vector3 = [4, -3, 0.75];
  const rotationZ = Math.PI / 2;
  const cosine = Math.cos(rotationZ);
  const sine = Math.sin(rotationZ);

  for (let index = 0; index < positions.count; index += 1) {
    const localX = positions.getX(index);
    const localY = positions.getY(index);
    const localZ = positions.getZ(index);
    const normalX = normals.getX(index);
    const normalY = normals.getY(index);
    const normalZ = normals.getZ(index);
    const worldPosition: Vector3 = [
      translation[0] + localX * cosine - localY * sine,
      translation[1] + localX * sine + localY * cosine,
      translation[2] + localZ,
    ];
    const worldNormal: Vector3 = [
      normalX * cosine - normalY * sine,
      normalX * sine + normalY * cosine,
      normalZ,
    ];
    const absoluteNormal = worldNormal.map(Math.abs);
    const expected =
      absoluteNormal[2] >= absoluteNormal[0] && absoluteNormal[2] >= absoluteNormal[1]
        ? [worldPosition[0], worldPosition[1]]
        : absoluteNormal[1] >= absoluteNormal[0]
          ? [worldPosition[0], worldPosition[2]]
          : [worldPosition[2], worldPosition[1]];
    const actual = projectB05TextureUv(
      [localX, localY, localZ],
      translation,
      [normalX, normalY, normalZ],
      rotationZ,
    );

    assert.ok(Math.abs(actual[0] - expected[0] / B05_WORLD_UNITS_PER_TEXTURE_REPEAT) < 1e-9);
    assert.ok(Math.abs(actual[1] - expected[1] / B05_WORLD_UNITS_PER_TEXTURE_REPEAT) < 1e-9);
  }
});
