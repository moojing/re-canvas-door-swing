import type {
  DoorSurfaceTextureUrls,
  ResolvedDoorSurfaceTextureUrls,
} from "./types.ts";

export const resolveDoorSurfaceTextureUrls = (
  textures: DoorSurfaceTextureUrls,
  defaultTextureUrl: string
): ResolvedDoorSurfaceTextureUrls => {
  const frontTextureUrl =
    textures.frontTextureUrl ?? textures.textureUrl ?? defaultTextureUrl;

  return {
    frontTextureUrl,
    edgeTextureUrl: textures.edgeTextureUrl ?? frontTextureUrl,
    backTextureUrl: textures.backTextureUrl ?? frontTextureUrl,
  };
};

/** A separately authored back image is already laid out from the opposite viewpoint. */
export const shouldMirrorBackTextureX = ({
  frontMirrored,
  hasDistinctBackTexture,
}: {
  frontMirrored: boolean;
  hasDistinctBackTexture: boolean;
}): boolean => hasDistinctBackTexture ? frontMirrored : !frontMirrored;
