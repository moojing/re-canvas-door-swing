export interface DoorAnimationSoundWindow {
  soundStartProgress?: number;
  soundEndProgress?: number;
  soundSourceStartProgress?: number;
  soundSourceEndProgress?: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const mapAnimationProgressToSoundProgress = (
  animationProgress: number,
  soundWindow: DoorAnimationSoundWindow = {}
) => {
  const start = clamp(soundWindow.soundStartProgress ?? 0, 0, 1);
  const end = clamp(soundWindow.soundEndProgress ?? 1, 0, 1);
  const duration = Math.max(end - start, Number.EPSILON);

  return clamp((animationProgress - start) / duration, 0, 1);
};

export const getSoundPlaybackRate = (
  sourceDurationMs: number,
  animationDurationMs: number,
  soundWindow: DoorAnimationSoundWindow
): number | null => {
  const timelineSpan = animationDurationMs *
    ((soundWindow.soundEndProgress ?? 1) - (soundWindow.soundStartProgress ?? 0));
  const sourceSpan = sourceDurationMs *
    ((soundWindow.soundSourceEndProgress ?? 1) - (soundWindow.soundSourceStartProgress ?? 0));
  if (
    !Number.isFinite(timelineSpan) ||
    !Number.isFinite(sourceSpan) ||
    timelineSpan <= 0 ||
    sourceSpan <= 0
  ) return null;
  const rate = sourceSpan / timelineSpan;
  return Number.isFinite(rate) && rate > 0 ? rate : null;
};
