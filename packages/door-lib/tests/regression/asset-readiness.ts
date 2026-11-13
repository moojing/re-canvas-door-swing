// Test-only instrumentation inserted before the sample boot. Import the exact
// transformed module URLs used by that server, so prototypes are not duplicated.
export function assetReadinessScript(threeUrl: string, loaderUrl: string) {
  return `
const __three = await import(${JSON.stringify(threeUrl)});
const { GLTFLoader: __Loader } = await import(${JSON.stringify(loaderUrl)});
window.__animationAssets = { pending: 0, textures: 0, models: 0, attached: 0, errors: [] };
const __assets = window.__animationAssets;
const __geometries = new Set();
const __textureLoad = __three.TextureLoader.prototype.load;
__three.TextureLoader.prototype.load = function(url, loaded, progress, failed) {
  __assets.pending++;
  return __textureLoad.call(this, url, texture => {
    Promise.resolve(texture.image.decode?.()).then(() => {
      if (!(texture.image.naturalWidth > 0)) throw new Error('Empty decoded texture: ' + url);
      __assets.textures++; __assets.pending--;
    }).catch(error => { __assets.errors.push(String(error)); __assets.pending--; });
    loaded?.(texture);
  }, progress, error => { __assets.pending--; __assets.errors.push('Texture decode/load failed: ' + url); failed?.(error); });
};
const __parse = __Loader.prototype.parse;
__Loader.prototype.parse = function(data, base, loaded, failed) {
  __assets.pending++;
  const error = reason => { __assets.pending--; __assets.errors.push('GLB decode failed: ' + reason); failed?.(reason); };
  try { return __parse.call(this, data, base, gltf => {
    gltf.scene.traverse(node => { if (node.isMesh) __geometries.add(node.geometry); });
    __assets.models++; __assets.pending--; loaded(gltf);
  }, error); } catch (reason) { error(reason); }
};
const __add = __three.Object3D.prototype.add;
__three.Object3D.prototype.add = function(...objects) {
  const value = __add.apply(this, objects);
  let ancestor = this; while (ancestor.parent) ancestor = ancestor.parent;
  if (ancestor.isScene) for (const object of objects) object.traverse(node => {
    if (node.isMesh && __geometries.has(node.geometry)) __assets.attached++;
  });
  return value;
};
`;
}

export async function installAssetReadiness(page: import("@playwright/test").Page, sourceRoot: string) {
  const response = await page.request.get(`/@fs${sourceRoot}/packages/door-lib/src/handleModel.ts`);
  if (!response.ok()) throw new Error("Reference loader module did not resolve inside its source tree");
  const code = await response.text();
  const threeUrl = code.match(/import \* as THREE from ["']([^"']+)["']/)?.[1];
  const loaderUrl = code.match(/import \{ GLTFLoader \} from ["']([^"']+)["']/)?.[1];
  if (!threeUrl || !loaderUrl) throw new Error("Cannot instrument exact renderer loader modules");
  await page.route("**/src/sample/vanillaEntry.ts", async route => {
    const result = await route.fetch();
    const body = await result.text();
    if (!decodeURI(body).includes(`${sourceRoot}/packages/door-lib/src/index.ts`)) {
      throw new Error("Sample imports a runtime outside the selected source tree");
    }
    await route.fulfill({ response: result, body: assetReadinessScript(threeUrl, loaderUrl) + "\n" + body });
  });
}
