import * as THREE from "three";

/** Coarse sampling of our authored texture, with subtle 5-bit ordered dithering. */
export const applyRetroMaterial = (material: THREE.MeshStandardMaterial, edge = false) => {
  material.roughness = 1;
  material.metalness = 0;
  material.color.set("#e0d29a");
  material.onBeforeCompile = (shader) => {
    const mapFragment = THREE.ShaderChunk.map_fragment.replace(
      /texture2D\( map, (vUv|vMapUv) \)/,
      edge
        ? "texture2D( map, vec2(0.04, (floor($1.y * 384.0) + 0.5) / 384.0) )"
        : "texture2D( map, (floor($1 * vec2(192.0, 384.0)) + 0.5) / vec2(192.0, 384.0) )"
    );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <map_fragment>", mapFragment)
      .replace("#include <dithering_fragment>", `
        // A stable 2x2 ordered pattern; black stays black, including the silhouette.
        vec2 cell = mod(floor(gl_FragCoord.xy), 2.0);
        float threshold = (cell.x + cell.y * 2.0) / 4.0;
        vec3 sourceColor = clamp(gl_FragColor.rgb, 0.0, 1.0);
        vec3 quantizedColor = floor(sourceColor * 31.0 + threshold) / 31.0;
        gl_FragColor.rgb = mix(sourceColor, quantizedColor, 0.3);
      `);
  };
  material.customProgramCacheKey = () => `door-retro-soft-5bit-v2-${edge}`;
  material.needsUpdate = true;
};
