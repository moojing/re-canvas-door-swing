import { doorWood } from "../../assets/textures";

export type TextureId = "door-1";

export interface TextureMeta {
  url: string;
  label?: string;
  note?: string;
}

export const textureManifest: Record<TextureId, TextureMeta> = {
  "door-1": {
    url: doorWood,
    label: "Default Wood",
  },
};

export const textureIds: TextureId[] = Object.keys(
  textureManifest
) as TextureId[];

export const getTextureUrl = (id: TextureId): string => {
  const entry = textureManifest[id];
  if (!entry) {
    throw new Error(`Unknown texture id: ${id}`);
  }
  return entry.url;
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
