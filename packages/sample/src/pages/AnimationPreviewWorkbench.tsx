import { useEffect, useRef, useState } from "react";
import type { FullScreenDoorTransitionRequest } from "@/components/FullScreenDoorTransition";
import {
  mountDoorEntrance,
  getDoorEntranceAnimationConfig,
  getDoorEntranceAnimationSet,
  type DoorEntranceHandle,
  type DoorEntrancePreset,
  type DoorEntrancePresetId,
  type DoorTimingEvents,
} from "retro-horror-door";

const formatTime = (milliseconds: number) => {
  return `${(milliseconds / 1000).toFixed(2)} s`;
};

const timingEditorEnabled = import.meta.env.DEV &&
  import.meta.env.VITE_DOOR_TIMING_EDITOR === "true";

const AnimationPreviewWorkbench = ({
  preset,
  onFullScreenPreview,
  variants,
  onVariantChange,
}: {
  preset: DoorEntrancePreset;
  variants: readonly DoorEntrancePreset[];
  onVariantChange: (id: DoorEntrancePresetId) => void;
  onFullScreenPreview: (request: FullScreenDoorTransitionRequest) => void;
}) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const doorRef = useRef<DoorEntranceHandle | null>(null);
  const swingDirection = preset.swingDirection ?? "toward-viewer";
  const [timingEvents, setTimingEvents] = useState<DoorTimingEvents>({});
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const animation = getDoorEntranceAnimationConfig(preset, timingEvents);
  const events = animation.timelineEvents ?? [];
  const animationSet = getDoorEntranceAnimationSet(preset);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

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

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0">
        <div className="relative min-h-[50vh] bg-black sm:min-h-[64vh]">
          <div ref={targetRef} className="absolute inset-0" />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-[Georgia,serif] text-xl text-[#f1e7d6]">{preset.label}</p>
            <p className="mt-1 break-words font-mono text-xs text-[#aa9f90]">{preset.id}</p>
            <p className="mt-3 text-sm text-[#d8c9b5]">
              <span className="text-[#c58a45]">套用動畫組</span>
              <span className="ml-2 break-words font-mono text-xs">{animationSet?.id ?? "legacy"}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => doorRef.current?.play(preset.id)}
              disabled={!ready}
              className="border border-[#c98d48] bg-[#c98d48] px-4 py-2 text-sm font-bold text-[#100c08] disabled:opacity-50"
            >
              Play
            </button>
            <button
              type="button"
              disabled={!ready}
              onClick={() => {
                doorRef.current?.stop();
                onFullScreenPreview({
                  preset: preset.id,
                  previewOverrides: { swingDirection, timingEvents },
                });
              }}
              className="border border-[#8d683e] px-4 py-2 text-sm font-semibold text-[#ddc6a8] disabled:opacity-50"
            >
              Full-screen preview
            </button>
            <button
              type="button"
              onClick={() => {
                setProgress(0);
                doorRef.current?.reset(preset.id);
              }}
              className="border border-[#8d683e] px-4 py-2 text-sm font-semibold text-[#ddc6a8]"
            >
              Reset
            </button>
          </div>
        </div>
        <section className="mt-4 border-y border-[#4b3928] py-4" aria-label="Animation timeline">
          <div className="flex justify-between text-xs text-[#aa9f90]">
            <span>{formatTime(animation.duration * progress)}</span>
            <span>{Math.round(progress * 100)}%</span>
            <span>{formatTime(animation.duration)}</span>
          </div>
          <input
            aria-label="Animation progress"
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress * 100}
            disabled={!ready}
            onChange={(event) => {
              const next = Number(event.target.value) / 100;
              setProgress(next);
              doorRef.current?.seek(next, preset.id);
            }}
            className="mt-2 h-2 w-full accent-[#c98d48]"
          />
          {events.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Animation stages">
              {events.slice(1, -1).map(({ id, label, atMs }) => (
                <button
                  key={id}
                  type="button"
                  aria-label={`Seek to ${label}`}
                  onClick={() => {
                    const next = atMs / animation.duration;
                    setProgress(next);
                    doorRef.current?.seek(next, preset.id);
                  }}
                  className="border border-[#5f4933] px-2 py-1 text-xs text-[#d8c9b5] hover:border-[#d39952]"
                >
                  {label} · {formatTime(atMs)}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="min-w-0 border border-[#4b3928] bg-[#100d0a] p-5 sm:p-6" aria-label="Preview settings">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#c58a45]">
          Preview settings
        </p>
        <p className="mt-3 text-sm leading-6 text-[#aa9f90]">
          {timingEditorEnabled
            ? "Adjust this preview at the current point in the animation. Timing edits pause playback; Play resumes from this point."
            : "Inspect the published preset at the current point in the animation."}
        </p>

        {(variants.length > 1 || preset.traversal) && (
          <div className="mt-6 border-t border-[#4b3928] pt-6" role="group" aria-label="Traversal variant">
            <p className="text-sm font-semibold text-[#e9dfcd]">Traversal variant</p>
            <div className={`mt-2 grid ${variants.length > 1 ? "grid-cols-2" : "grid-cols-1"} overflow-hidden border border-[#765939]`}>
              {variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  aria-pressed={variant.id === preset.id}
                  onClick={() => onVariantChange(variant.id)}
                  className={`min-h-11 px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d39952] ${
                    variant.id === preset.id ? "bg-[#c98d48] text-[#100c08]" : "bg-[#1d1610] text-[#d8c9b5] hover:bg-[#322518]"
                  }`}
                >
                  {variant.traversal === "leave" ? "Leave" : "Enter"}
                </button>
              ))}
            </div>
          </div>
        )}

        {timingEditorEnabled && events.length > 2 && (
          <div className="mt-6 space-y-4 border-t border-[#4b3928] pt-6">
            <p className="text-sm font-semibold text-[#e9dfcd]">Stage timing</p>
            <p className="text-xs leading-5 text-[#aa9f90]">Adjust when a stage ends. Changes apply only to this preview.</p>
            {events.slice(1, -1).map((stage, index) => {
              const minimum = events[index].atMs + 10;
              const maximum = events[index + 2].atMs - 10;
              return (
                <label key={stage.id} className="block text-xs text-[#d8c9b5]">
                  <span className="flex justify-between gap-2">
                    <span>{stage.label}</span>
                    <span className="font-mono">{formatTime(stage.atMs)}</span>
                  </span>
                  <input
                    aria-label={`${stage.label} timing`}
                    type="range"
                    min={minimum}
                    max={maximum}
                    step="10"
                    value={stage.atMs}
                    onChange={(event) => {
                      const nextTiming = { ...timingEvents, [stage.id]: Number(event.target.value) };
                      getDoorEntranceAnimationConfig(preset, nextTiming);
                      setTimingEvents(nextTiming);
                      doorRef.current?.setPreviewOverrides({ swingDirection, timingEvents: nextTiming });
                    }}
                    className="mt-2 w-full accent-[#c98d48]"
                  />
                </label>
              );
            })}
          </div>
        )}

        <div className="mt-6 border-t border-[#4b3928] pt-6">
            <button
              type="button"
              onClick={() => {
                setTimingEvents({});
                doorRef.current?.setPreviewOverrides({});
              }}
              className="border border-[#8d683e] px-3 py-2 text-sm font-semibold text-[#ddc6a8] hover:border-[#d39952] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d39952]"
            >
              Restore preset values
            </button>
        </div>

        <div className="mt-7 border-t border-[#4b3928] pt-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c58a45]">
            Published preset
          </h2>
          <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs leading-5">
            {preset.traversal && <><dt className="text-[#827665]">Variant</dt><dd className="text-right text-[#d8c9b5]">{preset.traversal === "leave" ? "Leave" : "Enter"}</dd></>}
            <dt className="text-[#827665]">Animation</dt><dd className="text-right text-[#d8c9b5]">{animation.label}</dd>
            <dt className="text-[#827665]">Animation style</dt><dd className="text-right text-[#d8c9b5]">{preset.animationStyle ?? "legacy"}</dd>
            <dt className="text-[#827665]">Motion</dt><dd className="break-words text-right text-[#d8c9b5]">{preset.motion}</dd>
            <dt className="text-[#827665]">Hinge side</dt><dd className="text-right text-[#d8c9b5]">{preset.hingeSide ?? "—"}</dd>
            <dt className="text-[#827665]">Material</dt><dd className="break-words text-right text-[#d8c9b5]">{preset.material}</dd>
            <dt className="text-[#827665]">Handle</dt><dd className="text-right text-[#d8c9b5]">{preset.handleProfileId ?? "none"}</dd>
            {!preset.traversal && <><dt className="text-[#827665]">Swing direction</dt><dd className="text-right text-[#d8c9b5]">{preset.type === "single" ? swingDirection : "—"}</dd></>}
          </dl>
          <p className="mt-6 text-xs font-semibold text-[#aa9f90]">Published preset usage</p>
          <code className="mt-2 block overflow-x-auto border border-[#4b3928] bg-[#070504] p-3 font-mono text-[0.68rem] leading-5 text-[#d8c9b5]">
            {`mountDoorEntrance({ target, preset: "${preset.id}" })`}
          </code>
        </div>
      </aside>
    </div>
  );
};

export default AnimationPreviewWorkbench;
