import type {
  DoorAnimationStyleId,
  DoorEntranceMotion,
  Vector3Tuple,
} from "./types.ts";
import type { CameraPath } from "./cameraPath.ts";
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
  rightHandleAngle?: TimelineKeyframe<number>[];
  cameraPath: CameraPath;
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
// Screen framing is fitted per reusable set; level closed shots keep position
// and target at the same height instead of tilting a centered camera upward.
const framedCamera = (atMs: number, z: number, y: number, x = 0): TimelineKeyframe<Vector3Tuple> => ({
  atMs, value: [x, y, z],
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
  doorAngle: [at(0, 87.2 / 90), at(4640, 87.2 / 90)],
  handleAngle: [at(0, 0), at(4640, 0)],
  // Local MP4 silhouette fit: narrow already-open leaf, lower mid-shot.
  // One cubic path: slow start, 50% faster terminal speed than quadratic,
  // with no intermediate ease restart or velocity drop.
  cameraPath: {
    position: [
      { atMs: 0, value: [3.366, 1.046, 13.67], easing: "ease-in-cubic" },
      { atMs: 4640, value: [3.366, 1.046, 0.45] },
    ],
    target: [{ atMs: 0, value: [3.366, 1.046, -4] }, { atMs: 4640, value: [3.366, 1.046, -4] }],
  },
  fadeOut: [at(0, 0), at(4400, 0), at(4640, 1)],
  // The silent GIF cannot establish a running sound. Disable the default door
  // creak rather than attaching it to a stationary, already-open leaf.
  soundStartMs: 0,
  soundEndMs: 0,
  soundSourceStartProgress: 0,
  soundSourceEndProgress: 0,
};

// MP4 file times are offset by3.04s for this passage. The slight opening
// happens before the old GIF-derived opening marker, then holds briefly.
export const knobApproachWaitPass1999Profile: EraAnimationProfile = {
  durationMs: 4800,
  events: [event("start", "Start", 0), event("approach-end", "Approach ends", 1560),
    event("handle-start", "Handle starts", 1840), event("opening-start", "Opening starts", 2160),
    event("slight-open", "Slight opening", 2440), event("hold-end", "Pause ends", 2920),
    event("open-end", "Door opens", 4400), event("passage", "Passage", 4480),
    event("fade-start", "Fade starts", 4560), event("end", "End", 4800)],
  doorAngle: [at(0, 0), at(2160, 0), at(2440, 4 / 90),
    { ...at(2920, 4 / 90), easing: "ease-in" }, at(4080, 69 / 90),
    at(4400, 1), at(4800, 1)],
  handleAngle: [at(0, 0), at(1840, 0), at(2160, radians(180)),
    at(2920, radians(180)), at(4000, 0), at(4800, 0)],
  cameraPath: {
    position: [framedCamera(0, 6.4, 1.103, 0.19),
      { ...framedCamera(240, 6.4, 1.103, 0.19), easing: "ease-in-out" },
      framedCamera(1560, 4.217, 1.103, 0.19),
      { ...framedCamera(2920, 4.217, 1.103, 0.19), easing: "ease-in" },
      // Quadratic departure reaches the following linear segment's velocity:
      // 2 * (4.217 - 4.046666...) / 0.28 = (4.046666... - 2.1) / 1.6.
      framedCamera(3200, 4.046666666666667, 1.103, 0.19),
      framedCamera(4800, 2.1, 1.103, 0.19)],
    target: [{ atMs: 0, value: [-0.234, 0.622, 0] },
      { atMs: 500, value: [-0.234, 0.622, 0], easing: "ease-in-out" },
      { atMs: 1560, value: [-0.667, 0.622, 0] },
      { atMs: 4800, value: [-0.667, 0.622, 0] }],
  },
  fadeOut: [at(0, 0), at(4560, 0), at(4800, 1)],
  soundStartMs: 2160,
  soundEndMs: 4560,
  soundSourceStartProgress: 0.06,
  soundSourceEndProgress: 0.36,
};

// The opposite face has its own off-center hold and a leftward passage.
// Keep the camera in front of the outward leaf, avoiding the old close-up
// caused by crossing its near plane while most of the source is already dark.
export const knobApproachOutwardPass1999Profile: EraAnimationProfile = {
  durationMs: 5280,
  events: [event("start", "Start", 0), event("approach-end", "Approach ends", 1600),
    event("handle-start", "Handle starts", 1680), event("opening-start", "Opening starts", 2000),
    event("slight-open", "Slight opening", 2320), event("hold-end", "Pause ends", 2920),
    event("open-end", "Door opens", 4240), event("passage", "Passage", 4540),
    event("fade-start", "Fade starts", 4800), event("end", "End", 5280)],
  doorAngle: [at(0, 0), at(2000, 0), at(2320, 4 / 90),
    { ...at(2920, 4 / 90), easing: "ease-in-out" }, at(4240, 1), at(5280, 1)],
  handleAngle: [at(0, 0), at(1680, 0), at(2000, radians(180)),
    at(2920, radians(180)), at(3840, 0), at(5280, 0)],
  cameraPath: {
    position: [framedCamera(0, 6.585, 1.116, 0.045),
      { ...framedCamera(80, 6.585, 1.116, 0.045), easing: "ease-in-out" },
      framedCamera(1600, 4.132, 1.116, 0.045), framedCamera(2920, 4.132, 1.116, 0.045),
      framedCamera(3640, 4.12, 1.116, 0.045), framedCamera(4240, 4, 1.116, 0.045),
      framedCamera(5280, 4, 1.116, 0.045)],
    target: [{ atMs: 0, value: [-0.2585, 0.614, 0] },
      { atMs: 400, value: [-0.2585, 0.614, 0], easing: "ease-in-out" },
      { atMs: 1600, value: [0.251, 0.614, 0] },
      { atMs: 3640, value: [0.251, 0.614, 0] },
      { atMs: 4240, value: [0.75, 0.614, 0] },
      { atMs: 4540, value: [1, 0.614, 0] },
      { atMs: 5280, value: [1, 0.614, 0] }],
  },
  fadeOut: [at(0, 0), at(4800, 0), at(5280, 1)],
  soundStartMs: 2000,
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
    cameraPath: {
      position: [
        camera(0, 8),
        camera(approachEndMs, approachZ),
        camera(slightOpenMs, approachZ),
        camera(holdEndMs, approachZ),
        camera(openEndMs, openZ),
        camera(passageMs, 1.4),
        camera(durationMs, 0.5),
      ],
      target: [
        { atMs: 0, value: [0, 0, 0] },
        { atMs: durationMs, value: [0, 0, 0] },
      ],
    },
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
    cameraPath: {
      position: [
        framedCamera(0, 6.24, 0.675, -0.23),
        { ...framedCamera(500, 6.24, 0.675, -0.23), easing: "ease-in-out" },
        { ...framedCamera(1800, 3.98, 0.70, 0.25), easing: "ease-out" },
        framedCamera(2300, 3.93, 0.70, 0.25),
        { ...framedCamera(3100, 3.93, 0.70, 0.25), easing: "ease-in" },
        camera(durationMs, 2.3),
      ],
      target: [
        { atMs: 0, value: [-0.23, 0.675, 0] },
        { atMs: 500, value: [-0.23, 0.675, 0], easing: "ease-in-out" },
        { atMs: 1800, value: [0.25, 0.32, 0], easing: "ease-out" },
        { atMs: 2300, value: [0.25, 0.325, 0] },
        { atMs: 3100, value: [0.25, 0.325, 0], easing: "ease-in" },
        { atMs: durationMs, value: [0, 0, 0] },
      ],
    },
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
  initialZ = 7.1,
  initialTargetY = 0.85,
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
    cameraPath: {
      position: [
        framedCamera(0, initialZ, 0.85),
        framedCamera(approachEndMs * 0.25, 6.32, 0.85),
        framedCamera(approachEndMs * 0.5, 5.75, 0.85),
        framedCamera(approachEndMs * 0.75, 5.46, 0.85),
        framedCamera(approachEndMs, 5.23, 0.85),
        framedCamera(driftMidMs, 5.23, 0.85), framedCamera(slightOpenMs, 5.23, 0.85),
        { ...framedCamera(holdEndMs, 5.23, 0.85), easing: "ease-in" }, camera(durationMs, 3.95),
      ],
      target: [
        { atMs: 0, value: [0, initialTargetY, 0] },
        { atMs: holdEndMs, value: [0, 0.85, 0], easing: "ease-in" },
        { atMs: durationMs, value: [0, 0.4, 0] },
      ],
    },
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
}, 7.1, 0.85, 2100);

