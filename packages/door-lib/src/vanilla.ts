import * as THREE from "three";
import { getDoorAnimationConfig } from "./core/animationState.ts";
import { resolveDoorEntrancePresetSelection } from "./core/presets.ts";
import { resolveDoorSurfaceTextureUrls } from "./core/surfaceTextures.ts";
import type {
  DoorAnimationState,
  DoorAnimationConfig,
  DoorAnimationId,
  DoorEntranceMotion,
  DoorEntrancePresetId,
  DoorEntranceSoundState,
  DoorEntranceType,
  DoorEntrancePreset,
  DoorEntrancePresetSelection,
  DoorHingeSide,
  DoorMaterialId,
  HandleProfileId,
  ResolvedDoorSurfaceTextureUrls,
} from "./core/types.ts";
import { doorWood } from "./assets/textures/index.ts";
import { doorOpenClose } from "./assets/sounds/index.ts";
import { loadHandleScene, prepareHandleModel } from "./handleModel.ts";

interface MountDoorEntranceOptions extends DoorEntrancePresetSelection {
  target: HTMLElement | null;
  autoPlay?: boolean;
  className?: string;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  onSoundProgress?: (state: DoorEntranceSoundState) => void;
  onReady?: () => void;
  textureUrl?: string;
  handleModelUrl?: string;
  soundUrl?: string;
  cameraPanX?: number;
  cameraPanY?: number;
}

interface MountedDoorEntrance {
  play: (preset?: DoorEntrancePresetId) => void;
  stop: () => void;
  reset: (preset?: DoorEntrancePresetId) => void;
  seek: (progress: number, preset?: DoorEntrancePresetId) => void;
  seekSound: (progress: number) => void;
  unmount: () => void;
}

type DoorEntranceHandle = MountedDoorEntrance;

const DEFAULT_CLASS_NAME =
  "h-[460px] w-full rounded-xl border border-white/10 bg-black";
const DEFAULT_TEXTURE_URL = doorWood;
const DEFAULT_SOUND_URL = doorOpenClose;

const clampProgress = (progress: number) => {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(Math.max(progress, 0), 1);
};

const toPublicAssetUrl = (url?: string) => {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url) || url.startsWith("/")) return url;

  const normalized = url.replace(/^\.?\//, "");
  if (typeof document !== "undefined") {
    try {
      return new URL(normalized, document.baseURI).toString();
    } catch {
      return normalized;
    }
  }

  return normalized;
};

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

const createHandleMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: "#74685c",
    roughness: 0.55,
    metalness: 0.65,
  });

class VanillaDoorScene {
  readonly element: HTMLDivElement;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  private readonly textureLoader = new THREE.TextureLoader();
  private readonly fadeOverlay = document.createElement("div");
  private readonly label = document.createElement("div");
  private readonly resizeObserver?: ResizeObserver;
  private doorRoot = new THREE.Group();
  private activeSurfaceTextureKey?: string;
  private activeHandleModelUrl?: string;
  private activeHasHandle?: boolean;
  private activeMirrorBackTexture?: boolean;
  private activeMirrorTextureX?: boolean;
  private activeSingleHingeSide: DoorHingeSide = "left";
  private activeAnimation?: DoorAnimationId;
  private activeHandleGroups: Array<{
    group: THREE.Group;
    rotationMultiplier: number;
    pressRotationMultiplier?: 1 | -1;
    pressTargets?: Array<{ node: THREE.Object3D; baseRotation: THREE.Euler }>;
  }> = [];
  private doorMaterials = createDoorMaterials();
  private frontDoorMaterial = createDoorFaceMaterial();
  private backDoorMaterial = createDoorFaceMaterial();
  private handleMaterial = createHandleMaterial();
  private disposed = false;

