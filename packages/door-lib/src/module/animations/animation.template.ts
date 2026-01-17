// Template for adding a new door animation based on the existing ones.
// Steps:
// 1) Copy this file, rename it (e.g., `staircaseEntry.ts`), and place it in this folder.
// 2) Update the `id`/label/description and customize `getState`.
// 3) Export your config and add it to `doorAnimationConfigs` in `index.ts`.
// 4) Extend `DoorAnimationVariant` in `types.ts` with the new id for type safety.

import { DoorAnimationConfig } from "../types";
import { clamp, easeInOutCubic, lerp } from "./shared";

// Replace "your-variant-id" with a unique string, e.g., "staircase-entry"
export const templateAnimationConfig: DoorAnimationConfig = {
  id: "your-variant-id" as any,
  label: "Your Animation",
  description: "Short description of the motion path",
  duration: 6000, // ms
  progressMarkers: [0, 0.25, 0.5, 0.75, 1],
  easing: easeInOutCubic,
  getState: (rawProgress: number) => {
    const progress = clamp(rawProgress, 0, 1);

    // Camera keyframes (edit as needed)
    const start: [number, number, number] = [0, 2, 6];
    const mid: [number, number, number] = [0, 1, 4];
    const end: [number, number, number] = [0, 0, 2];

    // Door timing: opens between 40%-80% of the timeline
    let doorAngle = 0;
    let rightDoorAngle = undefined as number | undefined; // set to a number for double doors
    if (progress >= 0.4 && progress <= 0.8) {
      const t = (progress - 0.4) / 0.4;
      doorAngle = easeInOutCubic(t);
      rightDoorAngle = easeInOutCubic(t); // remove if single door
    } else if (progress > 0.8) {
      doorAngle = 1;
      rightDoorAngle = 1;
    }

    // Camera interpolation example
    let cameraPosition: [number, number, number] = start;
    if (progress <= 0.5) {
      cameraPosition = lerp(start, mid, progress / 0.5);
    } else {
      cameraPosition = lerp(mid, end, (progress - 0.5) / 0.5);
    }

    // Fade near the end
    const fadeOut = progress > 0.9 ? clamp((progress - 0.9) / 0.1, 0, 1) : 0;

    return {
      doorAngle,
      rightDoorAngle,
      cameraPosition,
      cameraTarget: [0, 0, 0],
      fadeOut,
    };
  },
};
