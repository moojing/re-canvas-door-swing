import {
  resolvePhoneCameraDraft,
  type DoorPhoneFraming,
  type DoorCameraDraft,
} from "./core/cameraAuthoring.ts";
import { resolveAssetUrl } from "./core/assetUrls.ts";
import { getDoorEntranceAnimationConfig, type DoorTimingEvents } from "./core/presetAnimation.ts";
import { resolveDoorEntrancePresetSelection } from "./core/presets.ts";
import { resolveDoorSurfaceTextureUrls, shouldMirrorBackTextureX } from "./core/surfaceTextures.ts";
import type {
  DoorAnimationConfig,
  DoorEntrancePresetId,
  DoorEntranceSoundState,
  DoorEntrancePreset,
  DoorEntrancePresetSelection,
  DoorSwingDirection,
} from "./core/types.ts";
import { doorWood } from "./assets/textures/index.ts";
import { doorOpenClose } from "./assets/sounds/index.ts";
import { VanillaDoorScene } from "./renderer/scene.ts";
import { createDoorAudio } from "./renderer/audio.ts";
import { clampProgress } from "./renderer/progress.ts";

interface MountDoorEntranceOptions extends DoorEntrancePresetSelection {
  target: HTMLElement | null;
  /** Base directory for library-owned textures, models and sounds. */
  assetBaseUrl?: string;
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

interface DoorPreviewOverrides {
  swingDirection?: DoorSwingDirection;
  timingEvents?: DoorTimingEvents;
  cameraDraft?: DoorCameraDraft;
  phoneFraming?: DoorPhoneFraming;
}

interface MountedDoorEntrance {
  play: (preset?: DoorEntrancePresetId) => void;
  stop: () => void;
  reset: (preset?: DoorEntrancePresetId) => void;
  seek: (progress: number, preset?: DoorEntrancePresetId) => void;
  seekSound: (progress: number) => void;
  setPreviewOverrides: (overrides: DoorPreviewOverrides) => void;
  unmount: () => void;
}

type DoorEntranceHandle = MountedDoorEntrance;

const DEFAULT_CLASS_NAME =
  "h-[460px] w-full rounded-xl border border-white/10 bg-black";
const DEFAULT_TEXTURE_URL = doorWood;
const DEFAULT_SOUND_URL = doorOpenClose;
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

export const mountDoorEntrance = (
  options: MountDoorEntranceOptions
): MountedDoorEntrance => {
  const { target } = options;

  if (!target) {
    throw new Error("mountDoorEntrance: target element is required");
  }

  const assetUrl = (url: string) => resolveAssetUrl(url, options.assetBaseUrl)!;
  const presetAssets = (preset: DoorEntrancePreset) => ({
    ...preset,
    frontTextureUrl: resolveAssetUrl(preset.frontTextureUrl, options.assetBaseUrl),
    edgeTextureUrl: resolveAssetUrl(preset.edgeTextureUrl, options.assetBaseUrl),
    backTextureUrl: resolveAssetUrl(preset.backTextureUrl, options.assetBaseUrl),
    handleModelUrl: resolveAssetUrl(preset.handleModelUrl, options.assetBaseUrl),
    soundUrl: resolveAssetUrl(preset.soundUrl, options.assetBaseUrl),
  });
  let activeDoorPreset = presetAssets(resolveDoorEntrancePresetSelection(options));
  let previewOverrides: DoorPreviewOverrides = {};
  let activeConfig = getDoorEntranceAnimationConfig(activeDoorPreset);
  let phoneConfig: DoorAnimationConfig | undefined;
  const resolvePhoneConfig = (overrides: DoorPreviewOverrides) => overrides.phoneFraming
    ? getDoorEntranceAnimationConfig(activeDoorPreset, overrides.timingEvents,
      resolvePhoneCameraDraft(overrides.cameraDraft ?? {}, overrides.phoneFraming))
    : undefined;
  let progress = 0;
  let isAnimating = false;
  let didComplete = false;
  let animationFrame: number | null = null;
  let disposed = false;

  const scene = new VanillaDoorScene(
    options.className ?? activeDoorPreset.className ?? DEFAULT_CLASS_NAME
  );
  target.append(scene.element);

  let resolvedSurfaceTextureUrls = options.textureUrl
    ? {
        frontTextureUrl: options.textureUrl,
        edgeTextureUrl: options.textureUrl,
        backTextureUrl: options.textureUrl,
      }
    : resolveDoorSurfaceTextureUrls(activeDoorPreset, assetUrl(DEFAULT_TEXTURE_URL));
  let resolvedSoundUrl = toPublicAssetUrl(
    options.soundUrl ?? activeDoorPreset.soundUrl ?? assetUrl(DEFAULT_SOUND_URL)
  );

  const sound = createDoorAudio({
    parent: scene.element,
    sourceUrl: resolvedSoundUrl,
    getConfig: () => activeConfig,
    hasAnimationStyle: () => Boolean(activeDoorPreset.animationStyle),
    getProgress: () => progress,
    isAnimating: () => isAnimating,
    onSoundProgress: (state) => options.onSoundProgress?.(state),
  });

  const renderProgress = (nextProgress: number, config = activeConfig) => {
    progress = clampProgress(nextProgress);
    sound.setVolume(progress, config);
    const easedProgress = clampProgress(config.easing?.(progress) ?? progress);
    const state = config.getState(easedProgress, {
      linearProgress: progress,
      handleProfileId: activeDoorPreset.handleProfileId,
    });
    scene.render({
      progress,
      presetId: activeDoorPreset.id,
      handleTurnDirection: activeDoorPreset.handleTurnDirection,
      state,
      config,
      phoneConfig,
      phoneFraming: previewOverrides.phoneFraming,
      surfaceTextureUrls: resolvedSurfaceTextureUrls,
      textureFlipY: activeDoorPreset.textureFlipY ?? false,
      handleModelUrl: toPublicAssetUrl(
        options.handleModelUrl ?? activeDoorPreset.handleModelUrl
      ),
      handleProfileId: activeDoorPreset.handleProfileId,
      hasHandle: Boolean(activeDoorPreset.handleProfileId),
      mirrorBackTextureX: shouldMirrorBackTextureX({
        frontMirrored: activeDoorPreset.mirrorTextureX ?? false,
        hasDistinctBackTexture:
          resolvedSurfaceTextureUrls.backTextureUrl !==
          resolvedSurfaceTextureUrls.frontTextureUrl,
      }),
      mirrorTextureX: activeDoorPreset.mirrorTextureX ?? false,
      hingeSide: activeDoorPreset.hingeSide ?? "left",
      swingDirection:
        previewOverrides.swingDirection ??
        activeDoorPreset.swingDirection ??
        "toward-viewer",
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
    if (nextPreset && nextPreset !== activeDoorPreset.id) {
      previewOverrides = {};
    }
    activeDoorPreset = nextPreset
      ? presetAssets(resolveDoorEntrancePresetSelection({ preset: nextPreset }))
      : activeDoorPreset;
    activeConfig = getDoorEntranceAnimationConfig(activeDoorPreset, previewOverrides.timingEvents, previewOverrides.cameraDraft);
    phoneConfig = resolvePhoneConfig(previewOverrides);
    sound.updateSoundPlaybackRate(activeConfig);
    resolvedSurfaceTextureUrls = options.textureUrl
      ? {
          frontTextureUrl: options.textureUrl,
          edgeTextureUrl: options.textureUrl,
          backTextureUrl: options.textureUrl,
        }
      : resolveDoorSurfaceTextureUrls(activeDoorPreset, assetUrl(DEFAULT_TEXTURE_URL));
    resolvedSoundUrl = toPublicAssetUrl(
      options.soundUrl ?? activeDoorPreset.soundUrl ?? assetUrl(DEFAULT_SOUND_URL)
    );
    sound.setSource(resolvedSoundUrl);
    return activeConfig;
  };

  const api: MountedDoorEntrance = {
    play: (preset) => {
      if (disposed || isAnimating) return;

      const config = resolvePreset(preset);
      const startProgress = progress >= 1 ? 0 : progress;
      if (startProgress !== progress) {
        renderProgress(startProgress, config);
      }

      void sound.unlockSound();
      sound.playSoundForTimeline(startProgress, config);
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
        sound.updateTimeline(linearProgress, config);

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
      sound.clearAudioDelayTimer();
      sound.pauseSound();
      sound.emitSoundProgress();
    },
    reset: (preset) => {
      if (disposed) return;
      cancelAnimationLoop();
      isAnimating = false;
      sound.clearAudioDelayTimer();
      sound.resetSound();
      const config = resolvePreset(preset);
      didComplete = false;
      renderProgress(0, config);
    },
    seek: (nextProgress, preset) => {
      if (disposed) return;
      cancelAnimationLoop();
      isAnimating = false;
      sound.clearAudioDelayTimer();
      sound.pauseSound();
      const config = resolvePreset(preset);
      renderProgress(nextProgress, config);
      sound.syncSoundToTimelineProgress(clampProgress(nextProgress), config);
    },
    seekSound: (nextProgress) => sound.seekSound(nextProgress),
    setPreviewOverrides: (overrides) => {
      if (disposed) return;
      const timingChanged = JSON.stringify(previewOverrides.timingEvents ?? {}) !==
        JSON.stringify(overrides.timingEvents ?? {}) ||
        JSON.stringify(previewOverrides.cameraDraft ?? {}) !== JSON.stringify(overrides.cameraDraft ?? {}) ||
        JSON.stringify(previewOverrides.phoneFraming ?? {}) !== JSON.stringify(overrides.phoneFraming ?? {});
      if (timingChanged) {
        const nextConfig = getDoorEntranceAnimationConfig(activeDoorPreset, overrides.timingEvents, overrides.cameraDraft);
        const nextPhoneConfig = resolvePhoneConfig(overrides);
        const elapsedMs = progress * activeConfig.duration;
        cancelAnimationLoop();
        isAnimating = false;
        sound.clearAudioDelayTimer();
        sound.pauseSound();
        previewOverrides = { ...overrides, cameraDraft: overrides.cameraDraft ? { ...overrides.cameraDraft } : undefined,
          phoneFraming: overrides.phoneFraming ? { ...overrides.phoneFraming } : undefined,
          timingEvents: overrides.timingEvents ? { ...overrides.timingEvents } : undefined };
        activeConfig = nextConfig;
        phoneConfig = nextPhoneConfig;
        // Camera-only drafts may keep the same initial state and event times.
        // Their protected path still requires a new fixed portrait fit.
        scene.invalidateCameraFit();
        sound.updateSoundPlaybackRate(nextConfig);
        const nextProgress = clampProgress(elapsedMs / nextConfig.duration);
        renderProgress(nextProgress, nextConfig);
        sound.syncSoundToTimelineProgress(nextProgress, nextConfig);
        return;
      }
      previewOverrides = { ...overrides, cameraDraft: overrides.cameraDraft ? { ...overrides.cameraDraft } : undefined,
          phoneFraming: overrides.phoneFraming ? { ...overrides.phoneFraming } : undefined,
          timingEvents: overrides.timingEvents ? { ...overrides.timingEvents } : undefined };
      renderProgress(progress);
    },
    unmount: () => {
      if (disposed) return;
      disposed = true;
      sound.beginDispose();
      cancelAnimationLoop();
      sound.clearAudioDelayTimer();
      sound.stopSoundLoop();
      sound.remove();
      scene.dispose();
    },
  };

  sound.attachListeners();

  renderProgress(0);
  requestAnimationFrame(() => {
    if (!disposed) options.onReady?.();
  });

  if (options.autoPlay ?? true) {
    requestAnimationFrame(() => api.play());
  }

  return api;
};

export type { DoorEntranceHandle, DoorPreviewOverrides, MountDoorEntranceOptions, MountedDoorEntrance };
