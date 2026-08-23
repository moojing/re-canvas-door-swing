import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  doorAnimationConfigs,
  doorEntrancePresets,
  getDoorAnimationConfig,
  mountDoorEntrance,
  type DoorEntranceHandle,
} from "retro-horror-door";
import {
  isKnownAnimation,
  presetsForAnimation,
  resolveVerifierPreset,
} from "@/dev/animationPresets";
import SampleHeader from "@/components/SampleHeader";
import NotFound from "./NotFound";

const formatTime = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
};

const DevAnimationVerifier = () => {
  const { animationId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetRef = useRef<HTMLDivElement>(null);
  const doorRef = useRef<DoorEntranceHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const animationIds = doorAnimationConfigs.map(({ id }) => id);
  const known = isKnownAnimation(animationId, animationIds);
  const animation = known ? getDoorAnimationConfig(animationId) : null;
  const presets = known
    ? presetsForAnimation(animationId, doorEntrancePresets)
    : [];
  const preset = known
    ? resolveVerifierPreset(animationId, presets, searchParams.get("preset"))
    : null;

  useEffect(() => {
    const target = targetRef.current;
    if (!target || !preset) return;

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
  }, [preset]);

  if (!known || !animation) {
    return <NotFound />;
  }

  return (
    <main className="min-h-screen bg-[#070504] px-5 py-8 text-[#e9dfcd] sm:px-8 lg:px-10">
      <SampleHeader />
      <p className="mt-10 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#c58a45]">
        Developer verify
      </p>
      <h1 className="mt-3 font-[Georgia,serif] text-4xl text-[#f1e7d6]">
        {animation.label}
      </h1>

      {!preset ? (
        <p className="mt-10 text-[#aa9f90]">
          No published presets for this animation.
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-6">
          <div className="relative min-h-[56vh] bg-black sm:min-h-[64vh]">
            <div ref={targetRef} className="absolute inset-0" />
          </div>
          <div>
            <p className="font-mono text-xs text-[#aa9f90]">{preset.id}</p>
            <div className="mt-4 flex gap-2">
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
            <section className="mt-4 border-y border-[#4b3928] py-4" aria-label="Animation timeline">
              <div className="flex justify-between text-xs text-[#aa9f90]">
                <span>{formatTime(animation.duration * progress)}</span>
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
            <h2 className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#827665]">
              Published presets
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {presets.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    aria-pressed={option.id === preset.id}
                    onClick={() => setSearchParams({ preset: option.id })}
                    className={`border px-3 py-2 text-sm ${
                      option.id === preset.id
                        ? "border-[#c98d48] text-[#f1e7d6]"
                        : "border-[#5f4933] text-[#d8c9b5]"
                    }`}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
};

export default DevAnimationVerifier;
