import { registerHooks } from "node:module";

const ASSET_EXTENSION_PATTERN = /\.(glb|mp3|png|webp)$/;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (ASSET_EXTENSION_PATTERN.test(specifier)) {
      return {
        format: "module",
        shortCircuit: true,
        url: new URL(specifier, context.parentURL).href,
      };
    }

    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (ASSET_EXTENSION_PATTERN.test(url)) {
      return {
        format: "module",
        shortCircuit: true,
        source: `export default ${JSON.stringify(url)};`,
      };
    }

    return nextLoad(url, context);
  },
});
