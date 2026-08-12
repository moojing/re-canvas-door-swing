import * as THREE from "three";
import { getDoorAnimationConfig } from "./core/animationState.ts";
import { resolveDoorEntranceVariantSelection } from "./core/variants.ts";
import type {
  DoorAnimationState,
  DoorAnimationConfig,
  DoorAnimationVariant,
  DoorEntranceMotion,
  DoorEntranceSoundState,
  DoorEntranceType,
  DoorEntranceVariant,
  DoorEntranceVariantId,
  DoorEntranceVariantSelection,
  DoorMaterialId,
  HandleProfileId,
} from "./core/types.ts";
import { doorWood } from "./assets/textures";
import { doorOpenClose } from "./assets/sounds";

interface MountDoorEntranceOptions extends DoorEntranceVariantSelection {
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
  play: (variant?: DoorEntranceVariantId) => void;
  stop: () => void;
  reset: (variant?: DoorEntranceVariantId) => void;
  seek: (progress: number, variant?: DoorEntranceVariantId) => void;
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
  private activeTextureUrl?: string;
  private activeVariant?: DoorAnimationVariant;
  private activeHandleGroup?: THREE.Group;
  private baseDoorMaterial = createDoorMaterial();
  private handleMaterial = createHandleMaterial();

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
    textureUrl,
    cameraPanX,
    cameraPanY,
  }: {
    state: DoorAnimationState;
    config: DoorAnimationConfig;
    textureUrl: string;
    cameraPanX: number;
    cameraPanY: number;
  }) {
    if (
      this.activeVariant !== config.id ||
      this.activeTextureUrl !== textureUrl
    ) {
      this.rebuildDoor(config.id, textureUrl);
      this.activeVariant = config.id;
      this.activeTextureUrl = textureUrl;
    }

    this.applyDoorState(config.id, state);
    this.applyCameraState(state, cameraPanX, cameraPanY);
    this.fadeOverlay.style.opacity = String(clampProgress(state.fadeOut));
    this.label.textContent = config.label;
    this.resize();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.resizeObserver?.disconnect();
    disposeObject(this.doorRoot);
    this.scene.remove(this.doorRoot);
    this.baseDoorMaterial.dispose();
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

  private rebuildDoor(variant: DoorAnimationVariant, textureUrl: string) {
    disposeObject(this.doorRoot);
    this.scene.remove(this.doorRoot);
    this.doorRoot = new THREE.Group();
    this.scene.add(this.doorRoot);
    this.activeHandleGroup = undefined;

    this.baseDoorMaterial = createDoorMaterial();
    this.handleMaterial = createHandleMaterial();
    this.textureLoader.load(textureUrl, (texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      this.baseDoorMaterial.map = texture;
      this.baseDoorMaterial.needsUpdate = true;
    });

    this.addFrame();

    if (variant === "double-swing") {
      const left = this.createDoorLeaf({
        width: 1.48,
        height: 5.2,
        pivotX: 0,
        side: "left",
      });
      left.name = "left-door";
      left.position.x = -0.02;
      this.doorRoot.add(left);

      const right = this.createDoorLeaf({
        width: 1.48,
        height: 5.2,
        pivotX: 0,
        side: "right",
      });
      right.name = "right-door";
      right.position.x = 0.02;
      this.doorRoot.add(right);
      return;
    }

    const single = this.createDoorLeaf({
      width: 3,
      height: 5.2,
      pivotX: -1.5,
      side: "single",
    });
    single.name = "single-door";
    this.doorRoot.add(single);
  }

  private addFrame() {
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: "#171717",
      roughness: 0.85,
      metalness: 0.15,
    });
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.28, 0.28), frameMaterial);
    top.position.set(0, 2.75, -0.08);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.28, 5.6, 0.28), frameMaterial);
    left.position.set(-1.78, 0, -0.08);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.28, 5.6, 0.28), frameMaterial);
    right.position.set(1.78, 0, -0.08);
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.08, 4),
      new THREE.MeshStandardMaterial({
        color: "#24211e",
        roughness: 0.8,
        metalness: 0.08,
      })
    );
    floor.position.set(0, -2.72, 0.8);
    this.doorRoot.add(top, left, right, floor);
  }

  private createDoorLeaf({
    width,
    height,
    pivotX,
    side,
  }: {
    width: number;
    height: number;
    pivotX: number;
    side: "single" | "left" | "right";
  }) {
    const pivot = new THREE.Group();
    pivot.position.x = pivotX;

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 0.16),
      this.baseDoorMaterial
    );
    const doorOffset = side === "right" ? width / 2 : -pivotX + width / 2 - 1.5;
    door.position.set(side === "left" ? -width / 2 : doorOffset, 0, 0);
    pivot.add(door);

    const bevel = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.82, height * 0.72, 0.04),
      new THREE.MeshStandardMaterial({
        color: "#000000",
        roughness: 0.85,
        metalness: 0.05,
        transparent: true,
        opacity: 0.22,
      })
    );
    bevel.position.set(door.position.x, 0, 0.105);
    pivot.add(bevel);

    const handleGroup = new THREE.Group();
    const handleX =
      side === "left" ? -width + 0.32 : side === "right" ? width - 0.32 : 1.08;
    handleGroup.position.set(handleX, -0.1, 0.22);
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

    if (side === "single" || side === "right") {
      this.activeHandleGroup = handleGroup;
    }

    return pivot;
  }

  private applyDoorState(variant: DoorAnimationVariant, state: DoorAnimationState) {
    const maxAngle = Math.PI * 0.58;
    const left = this.doorRoot.getObjectByName("left-door");
    const right = this.doorRoot.getObjectByName("right-door");
    const single = this.doorRoot.getObjectByName("single-door");

    if (variant === "double-swing") {
      if (left) left.rotation.y = state.doorAngle * maxAngle;
      if (right) right.rotation.y = -(state.rightDoorAngle ?? state.doorAngle) * maxAngle;
    } else if (single) {
      single.rotation.y = -state.doorAngle * maxAngle;
    }

    if (this.activeHandleGroup) {
      this.activeHandleGroup.rotation.z = -(state.handleAngle ?? 0);
    }
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

  let activeDoorVariant = resolveDoorEntranceVariantSelection(options);
  let activeConfig = getDoorAnimationConfig(activeDoorVariant.animation);
  let progress = 0;
  let isAnimating = false;
  let didComplete = false;
  let animationFrame: number | null = null;
  let soundFrame: number | null = null;
  let audioDelayTimer: number | null = null;
  let soundStarted = false;
  let disposed = false;

  const scene = new VanillaDoorScene(
    options.className ?? activeDoorVariant.className ?? DEFAULT_CLASS_NAME
  );
  target.append(scene.element);

  const audio = document.createElement("audio");
  let resolvedTextureUrl =
    options.textureUrl ?? activeDoorVariant.textureUrl ?? DEFAULT_TEXTURE_URL;
  let resolvedSoundUrl = toPublicAssetUrl(
    options.soundUrl ?? activeDoorVariant.soundUrl ?? DEFAULT_SOUND_URL
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
      handleProfileId:
        activeDoorVariant.handleProfileId ?? "lever-l",
    });
    scene.render({
      state,
      config,
      textureUrl: resolvedTextureUrl,
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

  const resolveVariant = (nextVariant?: DoorEntranceVariantId) => {
    activeDoorVariant = nextVariant
      ? resolveDoorEntranceVariantSelection({ variant: nextVariant })
      : activeDoorVariant;
    activeConfig = getDoorAnimationConfig(activeDoorVariant.animation);
    resolvedTextureUrl =
      options.textureUrl ?? activeDoorVariant.textureUrl ?? DEFAULT_TEXTURE_URL;
    resolvedSoundUrl = toPublicAssetUrl(
      options.soundUrl ?? activeDoorVariant.soundUrl ?? DEFAULT_SOUND_URL
    );
    if (resolvedSoundUrl && audio.src !== resolvedSoundUrl) {
      audio.src = resolvedSoundUrl;
      audio.preload = "auto";
    }
    return activeConfig;
  };

  const playSoundForTimeline = (startProgress: number, config = activeConfig) => {
    clearAudioDelayTimer();
    soundStarted = false;

    if (!resolvedSoundUrl || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      emitSoundProgress();
      return;
    }

    const { startProgress: soundStartProgress } = getSoundWindow(config);
    const playNow = () => {
      syncSoundToTimelineProgress(
        Math.max(startProgress, soundStartProgress),
        config
      );
      void audio
        .play()
        .then(() => {
          soundStarted = true;
          startSoundLoop();
        })
        .catch(() => {
          soundStarted = false;
        });
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
    play: (variant) => {
      if (disposed || isAnimating) return;

      const config = resolveVariant(variant);
      const startProgress = progress >= 1 ? 0 : progress;
      if (startProgress !== progress) {
        renderProgress(startProgress, config);
      }

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
    reset: (variant) => {
      if (disposed) return;
      cancelAnimationLoop();
      isAnimating = false;
      clearAudioDelayTimer();
      resetSound();
      const config = resolveVariant(variant);
      didComplete = false;
      renderProgress(0, config);
    },
    seek: (nextProgress, variant) => {
      if (disposed) return;
      cancelAnimationLoop();
      isAnimating = false;
      clearAudioDelayTimer();
      pauseSound();
      const config = resolveVariant(variant);
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