// Reusable close passage: retain the micro hold, then fit the narrow front / visible edge.
const microOpenClosePassBase = singleDoor1996();
export const microOpenClosePassSingleDoor1996Profile: EraAnimationProfile = {
  ...microOpenClosePassBase,
  doorAngle: [
    ...microOpenClosePassBase.doorAngle.slice(0, -1),
    at(4800, 64 / 90), at(microOpenClosePassBase.durationMs, 64 / 90),
  ],
  cameraPath: {
    ...microOpenClosePassBase.cameraPath,
    position: [
      ...microOpenClosePassBase.cameraPath.position.slice(0, -1),
      camera(4800, 3.95), camera(microOpenClosePassBase.durationMs, 3.95),
    ],
  },

};

const singleDoor1998 = (): EraAnimationProfile => {
  const profile = heldDoor({
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
  });
  return {
    ...profile,
    cameraPath: {
      position: [
        framedCamera(0, 5.31, 0.43, -0.28),
        framedCamera(2850, 5.31, 0.43, -0.28),
        framedCamera(3600, 4.8, 0.17, -0.11),
        camera(4000, 1.4), camera(4400, 0.5),
      ],
      target: [
        { atMs: 0, value: [-0.28, 0.43, 0] },
        { atMs: 2850, value: [-0.28, 0.43, 0] },
        { atMs: 3600, value: [-0.11, 0.17, 0] },
        { atMs: 4000, value: [0, 0, 0] },
        { atMs: 4400, value: [0, 0, 0] },
      ],
    },
  };
};

