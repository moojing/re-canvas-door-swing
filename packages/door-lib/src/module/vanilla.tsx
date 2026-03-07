import { createRoot, Root } from "react-dom/client";
import DoorEntrance from "./DoorEntrance";
import {
  DoorEntrancePresetId,
  DoorAnimationVariant,
  DoorEntranceHandle,
} from "./types";

interface MountDoorEntranceOptions {
  target: HTMLElement | null;
  preset?: DoorEntrancePresetId;
  variant?: DoorAnimationVariant;
  autoPlay?: boolean;
  className?: string;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  onReady?: () => void;
  textureUrl?: string;
  handleModelUrl?: string;
}

interface MountedDoorEntrance {
  play: (preset?: DoorEntrancePresetId) => void;
  reset: (preset?: DoorEntrancePresetId) => void;
  seek: (progress: number, preset?: DoorEntrancePresetId) => void;
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
    play: (preset) => handle?.play(preset),
    reset: (preset) => handle?.reset(preset),
    seek: (progress, preset) => handle?.seek(progress, preset),
    unmount: () => {
      root?.unmount();
      root = null;
      handle = null;
    },
  };
};
