import type {
  DoorAnimationStyleId,
  DoorEntranceMotion,
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
      { ...camera(0, 5.5), easing: "ease-out" },
      camera(2300, 4.5),
      { ...camera(3100, 4.5), easing: "ease-in" },
      camera(durationMs, 2.3),
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

// Construct the shared single-door continuous approach, opening and fade tracks.
const continuousApproachSingleDoor = (
  timing: Omit<HeldDoorTiming, "double">,
  initialZ = 9,
  initialTargetY = 0.2,
  driftMidMs = (timing.approachEndMs + timing.slightOpenMs) / 2
): EraAnimationProfile => {
  const { durationMs, approachEndMs, slightOpenMs, holdEndMs } = timing;
  const profile = heldDoor(timing);
  return {
    ...profile,
    events: profile.events.map((marker) => ({
      ...marker,
      label: marker.id === "approach-end" ? "Initial approach ends"
        : marker.id === "hold-end" ? "Opening resumes"
        : marker.id === "open-end" ? "Late opening"
        : marker.id === "passage" ? "Close approach" : marker.label,
    })),
    doorAngle: [
      at(0, 0), at(slightOpenMs - 180, 0), at(slightOpenMs, 10 / 90),
      at(holdEndMs, 10 / 90), at(durationMs, 30 / 90),
    ],
    cameraPosition: [
      { ...camera(0, initialZ), easing: "ease-out" },
      camera(approachEndMs, 6.1), camera(driftMidMs, 6.05), camera(slightOpenMs, 6.02),
      { ...camera(holdEndMs, 6.02), easing: "ease-in" }, camera(durationMs, 3.95),
    ],
    cameraTarget: [
      { atMs: 0, value: [0, initialTargetY, 0] },
      { atMs: approachEndMs, value: [0, 0.4, 0] },
      { atMs: durationMs, value: [0, 0.4, 0] },
    ],
  };
};

const singleDoor1996 = (): EraAnimationProfile => continuousApproachSingleDoor({
  durationMs: 5000,
  approachEndMs: 1200,
  knobStartMs: 2600,
  knobEndMs: 3100,
  slightOpenMs: 3300,
  holdEndMs: 3700,
  openEndMs: 4300,
  passageMs: 4500,
  fadeStartMs: 4800,
  slightAngle: 10 / 90,
  approachZ: 6.1,
  openZ: 4.98,
}, 9, 0.2, 2100);

// Reusable close passage: retain the micro hold, then fit the narrow front / visible edge.
const microOpenClosePassBase = singleDoor1996();
export const microOpenClosePassSingleDoor1996Profile: EraAnimationProfile = {
  ...microOpenClosePassBase,
  doorAngle: [
    ...microOpenClosePassBase.doorAngle.slice(0, -1),
    at(4800, 64 / 90), at(microOpenClosePassBase.durationMs, 64 / 90),
  ],
  cameraPosition: [
    ...microOpenClosePassBase.cameraPosition.slice(0, -1),
    camera(4800, 3.95), camera(microOpenClosePassBase.durationMs, 3.95),
  ],

};

export const eraStyleDefaults: Record<DoorAnimationStyleId, EraAnimationProfile> = {
  "biohazard-1996": singleDoor1996(),
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

// Profiles are selected by motion and explicit era, never by door or traversal ID.
export const motionStyleProfiles: Record<DoorAnimationStyleId,
  Partial<Record<DoorEntranceMotion, EraAnimationProfile>>> = {
  "biohazard-1996": {
    "hinge-single": eraStyleDefaults["biohazard-1996"],
    "hinge-double": heldDoor({
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
  },
  "biohazard-1998": { "hinge-single": eraStyleDefaults["biohazard-1998"] },
  "biohazard-1999": { "hinge-single": eraStyleDefaults["biohazard-1999"] },
};


export const wideSwingSingleDoor1996Profile: EraAnimationProfile = {
  durationMs: 4700,
  events: [
    event("start", "Start", 0),
    event("approach-end", "Initial approach ends", 1350),
    event("opening-start", "Opening starts", 3350),
    event("slight-open", "Slight opening", 3550),
    event("opening-resumes", "Opening accelerates", 3650),
    event("open-end", "Late opening", 4500),
    event("passage", "Close approach", 4560),
    event("fade-start", "Fade starts", 4580),
    event("end", "End", 4700),
  ],
  doorAngle: [
    at(0, 0), at(3350, 0), at(3550, 3 / 90), at(3650, 6 / 90),
    at(3950, 17 / 90), at(4150, 30 / 90), at(4550, 65 / 90), at(4700, 72 / 90),
  ],
  handleAngle: [at(0, 0), at(4700, 0)],
  cameraPosition: [
    { ...camera(0, 5.8), easing: "ease-out" },
    camera(1350, 4.5), camera(3350, 4.48), camera(3550, 4.46),
    camera(3650, 4.4), camera(3950, 4.25), camera(4150, 4.1),
    camera(4350, 4), camera(4450, 3.93), camera(4550, 3.85), camera(4700, 3.8),
  ],
  cameraTarget: [
    { atMs: 0, value: [0, 0, 0] },
    { atMs: 1350, value: [0, 0, 0] },
    { atMs: 4700, value: [0, 0, 0] },
  ],
  fadeOut: [at(0, 0), at(4580, 0), at(4700, 1)],
  soundStartMs: 3350,
  soundEndMs: 4560,
  soundSourceStartProgress: 0.06,
  soundSourceEndProgress: 0.36,
};
