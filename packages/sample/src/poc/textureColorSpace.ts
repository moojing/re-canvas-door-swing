import * as THREE from "three";

type LegacyTexture = THREE.Texture & {
  colorSpace?: string;
  encoding?: number;
};

type ModernThree = typeof THREE & {
  SRGBColorSpace?: string;
  sRGBEncoding?: number;
};

export type TextureColorSpaceRuntime = {
  SRGBColorSpace?: string;
  sRGBEncoding?: number;
};

export const setTextureColorSpace = (
  texture: THREE.Texture,
  runtime: TextureColorSpaceRuntime = THREE as ModernThree,
) => {
  if (runtime.SRGBColorSpace) {
    (texture as LegacyTexture).colorSpace = runtime.SRGBColorSpace;
    return;
  }

  if (runtime.sRGBEncoding !== undefined) {
    (texture as LegacyTexture).encoding = runtime.sRGBEncoding;
  }
};
