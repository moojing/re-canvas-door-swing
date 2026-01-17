import "../index.css";
import { mountDoorEntrance } from "door-entrance/vanilla";

const target = document.getElementById("door-root");
const statusEl = document.getElementById("door-status");
const variantSelect = document.getElementById(
  "door-variant"
) as HTMLSelectElement | null;
const playButton = document.getElementById("door-play");

const setStatus = (text: string) => {
  if (statusEl) {
    statusEl.textContent = text;
  }
};

let app = mountDoorEntrance({
  target,
  variant: "direct-entry",
  autoPlay: false,
  className:
    "h-[420px] w-full rounded-xl border border-white/10 bg-black",
  onComplete: () => setStatus("播放完成"),
});

const play = () => {
  setStatus("播放中...");
  app.reset();
  app.play();
};

if (playButton) {
  playButton.addEventListener("click", play);
}

if (variantSelect) {
  variantSelect.addEventListener("change", (event) => {
    const variant = (event.target as HTMLSelectElement)
      .value as "direct-entry" | "top-down-entry";
    app.unmount();
    app = mountDoorEntrance({
      target,
      variant,
      autoPlay: false,
      className:
        "h-[420px] w-full rounded-xl border border-white/10 bg-black",
      onComplete: () => setStatus("播放完成"),
    });
    setStatus("等待播放");
  });
}

setStatus("等待播放");