  constructor(className: string) {
    this.element = document.createElement("div");
    this.element.className = `relative overflow-hidden ${className}`;
    this.element.style.position = this.element.style.position || "relative";
    this.element.style.overflow = "hidden";
    this.element.style.background = "#000000";

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setClearColor("#000000");
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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

    this.scene.add(new THREE.AmbientLight("#ffffff", 0.25));
    const keyLight = new THREE.DirectionalLight("#fff7ee", 0.75);
    keyLight.position.set(2, 5, 5);
    this.scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight("#8fa8c7", 0.35);
    rimLight.position.set(-3, 2, -4);
    this.scene.add(rimLight);
    const warmLight = new THREE.PointLight("#ff8844", 0.55);
    warmLight.position.set(0, 2, 3);
    this.scene.add(warmLight);
    this.scene.add(this.doorRoot);

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.element);
    }
  }

  render({
    state,
    config,
    surfaceTextureUrls,
    handleModelUrl,
    hasHandle,
    mirrorBackTexture,
    mirrorTextureX,
    hingeSide,
    cameraPanX,
    cameraPanY,
  }: {
    state: DoorAnimationState;
    config: DoorAnimationConfig;
    surfaceTextureUrls: ResolvedDoorSurfaceTextureUrls;
    handleModelUrl?: string;
    hasHandle: boolean;
    mirrorBackTexture: boolean;
    mirrorTextureX: boolean;
    hingeSide: DoorHingeSide;
    cameraPanX: number;
    cameraPanY: number;
  }) {
    const surfaceKey = [
      surfaceTextureUrls.frontTextureUrl,
      surfaceTextureUrls.edgeTextureUrl,
      surfaceTextureUrls.backTextureUrl,
    ].join("|");
    if (
      this.activeAnimation !== config.id ||
      this.activeSurfaceTextureKey !== surfaceKey ||
      this.activeHandleModelUrl !== handleModelUrl ||
      this.activeHasHandle !== hasHandle ||
      this.activeMirrorBackTexture !== mirrorBackTexture ||
      this.activeMirrorTextureX !== mirrorTextureX ||
      this.activeSingleHingeSide !== hingeSide
    ) {
      this.rebuildDoor(
        config.id,
        surfaceTextureUrls,
        handleModelUrl,
        hasHandle,
        mirrorBackTexture,
        mirrorTextureX,
        hingeSide
      );
      this.activeAnimation = config.id;
      this.activeSurfaceTextureKey = surfaceKey;
      this.activeHandleModelUrl = handleModelUrl;
      this.activeHasHandle = hasHandle;
      this.activeMirrorBackTexture = mirrorBackTexture;
      this.activeMirrorTextureX = mirrorTextureX;
      this.activeSingleHingeSide = hingeSide;
    }

    this.applyDoorState(config.id, state);
    this.applyCameraState(state, cameraPanX, cameraPanY);
    this.fadeOverlay.style.opacity = String(clampProgress(state.fadeOut));
    this.label.textContent = config.label;
    this.resize();
    this.renderer.render(this.scene, this.camera);
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

    const canvas = this.renderer.domElement;
    if (canvas.width !== width || canvas.height !== height) {
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  private rebuildDoor(
    animation: DoorAnimationId,
    surfaceTextureUrls: ResolvedDoorSurfaceTextureUrls,
    handleModelUrl: string | undefined,
    hasHandle: boolean,
    mirrorBackTexture: boolean,
    mirrorTextureX: boolean,
    hingeSide: DoorHingeSide
  ) {
    disposeObject(this.doorRoot);
    this.scene.remove(this.doorRoot);
    this.doorRoot = new THREE.Group();
    this.scene.add(this.doorRoot);
    this.activeHandleGroups = [];

    this.doorMaterials = createDoorMaterials();
    this.frontDoorMaterial = createDoorFaceMaterial();
    this.backDoorMaterial = createDoorFaceMaterial();
    this.handleMaterial = createHandleMaterial();
    const doorMaterials = this.doorMaterials;
    this.loadTexture(surfaceTextureUrls.edgeTextureUrl, doorMaterials.slice(0, 4));
    this.loadTexture(surfaceTextureUrls.frontTextureUrl, [this.frontDoorMaterial]);
    this.loadTexture(surfaceTextureUrls.backTextureUrl, [this.backDoorMaterial]);

    if (animation === "double-swing") {
      const left = this.createDoorLeaf({
        width: 3,
        height: 6,
        pivotX: -3,
        doorCenterX: 1.5,
        handleX: 2.26,
        side: "left",
        handleModelUrl,
        hasHandle,
        mirrorBackTexture,
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
        hasHandle,
        mirrorBackTexture,
        mirrorTextureX,
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
            hasHandle,
            mirrorBackTexture,
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
            hasHandle,
            mirrorBackTexture,
            mirrorTextureX,
          });
    single.name = "single-door";
    this.doorRoot.add(single);
  }

  private loadTexture(
    url: string,
    materials: THREE.MeshStandardMaterial[]
  ) {
    this.textureLoader.load(url, (texture) => {
      if (this.disposed) {
        texture.dispose();
        return;
      }

      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.flipY = false;
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
    hasHandle,
    mirrorBackTexture,
    mirrorTextureX,
  }: {
    width: number;
    height: number;
    pivotX: number;
    doorCenterX: number;
    handleX: number;
    side: "single" | "left" | "right";
    handleModelUrl?: string;
    hasHandle: boolean;
    mirrorBackTexture: boolean;
    mirrorTextureX: boolean;
  }) {
    const pivot = new THREE.Group();
    pivot.position.x = pivotX;

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 0.16),
      this.doorMaterials
    );
    door.position.set(doorCenterX, 0, 0.08);
    pivot.add(door);

    const front = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      this.frontDoorMaterial
    );
    front.position.set(doorCenterX, 0, 0.161);
    if (mirrorTextureX) mirrorPlaneTextureX(front.geometry);
    pivot.add(front);

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      this.backDoorMaterial
    );
    if (mirrorBackTexture !== mirrorTextureX) mirrorPlaneTextureX(back.geometry);
    back.position.set(doorCenterX, 0, -0.001);
    back.rotation.y = Math.PI;
    pivot.add(back);

    if (!hasHandle) return pivot;

    const handleGroup = new THREE.Group();
    handleGroup.position.set(handleX, -0.02, 0.32);
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.12, 24),
      this.handleMaterial
    );
    stem.rotation.x = Math.PI / 2;
    const lever = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.08, 0.08),
      this.handleMaterial
    );
    lever.position.x = side === "left" ? -0.25 : 0.25;
    handleGroup.add(stem, lever);
    pivot.add(handleGroup);

    const handleEntry = {
      group: handleGroup,
      rotationMultiplier: side === "left" ? 1 : -1,
      pressRotationMultiplier: undefined as 1 | -1 | undefined,
      pressTargets: undefined as
        | Array<{ node: THREE.Object3D; baseRotation: THREE.Euler }>
        | undefined,
    };
    this.activeHandleGroups.push(handleEntry);
    if (handleModelUrl) {
      this.mountImportedHandle(handleEntry, handleModelUrl, side === "left");
    }

    return pivot;
  }

  private applyDoorState(animation: DoorAnimationId, state: DoorAnimationState) {
    const maxAngle = Math.PI / 2;
    const left = this.doorRoot.getObjectByName("left-door");
    const right = this.doorRoot.getObjectByName("right-door");
    const single = this.doorRoot.getObjectByName("single-door");

    if (animation === "double-swing") {
      if (left) left.rotation.y = -state.doorAngle * maxAngle;
      if (right) right.rotation.y = (state.rightDoorAngle ?? state.doorAngle) * maxAngle;
    } else if (single) {
      const singleRotationDirection = this.activeSingleHingeSide === "right" ? 1 : -1;
      single.rotation.y = singleRotationDirection * state.doorAngle * maxAngle;
    }

    this.activeHandleGroups.forEach((handleEntry) => {
      const { group, rotationMultiplier, pressTargets } = handleEntry;
      const multiplier = pressTargets?.length
        ? handleEntry.pressRotationMultiplier ?? rotationMultiplier
        : rotationMultiplier;
      const angle = (state.handleAngle ?? 0) * multiplier;
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
    mirrorX: boolean
  ) {
    void loadHandleScene(url)
      .then((scene) => {
        if (this.disposed || !handleEntry.group.parent) return;
        const prepared = prepareHandleModel(scene);
        if (!prepared) return;

        handleEntry.group.clear();
        const wrapper = new THREE.Group();
        const scale = prepared.scale;
        wrapper.scale.set(mirrorX ? -scale : scale, scale, scale);
        wrapper.add(prepared.object);
        handleEntry.group.add(wrapper);
        handleEntry.pressRotationMultiplier = prepared.pressRotationMultiplier;
        handleEntry.pressTargets = prepared.pressTargets;
        this.renderer.render(this.scene, this.camera);
      })
      .catch(() => undefined);
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
}

export const mountDoorEntrance = (
  options: MountDoorEntranceOptions
): MountedDoorEntrance => {
  const { target } = options;

  if (!target) {
    throw new Error("mountDoorEntrance: target element is required");
  }

  let activeDoorPreset = resolveDoorEntrancePresetSelection(options);
  let activeConfig = getDoorAnimationConfig(activeDoorPreset.animation);
  let progress = 0;
  let isAnimating = false;
  let didComplete = false;
  let animationFrame: number | null = null;
  let soundFrame: number | null = null;
  let audioDelayTimer: number | null = null;
  let soundStarted = false;
  let soundUnlocked = false;
  let soundUnlocking: Promise<boolean> | null = null;
  let disposed = false;

  const scene = new VanillaDoorScene(
    options.className ?? activeDoorPreset.className ?? DEFAULT_CLASS_NAME
  );
  target.append(scene.element);

  const audio = document.createElement("audio");
  let resolvedSurfaceTextureUrls = options.textureUrl
    ? {
        frontTextureUrl: options.textureUrl,
        edgeTextureUrl: options.textureUrl,
        backTextureUrl: options.textureUrl,
      }
    : resolveDoorSurfaceTextureUrls(activeDoorPreset, DEFAULT_TEXTURE_URL);
  let resolvedSoundUrl = toPublicAssetUrl(
    options.soundUrl ?? activeDoorPreset.soundUrl ?? DEFAULT_SOUND_URL
  );

  if (resolvedSoundUrl) {
    audio.src = resolvedSoundUrl;
    audio.preload = "auto";
    scene.element.append(audio);
  }

  const emitSoundProgress = () => {
    if (!resolvedSoundUrl) {
      options.onSoundProgress?.({
        enabled: false,
        ready: false,
        currentTimeMs: 0,
        durationMs: 0,
        progress: 0,
      });
      return;
    }

    const ready = Number.isFinite(audio.duration) && audio.duration > 0;
    const durationMs = ready ? audio.duration * 1000 : 0;
    const currentTimeMs = ready ? audio.currentTime * 1000 : 0;
    options.onSoundProgress?.({
      enabled: true,
      ready,
      currentTimeMs,
      durationMs,
      progress: ready ? clampProgress(audio.currentTime / audio.duration) : 0,
    });
  };

  const stopSoundLoop = () => {
    if (soundFrame !== null) {
      cancelAnimationFrame(soundFrame);
      soundFrame = null;
    }
  };

  const startSoundLoop = () => {
    stopSoundLoop();
    const tick = () => {
      if (audio.paused || audio.ended) {
        soundFrame = null;
        emitSoundProgress();
        return;
      }
      emitSoundProgress();
      soundFrame = requestAnimationFrame(tick);
    };
    soundFrame = requestAnimationFrame(tick);
  };

  const clearAudioDelayTimer = () => {
    if (audioDelayTimer !== null) {
      window.clearTimeout(audioDelayTimer);
      audioDelayTimer = null;
    }
  };

  const getSoundWindow = (config = activeConfig) => {
    const startProgress = clampProgress(config.soundStartProgress ?? 0.18);
    const endProgress = Math.min(
      Math.max(config.soundEndProgress ?? 1, startProgress + 0.001),
      1
    );
    const sourceStartProgress = clampProgress(config.soundSourceStartProgress ?? 0);
    const sourceEndProgress = Math.min(
      Math.max(
        config.soundSourceEndProgress ?? 1,
        sourceStartProgress + Number.EPSILON
      ),
      1
    );
    return {
      startProgress,
      endProgress,
      sourceStartProgress,
      sourceEndProgress,
    };
  };

  const syncSoundToTimelineProgress = (
    timelineProgress: number,
    config = activeConfig
  ) => {
    if (!resolvedSoundUrl || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      emitSoundProgress();
      return;
    }

    const {
      startProgress,
      endProgress,
      sourceStartProgress,
      sourceEndProgress,
    } = getSoundWindow(config);

    let sourceProgress = 0;
    if (timelineProgress >= endProgress) {
      sourceProgress = sourceEndProgress;
    } else if (timelineProgress >= 0 && timelineProgress < startProgress) {
      sourceProgress =
        sourceStartProgress *
        clampProgress(timelineProgress / Math.max(startProgress, Number.EPSILON));
    } else if (timelineProgress >= startProgress) {
      const normalized = clampProgress(
        (timelineProgress - startProgress) /
          Math.max(endProgress - startProgress, Number.EPSILON)
      );
      sourceProgress =
        sourceStartProgress +
        normalized * (sourceEndProgress - sourceStartProgress);
    }

    audio.currentTime = audio.duration * sourceProgress;
    emitSoundProgress();
  };

  const pauseSound = () => {
    stopSoundLoop();
    audio.pause();
    soundStarted = false;
  };

  const unlockSound = () => {
    if (!resolvedSoundUrl || soundUnlocked) {
      return Promise.resolve(soundUnlocked);
    }

    if (soundUnlocking) return soundUnlocking;

    const wasMuted = audio.muted;
    audio.muted = true;
    soundUnlocking = audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = wasMuted;
        soundUnlocked = true;
        return true;
      })
      .catch(() => {
        audio.muted = wasMuted;
        return false;
      })
      .finally(() => {
        soundUnlocking = null;
      });

    return soundUnlocking;
  };

  const resetSound = () => {
    audio.pause();
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = 0;
    }
    soundStarted = false;
    emitSoundProgress();
  };

  const renderProgress = (nextProgress: number, config = activeConfig) => {
    progress = clampProgress(nextProgress);
    const easedProgress = clampProgress(config.easing?.(progress) ?? progress);
    const state = config.getState(easedProgress, {
      linearProgress: progress,
      handleProfileId: activeDoorPreset.handleProfileId,
    });
    scene.render({
      state,
      config,
      surfaceTextureUrls: resolvedSurfaceTextureUrls,
      handleModelUrl: toPublicAssetUrl(
        options.handleModelUrl ?? activeDoorPreset.handleModelUrl
      ),
      hasHandle: Boolean(activeDoorPreset.handleProfileId),
      mirrorBackTexture: Boolean(activeDoorPreset.backTextureUrl) && !options.textureUrl,
      mirrorTextureX: activeDoorPreset.mirrorTextureX ?? false,
      hingeSide: activeDoorPreset.hingeSide ?? "left",
      cameraPanX: options.cameraPanX ?? 0,
      cameraPanY: options.cameraPanY ?? 0,
    });
    options.onProgress?.(progress);

    if (progress < 1) didComplete = false;
    if (progress >= 1 && !didComplete) {
      didComplete = true;
      isAnimating = false;
      options.onComplete?.();
    }
  };

  const cancelAnimationLoop = () => {
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  };

  const resolvePreset = (nextPreset?: DoorEntrancePresetId) => {
    activeDoorPreset = nextPreset
      ? resolveDoorEntrancePresetSelection({ preset: nextPreset })
      : activeDoorPreset;
    activeConfig = getDoorAnimationConfig(activeDoorPreset.animation);
    resolvedSurfaceTextureUrls = options.textureUrl
      ? {
          frontTextureUrl: options.textureUrl,
          edgeTextureUrl: options.textureUrl,
          backTextureUrl: options.textureUrl,
        }
      : resolveDoorSurfaceTextureUrls(activeDoorPreset, DEFAULT_TEXTURE_URL);
    resolvedSoundUrl = toPublicAssetUrl(
      options.soundUrl ?? activeDoorPreset.soundUrl ?? DEFAULT_SOUND_URL
    );
    if (resolvedSoundUrl && audio.src !== resolvedSoundUrl) {
      audio.src = resolvedSoundUrl;
      audio.preload = "auto";
      soundUnlocked = false;
    }
    return activeConfig;
  };

  const playSoundForTimeline = (startProgress: number, config = activeConfig) => {
    clearAudioDelayTimer();
    soundStarted = false;

    if (!resolvedSoundUrl) {
      emitSoundProgress();
      return;
    }

    const { startProgress: soundStartProgress } = getSoundWindow(config);
    const playNow = () => {
      const startPlayback = () => {
        syncSoundToTimelineProgress(
          Math.max(startProgress, soundStartProgress),
          config
        );
        void audio
          .play()
          .then(() => {
            syncSoundToTimelineProgress(progress, config);
            soundStarted = true;
            startSoundLoop();
          })
          .catch(() => {
            soundStarted = false;
          });
      };

      if (!soundUnlocked) {
        void unlockSound().then((unlocked) => {
          if (unlocked && !disposed && isAnimating) startPlayback();
        });
        return;
      }

      startPlayback();
    };

    if (startProgress >= soundStartProgress) {
      playNow();
      return;
    }

    syncSoundToTimelineProgress(startProgress, config);
    audioDelayTimer = window.setTimeout(
      playNow,
      (soundStartProgress - startProgress) * config.duration
    );
  };

  const api: MountedDoorEntrance = {
    play: (preset) => {
      if (disposed || isAnimating) return;

      const config = resolvePreset(preset);
      const startProgress = progress >= 1 ? 0 : progress;
      if (startProgress !== progress) {
        renderProgress(startProgress, config);
      }

      void unlockSound();
      playSoundForTimeline(startProgress, config);
      const duration = Math.max(config.duration * (1 - startProgress), 1);
      const startTime = performance.now();
      isAnimating = true;

      const animate = (currentTime: number) => {
        if (!isAnimating || disposed) {
          animationFrame = null;
          return;
        }

        const linearProgress = Math.min(
          startProgress +
            ((currentTime - startTime) / duration) * (1 - startProgress),
          1
        );
        renderProgress(linearProgress, config);
        if (!soundStarted) {
          syncSoundToTimelineProgress(linearProgress, config);
        }

        if (linearProgress < 1) {
          animationFrame = requestAnimationFrame(animate);
        } else {
          isAnimating = false;
          animationFrame = null;
        }
      };

      cancelAnimationLoop();
      animationFrame = requestAnimationFrame(animate);
    },
    stop: () => {
      cancelAnimationLoop();
      isAnimating = false;
      clearAudioDelayTimer();
      pauseSound();
      emitSoundProgress();
    },
    reset: (preset) => {
      if (disposed) return;
      cancelAnimationLoop();
      isAnimating = false;
      clearAudioDelayTimer();
      resetSound();
      const config = resolvePreset(preset);
      didComplete = false;
      renderProgress(0, config);
    },
    seek: (nextProgress, preset) => {
      if (disposed) return;
      cancelAnimationLoop();
      isAnimating = false;
      clearAudioDelayTimer();
      pauseSound();
      const config = resolvePreset(preset);
      renderProgress(nextProgress, config);
      syncSoundToTimelineProgress(clampProgress(nextProgress), config);
    },
    seekSound: (nextProgress) => {
      clearAudioDelayTimer();
      pauseSound();
      if (!resolvedSoundUrl || !Number.isFinite(audio.duration) || audio.duration <= 0) {
        emitSoundProgress();
        return;
      }
      audio.currentTime = audio.duration * clampProgress(nextProgress);
      soundStarted = false;
      emitSoundProgress();
    },
    unmount: () => {
      if (disposed) return;
      disposed = true;
      cancelAnimationLoop();
      clearAudioDelayTimer();
      stopSoundLoop();
      audio.pause();
      audio.remove();
      scene.dispose();
    },
  };

  audio.addEventListener("loadedmetadata", emitSoundProgress);
  audio.addEventListener("canplay", emitSoundProgress);
  audio.addEventListener("timeupdate", emitSoundProgress);
  audio.addEventListener("ended", () => {
    soundStarted = false;
    stopSoundLoop();
    emitSoundProgress();
  });
  audio.addEventListener("pause", () => {
    soundStarted = false;
    stopSoundLoop();
    emitSoundProgress();
  });
  audio.addEventListener("play", () => {
    soundStarted = true;
    startSoundLoop();
    emitSoundProgress();
  });

  renderProgress(0);
  requestAnimationFrame(() => {
    if (!disposed) options.onReady?.();
  });

  if (options.autoPlay ?? true) {
    requestAnimationFrame(() => api.play());
  }

  return api;
};

export type { DoorEntranceHandle, MountDoorEntranceOptions, MountedDoorEntrance };
