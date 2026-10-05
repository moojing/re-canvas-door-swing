import type {
  DoorAnimationStyleId,
  DoorEntrancePreset,
  DoorEntrancePresetId,
  Vector3Tuple,
} from "./types.ts";
import type { TimelineKeyframe } from "./animationTimeline.ts";

export interface TimelineEvent {
  id: string;
  label: string;
  atMs: number;
}

export interface EraAnimationProfile {
  durationMs: number;
  events: TimelineEvent[];
  doorAngle: TimelineKeyframe<number>[];
  rightDoorAngle?: TimelineKeyframe<number>[];
  handleAngle: TimelineKeyframe<number>[];
  cameraPosition: TimelineKeyframe<Vector3Tuple>[];
  cameraTarget: TimelineKeyframe<Vector3Tuple>[];
  fadeOut: TimelineKeyframe<number>[];
  soundStartMs: number;
  soundEndMs: number;
  soundSourceStartProgress: number;
  soundSourceEndProgress: number;
}

const radians = (degrees: number) => (degrees * Math.PI) / 180;
const at = (atMs: number, value: number): TimelineKeyframe<number> => ({ atMs, value });
const camera = (atMs: number, z: number): TimelineKeyframe<Vector3Tuple> => ({
  atMs,
  value: [0, 0, z],
});
const event = (id: string, label: string, atMs: number): TimelineEvent => ({
  id,
  label,
  atMs,
});

interface HeldDoorTiming {
  durationMs: number;
  approachEndMs: number;
  slightOpenMs: number;
  holdEndMs: number;
  openEndMs: number;
  passageMs: number;
  fadeStartMs: number;
  slightAngle: number;
  approachZ: number;
  openZ: number;
  double?: boolean;
  knobStartMs?: number;
  knobEndMs?: number;
}

const heldDoor = (timing: HeldDoorTiming): EraAnimationProfile => {
  const {
    durationMs,
    approachEndMs,
    slightOpenMs,
    holdEndMs,
    openEndMs,
    passageMs,
    fadeStartMs,
    slightAngle,
    approachZ,
    openZ,
  } = timing;
  const doorAngle = [
    at(0, 0),
    at(slightOpenMs - 180, 0),
    at(slightOpenMs, slightAngle),
    at(holdEndMs, slightAngle),
    at(openEndMs, 1),
    at(durationMs, 1),
  ];
  const knobEnd = timing.knobEndMs;
  const handleAngle = knobEnd === undefined
    ? [at(0, 0), at(durationMs, 0)]
    : [
        at(0, 0),
        at(timing.knobStartMs!, 0),
        at(knobEnd, radians(65)),
        at(holdEndMs, radians(65)),
        at(openEndMs, 0),
        at(durationMs, 0),
      ];
  return {
    durationMs,
    events: [
      event("start", "Start", 0),
      event("approach-end", "Approach ends", approachEndMs),
      ...(timing.knobStartMs === undefined
        ? []
        : [event("handle-start", "Handle starts", timing.knobStartMs)]),
      event("opening-start", "Opening starts", slightOpenMs - 180),
      event("slight-open", "Slight opening", slightOpenMs),
      event("hold-end", "Pause ends", holdEndMs),
      event("open-end", "Door opens", openEndMs),
      event("passage", "Passage", passageMs),
      event("fade-start", "Fade starts", fadeStartMs),
      event("end", "End", durationMs),
    ],
    doorAngle,
    rightDoorAngle: timing.double
      ? [
          at(0, 0),
          at(slightOpenMs - 180, 0),
          at(slightOpenMs, slightAngle * 0.9),
          at(holdEndMs, slightAngle * 0.9),
          at(openEndMs, 1),
          at(durationMs, 1),
        ]
      : undefined,
    handleAngle,
    cameraPosition: [
      camera(0, 8),
      camera(approachEndMs, approachZ),
      camera(slightOpenMs, approachZ),
      camera(holdEndMs, approachZ),
      camera(openEndMs, openZ),
      camera(passageMs, 1.4),
      camera(durationMs, 0.5),
    ],
    cameraTarget: [
      { atMs: 0, value: [0, 0, 0] },
      { atMs: durationMs, value: [0, 0, 0] },
    ],
    fadeOut: [at(0, 0), at(fadeStartMs, 0), at(durationMs, 1)],
    soundStartMs: timing.knobStartMs ?? slightOpenMs - 180,
    soundEndMs: passageMs,
    soundSourceStartProgress: 0.06,
    soundSourceEndProgress: 0.36,
  };
};

