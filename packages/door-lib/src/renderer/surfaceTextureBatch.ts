import * as THREE from "three";

/** One door rebuild owns its loaded surface maps, never shared handle assets. */
export class SurfaceTextureBatch {
  private active = true;
  private readonly textures = new Set<THREE.Texture>();
  private readonly materials = new Set<THREE.MeshStandardMaterial>();
  private readonly pending = new Set<{ materials?: THREE.MeshStandardMaterial[] }>();

  constructor(
    private readonly loader: THREE.TextureLoader,
    private readonly render: () => void
  ) {}

  load(url: string, materials: THREE.MeshStandardMaterial[], flipY: boolean) {
    if (!this.active) return;
    // Clear pending material references on close, without pre-disposing a
    // texture that the loader will deliver later.
    const request: { materials?: THREE.MeshStandardMaterial[] } = { materials };
    this.pending.add(request);
    this.loader.load(url, (texture) => {
      this.pending.delete(request);
      const targets = request.materials;
      request.materials = undefined;
      if (!this.active || !targets) {
        texture.dispose();
        return;
      }

      this.textures.add(texture);
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.flipY = flipY;
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
      targets.forEach((material) => {
        this.materials.add(material);
        material.map = texture;
        material.needsUpdate = true;
      });
      this.render();
    }, undefined, () => {
      // Keep the existing untextured fallback on failure; no retry or render.
      this.pending.delete(request);
      request.materials = undefined;
    });
  }

  close(detach: () => void) {
    if (!this.active) return;
    this.active = false;
    detach();
    this.pending.forEach((request) => { request.materials = undefined; });
    this.pending.clear();
    this.materials.forEach((material) => {
      if (material.map && this.textures.has(material.map)) material.map = null;
    });
    this.materials.clear();
    this.textures.forEach((texture) => texture.dispose());
    this.textures.clear();
  }
}
