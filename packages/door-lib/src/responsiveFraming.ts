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

export const getPortraitHorizontalPullback = (
  reference: THREE.PerspectiveCamera,
  points: THREE.Vector3[],
  aspect: number
): number => {
  if (!Number.isFinite(aspect) || aspect <= 0 || aspect >= 1 || !points.length) return 0;
  reference.updateMatrixWorld(true);
  const slope = Math.tan(reference.fov * Math.PI / 360) / reference.zoom * aspect * FIT_LIMIT;
  let required = -Infinity;
  for (const point of points) {
    const local = point.clone().applyMatrix4(reference.matrixWorldInverse);
    // A backward dolly preserves camera-space X and increases depth by its
    // distance: |X| / (depth + distance) <= horizontal frustum slope.
    required = Math.max(required, Math.abs(local.x) / slope + local.z, reference.near + local.z);
  }
  // C1 conservative clamp: begin slowing before the safety edge, and never
  // underestimate a positive required distance. This avoids a hard camera stop.
  if (required <= -FIT_BLEND_DISTANCE) return 0;
  if (required >= FIT_BLEND_DISTANCE) return required;
  return (required + FIT_BLEND_DISTANCE) ** 2 / (4 * FIT_BLEND_DISTANCE);
};

export const getPortraitPullbackWeight = (
  progress: number,
  duration: number,
  events?: { id: string; atMs: number }[]
): number => {
  const release = events?.find((event) => ["hold-end", "opening-resumes"].includes(event.id))?.atMs ??
    events?.find((event) => ["opening-start", "closed-hold-end"].includes(event.id))?.atMs ??
    events?.find((event) => event.id === "run-start")?.atMs ?? 0;
  const end = events?.find((event) => event.id === "passage" && event.atMs > release)?.atMs ??
    events?.find((event) => event.id === "fade-start" && event.atMs > release)?.atMs ?? duration;
  const t = Math.min(1, Math.max(0, (progress * duration - release) / Math.max(end - release, 1)));
  return 1 - t * t * (3 - 2 * t);
};
