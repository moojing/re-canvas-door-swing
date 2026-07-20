import {
  createB06ResourceController,
  type B06DisposableResources,
} from "./b06FrontResources.ts";

export type B06FrontLoadImage = {
  onload: ((event: Event) => unknown) | null;
  onerror: ((event: Event | string) => unknown) | null;
  src: string;
};

export type B06FrontLoadOptions<
  Image extends B06FrontLoadImage,
  Resources extends B06DisposableResources,
> = Readonly<{
  url: string;
  createImage(): Image;
  createResources(image: NoInfer<Image>): Resources;
  publish(resources: Resources): void;
  onFailure(error: unknown): void;
}>;

export const startB06FrontLoad = <
  Image extends B06FrontLoadImage,
  Resources extends B06DisposableResources,
>({
  url,
  createImage,
  createResources,
  publish,
  onFailure,
}: B06FrontLoadOptions<Image, Resources>): (() => void) => {
  const controller = createB06ResourceController<Resources>();
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
    let resources: Resources;
    try {
      resources = createResources(image);
    } catch (error) {
      reportFailure(error);
      return;
    }
    if (controller.accept(resources)) publish(resources);
  };
  image.onerror = () => {
    reportFailure(new Error(`Unable to load B06 generated front asset: ${url}`));
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
