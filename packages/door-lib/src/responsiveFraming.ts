import * as THREE from "three";

const REFERENCE_ASPECT = 1280 / 800;
const FIT_LIMIT = 0.92;
const FIT_BLEND_DISTANCE = 0.12;

export const hasReferenceHorizontalCrop = (
  reference: THREE.PerspectiveCamera,
  points: THREE.Vector3[]
): boolean => {
  reference.updateMatrixWorld(true);
  const slope = Math.tan(reference.fov * Math.PI / 360) / reference.zoom * REFERENCE_ASPECT;
  return points.some((point) => {
    const local = point.clone().applyMatrix4(reference.matrixWorldInverse);
    const depth = -local.z;
    return depth <= reference.near || depth >= reference.far ||
      Math.abs(local.x) > depth * slope * (1 + 1e-6);
  });
};

export const getPortraitProtectionEnd = (
  events?: { id: string; atMs: number }[]
): number => events?.find((event) => ["hold-end", "opening-resumes"].includes(event.id))?.atMs ??
  events?.find((event) => ["opening-start", "closed-hold-end"].includes(event.id))?.atMs ??
  events?.find((event) => event.id === "run-start")?.atMs ?? 0;

// Solve the horizontal frustum with both a dolly and a camera-space truck.
// Fitting against the original optical axis alone makes lateral authored
// motion look like a retreat once the opposite edge becomes the constraint.
export const getPortraitHorizontalFit = (
  reference: THREE.PerspectiveCamera,
  points: THREE.Vector3[],
  aspect: number,
  fixedPullback?: number
): { pullback: number; offsetX: number } => {
  if (!Number.isFinite(aspect) || aspect <= 0 || aspect >= 1 || !points.length) {
    return { pullback: 0, offsetX: 0 };
  }
  reference.updateMatrixWorld(true);
  const slope = Math.tan(reference.fov * Math.PI / 360) / reference.zoom * aspect * FIT_LIMIT;
  let lower = -Infinity, upper = Infinity, near = -Infinity;
  for (const point of points) {
    const local = point.clone().applyMatrix4(reference.matrixWorldInverse);
    lower = Math.max(lower, local.x + slope * local.z);
    upper = Math.min(upper, local.x - slope * local.z);
    near = Math.max(near, reference.near + local.z);
  }
  const required = Math.max((lower - upper) / (2 * slope), near);
  const pullback = fixedPullback ?? (required <= -FIT_BLEND_DISTANCE ? 0 : required >= FIT_BLEND_DISTANCE ? required :
    (required + FIT_BLEND_DISTANCE) ** 2 / (4 * FIT_BLEND_DISTANCE));
  // Keep the authored horizontal placement whenever it already fits.
  const minOffset = lower - slope * pullback;
  const maxOffset = upper + slope * pullback;
  // Opening leaves may intentionally leave the screen. Do not retreat to keep
  // fitting their expanding silhouette after the protected closed/held phase.
  const offsetX = minOffset > maxOffset ? (minOffset + maxOffset) / 2 :
    Math.max(minOffset, Math.min(0, maxOffset));
  return { pullback, offsetX };
};
