import { microOpenClosePassSingleDoor1996Profile, motionStyleProfiles, wideSwingSingleDoor1996Profile, type EraAnimationProfile } from "./animationStyles.ts";
import type { DoorAnimationSetId, DoorAnimationStyleId, DoorEntranceMotion, DoorEntrancePreset } from "./types.ts";

export interface DoorAnimationSetMetadata {
  readonly id: DoorAnimationSetId;
  readonly label: string;
  readonly animationStyle: DoorAnimationStyleId;
  readonly motion: DoorEntranceMotion;
}

interface AnimationSet {
  metadata: Readonly<DoorAnimationSetMetadata>;
  profile: EraAnimationProfile;
}

const defineSet = (
  id: DoorAnimationSetId,
  label: string,
  animationStyle: DoorAnimationStyleId,
  motion: DoorEntranceMotion,
  profile: EraAnimationProfile
): [DoorAnimationSetId, AnimationSet] => [id, {
  metadata: Object.freeze({ id, label, animationStyle, motion }),
  profile,
}];

const sets = new Map<DoorAnimationSetId, AnimationSet>([
  defineSet("1996-single-micro-open-advance", "Micro-open and advance", "biohazard-1996", "hinge-single", motionStyleProfiles["biohazard-1996"]["hinge-single"]!),
  defineSet("1996-single-micro-open-close-pass-advance", "Micro-open and close passage", "biohazard-1996", "hinge-single", microOpenClosePassSingleDoor1996Profile),
  defineSet("1996-single-wide-swing-advance", "Wide swing and advance", "biohazard-1996", "hinge-single", wideSwingSingleDoor1996Profile),
  defineSet("1996-double-micro-open-hold-advance", "Double micro-open, hold and advance", "biohazard-1996", "hinge-double", motionStyleProfiles["biohazard-1996"]["hinge-double"]!),
  defineSet("1998-single-micro-open-hold-advance", "Micro-open, hold and advance", "biohazard-1998", "hinge-single", motionStyleProfiles["biohazard-1998"]["hinge-single"]!),
  defineSet("1999-single-closed-wait-advance", "Closed wait and advance", "biohazard-1999", "hinge-single", motionStyleProfiles["biohazard-1999"]["hinge-single"]!),
]);

// Defaults are only for older style-only callers. Released presets select a set.
const defaults: Record<DoorAnimationStyleId, Partial<Record<DoorEntranceMotion, DoorAnimationSetId>>> = {
  "biohazard-1996": {
    "hinge-single": "1996-single-micro-open-advance",
    "hinge-double": "1996-double-micro-open-hold-advance",
  },
  "biohazard-1998": { "hinge-single": "1998-single-micro-open-hold-advance" },
  "biohazard-1999": { "hinge-single": "1999-single-closed-wait-advance" },
};

const resolveSet = (preset: DoorEntrancePreset): AnimationSet | undefined => {
  if (!preset.animationStyle && !preset.animationSet) return undefined;
  const id = preset.animationSet ?? (preset.animationStyle && defaults[preset.animationStyle]?.[preset.motion]);
  if (!id) throw new Error(`No ${preset.animationStyle} animation set for ${preset.motion}`);
  const set = sets.get(id);
  if (!set) throw new Error(`Unknown animation set: ${id}`);
  if (set.metadata.animationStyle !== preset.animationStyle) {
    throw new Error(`Animation set ${id} requires style ${set.metadata.animationStyle}`);
  }
  if (set.metadata.motion !== preset.motion) {
    throw new Error(`Animation set ${id} requires motion ${set.metadata.motion}`);
  }
  return set;
};

/** Read-only resolved metadata; this does not enable arbitrary mount combinations. */
export const getDoorEntranceAnimationSet = (
  preset: DoorEntrancePreset
): Readonly<DoorAnimationSetMetadata> | undefined => resolveSet(preset)?.metadata;

export const getAnimationSetProfile = (preset: DoorEntrancePreset): EraAnimationProfile => {
  const set = resolveSet(preset);
  if (!set) throw new Error(`Preset ${preset.id} has no animation set or style`);
  const profile = set.profile;
  if ((preset.motion === "hinge-double") !== Boolean(profile.rightDoorAngle)) {
    throw new Error(`Animation set ${set.metadata.id} has incompatible leaf tracks`);
  }
  if (!preset.handleProfileId && profile.events.some(({ id }) => id === "handle-start")) {
    return {
      ...profile,
      events: profile.events.filter(({ id }) => id !== "handle-start"),
      handleAngle: [{ atMs: 0, value: 0 }, { atMs: profile.durationMs, value: 0 }],
    };
  }
  return profile;
};
