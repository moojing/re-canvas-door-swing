import type { EraAnimationProfile } from "./animationStyles.ts";
import { sampleCameraPath } from "./cameraPath.ts";
import type { DoorAnimationState, Vector3Tuple } from "./types.ts";

/** Temporary authoring data, never a released preset or registry mutation. */
export interface DoorCameraDraft {
  initialHeightPercent?: number;
  approachHeightPercent?: number;
  cameraHoldMs?: number;
  cameraPace?: number;
  openingWaitMs?: number;
}

/** Optional framing overrides for previews whose logical short side is ≤600px. */
export interface DoorPhoneFraming {
  initialHeightPercent?: number;
  approachHeightPercent?: number;
  offsetXPercent?: number;
  offsetYPercent?: number;
}

export const resolvePhoneCameraDraft = (shared: DoorCameraDraft, phone: DoorPhoneFraming): DoorCameraDraft => {
  const ranges = { initialHeightPercent: [20, 200], approachHeightPercent: [20, 200],
    offsetXPercent: [-50, 50], offsetYPercent: [-50, 50] };
  for (const [key, value] of Object.entries(phone)) {
    const range = ranges[key as keyof DoorPhoneFraming];
    if (!range || !Number.isFinite(value) || value < range[0] || value > range[1]) {
      throw new Error(`Invalid phone framing value: ${key}`);
    }
  }
  return { ...shared,
    ...(phone.initialHeightPercent === undefined ? {} : { initialHeightPercent: phone.initialHeightPercent }),
    ...(phone.approachHeightPercent === undefined ? {} : { approachHeightPercent: phone.approachHeightPercent }),
  };
};

type CameraState = Pick<DoorAnimationState, "cameraPosition" | "cameraTarget">;
const dot = (a: Vector3Tuple, b: Vector3Tuple) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const subtract = (a: Vector3Tuple, b: Vector3Tuple): Vector3Tuple => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const normalize = (v: Vector3Tuple): Vector3Tuple => {
  const length = Math.hypot(...v);
  if (length < 1e-6) throw new Error("Camera position and target must differ");
  return v.map(n => n / length) as Vector3Tuple;
};

/** Full closed-door bounds before clipping, matching renderer height6/depth.16/FOV60. */
export const projectedDoorHeight = (state: CameraState, width: number) => {
  const forward = normalize(subtract(state.cameraTarget, state.cameraPosition));
  const right = normalize([-forward[2], 0, forward[0]]);
  const up: Vector3Tuple = [right[1] * forward[2] - right[2] * forward[1],
    right[2] * forward[0] - right[0] * forward[2], right[0] * forward[1] - right[1] * forward[0]];
  const ys: number[] = [];
  for (const x of [-width / 2, width / 2]) for (const y of [-3, 3]) for (const z of [-.002, .162]) {
    const v = subtract([x, y, z], state.cameraPosition), depth = dot(v, forward);
    if (depth <= .1) return Infinity;
    ys.push(dot(v, up) / (depth * Math.tan(Math.PI / 6)));
  }
  return (Math.max(...ys) - Math.min(...ys)) * 50;
};

const dolly = (state: CameraState, distance: number): Vector3Tuple => {
  const backward = normalize(subtract(state.cameraPosition, state.cameraTarget));
  return state.cameraPosition.map((n, i) => n + backward[i] * distance) as Vector3Tuple;
};

const fitDistance = (state: CameraState, width: number, height: number) => {
  const viewDistance = Math.hypot(...subtract(state.cameraPosition, state.cameraTarget));
  let low = -viewDistance + .11, high = 1000;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    const projected = projectedDoorHeight({ ...state, cameraPosition: dolly(state, mid) }, width);
    if (projected > height) low = mid;
    else high = mid;
  }
  const result = (low + high) / 2;
  if (Math.abs(projectedDoorHeight({ ...state, cameraPosition: dolly(state, result) }, width) - height) > .01) {
    throw new Error("Requested framing cannot fit this camera view");
  }
  return result;
};

