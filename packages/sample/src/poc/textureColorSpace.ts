import * as THREE from "three";

type LegacyTexture = THREE.Texture & {
  encoding?: number;
};

type ModernThree = typeof THREE & {
  SRGBColorSpace?: THREE.ColorSpace;
  sRGBEncoding?: number;
};

export const setTextureColorSpace = (texture: THREE.Texture) => {
  const runtime = THREE as ModernThree;
  if (runtime.SRGBColorSpace) {
    texture.colorSpace = runtime.SRGBColorSpace;
    return;
  }

  if (runtime.sRGBEncoding !== undefined) {
    (texture as LegacyTexture).encoding = runtime.sRGBEncoding;
  }
};
