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
  leftDoorOffset?: TimelineKeyframe<Vector3Tuple>[];
  rightDoorOffset?: TimelineKeyframe<Vector3Tuple>[];
  handleAngle: TimelineKeyframe<number>[];
  cameraPosition: TimelineKeyframe<Vector3Tuple>[];
  cameraTarget: TimelineKeyframe<Vector3Tuple>[];
  fadeOut: TimelineKeyframe<number>[];
  soundStartMs: number;
  soundEndMs: number;
  soundFadeOutStartMs?: number;
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

// S9 is already open on its first visible transition frame. Do not invent a
// closed-door/knob phase from the S2 appearance thumbnail. Coordinates are fits.
export const openRunningPass1996Profile: EraAnimationProfile = {
  durationMs: 4640,
  events: [event("start", "Open door", 0), event("run-start", "Running approach", 2400),
    event("passage", "Passage", 4000), event("fade-start", "Fade starts", 4400),
    event("end", "End", 4640)],
  doorAngle: [at(0, 78 / 90), at(4640, 78 / 90)],
  handleAngle: [at(0, 0), at(4640, 0)],
  // One cubic path: slow start, 50% faster terminal speed than quadratic,
  // with no intermediate ease restart or velocity drop.
  cameraPosition: [
    { atMs: 0, value: [3, 0, 15.5], easing: "ease-in-cubic" },
    { atMs: 4640, value: [3, 0, 0.45] },
  ],
  cameraTarget: [{ atMs: 0, value: [3, 0, -4] }, { atMs: 4640, value: [3, 0, -4] }],
  fadeOut: [at(0, 0), at(4400, 0), at(4640, 1)],
  // The silent GIF cannot establish a running sound. Disable the default door
  // creak rather than attaching it to a stationary, already-open leaf.
  soundStartMs: 0,
  soundEndMs: 0,
  soundSourceStartProgress: 0,
  soundSourceEndProgress: 0,
};

export const knobApproachWaitPass1999Profile: EraAnimationProfile = {
  durationMs: 4800,
  events: [event("start", "Start", 0), event("approach-end", "Approach ends", 1920),
    event("handle-start", "Handle starts", 2720), event("opening-start", "Opening starts", 3040),
    event("slight-open", "Slight opening", 3200), event("hold-end", "Pause ends", 3520),
    event("open-end", "Door opens", 4400), event("passage", "Passage", 4480),
    event("fade-start", "Fade starts", 4560), event("end", "End", 4800)],
  doorAngle: [at(0, 0), at(3040, 0), at(3200, 6 / 90),
    { ...at(3520, 6 / 90), easing: "ease-in" }, at(4400, 1), at(4800, 1)],
  handleAngle: [at(0, 0), at(2720, 0), at(3040, radians(180)), at(3520, radians(180)), at(4000, 0), at(4800, 0)],
  cameraPosition: [camera(0, 8), { ...camera(320, 8), easing: "ease-in-out" }, camera(1920, 4.8),
    { ...camera(3520, 4.8), easing: "ease-in" }, camera(4800, 1.6)],
  cameraTarget: [{ atMs: 0, value: [0, 0, 0] }, { atMs: 4800, value: [0, 0, 0] }],
  fadeOut: [at(0, 0), at(4560, 0), at(4800, 1)],
  soundStartMs: 3040,
  soundEndMs: 4560,
  soundSourceStartProgress: 0.06,
  soundSourceEndProgress: 0.36,
};

