import {
  createB05FrontResourceController,
  type B05FrontMaterialResource,
  type B05FrontResources,
  type B05FrontTextureResource,
} from "./b05FrontResources.ts";

export type B05FrontLoadImage = {
  onload: ((event: Event) => unknown) | null;
  onerror: ((event: Event | string) => unknown) | null;
  src: string;
};

export type B05FrontLoadOptions<
  Image extends B05FrontLoadImage,
  Texture extends B05FrontTextureResource,
  Material extends B05FrontMaterialResource,
> = Readonly<{
  url: string;
  createImage(): Image;
  createResources(image: NoInfer<Image>): B05FrontResources<Texture, Material>;
  publish(resources: B05FrontResources<Texture, Material>): void;
  onFailure(error: unknown): void;
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
  onFailure,
}: B05FrontLoadOptions<Image, Texture, Material>): (() => void) => {
  const controller = createB05FrontResourceController<Texture, Material>();
  const image = createImage();
  let cleanedUp = false;
  let failureReported = false;

  const reportFailure = (error: unknown): void => {
    if (cleanedUp || failureReported) return;
    failureReported = true;
    onFailure(error);
  };

  image.onload = () => {
    if (failureReported) return;

    let resources: B05FrontResources<Texture, Material>;
    try {
      resources = createResources(image);
    } catch (error) {
      reportFailure(error);
      return;
    }

    if (controller.accept(resources)) publish(resources);
  };
  image.onerror = () => {
    reportFailure(new Error(`Unable to load B05 generated front asset: ${url}`));
  };
  image.src = url;

  return () => {
    if (cleanedUp) return;
    cleanedUp = true;
    image.onload = null;
    image.onerror = null;
    controller.cancel();
  };
};
