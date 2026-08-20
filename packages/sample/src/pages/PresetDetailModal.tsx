import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  getDoorAnimationConfig,
  mountDoorEntrance,
  type DoorEntranceHandle,
  type DoorEntrancePreset,
} from "retro-horror-door";

type PresetDetailModalProps = {
  preset: DoorEntrancePreset;
  onClose: () => void;
};

const formatValue = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatTime = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const PresetDetailModal = ({ preset, onClose }: PresetDetailModalProps) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const doorRef = useRef<DoorEntranceHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const animation = getDoorAnimationConfig(preset.animation);
  const progressPercent = Math.round(progress * 100);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    setReady(false);
    setProgress(0);
    const door = mountDoorEntrance({
      target,
      preset: preset.id,
      autoPlay: false,
      className: "h-full min-h-[360px] w-full border-0 bg-black",
      onReady: () => setReady(true),
      onProgress: setProgress,
    });
    doorRef.current = door;

    return () => {
      door.unmount();
      doorRef.current = null;
    };
  }, [preset.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const play = () => {
    const door = doorRef.current;
    if (!door || !ready) return;

    door.play(preset.id);
  };

  const reset = () => {
    setProgress(0);
    doorRef.current?.reset(preset.id);
  };

  const seek = (nextProgress: number) => {
    const clampedProgress = Math.min(Math.max(nextProgress, 0), 1);
    setProgress(clampedProgress);
    doorRef.current?.seek(clampedProgress, preset.id);
  };
  const usageSnippet = `mountDoorEntrance({\n  target: document.getElementById("door-root"),\n  preset: "${preset.id}",\n  autoPlay: true,\n});`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="preset-detail-title"
        className="grid max-h-full w-full max-w-6xl overflow-auto border border-[#5f4933] bg-[#0c0907] lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.75fr)]"
      >
        <div className="relative min-h-[360px] bg-black sm:min-h-[520px]">
          <div ref={targetRef} className="absolute inset-0" />
        </div>

        <div className="flex min-w-0 min-h-[360px] flex-col border-t border-[#5f4933] p-5 sm:p-7 lg:border-l lg:border-t-0">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#c98d48]">
                Selected preset
              </p>
              <h2
                id="preset-detail-title"
                className="mt-2 break-words font-[Georgia,serif] text-2xl leading-tight text-[#eee2d0] sm:text-3xl"
              >
                {preset.label}
              </h2>
              <p className="mt-2 font-mono text-xs text-[#aa9f90]">{preset.id}</p>
            </div>
            <button
              type="button"
              aria-label="Close preset detail"
              title="Close preset detail"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center border border-[#5f4933] text-[#d8c9b5] transition-colors hover:border-[#c98d48] hover:text-[#f1e7d6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d39952]"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>

          <dl className="mt-7 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 border-y border-[#4b3928] py-5 text-sm">
            <dt className="text-[#827665]">Type</dt>
            <dd className="text-[#dfd2bf]">{formatValue(preset.type)}</dd>
            <dt className="text-[#827665]">Motion</dt>
            <dd className="text-[#dfd2bf]">{formatValue(preset.motion)}</dd>
            <dt className="text-[#827665]">Handle</dt>
            <dd className="text-[#dfd2bf]">
              {preset.handleProfileId
                ? formatValue(preset.handleProfileId)
                : "None"}
            </dd>
            <dt className="text-[#827665]">Material</dt>
            <dd className="text-[#dfd2bf]">{formatValue(preset.material)}</dd>
            <dt className="text-[#827665]">Animation</dt>
            <dd className="text-[#dfd2bf]">{formatValue(preset.animation)}</dd>
          </dl>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={play}
              disabled={!ready}
              className="border border-[#c98d48] bg-[#c98d48] px-4 py-2 text-sm font-bold text-[#100c08] transition-colors hover:bg-[#dda762] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Play
            </button>
            <button
              type="button"
              onClick={reset}
              className="border border-[#8d683e] px-4 py-2 text-sm font-semibold text-[#ddc6a8] transition-colors hover:border-[#c98d48] hover:text-[#f1e7d6]"
            >
              Reset
            </button>
          </div>

          <section className="mt-6 border-y border-[#4b3928] py-4" aria-label="Animation timeline">
            <div className="flex items-center justify-between gap-4 text-xs text-[#aa9f90]">
              <span>{formatTime(animation.duration * progress)}</span>
              <span>{formatTime(animation.duration)}</span>
            </div>
            <div className="relative mt-2">
              <input
                aria-label="Animation progress"
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={progress * 100}
                disabled={!ready}
                onChange={(event) => seek(Number(event.target.value) / 100)}
                className="h-2 w-full cursor-ew-resize appearance-none rounded-full accent-[#c98d48] disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(to right, #c98d48 0%, #c98d48 ${progress * 100}%, #4b3928 ${progress * 100}%, #4b3928 100%)`,
                }}
              />
              <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2">
                {animation.progressMarkers.map((marker) => (
                  <span
                    key={marker}
                    className="absolute h-3 w-px bg-[#e3d2bd]/55"
                    style={{ left: `${marker * 100}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[0.68rem] text-[#827665]">
              <span>{progressPercent}%</span>
              <span>
                {animation.progressMarkers
                  .map((marker) => `${Math.round(marker * 100)}%`)
                  .join(" · ")}
              </span>
            </div>
          </section>

          <pre className="mt-6 overflow-x-auto border border-[#4b3928] bg-[#090705] p-4 text-xs leading-6 text-[#d8c9b5]">
            <code>{usageSnippet}</code>
          </pre>
        </div>
      </section>
    </div>
  );
};

export default PresetDetailModal;
