declare module "*.png" {
  const url: string;
  export default url;
}

declare module "*.mp3" {
  const url: string;
  export default url;
}

declare module "*.glb" {
  const url: string;
  export default url;
}

declare module "three/examples/jsm/loaders/GLTFLoader" {
  export class GLTFLoader {
    constructor(manager?: unknown);
  }
}
