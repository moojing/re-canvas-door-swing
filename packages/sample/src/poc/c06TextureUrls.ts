export const C06_TEXTURE_PATHS = Object.freeze([
  "textures/c06/aged-brick-albedo.png",
  "textures/c06/broken-brick-core-albedo.png",
] as const);

export type C06TexturePath = (typeof C06_TEXTURE_PATHS)[number];

export const resolveC06TextureUrl = (
  baseUrl: string,
  texturePath: C06TexturePath,
): string => {
  const normalizedBase = baseUrl.split("/").filter(Boolean).join("/");
  return `/${normalizedBase ? `${normalizedBase}/` : ""}${texturePath}`;
};