// The reverse passage turns earlier and has a longer visible traversal.
export const knobApproachOutwardPass1999Profile: EraAnimationProfile = {
  durationMs: 5280,
  events: [event("start", "Start", 0), event("approach-end", "Approach ends", 1920),
    event("handle-start", "Handle starts", 2240), event("opening-start", "Opening starts", 2560),
    event("slight-open", "Slight opening", 2720), event("hold-end", "Pause ends", 3040),
    event("open-end", "Door opens", 4160), event("passage", "Passage", 4480),
    event("fade-start", "Fade starts", 4800), event("end", "End", 5280)],
  doorAngle: [at(0, 0), at(2560, 0), at(2720, 6 / 90),
    { ...at(3040, 6 / 90), easing: "ease-in" }, at(4160, 1), at(5280, 1)],
  handleAngle: [at(0, 0), at(2240, 0), at(2560, radians(180)), at(3040, radians(180)), at(3840, 0), at(5280, 0)],
  cameraPosition: [camera(0, 8), { ...camera(320, 8), easing: "ease-in-out" }, camera(1920, 4.8),
    { ...camera(3040, 4.8), easing: "ease-in" }, camera(5280, 1.6)],
  cameraTarget: [{ atMs: 0, value: [0, 0, 0] }, { atMs: 5280, value: [0, 0, 0] }],
  fadeOut: [at(0, 0), at(4800, 0), at(5280, 1)],
  soundStartMs: 2560,
  soundEndMs: 4800,
  soundSourceStartProgress: 0.06,
  soundSourceEndProgress: 0.36,
};

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
      camera(0, 6.9),
      { ...camera(500, 6.9), easing: "ease-in-out" },
      { ...camera(1800, 4.55), easing: "ease-out" },
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

const doubleDoor1996 = (): EraAnimationProfile => {
  const pictureEndMs = 5700;
  const durationMs = pictureEndMs + 1200;
  const profile = heldDoor({
    durationMs: pictureEndMs,
    approachEndMs: 1200,
    knobStartMs: 2750,
    knobEndMs: 3350,
    slightOpenMs: 4500,
    holdEndMs: 4700,
    openEndMs: 5400,
    passageMs: 5450,
    fadeStartMs: 5500,
    slightAngle: 6 / 90,
    approachZ: 5.3,
    openZ: 4.6,
    double: true,
  });
  // S3 retains broad faces through fade; its late approach has no full-open sprint.
  const opening = [
    at(0, 0), at(4320, 0), at(4500, 6 / 90),
    { ...at(4700, 6 / 90), easing: "ease-in" as const },
    at(pictureEndMs, 40 / 90), at(durationMs, 40 / 90),
  ];
  return {
    ...profile,
    durationMs,
    events: profile.events.flatMap((marker) => {
      if (marker.id === "end") return [
        event("black-start", "Black hold", pictureEndMs),
        { ...marker, atMs: durationMs },
      ];
      return [{ ...marker, ...(marker.id === "open-end" ? { label: "Late opening" } : {}) }];
    }),
    fadeOut: [at(0, 0), at(5500, 0), at(pictureEndMs, 1), at(durationMs, 1)],
    doorAngle: opening,
    handleAngle: [...profile.handleAngle, at(durationMs, 0)],
    // S3's right leaf stays closed; its apparent growth is camera motion.
    rightDoorAngle: [at(0, 0), at(durationMs, 0)],
    cameraPosition: ([
      { ...camera(0, 7.6), easing: "ease-out" },
      camera(1200, 5.3),
      // Let the micro-open leaf and camera pause together before advancing.
      { ...camera(4700, 5.3), easing: "ease-in" },
      // Spread the same travel over one second, including the image fade.
      camera(pictureEndMs, 4.45),
      camera(durationMs, 4.45),
    ] as TimelineKeyframe<Vector3Tuple>[]).map((frame) => ({
      ...frame,
      value: [0, 0.65, frame.value[2]],
    })),
    cameraTarget: [
      { atMs: 0, value: [0, 0.65, 0] },
      { atMs: durationMs, value: [0, 0.65, 0] },
    ],
    // Fit the opening clip to leaf motion, rather than the earlier knob action.
    soundStartMs: 4320,
    soundEndMs: 5500,
  };
};

