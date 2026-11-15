import * as THREE from "three";
import type { DoorPhoneFraming } from "../core/cameraAuthoring.ts";
import {
  getDrawingBufferSize,
  usesAgedWoodLook,
  usesSteelKnobLook,
  usesRectangularKnobPlate,
  getHandleTurnMultiplier,
  usesCompactWindowLayout,
  compactWindowTextureV,
} from "../core/renderLook.ts";
import { applyRetroMaterial } from "../retroMaterial.ts";
import type {
  DoorAnimationState,
  DoorAnimationConfig,
  DoorAnimationId,
  DoorEntrancePresetId,
  DoorHingeSide,
  DoorSwingDirection,
  HandleProfileId,
  ResolvedDoorSurfaceTextureUrls,
} from "../core/types.ts";
import {
  createAgedHandleMaterial,
  loadHandleScene,
  prepareHandleModel,
  getImportedGripTurnMultiplier,
} from "../handleModel.ts";
import { ResponsiveDoorCamera } from "./camera.ts";
import { clampProgress } from "./progress.ts";

const DOOR_DEPTH = 0.16;
const DOOR_SURFACE_OFFSET = 0.002;
const IMPORTED_HANDLE_SURFACE_EMBED = 0.006;
const IMPORTED_KNOB_MODEL_SCALE = 0.45;
const KNOB_HANDLE_EDGE_INSET = 0.2;

const disposeObject = (object: THREE.Object3D) => {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    const geometry = mesh.geometry;
    const material = mesh.material;

    geometry?.dispose?.();

    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
    } else {
      material?.dispose?.();
    }
  });
};

const createDoorMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: "#8a5a37",
    roughness: 0.7,
    metalness: 0.12,
  });

const createDoorMaterials = () =>
  Array.from({ length: 6 }, () => createDoorMaterial()) as [
    THREE.MeshStandardMaterial,
    THREE.MeshStandardMaterial,
    THREE.MeshStandardMaterial,
    THREE.MeshStandardMaterial,
    THREE.MeshStandardMaterial,
    THREE.MeshStandardMaterial,
  ];

const createDoorFaceMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.7,
    metalness: 0.12,
  });

const mirrorPlaneTextureX = (geometry: THREE.BufferGeometry) => {
  const uv = geometry.getAttribute("uv");
  for (let index = 0; index < uv.count; index += 1) {
    uv.setX(index, 1 - uv.getX(index));
  }
  uv.needsUpdate = true;
};

const createHandleMaterial = () => createAgedHandleMaterial();

export class VanillaDoorScene {
  readonly element: HTMLDivElement;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  private readonly textureLoader = new THREE.TextureLoader();
  private readonly fadeOverlay = document.createElement("div");
  private readonly label = document.createElement("div");
  private readonly resizeObserver?: ResizeObserver;
  private readonly cameraFraming = new ResponsiveDoorCamera(this.camera, {
    getViewport: () => ({ width: this.element.clientWidth, height: this.element.clientHeight }),
    getRoot: () => this.doorRoot,
    isDoorPanel: (mesh) => {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      return materials.some((material) => material === this.frontDoorMaterial ||
        material === this.backDoorMaterial || this.doorMaterials.some((doorMaterial) => material === doorMaterial));
    },
    applyDoorState: (animation, state) => this.applyDoorState(animation, state),
  });
  private doorRoot = new THREE.Group();
  private activeSurfaceTextureKey?: string;
  private activeHandleModelUrl?: string;
  private activeHandleProfileId?: HandleProfileId;
  private activeHasHandle?: boolean;
  private activeMirrorBackTextureX?: boolean;
  private activeMirrorTextureX?: boolean;
  private activeSingleHingeSide: DoorHingeSide = "left";
  private activeSwingDirection: DoorSwingDirection = "toward-viewer";
  private activeAnimation?: DoorAnimationId;
  private activeHandleGroups: Array<{
    group: THREE.Group;
    side: "single" | "left" | "right";
    rotationMultiplier: number;
    pressRotationMultiplier?: 1 | -1;
    pressTargets?: Array<{ node: THREE.Object3D; baseRotation: THREE.Euler }>;
  }> = [];
  private doorMaterials = createDoorMaterials();
  private frontDoorMaterial = createDoorFaceMaterial();
  private backDoorMaterial = createDoorFaceMaterial();
  private handleMaterial = createHandleMaterial();
  private agedWood = false;
  private knobBackplate = false;
  private steelKnob = false;
  private rectangularKnobPlate = false;
  private compactWindowLayout = false;
  private handleTurnDirection?: "clockwise" | "counterclockwise";
  private activeTextureFlipY = false;
  private readonly retroRasterSize = new THREE.Vector2(360, 360);
  private readonly ambientLight = new THREE.AmbientLight("#ffffff", 0.25);
  private readonly keyLight = new THREE.DirectionalLight("#fff7ee", 0.75);
  private readonly rimLight = new THREE.DirectionalLight("#8fa8c7", 0.35);
  private disposed = false;

