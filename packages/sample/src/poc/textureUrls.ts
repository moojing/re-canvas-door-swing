export const resolveTextureUrl = <T extends string>(
  baseUrl: string,
  texturePath: T,
): string => {
  const normalizedBase = baseUrl.split("/").filter(Boolean).join("/");
  return `/${normalizedBase ? `${normalizedBase}/` : ""}${texturePath}`;
};