// Profiles are selected by motion and explicit era, never by door or traversal ID.
export const motionStyleProfiles: Record<DoorAnimationStyleId,
  Partial<Record<DoorEntranceMotion, EraAnimationProfile>>> = {
  "biohazard-1996": {
    "hinge-single": eraStyleDefaults["biohazard-1996"],
    "hinge-double": doubleDoor1996(),
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


// Fixed closed framing and a short micro-open hold, followed by a full passage.
// Values fit the observed1998 single-door trajectory, not original engine coordinates.
export const fixedWaitMicroOpenPass1998Profile: EraAnimationProfile = {
  durationMs: 4800,
  events: [
    event("start", "Start", 0),
    event("closed-wait", "Closed wait", 1000),
    event("handle-start", "Handle starts", 1650),
    event("opening-start", "Opening starts", 2050),
    event("slight-open", "Slight opening", 2300),
    event("hold-end", "Pause ends", 2900),
    event("open-end", "Door opens", 4250),
    event("passage", "Passage", 4400),
    event("fade-start", "Fade starts", 4550),
    event("end", "End", 4800),
  ],
  doorAngle: [at(0, 0), at(2050, 0), at(2300, 6 / 90),
    { ...at(2900, 6 / 90), easing: "ease-in" }, at(4250, 1), at(4800, 1)],
  handleAngle: [at(0, 0), at(1650, 0), at(2050, radians(65)), at(2900, radians(65)), at(3650, 0), at(4800, 0)],
  cameraPosition: [camera(0, 5.5), { ...camera(2900, 5.5), easing: "ease-in" }, camera(4800, 1.5)],
  cameraTarget: [{ atMs: 0, value: [0, 0, 0] }, { atMs: 4800, value: [0, 0, 0] }],
  fadeOut: [at(0, 0), at(4550, 0), at(4800, 1)],
  soundStartMs: 2050,
  soundEndMs: 4550,
  soundSourceStartProgress: 0.06,
  soundSourceEndProgress: 0.36,
};


/** Center-split translation: approach, closed wait, slide and final advance. */
export const centerSplitSlide1996Profile: EraAnimationProfile = {
  durationMs: 5650,
  events: [event("start", "Start", 0), event("approach-end", "Approach ends", 1500),
    event("opening-start", "Sliding starts", 3350), event("advance-start", "Advance starts", 3600),
    event("open-end", "Doors open", 4350), event("fade-start", "Fade starts", 4600), event("fade-end", "Picture black", 5000),
    event("sound-fade-start", "Sound fade starts", 5250), event("end", "End", 5650)],
  doorAngle: [at(0, 0), at(5650, 0)],
  leftDoorOffset: [{ atMs: 0, value: [0, 0, 0] },
    { atMs: 3350, value: [0, 0, 0], easing: "ease-in-out" },
    { atMs: 4350, value: [-2.25, 0, 0] }, { atMs: 5650, value: [-2.25, 0, 0] }],
  rightDoorOffset: [{ atMs: 0, value: [0, 0, 0] },
    { atMs: 3350, value: [0, 0, 0], easing: "ease-in-out" },
    { atMs: 4350, value: [2.25, 0, 0] }, { atMs: 5650, value: [2.25, 0, 0] }],
  handleAngle: [at(0, 0), at(5650, 0)],
  cameraPosition: [camera(0, 10), camera(1500, 6.65),
    { ...camera(3600, 6.65), easing: "ease-in" }, camera(4700, 4), camera(5650, 4)],
  cameraTarget: [{ atMs: 0, value: [0, 0, 0] }, { atMs: 5650, value: [0, 0, 0] }],
  fadeOut: [at(0, 0), at(4600, 0), at(5000, 1), at(5650, 1)],
  soundStartMs: 3350,
  soundEndMs: 5650,
  soundFadeOutStartMs: 5250,
  soundSourceStartProgress: 1.64 / 3.940227,
  soundSourceEndProgress: 1,
};
