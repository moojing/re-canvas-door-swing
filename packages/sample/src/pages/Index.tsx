import { useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  doorAnimationConfigs,
  doorEntrancePresets,
  type DoorEntrancePreset,
  type DoorEntrancePresetId,
} from "retro-horror-door";
import FullScreenDoorTransition, {
  type FullScreenDoorTransitionHandle,
} from "@/components/FullScreenDoorTransition";
import SampleHeader from "@/components/SampleHeader";
import { catalogPresets, presetsForAnimation } from "@/dev/animationPresets";
import PresetAnimationPreview from "./PresetAnimationPreview";

const formatValue = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const PresetCard = ({
  preset,
  isPreviewing,
  onStart,
}: {
  preset: DoorEntrancePreset;
  isPreviewing: boolean;
  onStart: () => void;
}) => (
  <article className="flex min-h-[340px] flex-col overflow-hidden border border-[#5f4933]/60 bg-[#0c0907]">
    <div className="relative h-64 min-h-0 overflow-hidden border-b border-[#5f4933]/45 bg-[#090705]">
      <PresetAnimationPreview preset={preset} />
      <span className="absolute left-4 top-4 border border-[#c58a45]/55 bg-[#080604]/90 px-2.5 py-1 text-[0.65rem] font-bold tracking-[0.18em] text-[#d8a05a]">
        {formatValue(preset.type)}
      </span>
    </div>

    <div className="flex flex-1 flex-col p-5 sm:p-6">
      <h3 className="font-[Georgia,serif] text-2xl leading-tight text-[#eee2d0]">
        {preset.label}
      </h3>
      <p className="mt-2 font-mono text-xs text-[#a89d8e]">{preset.id}</p>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
        <div>
          <dt className="text-[#756958]">Motion</dt>
          <dd className="mt-1 text-[#d8c9b5]">{formatValue(preset.motion)}</dd>
        </div>
        <div>
          <dt className="text-[#756958]">Handle</dt>
          <dd className="mt-1 text-[#d8c9b5]">
            {preset.handleProfileId ? formatValue(preset.handleProfileId) : "None"}
          </dd>
        </div>
        <div>
          <dt className="text-[#756958]">Material</dt>
          <dd className="mt-1 text-[#d8c9b5]">{formatValue(preset.material)}</dd>
        </div>
        <div>
          <dt className="text-[#756958]">Animation</dt>
          <dd className="mt-1 text-[#d8c9b5]">{formatValue(preset.animation)}</dd>
        </div>
      </dl>
      <div className="mt-auto border-t border-[#4b3928]/65 pt-5">
        <Link
          to={`/dev/animations/${preset.animation}?preset=${preset.id}`}
          state={{ from: "/" }}
          aria-label={`View details for ${preset.label}`}
          className="flex min-h-11 w-full items-center justify-between border border-[#c98d48] bg-[#c98d48] px-5 text-sm font-bold text-[#100c08] transition-colors hover:bg-[#dda762] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d39952] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0c0907]"
        >
          View details
          <ArrowUpRight aria-hidden="true" size={16} />
        </Link>
        <button
          type="button"
          disabled={isPreviewing}
          aria-label={`Preview ${preset.label} full-screen`}
          onClick={onStart}
          className="mt-3 min-h-11 w-full border border-[#5f4933] bg-transparent px-5 text-sm font-semibold text-[#d8c9b5] transition-colors hover:border-[#c98d48] hover:text-[#f0bd78] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d39952] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0c0907] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Full-screen preview
        </button>
      </div>
    </div>
  </article>
);

const AnimationSection = ({
  animation,
  presets,
  isPreviewing,
  onStart,
}: {
  animation: (typeof doorAnimationConfigs)[number];
  presets: readonly DoorEntrancePreset[];
  isPreviewing: boolean;
  onStart: (id: DoorEntrancePresetId) => void;
}) => (
    <section
      aria-labelledby={`animation-${animation.id}`}
      className="mt-14 border-t border-[#5f4933]/60 pt-8 sm:mt-16 sm:pt-10"
    >
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#c98d48]">
        Animation
      </p>
      <h2
        id={`animation-${animation.id}`}
        className="mt-2 font-[Georgia,serif] text-3xl text-[#f1e7d6] sm:text-4xl"
      >
        {animation.label}
      </h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {presets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            isPreviewing={isPreviewing}
            onStart={() => onStart(preset.id)}
          />
        ))}
      </div>
    </section>
  );

const Index = () => {
  const transitionRef = useRef<FullScreenDoorTransitionHandle>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const startPreview = (presetId: DoorEntrancePresetId) => {
    if (isPreviewing) return;

    transitionRef.current?.play({ preset: presetId });
  };

  return (
    <>
      <main
        inert={isPreviewing ? "" : undefined}
        className="min-h-screen bg-[#070504] text-[#e9dfcd]"
      >
        <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
          <SampleHeader />

          <header className="mt-10 max-w-3xl border-l border-[#b77a38]/70 pl-5 sm:mt-14 sm:pl-7">
            <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#c58a45]">
              Retro Horror Door / {String(catalogPresets(doorEntrancePresets).length).padStart(2, "0")} doors
            </p>
            <h1 className="font-[Georgia,serif] text-4xl leading-[1.04] text-[#f1e7d6] sm:text-5xl lg:text-6xl">
              Playable doors
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#aa9f90] sm:text-base">
              每張卡代表一扇門。查看動畫細節與通行版本，或全螢幕預覽動畫。
            </p>
          </header>

          {doorAnimationConfigs.map((animation) => {
            const presets = presetsForAnimation(animation.id, catalogPresets(doorEntrancePresets));
            if (presets.length === 0) return null;

            return (
              <AnimationSection
                key={animation.id}
                animation={animation}
                presets={presets}
                isPreviewing={isPreviewing}
                onStart={startPreview}
              />
            );
          })}
        </div>

      </main>
      <FullScreenDoorTransition
        ref={transitionRef}
        onActiveChange={setIsPreviewing}
      />
    </>
  );
};

export default Index;
