import "../index.css";
import { mountDoorEntrance } from "door-entrance/vanilla";
import { getTextureUrl, pickTextureId } from "door-entrance";

const target = document.getElementById("door-root");
const statusEl = document.getElementById("door-status");
const variantSelect = document.getElementById(
  "door-variant"
) as HTMLSelectElement | null;
const playButton = document.getElementById("door-play");
const textureBase = import.meta.env.BASE_URL ?? "/";
const textureUrl = getTextureUrl(pickTextureId(), textureBase);
let ready = false;

const setStatus = (text: string) => {
  if (statusEl) {
    statusEl.textContent = text;
  }
};

const boot = () => {
  if (!target) return;
  let app = mountDoorEntrance({
    target,
    variant: "direct-entry",
    autoPlay: false,
    className:
      "h-[420px] w-full rounded-xl border border-white/10 bg-black",
    textureUrl,
    onComplete: () => setStatus("播放完成"),
  });

  const play = () => {
    if (!ready) {
      setStatus("貼圖載入中...");
      return;
    }
    setStatus("播放中...");
    app.reset();
    requestAnimationFrame(() => app.play());
  };

  if (playButton) {
    playButton.addEventListener("click", play);
  }

  if (variantSelect) {
    variantSelect.addEventListener("change", (event) => {
      const variant = (event.target as HTMLSelectElement).value as
        | "direct-entry"
        | "top-down-entry"
        | "double-swing"
        | "single-handle-turn";
      app.unmount();
      app = mountDoorEntrance({
        target,
        variant,
        autoPlay: false,
        className:
          "h-[420px] w-full rounded-xl border border-white/10 bg-black",
        textureUrl,
        onComplete: () => setStatus("播放完成"),
      });
      setStatus("等待播放");
    });
  }
};

const preload = () => {
  setStatus("貼圖載入中...");
  const img = new Image();
  img.onload = () => {
    ready = true;
    setStatus("等待播放");
    boot();
  };
  img.onerror = () => {
    setStatus("貼圖載入失敗");
  };
  img.src = textureUrl;
};

preload();
