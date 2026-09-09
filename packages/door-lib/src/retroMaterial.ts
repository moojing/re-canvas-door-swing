import * as THREE from "three";

/** Coarse sampling of our authored texture, with subtle 5-bit ordered dithering. */
export const applyRetroMaterial = (
  material: THREE.MeshStandardMaterial,
  edge = false,
  rasterSize?: THREE.Vector2,
  softHighlights = false
) => {
  material.onBeforeCompile = (shader) => {
    if (rasterSize) {
      shader.uniforms.retroRasterSize = { value: rasterSize };
      shader.vertexShader = `uniform vec2 retroRasterSize;\n${shader.vertexShader}`
        .replace("#include <project_vertex>", `
          #include <project_vertex>
          // Quantize projected positions, not time: resting geometry stays still.
          // A half-pixel step keeps the wobble subtle at the soft output resolution.
          if (gl_Position.w > 0.0) {
            vec2 ndc = gl_Position.xy / gl_Position.w;
            gl_Position.xy = floor(ndc * retroRasterSize + 0.5)
              / retroRasterSize * gl_Position.w;
          }
        `);
    }
    let mapFragment = THREE.ShaderChunk.map_fragment.replace(
      /texture2D\( map, (vUv|vMapUv) \)/,
      edge
        ? "texture2D( map, vec2(0.04, (floor($1.y * 384.0) + 0.5) / 384.0) )"
        : "texture2D( map, (floor($1 * vec2(192.0, 384.0)) + 0.5) / vec2(192.0, 384.0) )"
    );
    if (softHighlights && !edge) {
      mapFragment = mapFragment.replace(
        /vec4 texelColor = ([^;]+);/,
        `vec4 texelColor = $1;
         vec2 highlightUv = vUv;
         vec2 highlightStep = vec2(1.0 / 192.0, 1.0 / 384.0);
         vec3 softLight = (
           texture2D(map, highlightUv + vec2(highlightStep.x, 0.0)).rgb +
           texture2D(map, highlightUv - vec2(highlightStep.x, 0.0)).rgb +
           texture2D(map, highlightUv + vec2(0.0, highlightStep.y)).rgb +
           texture2D(map, highlightUv - vec2(0.0, highlightStep.y)).rgb
         ) * 0.25;
         float highlight = smoothstep(0.32, 0.72, dot(softLight, vec3(0.2126, 0.7152, 0.0722)));
         texelColor.rgb = mix(texelColor.rgb, softLight, 0.18);
         texelColor.rgb += vec3(0.10) * highlight;`
      );
    }
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <map_fragment>", mapFragment)
      .replace("#include <dithering_fragment>", `
        // A stable 2x2 ordered pattern; black stays black, including the silhouette.
        vec2 cell = mod(floor(gl_FragCoord.xy), 2.0);
        float threshold = (cell.x + cell.y * 2.0) / 4.0;
        vec3 sourceColor = clamp(gl_FragColor.rgb, 0.0, 1.0);
        // Lift material midtones while retaining true black and white endpoints.
        sourceColor += 0.45 * sourceColor * (1.0 - sourceColor);
        vec3 quantizedColor = floor(sourceColor * 31.0 + threshold) / 31.0;
        gl_FragColor.rgb = mix(sourceColor, quantizedColor, 0.3);
      `);
  };
  material.customProgramCacheKey = () => `door-retro-soft-5bit-v4-${edge}-${!!rasterSize}-${softHighlights}`;
  material.needsUpdate = true;
};
