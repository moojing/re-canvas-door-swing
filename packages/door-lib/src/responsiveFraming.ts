import * as THREE from "three";

const REFERENCE_ASPECT = 1280 / 800;
const FIT_LIMIT = 0.92;

export const getInitialPortraitPullback = (
  reference: THREE.PerspectiveCamera,
  points: THREE.Vector3[],
  aspect: number
): number => {
  if (!Number.isFinite(aspect) || aspect <= 0 || aspect >= 1 || !points.length) return 0;
  const camera = reference.clone();
  const origin = reference.position.clone();
  const backward = reference.getWorldDirection(new THREE.Vector3()).negate();
  camera.aspect = REFERENCE_ASPECT;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  const fits = (limit: number) => points.every((point) => {
    const projected = point.clone().project(camera);
    return Math.abs(projected.x) <= limit && Math.abs(projected.y) <= limit &&
      projected.z >= -1 && projected.z <= 1;
  });
  // An authored crop is intentional. Never use portrait fitting to undo it.
  if (!fits(1 + 1e-6)) return 0;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  if (fits(1 + 1e-6)) return 0;
  const move = (distance: number) => {
    camera.position.copy(origin).addScaledVector(backward, distance);
    camera.updateMatrixWorld(true);
  };
  let low = 0;
  let high = 1;
  while (high <= 64) {
    move(high);
    if (fits(FIT_LIMIT)) break;
    high *= 2;
  }
  if (high > 64) return 0;
  for (let iteration = 0; iteration < 30; iteration++) {
    const middle = (low + high) / 2;
    move(middle);
    if (fits(FIT_LIMIT)) high = middle;
    else low = middle;
  }
  return high;
};

export const getPortraitPullbackWeight = (
  progress: number,
  duration: number,
  events?: { id: string; atMs: number }[]
): number => {
  const end = events?.find((event) => event.id === "approach-end" && event.atMs > 0)?.atMs ??
    events?.find((event) => event.atMs > 0)?.atMs ?? duration * 0.25;
  const t = Math.min(1, Math.max(0, progress * duration / Math.max(end, 1)));
  return 1 - t * t * (3 - 2 * t);
};
