import { createRoot, Root } from "react-dom/client";
import DoorEntrance from "./DoorEntrance";
import {
  DoorAnimationVariant,
  DoorEntranceHandle,
} from "./types";

interface MountDoorEntranceOptions {
  target: HTMLElement | null;
  variant?: DoorAnimationVariant;
  autoPlay?: boolean;
  className?: string;
  onComplete?: () => void;
  textureUrl?: string;
}

interface MountedDoorEntrance {
  play: () => void;
  reset: () => void;
  unmount: () => void;
}

export const mountDoorEntrance = (
  options: MountDoorEntranceOptions
): MountedDoorEntrance => {
  const { target, ...rest } = options;

  if (!target) {
    throw new Error("mountDoorEntrance: target element is required");
  }

  let handle: DoorEntranceHandle | null = null;
  let root: Root | null = null;

  const withHandle = (instance: DoorEntranceHandle | null) => {
    handle = instance;
  };

  root = createRoot(target);
  root.render(<DoorEntrance ref={withHandle} {...rest} />);

  return {
    play: () => handle?.play(),
    reset: () => handle?.reset(),
    unmount: () => {
      root?.unmount();
      root = null;
      handle = null;
    },
  };
};
