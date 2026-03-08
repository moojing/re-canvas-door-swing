import { createRoot, Root } from "react-dom/client";
import DoorEntrance from "./DoorEntrance";
import {
  DoorEntrancePresetId,
  DoorAnimationVariant,
  DoorEntranceHandle,
  DoorEntranceSoundState,
  HandleProfileId,
} from "./types";

interface MountDoorEntranceOptions {
  target: HTMLElement | null;
  preset?: DoorEntrancePresetId;
  variant?: DoorAnimationVariant;
  autoPlay?: boolean;
  className?: string;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  onSoundProgress?: (state: DoorEntranceSoundState) => void;
  onReady?: () => void;
  textureUrl?: string;
  handleModelUrl?: string;
  handleProfileId?: HandleProfileId;
  soundUrl?: string;
}

interface MountedDoorEntrance {
  play: (preset?: DoorEntrancePresetId) => void;
  stop: () => void;
  reset: (preset?: DoorEntrancePresetId) => void;
  seek: (progress: number, preset?: DoorEntrancePresetId) => void;
  seekSound: (progress: number) => void;
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
    stop: () => handle?.stop(),
    reset: (preset) => handle?.reset(preset),
    seek: (progress, preset) => handle?.seek(progress, preset),
    seekSound: (progress) => handle?.seekSound(progress),
    unmount: () => {
      root?.unmount();
      root = null;
      handle = null;
    },
  };
};
