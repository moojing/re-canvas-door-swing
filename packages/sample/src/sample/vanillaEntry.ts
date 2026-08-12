import "../index.css";
import { mountDoorEntrance, type DoorEntranceVariantId } from "retro-horror-door";

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
const variantSelect = document.getElementById(
  "door-variant"
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
  const getSelectedVariant = (): DoorEntranceVariantId =>
    (variantSelect?.value as DoorEntranceVariantId) ?? "single-lever-wood";

  const mountApp = (variant: DoorEntranceVariantId) => {
    ready = false;
    animationProgress = 0;
    return mountDoorEntrance({
      target,
      variant,
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

  let app: MountedDoorEntrance | null = mountApp(getSelectedVariant());

  const play = () => {
    if (!ready) {
      setStatus("準備中...");
      return;
    }
    setStatus("播放中...");
    const variant = getSelectedVariant();
    app?.reset(variant);
    requestAnimationFrame(() => app?.play(variant));
  };

  if (playButton) {
    playButton.addEventListener("click", play);
  }

  if (variantSelect) {
    variantSelect.addEventListener("change", (event) => {
      const nextVariant = (event.target as HTMLSelectElement)
        .value as DoorEntranceVariantId;
      app?.unmount();
      app = mountApp(nextVariant);
      setStatus("準備中...");
    });
  }

  if (testMode) {
    window.__doorEntranceTestApi__ = {
      play,
      reset: () => app?.reset(getSelectedVariant()),
      seek: (progress) => app?.seek(progress, getSelectedVariant()),
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
