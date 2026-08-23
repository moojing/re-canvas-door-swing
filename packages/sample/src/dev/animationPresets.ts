export const INLINE_HEADER_ANIMATION_LIMIT = 2;

export const useAnimationDropdown = (count: number) =>
  count > INLINE_HEADER_ANIMATION_LIMIT;

export const isKnownAnimation = (
  animationId: string,
  animationIds: Iterable<string>
) => new Set(animationIds).has(animationId);

export const presetsForAnimation = <
  T extends { animation: string },
>(
  animationId: string,
  presets: readonly T[]
) => presets.filter((preset) => preset.animation === animationId);

export const resolveVerifierPreset = <
  T extends { id: string; animation: string },
>(
  animationId: string,
  presets: readonly T[],
  presetId?: string | null
) => {
  const matches = presetsForAnimation(animationId, presets);
  return matches.find((preset) => preset.id === presetId) ?? matches[0] ?? null;
};
