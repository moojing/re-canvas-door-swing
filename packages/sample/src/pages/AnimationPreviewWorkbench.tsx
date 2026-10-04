import { useEffect, useRef, useState } from "react";
import {
  mountDoorEntrance,
  type DoorAnimationConfig,
  type DoorEntranceHandle,
  type DoorEntrancePreset,
  type DoorSwingDirection,
} from "retro-horror-door";

const formatTime = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
};

const swingDirectionOptions: Array<{ value: DoorSwingDirection; label: string }> = [
  { value: "toward-viewer", label: "Toward viewer" },
  { value: "away-from-viewer", label: "Away from viewer" },
];

const AnimationPreviewWorkbench = ({
  animation,
  preset,
}: {
  animation: DoorAnimationConfig;
  preset: DoorEntrancePreset;
}) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const doorRef = useRef<DoorEntranceHandle | null>(null);
  const authoredDirection = preset.swingDirection ?? "toward-viewer";
  const [swingDirection, setSwingDirection] = useState<DoorSwingDirection>(authoredDirection);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);

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
          <div>
            <p className="font-[Georgia,serif] text-xl text-[#f1e7d6]">{preset.label}</p>
            <p className="mt-1 font-mono text-xs text-[#aa9f90]">{preset.id}</p>
          </div>
          <div className="flex gap-2">
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
        </section>
      </div>

      <aside className="min-w-0 border border-[#4b3928] bg-[#100d0a] p-5 sm:p-6" aria-label="Preview settings">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#c58a45]">
          Preview settings
        </p>
        <p className="mt-3 text-sm leading-6 text-[#aa9f90]">
          {preset.type === "single"
            ? "Adjust this preview at the current point in the animation."
            : "This animation has no editable preview settings yet."}
        </p>

        {preset.type === "single" && (
          <div className="mt-6 space-y-6 border-t border-[#4b3928] pt-6">
            <div role="group" aria-labelledby="preview-swing-direction-label">
              <p id="preview-swing-direction-label" className="text-sm font-semibold text-[#e9dfcd]">
                Swing direction
              </p>
              <div className="mt-2 grid grid-cols-2 overflow-hidden border border-[#765939]">
                {swingDirectionOptions.map(({ value, label }, index) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={swingDirection === value}
                    onClick={() => {
                      setSwingDirection(value);
                      doorRef.current?.setPreviewOverrides({ swingDirection: value });
                    }}
                    className={`min-h-11 px-2 py-2 text-center text-xs font-semibold focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d39952] sm:text-sm ${
                      index === 0 ? "border-r border-[#765939]" : ""
                    } ${
                      swingDirection === value
                        ? "bg-[#c98d48] text-[#100c08]"
                        : "bg-[#1d1610] text-[#d8c9b5] hover:bg-[#322518]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSwingDirection(authoredDirection);
                doorRef.current?.setPreviewOverrides({});
              }}
              className="border border-[#8d683e] px-3 py-2 text-sm font-semibold text-[#ddc6a8] hover:border-[#d39952] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d39952]"
            >
              Restore preset values
            </button>
          </div>
        )}

        <div className="mt-7 border-t border-[#4b3928] pt-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c58a45]">
            Published preset
          </h2>
          <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs leading-5">
            <dt className="text-[#827665]">Animation</dt><dd className="text-right text-[#d8c9b5]">{animation.label}</dd>
            <dt className="text-[#827665]">Motion</dt><dd className="break-words text-right text-[#d8c9b5]">{preset.motion}</dd>
            <dt className="text-[#827665]">Hinge side</dt><dd className="text-right text-[#d8c9b5]">{preset.hingeSide ?? "—"}</dd>
            <dt className="text-[#827665]">Material</dt><dd className="break-words text-right text-[#d8c9b5]">{preset.material}</dd>
            <dt className="text-[#827665]">Handle</dt><dd className="text-right text-[#d8c9b5]">{preset.handleProfileId ?? "none"}</dd>
            <dt className="text-[#827665]">Swing direction</dt><dd className="text-right text-[#d8c9b5]">{preset.type === "single" ? authoredDirection : "—"}</dd>
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
