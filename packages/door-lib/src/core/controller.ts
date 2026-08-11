import { getDoorAnimationConfig } from "./animationState.ts";
import { getDoorEntrancePreset } from "./presets.ts";
import type {
  DoorAnimationConfig,
  DoorAnimationState,
  DoorEntrancePreset,
  DoorEntrancePresetId,
} from "./types.ts";

export interface DoorEntranceControllerOptions {
  preset?: DoorEntrancePresetId;
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
  let preset = getDoorEntrancePreset(options.preset);
  let animation = getDoorAnimationConfig(preset.variant);
  let progress = clampProgress(options.progress ?? 0);
  let isPlaying = false;
  let didComplete = progress >= 1;

  const syncPreset = (nextPresetId?: DoorEntrancePresetId) => {
    preset = getDoorEntrancePreset(nextPresetId);
    animation = getDoorAnimationConfig(preset.variant);
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
    syncPreset(resetOptions.preset ?? preset.id);
    progress = clampProgress(resetOptions.progress ?? 0);
    isPlaying = false;
    didComplete = progress >= 1;
  };

  const play = () => {
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
