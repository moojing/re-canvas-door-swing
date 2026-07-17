export const B10_TEXTURE_PATHS = Object.freeze([
  "textures/b10/door.png",
  "textures/b10/lower.png",
  "textures/b10/lever-sign.png",
  "textures/b10/lever-box.png",
] as const);

export type B10TexturePath = (typeof B10_TEXTURE_PATHS)[number];

export const resolveB10TextureUrl = (
  baseUrl: string,
  texturePath: B10TexturePath,
): string => {
  const normalizedBase = baseUrl.split("/").filter(Boolean).join("/");
  return `/${normalizedBase ? `${normalizedBase}/` : ""}${texturePath}`;
};
