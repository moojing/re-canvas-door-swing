import {
  createB05FrontResourceController,
  type B05FrontMaterialResource,
  type B05FrontResources,
  type B05FrontTextureResource,
} from "./b05FrontResources.ts";

export type B05FrontLoadImage = {
  onload: (() => void) | null;
  onerror: (() => void) | null;
  src: string;
};

export type B05FrontLoadOptions<
  Image extends B05FrontLoadImage,
  Texture extends B05FrontTextureResource,
  Material extends B05FrontMaterialResource,
> = Readonly<{
  url: string;
  createImage(): Image;
  createResources(image: Image): B05FrontResources<Texture, Material>;
  publish(resources: B05FrontResources<Texture, Material>): void;
}>;

export const startB05FrontLoad = <
  Image extends B05FrontLoadImage,
  Texture extends B05FrontTextureResource,
  Material extends B05FrontMaterialResource,
>({
  url,
  createImage,
  createResources,
  publish,
}: B05FrontLoadOptions<Image, Texture, Material>): (() => void) => {
  const controller = createB05FrontResourceController<Texture, Material>();
  const image = createImage();
  let cleanedUp = false;

  image.onload = () => {
    let resources: B05FrontResources<Texture, Material>;
    try {
      resources = createResources(image);
    } catch {
      return;
    }

    if (controller.accept(resources)) publish(resources);
  };
  image.onerror = () => {};
  image.src = url;

  return () => {
    if (cleanedUp) return;
    cleanedUp = true;
    image.onload = null;
    image.onerror = null;
    controller.cancel();
  };
};