export const eraStyleDefaults: Record<DoorAnimationStyleId, EraAnimationProfile> = {
  "biohazard-1996": singleDoor1996(),
  "biohazard-1998": singleDoor1998(),
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
    rightHandleAngle: [at(0, 0), at(durationMs, 0)],
    cameraPath: {
      position: ([
        { ...camera(0, 7.6), easing: "ease-out" },
        camera(1200, 5.3),
        // Let the micro-open leaf and camera pause together before advancing.
        { ...camera(4700, 5.3), easing: "ease-in" },
        // Spread the same travel over one second, including the image fade.
        camera(pictureEndMs, 4.45),
        camera(durationMs, 4.45),
      ] as TimelineKeyframe<Vector3Tuple>[]).map((frame) => ({
        ...frame,
        value: [0, 0.80, frame.value[2]],
      })),
      target: [
        { atMs: 0, value: [0, 0.80, 0] },
        { atMs: durationMs, value: [0, 0.80, 0] },
      ],
    },
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
  cameraPath: {
    position: [
      framedCamera(0, 7.0, 0.85),
      framedCamera(300, 6.32, 0.85), framedCamera(600, 5.75, 0.85),
      framedCamera(900, 5.46, 0.85), framedCamera(1350, 5.23, 0.85),
      framedCamera(3350, 5.23, 0.85),
      ...[[3550, 4.46], [3650, 4.4], [3950, 4.25], [4150, 4.1],
        [4350, 4], [4450, 3.93], [4550, 3.85], [4700, 3.8]].map(([ms, z]) => {
          const remaining = (4700 - ms) / (4700 - 3350);
          return framedCamera(ms, z + 0.75 * remaining, 0.85 * remaining);
        }),
    ],
    target: [
      { atMs: 0, value: [0, 0.85, 0] },
      { atMs: 3350, value: [0, 0.85, 0] },
      { atMs: 4700, value: [0, 0, 0] },
    ],
  },
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
  cameraPath: {
    position: [framedCamera(0, 5.28, 0.39, -0.27),
      { ...framedCamera(2900, 5.28, 0.39, -0.27), easing: "ease-in" }, camera(4800, 1.5)],
    target: [{ atMs: 0, value: [-0.27, 0.39, 0] },
      { atMs: 2900, value: [-0.27, 0.39, 0], easing: "ease-in" },
      { atMs: 4800, value: [0, 0, 0] }],
  },
  fadeOut: [at(0, 0), at(4550, 0), at(4800, 1)],
  soundStartMs: 2050,
  soundEndMs: 4550,
  soundSourceStartProgress: 0.06,
  soundSourceEndProgress: 0.36,
};


/** Center-split translation: approach, closed wait, slide and final advance. */
export const centerSplitSlide1996Profile: EraAnimationProfile = {
  durationMs: 5650,
  events: [event("start", "Start", 0), event("approach-end", "Approach ends", 1900),
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
  cameraPath: {
    position: [framedCamera(0, 10, 0.83), framedCamera(300, 8.5, 0.83),
      framedCamera(600, 7.53, 0.83), framedCamera(900, 6.96, 0.83),
      framedCamera(1200, 6.24, 0.83), framedCamera(1500, 5.70, 0.83),
      framedCamera(1900, 5.29, 0.83),
      { ...framedCamera(3600, 5.29, 0.83), easing: "ease-in" },
      framedCamera(4700, 4, 0.83), framedCamera(5650, 4, 0.83)],
    target: [{ atMs: 0, value: [0, 0.83, 0] }, { atMs: 5650, value: [0, 0.83, 0] }],
  },
  fadeOut: [at(0, 0), at(4600, 0), at(5000, 1), at(5650, 1)],
  soundStartMs: 3350,
  soundEndMs: 5650,
  soundFadeOutStartMs: 5250,
  soundSourceStartProgress: 1.64 / 3.940227,
  soundSourceEndProgress: 1,
};
