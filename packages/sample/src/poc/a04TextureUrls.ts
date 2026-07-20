import { resolveTextureUrl } from "./textureUrls.ts";

export const A04_TEXTURE_PATHS = Object.freeze([
  "textures/a04/sewer-gate-aged-albedo.png",
  "textures/a04/metal-plate-02-roughness.jpg",
  "textures/a04/green-metal-rust-roughness.jpg",
] as const);

export type A04TexturePath = (typeof A04_TEXTURE_PATHS)[number];

export const resolveA04TextureUrl = (
  baseUrl: string,
  texturePath: A04TexturePath,
): string => {
  return resolveTextureUrl(baseUrl, texturePath);
};