/** Explicit supported closed phase IDs, never inferred from a preset's name. */
export const cameraAuthoringInfo = (profile: EraAnimationProfile, width: number) => {
  const event = (id: string) => profile.events.find(e => e.id === id)?.atMs;
  const approachAtMs = event("approach-end");
  const waitStartMs = approachAtMs ?? event("closed-wait");
  const waitEndMs = event("handle-start") ?? event("opening-start") ?? event("closed-hold-end");
  const closed = profile.doorAngle[0].value === 0;
  const cameraAt = (atMs: number) => sampleCameraPath(profile.cameraPath, profile.durationMs, atMs);
  return {
    supportsFraming: closed,
    supportsOpeningWait: closed && waitStartMs !== undefined && waitEndMs !== undefined && waitEndMs > waitStartMs,
    approachAtMs,
    waitStartMs,
    initialHeightPercent: closed ? projectedDoorHeight(cameraAt(0), width) : undefined,
    approachHeightPercent: closed && approachAtMs !== undefined ? projectedDoorHeight(cameraAt(approachAtMs), width) : undefined,
  };
};

export const validateCameraDraft = (draft: DoorCameraDraft, profile: EraAnimationProfile, width: number) => {
  const ranges = { initialHeightPercent: [20, 200], approachHeightPercent: [20, 200],
    cameraHoldMs: [0, Math.min(2000, profile.durationMs / 2)], cameraPace: [.5, 2], openingWaitMs: [0, 3000] };
  for (const [key, value] of Object.entries(draft)) {
    const range = ranges[key as keyof DoorCameraDraft];
    if (!range || !Number.isFinite(value) || value < range[0] || value > range[1]) {
      throw new Error(`Invalid camera authoring value: ${key}`);
    }
  }
  const info = cameraAuthoringInfo(profile, width);
  if ((draft.initialHeightPercent !== undefined || draft.approachHeightPercent !== undefined) && !info.supportsFraming) {
    throw new Error("This already-open path has no closed-door framing anchor");
  }
  if (draft.approachHeightPercent !== undefined && info.approachAtMs === undefined) {
    throw new Error("This path has no approach-end framing anchor");
  }
  if (draft.openingWaitMs && !info.supportsOpeningWait) throw new Error("This path has no supported closed wait");
};

export const authoredCameraSampler = (profile: EraAnimationProfile, width: number, draft: DoorCameraDraft) => {
  validateCameraDraft(draft, profile, width);
  const duration = profile.durationMs;
  const sample = (ms: number) => sampleCameraPath(profile.cameraPath, duration, ms);
  const info = cameraAuthoringInfo(profile, width);
  const initialOffset = draft.initialHeightPercent === undefined ? 0 : fitDistance(sample(0), width, draft.initialHeightPercent);
  const approach = info.approachAtMs;
  const approachOffset = draft.approachHeightPercent === undefined || approach === undefined
    ? 0 : fitDistance(sample(approach), width, draft.approachHeightPercent);
  const smooth = (v: number) => v * v * (3 - 2 * v);
  const hold = draft.cameraHoldMs ?? 0, pace = draft.cameraPace ?? 1;
  return (timeMs: number): CameraState => {
    const u = Math.max(0, Math.min(1, (timeMs - hold) / (duration - hold)));
    // Redistribute camera pace in the fixed timeline; always retain its end state.
    const cameraMs = hold === 0 && pace === 1 ? timeMs : duration * u ** (1 / pace);
    const state = sample(cameraMs);
    const offset = approach === undefined
      ? initialOffset * (1 - smooth(cameraMs / duration))
      : cameraMs <= approach
        ? initialOffset + (approachOffset - initialOffset) * smooth(cameraMs / approach)
        : approachOffset * (1 - smooth((cameraMs - approach) / (duration - approach)));
    return { ...state, cameraPosition: offset === 0 ? state.cameraPosition : dolly(state, offset) };
  };
};
