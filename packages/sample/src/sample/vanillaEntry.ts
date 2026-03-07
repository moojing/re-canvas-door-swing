import "../index.css";
import { mountDoorEntrance } from "door-entrance/vanilla";
import type { DoorEntrancePresetId } from "door-entrance";

const target = document.getElementById("door-root");
const statusEl = document.getElementById("door-status");
const presetSelect = document.getElementById(
  "door-preset"
) as HTMLSelectElement | null;
const playButton = document.getElementById("door-play");
let ready = false;

const setStatus = (text: string) => {
  if (statusEl) {
    statusEl.textContent = text;
  }
};

const boot = () => {
  if (!target) return;
  const getSelectedPreset = (): DoorEntrancePresetId =>
    (presetSelect?.value as DoorEntrancePresetId) ?? "door-single";

  let app = mountDoorEntrance({
    target,
    preset: getSelectedPreset(),
    autoPlay: false,
    className:
      "h-[420px] w-full rounded-xl border border-white/10 bg-black",
    onComplete: () => setStatus("播放完成"),
    onReady: () => {
      ready = true;
      setStatus("等待播放");
    },
  });

  const play = () => {
    if (!ready) {
      setStatus("準備中...");
      return;
    }
    setStatus("播放中...");
    const preset = getSelectedPreset();
    app.reset(preset);
    requestAnimationFrame(() => app.play(preset));
  };

  if (playButton) {
    playButton.addEventListener("click", play);
  }

  if (presetSelect) {
    presetSelect.addEventListener("change", (event) => {
      const nextPreset = (event.target as HTMLSelectElement)
        .value as DoorEntrancePresetId;
      app.unmount();
      ready = false;
      app = mountDoorEntrance({
        target,
        preset: nextPreset,
        autoPlay: false,
        className:
          "h-[420px] w-full rounded-xl border border-white/10 bg-black",
        onComplete: () => setStatus("播放完成"),
        onReady: () => {
          ready = true;
          setStatus("等待播放");
        },
      });
      setStatus("準備中...");
    });
  }
};

setStatus("準備中...");
boot();
