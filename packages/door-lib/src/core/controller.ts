import { getDoorAnimationConfig } from "./animationState.ts";
import { resolveDoorEntrancePresetSelection } from "./presets.ts";
import type {
  DoorAnimationConfig,
  DoorAnimationState,
  DoorEntrancePreset,
  DoorEntrancePresetId,
  DoorEntrancePresetSelection,
} from "./types.ts";

export interface DoorEntranceControllerOptions
  extends DoorEntrancePresetSelection {
  progress?: number;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
}

export interface DoorEntranceControllerResetOptions {
  preset?: DoorEntrancePresetId;
  progress?: number;
}

export interface DoorEntranceControllerSnapshot {
  preset: DoorEntrancePreset;
  animation: DoorAnimationConfig;
  progress: number;
  isPlaying: boolean;
  state: DoorAnimationState;
}

export interface DoorEntranceController {
  play: () => void;
  stop: () => void;
  reset: (options?: DoorEntranceControllerResetOptions) => void;
  seek: (progress: number) => void;
  getSnapshot: () => DoorEntranceControllerSnapshot;
}

const clampProgress = (progress: number) => {
  if (!Number.isFinite(progress)) return 0;

  return Math.min(Math.max(progress, 0), 1);
};

export const createDoorEntranceController = (
  options: DoorEntranceControllerOptions = {}
): DoorEntranceController => {
  let preset = resolveDoorEntrancePresetSelection(options);
  let animation = getDoorAnimationConfig(preset.animation);
  let progress = clampProgress(options.progress ?? 0);
  let isPlaying = false;
  let didComplete = progress >= 1;

  const syncPreset = (nextPresetId?: DoorEntrancePresetId) => {
    preset = nextPresetId
      ? resolveDoorEntrancePresetSelection({ preset: nextPresetId })
      : preset;
    animation = getDoorAnimationConfig(preset.animation);
  };

  const getSnapshot = (): DoorEntranceControllerSnapshot => {
    const easedProgress = clampProgress(animation.easing?.(progress) ?? progress);

    return {
      preset,
      animation,
      progress,
      isPlaying,
      state: animation.getState(easedProgress, {
        linearProgress: progress,
        handleProfileId: preset.handleProfileId,
      }),
    };
  };

  const seek = (nextProgress: number) => {
    progress = clampProgress(nextProgress);

    if (progress < 1) {
      didComplete = false;
    }

    options.onProgress?.(progress);

    if (progress >= 1 && !didComplete) {
      didComplete = true;
      isPlaying = false;
      options.onComplete?.();
    }
  };

  const reset = (resetOptions: DoorEntranceControllerResetOptions = {}) => {
    syncPreset(resetOptions.preset);
    progress = clampProgress(resetOptions.progress ?? 0);
    isPlaying = false;
    didComplete = progress >= 1;
  };

  const play = () => {
    if (progress >= 1) {
      progress = 0;
      didComplete = false;
    }

    isPlaying = true;
  };

  const stop = () => {
    isPlaying = false;
  };

  return {
    play,
    stop,
    reset,
    seek,
    getSnapshot,
  };
};
