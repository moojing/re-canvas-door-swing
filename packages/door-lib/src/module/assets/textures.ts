export type TextureId = "door-1";

export interface TextureMeta {
  file: string;
  label?: string;
  note?: string;
}

export const textureManifest: Record<TextureId, TextureMeta> = {
  "door-1": {
    file: "textures/door-1.png",
    label: "Default Wood",
  },
};

export const textureIds: TextureId[] = Object.keys(
  textureManifest
) as TextureId[];

const normalizeBase = (base: string) => {
  if (!base) return "/";
  return base.endsWith("/") ? base : `${base}/`;
};

export const getTextureUrl = (
  id: TextureId,
  base: string = "/"
): string => {
  const entry = textureManifest[id];
  if (!entry) {
    throw new Error(`Unknown texture id: ${id}`);
  }
  const normalized = normalizeBase(base);
  return `${normalized}${entry.file}`;
};

export const pickTextureId = (
  seed?: number,
  pool: TextureId[] = textureIds
): TextureId => {
  if (pool.length === 0) {
    throw new Error("No textures available to pick from.");
  }
  const index =
    seed == null
      ? Math.floor(Math.random() * pool.length)
      : Math.abs(Math.floor(seed)) % pool.length;
  return pool[index];
};
