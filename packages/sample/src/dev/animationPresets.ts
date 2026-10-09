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


/** A traversal variant belongs to its primary preset's catalog card. */
export const catalogPresets = <T extends { id: string; variantOf?: string }>(
  presets: readonly T[]
) => presets.filter((preset) => !preset.variantOf);

export const variantsForPreset = <T extends { id: string; variantOf?: string }>(
  preset: T,
  presets: readonly T[]
) => {
  const primaryId = preset.variantOf ?? preset.id;
  return presets.filter((candidate) => candidate.id === primaryId || candidate.variantOf === primaryId);
};