  constructor(className: string) {
    this.element = document.createElement("div");
    this.element.className = `relative overflow-hidden ${className}`;
    this.element.style.position = this.element.style.position || "relative";
    this.element.style.overflow = "hidden";
    this.element.style.background = "#000000";

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setClearColor("#000000");
    this.renderer.setPixelRatio(1);
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.element.append(this.renderer.domElement);

    this.fadeOverlay.style.position = "absolute";
    this.fadeOverlay.style.inset = "0";
    this.fadeOverlay.style.pointerEvents = "none";
    this.fadeOverlay.style.background = "#000000";
    this.fadeOverlay.style.opacity = "0";
    this.element.append(this.fadeOverlay);

    this.label.style.position = "absolute";
    this.label.style.right = "12px";
    this.label.style.bottom = "12px";
    this.label.style.borderRadius = "999px";
    this.label.style.background = "rgb(255 255 255 / 0.06)";
    this.label.style.padding = "4px 12px";
    this.label.style.color = "rgb(255 255 255 / 0.7)";
    this.label.style.fontSize = "12px";
    this.label.style.textTransform = "uppercase";
    this.label.style.pointerEvents = "none";
    this.element.append(this.label);

    this.keyLight.position.set(2, 5, 5);
    this.rimLight.position.set(-3, 2, -4);
    this.scene.add(this.ambientLight, this.keyLight, this.rimLight);
    this.scene.add(this.doorRoot);

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.disposed) return;
        this.resize();
        if (this.cameraFraming.reapply()) {
          this.renderer.render(this.scene, this.camera);
        }
      });
      this.resizeObserver.observe(this.element);
    }
  }

  render({
    presetId,
    handleTurnDirection,
    state,
    config,
    surfaceTextureUrls,
    textureFlipY,
    handleModelUrl,
    handleProfileId,
    hasHandle,
    mirrorBackTextureX,
    mirrorTextureX,
    hingeSide,
    swingDirection,
    cameraPanX,
    cameraPanY,
    phoneConfig,
    phoneFraming,
    progress,
  }: {
    presetId: DoorEntrancePresetId;
    handleTurnDirection?: "clockwise" | "counterclockwise";
    state: DoorAnimationState;
    config: DoorAnimationConfig;
    surfaceTextureUrls: ResolvedDoorSurfaceTextureUrls;
    textureFlipY: boolean;
    handleModelUrl?: string;
    handleProfileId?: HandleProfileId;
    hasHandle: boolean;
    mirrorBackTextureX: boolean;
    mirrorTextureX: boolean;
    hingeSide: DoorHingeSide;
    swingDirection: DoorSwingDirection;
    cameraPanX: number;
    cameraPanY: number;
    phoneConfig?: DoorAnimationConfig;
    phoneFraming?: DoorPhoneFraming;
    progress: number;
  }) {
    const agedWood = usesAgedWoodLook(presetId);
    const knobBackplate = presetId === "biohazard-1996-b02-blue-panel-double-door";
    const steelKnob = usesSteelKnobLook(presetId);
    const rectangularKnobPlate = usesRectangularKnobPlate(presetId);
    const compactWindowLayout = usesCompactWindowLayout(presetId);
    const lookChanged = this.agedWood !== agedWood || this.knobBackplate !== knobBackplate || this.steelKnob !== steelKnob || this.rectangularKnobPlate !== rectangularKnobPlate || this.handleTurnDirection !== handleTurnDirection || this.compactWindowLayout !== compactWindowLayout;
    this.compactWindowLayout = compactWindowLayout;
    this.handleTurnDirection = handleTurnDirection;
    this.rectangularKnobPlate = rectangularKnobPlate;
    this.steelKnob = steelKnob;
    this.knobBackplate = knobBackplate;
    this.agedWood = agedWood;
    this.ambientLight.intensity = agedWood ? 0.46 : 0.25;
    this.keyLight.intensity = agedWood ? 0.82 : 0.75;
    this.rimLight.intensity = agedWood ? 0.04 : 0.35;
    // Smooth the low-resolution buffer when enlarged, like a softly reconstructed video frame.
    this.renderer.domElement.style.imageRendering = "auto";
    const surfaceKey = [
      surfaceTextureUrls.frontTextureUrl,
      surfaceTextureUrls.edgeTextureUrl,
      surfaceTextureUrls.backTextureUrl,
    ].join("|");
    if (
      lookChanged ||
      this.activeAnimation !== config.id ||
      this.activeSurfaceTextureKey !== surfaceKey ||
      this.activeTextureFlipY !== textureFlipY ||
      this.activeHandleModelUrl !== handleModelUrl ||
      this.activeHandleProfileId !== handleProfileId ||
      this.activeHasHandle !== hasHandle ||
      this.activeMirrorBackTextureX !== mirrorBackTextureX ||
      this.activeMirrorTextureX !== mirrorTextureX ||
      this.activeSingleHingeSide !== hingeSide
    ) {
      this.rebuildDoor(
        config.id,
        surfaceTextureUrls,
        textureFlipY,
        handleModelUrl,
        handleProfileId,
        hasHandle,
        mirrorBackTextureX,
        mirrorTextureX,
        hingeSide
      );
      this.activeAnimation = config.id;
      this.activeSurfaceTextureKey = surfaceKey;
      this.activeTextureFlipY = textureFlipY;
      this.activeHandleModelUrl = handleModelUrl;
      this.activeHandleProfileId = handleProfileId;
      this.activeHasHandle = hasHandle;
      this.activeMirrorBackTextureX = mirrorBackTextureX;
      this.activeMirrorTextureX = mirrorTextureX;
      this.activeSingleHingeSide = hingeSide;
    }

    this.activeSwingDirection = swingDirection;
    this.applyDoorState(config.id, state);
    this.fadeOverlay.style.opacity = String(clampProgress(state.fadeOut));
    this.label.textContent = config.label;
    this.resize();
    this.cameraFraming.apply({ state, config, progress, cameraPanX, cameraPanY, phoneConfig, phoneFraming,
      handleProfileId: this.activeHandleProfileId, hingeSide: this.activeSingleHingeSide, swingDirection: this.activeSwingDirection });
    this.renderer.render(this.scene, this.camera);
  }

  invalidateCameraFit() {
    this.cameraFraming.invalidate();
  }

  dispose() {
    this.disposed = true;
    this.resizeObserver?.disconnect();
    disposeObject(this.doorRoot);
    this.scene.remove(this.doorRoot);
    this.doorMaterials.forEach((material) => material.dispose());
    this.frontDoorMaterial.dispose();
    this.backDoorMaterial.dispose();
    this.handleMaterial.dispose();
    this.renderer.dispose();
    this.element.remove();
  }

  private resize() {
    const width = Math.max(this.element.clientWidth, 1);
    const height = Math.max(this.element.clientHeight || 460, 1);

    if (this.element.clientHeight <= 0) {
      this.element.style.height = `${height}px`;
    }

    const [bufferWidth, bufferHeight] = getDrawingBufferSize(
      width, height, window.devicePixelRatio || 1, true
    );
    this.retroRasterSize.set(bufferWidth, bufferHeight);
    const canvas = this.renderer.domElement;
    if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
      this.renderer.setSize(bufferWidth, bufferHeight, false);
    }
    if (this.camera.aspect !== width / height) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  private rebuildDoor(
    animation: DoorAnimationId,
    surfaceTextureUrls: ResolvedDoorSurfaceTextureUrls,
    textureFlipY: boolean,
    handleModelUrl: string | undefined,
    handleProfileId: HandleProfileId | undefined,
    hasHandle: boolean,
    mirrorBackTextureX: boolean,
    mirrorTextureX: boolean,
    hingeSide: DoorHingeSide
  ) {
    this.cameraFraming.invalidate();
    disposeObject(this.doorRoot);
    this.scene.remove(this.doorRoot);
    this.doorRoot = new THREE.Group();
    this.scene.add(this.doorRoot);
    this.activeHandleGroups = [];

    this.doorMaterials = createDoorMaterials();
    this.frontDoorMaterial = createDoorFaceMaterial();
    this.backDoorMaterial = createDoorFaceMaterial();
    this.handleMaterial = createHandleMaterial();
    if (this.rectangularKnobPlate && handleProfileId === "lever-l") {
      // The running door's horizontal lock is yellow brass, not dark bronze.
      this.handleMaterial.map = null;
      this.handleMaterial.color.set("#e5c343");
      this.handleMaterial.roughness = 0.78;
      this.handleMaterial.metalness = 0.15;
    }
    if (this.steelKnob) {
      this.handleMaterial.map = null;
      this.handleMaterial.color.set("#a9ada8");
      this.handleMaterial.roughness = 0.75;
      this.handleMaterial.metalness = 0.2;
    }
    [this.frontDoorMaterial, this.backDoorMaterial, ...this.doorMaterials].forEach((material) => {
      if (this.agedWood) {
        material.roughness = 1;
        material.metalness = 0;
        material.color.set("#e0d29a");
      }
      if (this.knobBackplate) {
        material.roughness = 1;
        material.metalness = 0;
        material.color.set("#ffffff");
      }
      if (this.compactWindowLayout) material.color.set("#929892");
      if (this.rectangularKnobPlate && handleProfileId === "lever-l") {
        material.color.set("#b4aaa0");
      }
      applyRetroMaterial(
        material,
        (this.agedWood || this.knobBackplate) && this.doorMaterials.includes(material),
        this.knobBackplate ? this.retroRasterSize : undefined,
        this.knobBackplate
      );
    });
    applyRetroMaterial(this.handleMaterial, false, this.knobBackplate ? this.retroRasterSize : undefined);
    const doorMaterials = this.doorMaterials;
    this.loadTexture(surfaceTextureUrls.edgeTextureUrl, doorMaterials.slice(0, 4), textureFlipY);
    this.loadTexture(surfaceTextureUrls.frontTextureUrl, [this.frontDoorMaterial], textureFlipY);
    this.loadTexture(surfaceTextureUrls.backTextureUrl, [this.backDoorMaterial], textureFlipY);

    if (animation === "double-swing" || animation === "center-split-slide") {
      const left = this.createDoorLeaf({
        width: 3,
        height: 6,
        pivotX: -3,
        doorCenterX: 1.5,
        handleX: 2.26,
        side: "left",
        handleModelUrl,
        handleProfileId,
        hasHandle,
        mirrorBackTextureX,
        mirrorTextureX,
      });
      left.name = "left-door";
      this.doorRoot.add(left);

      const right = this.createDoorLeaf({
        width: 3,
        height: 6,
        pivotX: 3,
        doorCenterX: -1.5,
        handleX: -2.26,
        side: "right",
        handleModelUrl,
        handleProfileId,
        hasHandle,
        mirrorBackTextureX: animation === "center-split-slide" ? !mirrorBackTextureX : mirrorBackTextureX,
        mirrorTextureX: animation === "center-split-slide" ? !mirrorTextureX : mirrorTextureX,
      });
      right.name = "right-door";
      this.doorRoot.add(right);
      return;
    }

    const single =
      hingeSide === "right"
        ? this.createDoorLeaf({
            width: 3,
            height: 6,
            pivotX: 1.5,
            doorCenterX: -1.5,
            handleX: -2.26,
            side: "left",
            handleModelUrl,
            handleProfileId,
            hasHandle,
            mirrorBackTextureX,
            mirrorTextureX,
          })
        : this.createDoorLeaf({
            width: 3,
            height: 6,
            pivotX: -1.5,
            doorCenterX: 1.5,
            handleX: 2.26,
            side: "single",
            handleModelUrl,
            handleProfileId,
            hasHandle,
            mirrorBackTextureX,
            mirrorTextureX,
          });
    single.name = "single-door";
    this.doorRoot.add(single);
  }

  private loadTexture(
    url: string,
    materials: THREE.MeshStandardMaterial[],
    flipY = false
  ) {
    this.textureLoader.load(url, (texture) => {
      if (this.disposed) {
        texture.dispose();
        return;
      }

      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.flipY = flipY;
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
      materials.forEach((material) => {
        material.map = texture;
        material.needsUpdate = true;
      });
      this.renderer.render(this.scene, this.camera);
    });
  }

  private createDoorLeaf({
    width,
    height,
    pivotX,
    doorCenterX,
    handleX,
    side,
    handleModelUrl,
    handleProfileId,
    hasHandle,
    mirrorBackTextureX,
    mirrorTextureX,
  }: {
    width: number;
    height: number;
    pivotX: number;
    doorCenterX: number;
    handleX: number;
    side: "single" | "left" | "right";
    handleModelUrl?: string;
    handleProfileId?: HandleProfileId;
    hasHandle: boolean;
    mirrorBackTextureX: boolean;
    mirrorTextureX: boolean;
  }) {
    const pivot = new THREE.Group();
    pivot.position.x = pivotX;
    // Keep a narrow visible seam between the closed B02 leaves.
    const leafWidth = this.knobBackplate ? width - 0.025 : width;

    const edgeGeometry = new THREE.BoxGeometry(leafWidth, height, DOOR_DEPTH);
    // The separate textured planes own the front/back surfaces. Keeping the
    // untextured box caps lets snapped triangles occlude them at oblique angles.
    edgeGeometry.groups = edgeGeometry.groups.filter((group) => (group.materialIndex ?? 0) < 4);
    const door = new THREE.Mesh(edgeGeometry, this.doorMaterials);
    door.position.set(doorCenterX, 0, DOOR_DEPTH / 2);
    pivot.add(door);

    const faceGeometry = () => {
      const geometry = new THREE.PlaneGeometry(leafWidth, height, 1, this.compactWindowLayout ? 20 : 1);
      if (this.compactWindowLayout) {
        const uv = geometry.getAttribute("uv");
        for (let index = 0; index < uv.count; index++) uv.setY(index, compactWindowTextureV(uv.getY(index)));
      }
      return geometry;
    };
    const front = new THREE.Mesh(
      faceGeometry(),
      this.frontDoorMaterial
    );
    front.position.set(doorCenterX, 0, DOOR_DEPTH + DOOR_SURFACE_OFFSET);
    if (mirrorTextureX) mirrorPlaneTextureX(front.geometry);
    pivot.add(front);

    const back = new THREE.Mesh(
      faceGeometry(),
      this.backDoorMaterial
    );
    if (mirrorBackTextureX) mirrorPlaneTextureX(back.geometry);
    back.position.set(doorCenterX, 0, -DOOR_SURFACE_OFFSET);
    back.rotation.y = Math.PI;
    pivot.add(back);

    if (!hasHandle) return pivot;

    const frontHandleGroup = this.createHandleGroup({
      width,
      handleX,
      side,
      handleModelUrl,
      handleProfileId,
      face: "front",
    });
    pivot.add(frontHandleGroup);

    const backHandleGroup = this.createHandleGroup({
      width,
      handleX,
      side,
      handleModelUrl,
      handleProfileId,
      face: "back",
    });
    pivot.add(backHandleGroup);

    return pivot;
  }

  private createHandleGroup({
    width,
    handleX,
    side,
    handleModelUrl,
    handleProfileId,
    face,
  }: {
    width: number;
    handleX: number;
    side: "single" | "left" | "right";
    handleModelUrl?: string;
    handleProfileId?: HandleProfileId;
    face: "front" | "back";
  }) {
    const handleGroup = new THREE.Group();
    handleGroup.name = `${face}-handle`;
    // Both iron-window passages mount their knobs on the narrow raised stile,
    // centered 4% from the leaf edge rather than on the recessed-panel seam.
    const handleEdgeInset = this.compactWindowLayout
      ? width * 0.04
      : KNOB_HANDLE_EDGE_INSET;
    const resolvedHandleX =
      handleProfileId === "knob-round" || this.rectangularKnobPlate
        ? Math.sign(handleX) *
          (width - handleEdgeInset)
        : handleX;
    handleGroup.position.set(
      resolvedHandleX,
      -0.02,
      face === "front" ? DOOR_DEPTH + DOOR_SURFACE_OFFSET : -DOOR_SURFACE_OFFSET
    );
    if (face === "back") handleGroup.rotation.y = Math.PI;
    // Scale the complete accessory, including imported and fallback geometry.
    if (this.compactWindowLayout) handleGroup.scale.setScalar(0.7);
    if (this.rectangularKnobPlate && handleProfileId === "lever-l") handleGroup.scale.setScalar(0.85);
    if (this.rectangularKnobPlate) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.55, 0.025), this.handleMaterial);
      plate.name = "fixed-backplate";
      plate.position.set(0, -0.09, 0.0125);
      handleGroup.add(plate);
      const keyhole = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.075, 0.006),
        new THREE.MeshBasicMaterial({ color: "#171510" }));
      keyhole.position.set(0, -0.17, 0.016);
      plate.add(keyhole);
    }
    let pressTargets:
      | Array<{ node: THREE.Object3D; baseRotation: THREE.Euler }>
      | undefined;

    if (handleProfileId === "knob-round") {
      const rose = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.04, 32),
        this.handleMaterial
      );
      rose.rotation.x = Math.PI / 2;
      rose.position.z = 0.02;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.12, 24),
        this.handleMaterial
      );
      stem.rotation.x = Math.PI / 2;
      stem.position.z = 0.075;
      const knob = new THREE.Mesh(
        new THREE.SphereGeometry(0.165, 28, 16),
        this.handleMaterial
      );
      knob.scale.z = 0.72;
      knob.position.z = 0.19;
      const turnSlot = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.025, 0.025),
        this.handleMaterial
      );
      turnSlot.position.z = 0.35;
      handleGroup.add(rose, stem, knob, turnSlot);
      pressTargets = [
        { node: knob, baseRotation: knob.rotation.clone() },
        { node: turnSlot, baseRotation: turnSlot.rotation.clone() },
      ];
    } else {
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.12, 24),
        this.handleMaterial
      );
      stem.rotation.x = Math.PI / 2;
      stem.position.z = 0.075;
      const lever = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.08, 0.08),
        this.handleMaterial
      );
      // Extend along the leaf from its free edge, mirrored on the rear face.
      lever.position.x = -Math.sign(handleX) * (face === "front" ? 0.25 : -0.25);
      lever.position.z = 0.15;
      handleGroup.add(stem, lever);
    }

    const handleEntry = {
      group: handleGroup,
      side,
      rotationMultiplier:
        this.handleTurnDirection && handleProfileId === "knob-round"
          ? getHandleTurnMultiplier(this.handleTurnDirection, face)
          : face === "front"
          ? side === "left"
            ? 1
            : -1
          : side === "left"
            ? -1
            : 1,
      pressRotationMultiplier: undefined as 1 | -1 | undefined,
      pressTargets,
    };
    this.activeHandleGroups.push(handleEntry);
    if (handleModelUrl) {
      this.mountImportedHandle(handleEntry, handleModelUrl, side === "left", handleProfileId);
    }

    return handleGroup;
  }

  private applyDoorState(animation: DoorAnimationId, state: DoorAnimationState) {
    const maxAngle = Math.PI / 2;
    const left = this.doorRoot.getObjectByName("left-door");
    const right = this.doorRoot.getObjectByName("right-door");
    const single = this.doorRoot.getObjectByName("single-door");
    const swingDirection = this.activeSwingDirection === "away-from-viewer" ? -1 : 1;

    if (animation === "center-split-slide") {
      if (left) {
        const [x, y, z] = state.leftDoorOffset ?? [0, 0, 0];
        left.position.set(-3 + x, y, z);
        left.rotation.set(0, 0, 0);
      }
      if (right) {
        const [x, y, z] = state.rightDoorOffset ?? [0, 0, 0];
        right.position.set(3 + x, y, z);
        right.rotation.set(0, 0, 0);
      }
    } else if (animation === "double-swing") {
      if (left) left.rotation.y = -swingDirection * state.doorAngle * maxAngle;
      if (right) right.rotation.y = swingDirection * (state.rightDoorAngle ?? state.doorAngle) * maxAngle;
    } else if (single) {
      const singleRotationDirection = this.activeSingleHingeSide === "right" ? 1 : -1;
      single.rotation.y =
        swingDirection * singleRotationDirection * state.doorAngle * maxAngle;
    }

    this.activeHandleGroups.forEach((handleEntry) => {
      const { group, rotationMultiplier, pressTargets } = handleEntry;
      const multiplier = pressTargets?.length
        ? handleEntry.pressRotationMultiplier ?? rotationMultiplier
        : rotationMultiplier;
      const handleAngle = handleEntry.side === "right"
        ? state.rightHandleAngle ?? state.handleAngle ?? 0
        : state.handleAngle ?? 0;
      const angle = handleAngle * multiplier;
      if (pressTargets?.length) {
        group.rotation.z = 0;
        pressTargets.forEach(({ node, baseRotation }) => {
          node.rotation.set(
            baseRotation.x,
            baseRotation.y,
            baseRotation.z + angle
          );
        });
        return;
      }
      group.rotation.z = angle;
    });
  }

  private mountImportedHandle(
    handleEntry: VanillaDoorScene["activeHandleGroups"][number],
    url: string,
    mirrorX: boolean,
    handleProfileId?: HandleProfileId
  ) {
    void loadHandleScene(url)
      .then((scene) => {
        if (this.disposed || !handleEntry.group.parent) return;
        const prepared = prepareHandleModel(scene, handleProfileId === "knob-round");
        if (!prepared) return;
        prepared.object.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) return;
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach((material) => {
            if (!(material instanceof THREE.MeshStandardMaterial)) return;
            applyRetroMaterial(material, false, this.knobBackplate ? this.retroRasterSize : undefined);
            if (this.steelKnob) {
              material.map = null;
              material.color.set("#a9ada8");
              material.roughness = 0.75;
              material.metalness = 0.2;
            }
            if (this.agedWood) {
              material.roughness = 1;
              material.metalness = 0;
              material.color.set("#b9b66d");
            }
          });
        });

        const backplate = handleEntry.group.getObjectByName("fixed-backplate");
        handleEntry.group.clear();
        if (backplate) handleEntry.group.add(backplate);
        const wrapper = new THREE.Group();
        const scale =
          prepared.scale *
          (handleProfileId === "knob-round" ? IMPORTED_KNOB_MODEL_SCALE : 1);
        wrapper.rotation.x = handleProfileId === "knob-round" ? Math.PI / 2 : 0;
        wrapper.scale.set(mirrorX ? -scale : scale, scale, scale);
        wrapper.add(prepared.object);
        const importedBounds = new THREE.Box3().setFromObject(wrapper);
        if (!importedBounds.isEmpty()) {
          wrapper.position.z += -importedBounds.min.z - IMPORTED_HANDLE_SURFACE_EMBED;
        }
        handleEntry.group.add(wrapper);
        handleEntry.pressRotationMultiplier = handleProfileId === "knob-round"
          ? undefined
          : prepared.pressRotationMultiplier;
        handleEntry.pressTargets = prepared.pressTargets;
        if (handleProfileId === "knob-round" && this.handleTurnDirection && prepared.pressTargets[0]) {
          handleEntry.pressRotationMultiplier = getImportedGripTurnMultiplier(
            prepared.pressTargets[0].node, handleEntry.group, handleEntry.rotationMultiplier
          );
        }
        this.renderer.render(this.scene, this.camera);
      })
      .catch(() => undefined);
  }

}
