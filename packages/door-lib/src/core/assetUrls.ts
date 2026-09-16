import { DEFAULT_ASSET_BASE_URL } from "retro-horror-door-assets/base";
export { DEFAULT_ASSET_BASE_URL } from "retro-horror-door-assets/base";

export const resolveAssetUrl = (url: string | undefined, assetBaseUrl?: string) => {
  if (!url || assetBaseUrl === undefined || !url.startsWith(`${DEFAULT_ASSET_BASE_URL}/`)) return url;
  return `${assetBaseUrl.replace(/\/+$/, "")}/${url.slice(DEFAULT_ASSET_BASE_URL.length + 1)}`;
};
