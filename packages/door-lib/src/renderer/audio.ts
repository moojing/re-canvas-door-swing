import type { DoorAnimationConfig, DoorEntranceSoundState } from "../core/types.ts";
import { getSoundPlaybackRate, getSoundVolume } from "../core/soundWindow.ts";
import { clampProgress } from "./progress.ts";

interface DoorAudioOptions {
  parent: HTMLElement;
  sourceUrl?: string;
  getConfig: () => DoorAnimationConfig;
  hasAnimationStyle: () => boolean;
  getProgress: () => number;
  isAnimating: () => boolean;
  onSoundProgress?: (state: DoorEntranceSoundState) => void;
}

export const createDoorAudio = ({
  parent,
  sourceUrl,
  getConfig,
  hasAnimationStyle,
  getProgress,
  isAnimating,
  onSoundProgress,
}: DoorAudioOptions) => {
  const audio = document.createElement("audio");
  let resolvedSoundUrl = sourceUrl;
  let soundFrame: number | null = null;
  let audioDelayTimer: number | null = null;
  let soundStarted = false;
  let soundPlayGeneration = 0;
  let soundUnlocked = false;
  let soundUnlocking: Promise<boolean> | null = null;
  let disposed = false;

  if (resolvedSoundUrl) {
    audio.src = resolvedSoundUrl;
    audio.preload = "auto";
    parent.append(audio);
  }

  const emitSoundProgress = () => {
    if (!resolvedSoundUrl) {
      onSoundProgress?.({
        enabled: false,
        ready: false,
        currentTimeMs: 0,
        durationMs: 0,
        progress: 0,
      });
      return;
    }

    const ready = Number.isFinite(audio.duration) && audio.duration > 0;
    const durationMs = ready ? audio.duration * 1000 : 0;
    const currentTimeMs = ready ? audio.currentTime * 1000 : 0;
    onSoundProgress?.({
      enabled: true,
      ready,
      currentTimeMs,
      durationMs,
      progress: ready ? clampProgress(audio.currentTime / audio.duration) : 0,
    });
  };

  const stopSoundLoop = () => {
    if (soundFrame !== null) {
      cancelAnimationFrame(soundFrame);
      soundFrame = null;
    }
  };

  const startSoundLoop = () => {
    stopSoundLoop();
    const tick = () => {
      if (audio.paused || audio.ended) {
        soundFrame = null;
        emitSoundProgress();
        return;
      }
      emitSoundProgress();
      soundFrame = requestAnimationFrame(tick);
    };
    soundFrame = requestAnimationFrame(tick);
  };

  const clearAudioDelayTimer = () => {
    if (audioDelayTimer !== null) {
      window.clearTimeout(audioDelayTimer);
      audioDelayTimer = null;
    }
  };

  const getSoundWindow = (config = getConfig()) => {
    const startProgress = clampProgress(config.soundStartProgress ?? 0.18);
    const endProgress = Math.min(
      Math.max(config.soundEndProgress ?? 1, startProgress),
      1
    );
    const sourceStartProgress = clampProgress(config.soundSourceStartProgress ?? 0);
    const sourceEndProgress = Math.min(
      Math.max(
        config.soundSourceEndProgress ?? 1,
        sourceStartProgress + Number.EPSILON
      ),
      1
    );
    return {
      startProgress,
      endProgress,
      sourceStartProgress,
      sourceEndProgress,
    };
  };

  const updateSoundPlaybackRate = (config = getConfig()) => {
    if (!hasAnimationStyle()) {
      audio.playbackRate = 1;
      return true;
    }
    const rate = getSoundPlaybackRate(audio.duration * 1000, config.duration, config);
    if (rate === null) return false;
    try {
      audio.playbackRate = rate;
    } catch {
      // Native media rate limits vary by browser. Keep the exact mapping when
      // supported, and skip this sound window when the browser rejects it.
      audio.pause();
      return false;
    }
    audio.preservesPitch = true;
    return true;
  };

  const syncSoundToTimelineProgress = (
    timelineProgress: number,
    config = getConfig()
  ) => {
    if (!resolvedSoundUrl || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      emitSoundProgress();
      return;
    }

    const {
      startProgress,
      endProgress,
      sourceStartProgress,
      sourceEndProgress,
    } = getSoundWindow(config);

    let sourceProgress = 0;
    if (timelineProgress >= endProgress) {
      sourceProgress = sourceEndProgress;
    } else if (timelineProgress >= 0 && timelineProgress < startProgress) {
      sourceProgress =
        sourceStartProgress *
        clampProgress(timelineProgress / Math.max(startProgress, Number.EPSILON));
    } else if (timelineProgress >= startProgress) {
      const normalized = clampProgress(
        (timelineProgress - startProgress) /
          Math.max(endProgress - startProgress, Number.EPSILON)
      );
      sourceProgress =
        sourceStartProgress +
        normalized * (sourceEndProgress - sourceStartProgress);
    }

    audio.currentTime = audio.duration * sourceProgress;
    emitSoundProgress();
  };

  const pauseSound = () => {
    soundPlayGeneration += 1;
    stopSoundLoop();
    audio.pause();
    soundStarted = false;
  };

  const unlockSound = () => {
    if (!resolvedSoundUrl || soundUnlocked) {
      return Promise.resolve(soundUnlocked);
    }

    if (soundUnlocking) return soundUnlocking;

    const generation = soundPlayGeneration;
    const wasMuted = audio.muted;
    audio.muted = true;
    soundUnlocking = audio
      .play()
      .then(() => {
        audio.pause();
        if (!disposed && generation === soundPlayGeneration) {
          audio.currentTime = 0;
        }
        audio.muted = wasMuted;
        soundUnlocked = true;
        return true;
      })
      .catch(() => {
        audio.muted = wasMuted;
        return false;
      })
      .finally(() => {
        soundUnlocking = null;
      });

    return soundUnlocking;
  };

  const resetSound = () => {
    soundPlayGeneration += 1;
    audio.pause();
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = 0;
    }
    soundStarted = false;
    emitSoundProgress();
  };

  const playSoundForTimeline = (startProgress: number, config = getConfig()) => {
    const generation = ++soundPlayGeneration;
    clearAudioDelayTimer();
    soundStarted = false;

    if (!resolvedSoundUrl) {
      emitSoundProgress();
      return;
    }

    const { startProgress: soundStartProgress, endProgress: soundEndProgress } = getSoundWindow(config);
    if (startProgress >= soundEndProgress) {
      syncSoundToTimelineProgress(startProgress, config);
      return;
    }
    const playNow = () => {
      const startPlayback = () => {
        if (generation !== soundPlayGeneration || disposed) return;
        if (!updateSoundPlaybackRate(config)) return;
        syncSoundToTimelineProgress(
          Math.max(startProgress, soundStartProgress),
          config
        );
        void audio
          .play()
          .then(() => {
            if (generation !== soundPlayGeneration || disposed || !isAnimating()) {
              if (!isAnimating()) audio.pause();
              return;
            }
            syncSoundToTimelineProgress(getProgress(), config);
            soundStarted = true;
            startSoundLoop();
          })
          .catch(() => {
            soundStarted = false;
          });
      };

      if (!soundUnlocked) {
        void unlockSound().then((unlocked) => {
          if (unlocked && !disposed && isAnimating() && generation === soundPlayGeneration) startPlayback();
        });
        return;
      }

      startPlayback();
    };

    if (startProgress >= soundStartProgress) {
      playNow();
      return;
    }

    syncSoundToTimelineProgress(startProgress, config);
    audioDelayTimer = window.setTimeout(
      playNow,
      (soundStartProgress - startProgress) * config.duration
    );
  };

  return {
    emitSoundProgress,
    clearAudioDelayTimer,
    pauseSound,
    resetSound,
    unlockSound,
    syncSoundToTimelineProgress,
    updateSoundPlaybackRate,
    playSoundForTimeline,
    setVolume: (progress: number, config: DoorAnimationConfig) => {
      audio.volume = getSoundVolume(progress, config);
    },
    setSource: (sourceUrl?: string) => {
      resolvedSoundUrl = sourceUrl;
      if (resolvedSoundUrl && audio.getAttribute("src") !== resolvedSoundUrl) {
        audio.src = resolvedSoundUrl;
        audio.preload = "auto";
        soundUnlocked = false;
      }
    },
    updateTimeline: (linearProgress: number, config: DoorAnimationConfig) => {
      if (linearProgress >= getSoundWindow(config).endProgress && !audio.paused) {
        pauseSound();
      }
      if (!soundStarted) {
        syncSoundToTimelineProgress(linearProgress, config);
      }
    },
    seekSound: (nextProgress: number) => {
      clearAudioDelayTimer();
      pauseSound();
      if (!resolvedSoundUrl || !Number.isFinite(audio.duration) || audio.duration <= 0) {
        emitSoundProgress();
        return;
      }
      audio.currentTime = audio.duration * clampProgress(nextProgress);
      soundStarted = false;
      emitSoundProgress();
    },
    beginDispose: () => {
      disposed = true;
      soundPlayGeneration += 1;
    },
    stopSoundLoop,
    remove: () => {
      audio.pause();
      audio.remove();
    },
    // Register at the same mount phase as the public lifecycle coordinator.
    attachListeners: () => {
      audio.addEventListener("loadedmetadata", () => {
        updateSoundPlaybackRate();
        emitSoundProgress();
      });
      audio.addEventListener("canplay", emitSoundProgress);
      audio.addEventListener("timeupdate", emitSoundProgress);
      audio.addEventListener("ended", () => {
        soundStarted = false;
        stopSoundLoop();
        emitSoundProgress();
      });
      audio.addEventListener("pause", () => {
        soundStarted = false;
        stopSoundLoop();
        emitSoundProgress();
      });
      audio.addEventListener("play", () => {
        soundStarted = true;
        startSoundLoop();
        emitSoundProgress();
      });
    },
  };
};
