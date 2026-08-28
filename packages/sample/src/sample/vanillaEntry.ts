import "../index.css";
import { mountDoorEntrance, type DoorEntrancePresetId } from "retro-horror-door";

type MountedDoorEntrance = ReturnType<typeof mountDoorEntrance>;
type DoorEntranceTestApi = {
  play: () => void;
  reset: () => void;
  seek: (progress: number) => void;
  unmount: () => void;
  ready: () => boolean;
  progress: () => number;
};

const target = document.getElementById("door-root");
const statusEl = document.getElementById("door-status");
const presetSelect = document.getElementById(
  "door-preset"
) as HTMLSelectElement | null;
const playButton = document.getElementById("door-play");
let ready = false;
let animationProgress = 0;
const testMode = new URLSearchParams(window.location.search).has("testMode");

declare global {
  interface Window {
    __doorEntranceTestApi__?: DoorEntranceTestApi;
  }
}

const setStatus = (text: string) => {
  if (statusEl) {
    statusEl.textContent = text;
  }
};

const boot = () => {
  if (!target) return;
  const getSelectedPreset = (): DoorEntrancePresetId =>
    (presetSelect?.value as DoorEntrancePresetId) ??
    "biohazard-1996-a01-iron-door";

  const mountApp = (preset: DoorEntrancePresetId) => {
    ready = false;
    animationProgress = 0;
    return mountDoorEntrance({
      target,
      preset,
      autoPlay: false,
      className:
        "h-[420px] w-full rounded-xl border border-white/10 bg-black",
      onComplete: () => setStatus("播放完成"),
      onReady: () => {
        ready = true;
        setStatus("等待播放");
      },
      onProgress: (progress) => {
        animationProgress = progress;
      },
    });
  };

  let app: MountedDoorEntrance | null = mountApp(getSelectedPreset());

  const play = () => {
    if (!ready) {
      setStatus("準備中...");
      return;
    }
    setStatus("播放中...");
    const preset = getSelectedPreset();
    app?.reset(preset);
    requestAnimationFrame(() => app?.play(preset));
  };

  if (playButton) {
    playButton.addEventListener("click", play);
  }

  if (presetSelect) {
    presetSelect.addEventListener("change", (event) => {
      const nextPreset = (event.target as HTMLSelectElement)
        .value as DoorEntrancePresetId;
      app?.unmount();
      app = mountApp(nextPreset);
      setStatus("準備中...");
    });
  }

  if (testMode) {
    window.__doorEntranceTestApi__ = {
      play,
      reset: () => app?.reset(getSelectedPreset()),
      seek: (progress) => app?.seek(progress, getSelectedPreset()),
      unmount: () => {
        app?.unmount();
        app = null;
        ready = false;
        setStatus("已卸載");
      },
      ready: () => ready,
      progress: () => animationProgress,
    };
  }
};

setStatus("準備中...");
boot();