const parkingDoor = (): EraAnimationProfile => {
  const durationMs = 4800;
  return {
    durationMs,
    events: [
      event("start", "Start", 0),
      event("approach-end", "Approach ends", 2300),
      event("closed-hold-end", "Closed wait ends", 3100),
      event("open-end", "Door opens", 4050),
      event("passage", "Passage", 4300),
      event("fade-start", "Fade starts", 4600),
      event("end", "End", durationMs),
    ],
    doorAngle: [at(0, 0), at(3100, 0), at(4050, 1), at(durationMs, 1)],
    handleAngle: [at(0, 0), at(durationMs, 0)],
    cameraPosition: [
      camera(0, 8),
      camera(2300, 6.6),
      camera(3100, 6.6),
      camera(4050, 5.7),
      camera(4300, 1.5),
      camera(durationMs, 0.4),
    ],
    cameraTarget: [
      { atMs: 0, value: [0, 0, 0] },
      { atMs: durationMs, value: [0, 0, 0] },
    ],
    fadeOut: [at(0, 0), at(4600, 0), at(durationMs, 1)],
    soundStartMs: 3100,
    soundEndMs: 4300,
    soundSourceStartProgress: 0.06,
    soundSourceEndProgress: 0.36,
  };
};

export const eraStyleDefaults: Record<DoorAnimationStyleId, EraAnimationProfile> = {
  "biohazard-1996": heldDoor({
    durationMs: 4800,
    approachEndMs: 2100,
    slightOpenMs: 3300,
    holdEndMs: 3700,
    openEndMs: 4300,
    passageMs: 4500,
    fadeStartMs: 4600,
    slightAngle: 0.08,
    approachZ: 6.9,
    openZ: 6.2,
  }),
  "biohazard-1998": heldDoor({
    durationMs: 4400,
    approachEndMs: 1000,
    slightOpenMs: 2000,
    holdEndMs: 2850,
    openEndMs: 3600,
    passageMs: 4000,
    fadeStartMs: 4250,
    slightAngle: 0.08,
    approachZ: 8,
    openZ: 6.3,
  }),
  "biohazard-1999": parkingDoor(),
};

const presetOverrides: Partial<Record<DoorEntrancePresetId, EraAnimationProfile>> = {
  "biohazard-1996-a02-yellow-panel-knob-door": heldDoor({
    durationMs: 5200,
    approachEndMs: 2750,
    knobStartMs: 3000,
    knobEndMs: 3550,
    slightOpenMs: 3700,
    holdEndMs: 4100,
    openEndMs: 4700,
    passageMs: 4900,
    fadeStartMs: 5000,
    slightAngle: 0.08,
    approachZ: 6.9,
    openZ: 6.2,
  }),
  "biohazard-1996-b02-blue-panel-double-door": heldDoor({
    durationMs: 4900,
    approachEndMs: 2500,
    knobStartMs: 2750,
    knobEndMs: 3350,
    slightOpenMs: 3500,
    holdEndMs: 4000,
    openEndMs: 4550,
    passageMs: 4700,
    fadeStartMs: 4780,
    slightAngle: 0.07,
    approachZ: 6.9,
    openZ: 6.2,
    double: true,
  }),
};

export const getEraProfile = (preset: DoorEntrancePreset): EraAnimationProfile => {
  if (!preset.animationStyle) {
    throw new Error(`Preset ${preset.id} has no animation style`);
  }
  const profile = presetOverrides[preset.id] ?? eraStyleDefaults[preset.animationStyle];
  if (preset.motion === "hinge-double" && !profile.rightDoorAngle) {
    throw new Error(`Preset ${preset.id} needs two door-angle tracks`);
  }
  if (preset.motion !== "hinge-double" && profile.rightDoorAngle) {
    throw new Error(`Preset ${preset.id} cannot use a double-door profile`);
  }
  return profile;
};
