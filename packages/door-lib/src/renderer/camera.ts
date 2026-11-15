import * as THREE from "three";
import type { DoorPhoneFraming } from "../core/cameraAuthoring.ts";
import type {
  DoorAnimationState,
  DoorAnimationConfig,
  DoorAnimationId,
  HandleProfileId,
  DoorHingeSide,
  DoorSwingDirection,
} from "../core/types.ts";
import {
  getPortraitCameraOffset,
  getPortraitHorizontalFit,
  getPortraitProtectionEnd,
  hasReferenceHorizontalCrop,
} from "../responsiveFraming.ts";
import { clampProgress } from "./progress.ts";

interface CameraGeometry {
  getViewport: () => { width: number; height: number };
  getRoot: () => THREE.Group;
  isDoorPanel: (mesh: THREE.Mesh) => boolean;
  applyDoorState: (animation: DoorAnimationId, state: DoorAnimationState) => void;
}

type CameraFrame = {
  handleProfileId?: HandleProfileId;
  hingeSide: DoorHingeSide;
  swingDirection: DoorSwingDirection;
  state: DoorAnimationState;
  config: DoorAnimationConfig;
  progress: number;
  cameraPanX: number;
  cameraPanY: number;
  phoneConfig?: DoorAnimationConfig;
  phoneFraming?: DoorPhoneFraming;
};

export class ResponsiveDoorCamera {
  private lastCameraFrame?: CameraFrame;
  private portraitFitKey = "";
  private portraitPassagePoints: THREE.Vector3[] = [];
  private portraitPassageCamera = new THREE.PerspectiveCamera();
  private portraitProtectionEndMs = 0;
  private portraitFitEnabled = false;
  private portraitPullback = 0;
  private portraitPanels: { mesh: THREE.Mesh; corners: THREE.Vector3[] }[] = [];
  constructor(private readonly camera: THREE.PerspectiveCamera, private readonly geometry: CameraGeometry) {}

  invalidate() {
    this.portraitFitKey = "";
  }

  reapply() {
    if (!this.lastCameraFrame) return false;
    this.apply(this.lastCameraFrame);
    return true;
  }

  private applyCameraState(
    state: DoorAnimationState,
    cameraPanX: number,
    cameraPanY: number
  ) {
    const [x, y, z] = state.cameraPosition;
    this.camera.position.set(x + cameraPanX, y + cameraPanY, z);

    const [tx, ty, tz] = state.cameraTarget;
    this.camera.lookAt(tx + cameraPanX * 0.55, ty + cameraPanY * 0.55, tz);
  }

  private phoneFitActive = false;

  apply(frame: CameraFrame) {
    this.lastCameraFrame = frame;
    // Remove prior composition before fitting; resize may also leave phone scope.
    this.camera.clearViewOffset();
    const phone = Math.min(this.geometry.getViewport().width, this.geometry.getViewport().height) <= 600;
    const phoneActive = phone && frame.phoneConfig !== undefined;
    const config = phoneActive ? frame.phoneConfig! : frame.config;
    if (this.phoneFitActive !== phoneActive) {
      this.invalidate();
      this.phoneFitActive = phoneActive;
    }
    const state = config === frame.config ? frame.state : config.getState(
      clampProgress(config.easing?.(frame.progress) ?? frame.progress),
      { linearProgress: frame.progress, handleProfileId: frame.handleProfileId }
    );
    this.applyFittedCamera({ ...frame, state, config });
    const x = phone ? frame.phoneFraming?.offsetXPercent ?? 0 : 0;
    const y = phone ? frame.phoneFraming?.offsetYPercent ?? 0 : 0;
    if (x || y) {
      const width = this.geometry.getViewport().width, height = this.geometry.getViewport().height;
      // Projection shifts the image right/up without changing world-space pose.
      this.camera.setViewOffset(width, height, -x / 100 * width, y / 100 * height, width, height);
    }
  }

  private applyFittedCamera(frame: CameraFrame) {
    const { state, config, progress, cameraPanX, cameraPanY } = frame;
    this.applyCameraState(state, cameraPanX, cameraPanY);
    if (this.camera.aspect >= 1) return;

    const initial = config.getState(0, { linearProgress: 0, handleProfileId: frame.handleProfileId });
    const key = JSON.stringify([initial, config.id, config.duration, config.timelineEvents, this.camera.aspect, cameraPanX, cameraPanY,
      frame.hingeSide, frame.swingDirection]);
    if (key !== this.portraitFitKey) {
      this.portraitFitKey = key;
      this.geometry.applyDoorState(config.id, initial);
      this.geometry.getRoot().updateMatrixWorld(true);
      this.portraitPanels = [];
      this.geometry.getRoot().traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        if (!this.geometry.isDoorPanel(node)) return;
        node.geometry.computeBoundingBox();
        const box = node.geometry.boundingBox;
        if (!box) return;
        const corners: THREE.Vector3[] = [];
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) {
          for (const z of [box.min.z, box.max.z]) {
            corners.push(new THREE.Vector3(x, y, z));
          }
        }
        this.portraitPanels.push({ mesh: node, corners });
      });
      this.applyCameraState(initial, cameraPanX, cameraPanY);
      this.camera.updateMatrixWorld(true);
      const initialPoints = this.portraitPanels.flatMap(({ mesh, corners }) =>
        corners.map((point) => point.clone().applyMatrix4(mesh.matrixWorld)));
      this.portraitFitEnabled = !hasReferenceHorizontalCrop(this.camera, initialPoints);
      this.portraitPullback = 0;
      if (this.portraitFitEnabled) {
        const end = getPortraitProtectionEnd(config.timelineEvents);
        this.portraitProtectionEndMs = end;
        // Sample the whole protected approach once, not once per rendered frame.
        // A fixed dolly retains the authored movement and never has a late release.
        for (let i = 0; i <= 96; i++) {
          const sampleProgress = end / config.duration * i / 96;
          const sample = config.getState(sampleProgress, {
            linearProgress: sampleProgress, handleProfileId: frame.handleProfileId,
          });
          this.geometry.applyDoorState(config.id, sample);
          this.geometry.getRoot().updateMatrixWorld(true);
          this.applyCameraState(sample, cameraPanX, cameraPanY);
          const points = this.portraitPanels.flatMap(({ mesh, corners }) =>
            corners.map((point) => point.clone().applyMatrix4(mesh.matrixWorld)));
          if (i === 96) {
            this.portraitPassagePoints = points;
            this.portraitPassageCamera = this.camera.clone();
          }
          this.portraitPullback = Math.max(this.portraitPullback,
            getPortraitHorizontalFit(this.camera, points, this.camera.aspect).pullback);
        }
        if (this.portraitPullback > 0) this.portraitPullback += 0.03;
      }
      this.geometry.applyDoorState(config.id, state);
      this.applyCameraState(state, cameraPanX, cameraPanY);
    }
    if (!this.portraitFitEnabled) return;
    this.geometry.getRoot().updateMatrixWorld(true);
    const points = this.portraitPanels.flatMap(({ mesh, corners }) =>
      corners.map((point) => point.clone().applyMatrix4(mesh.matrixWorld)));
    this.camera.position.add(getPortraitCameraOffset(this.camera, points, this.camera.aspect, this.portraitPullback, {
      camera: this.portraitPassageCamera,
      points: this.portraitPassagePoints,
      timeMs: progress * config.duration,
      protectionEndMs: this.portraitProtectionEndMs,
    }));
    // Preserve the authored orientation: looking back at its original target
    // here would undo the truck and reintroduce the lateral fit constraint.
  }
}
