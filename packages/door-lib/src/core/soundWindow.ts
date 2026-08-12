export interface DoorAnimationSoundWindow {
  soundStartProgress?: number;
  soundEndProgress?: number;
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
