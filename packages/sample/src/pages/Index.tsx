import { useCallback, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  doorEntrancePresets,
  type DoorEntrancePresetId,
} from "retro-horror-door";
import FullScreenDoorTransition, {
  type FullScreenDoorTransitionHandle,
} from "@/components/FullScreenDoorTransition";
import PresetDetailModal from "./PresetDetailModal";
import PresetAnimationPreview from "./PresetAnimationPreview";

const formatValue = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const Index = () => {
  const navigate = useNavigate();
  const transitionRef = useRef<FullScreenDoorTransitionHandle>(null);
  const [selectedPresetId, setSelectedPresetId] =
    useState<DoorEntrancePresetId | null>(null);
  const [transitionPresetId, setTransitionPresetId] =
    useState<DoorEntrancePresetId>(doorEntrancePresets[0].id);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const selectedPreset = doorEntrancePresets.find(
    (preset) => preset.id === selectedPresetId
  );
  const closeDetail = useCallback(() => setSelectedPresetId(null), []);
  const startTransition = () => {
    if (isTransitioning) return;

    transitionRef.current?.play({
      preset: transitionPresetId,
      destination: "/transition-complete",
    });
  };

  return (
    <>
    <main
      inert={isTransitioning ? "" : undefined}
      className="min-h-screen bg-[#070504] text-[#e9dfcd]"
    >
      <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
        <header className="max-w-3xl border-l border-[#b77a38]/70 pl-5 sm:pl-7">
          <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#c58a45]">
            Retro Horror Door / {String(doorEntrancePresets.length).padStart(2, "0")} presets
          </p>
          <h1 className="font-[Georgia,serif] text-4xl leading-[1.04] text-[#f1e7d6] sm:text-5xl lg:text-6xl">
            Playable door presets
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#aa9f90] sm:text-base">
            每張卡代表一組已定義、可發布的門組合。開啟 preset 以檢視實際播放與其固定設定。
          </p>
        </header>

        <section
          aria-label="Available door presets"
          className="mt-10 grid gap-5 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3"
        >
          {doorEntrancePresets.map((preset) => (
              <article
                key={preset.id}
                className="flex min-h-[340px] flex-col overflow-hidden border border-[#5f4933]/60 bg-[#0c0907]"
              >
                <div
                  className="relative h-64 min-h-0 overflow-hidden border-b border-[#5f4933]/45 bg-[#090705]"
                >
                  <PresetAnimationPreview preset={preset} />
                  <span className="absolute left-4 top-4 border border-[#c58a45]/55 bg-[#080604]/90 px-2.5 py-1 text-[0.65rem] font-bold tracking-[0.18em] text-[#d8a05a]">
                    {formatValue(preset.type)}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <h2 className="font-[Georgia,serif] text-2xl leading-tight text-[#eee2d0]">
                    {preset.label}
                  </h2>
                  <p className="mt-2 font-mono text-xs text-[#a89d8e]">{preset.id}</p>
                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div>
                      <dt className="text-[#756958]">Motion</dt>
                      <dd className="mt-1 text-[#d8c9b5]">{formatValue(preset.motion)}</dd>
                    </div>
                    <div>
                      <dt className="text-[#756958]">Handle</dt>
                      <dd className="mt-1 text-[#d8c9b5]">
                        {preset.handleProfileId
                          ? formatValue(preset.handleProfileId)
                          : "None"}
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
                  <button
                    type="button"
                    aria-label={`Open ${preset.label}`}
                    onClick={() => setSelectedPresetId(preset.id)}
                    className="mt-auto flex items-center justify-between border-t border-[#4b3928]/65 pt-5 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#c98d48] transition-colors hover:text-[#f0bd78] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d39952] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0c0907]"
                  >
                    Open preset
                    <ArrowUpRight aria-hidden="true" size={16} />
                  </button>
                </div>
              </article>
          ))}
        </section>

        <section
          aria-labelledby="transition-demo-title"
          className="mt-14 border-y border-[#5f4933]/60 py-8 sm:mt-20 sm:py-10"
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-10">
            <div className="max-w-2xl">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#c98d48]">
                App navigation demo
              </p>
              <h2
                id="transition-demo-title"
                className="mt-3 font-[Georgia,serif] text-3xl text-[#f1e7d6] sm:text-4xl"
              >
                Full-screen page transition
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#aa9f90] sm:text-base">
                Choose a released preset, then use its actual vanilla animation before arriving at the next page.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_auto] lg:min-w-[520px]">
              <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#aa9f90]">
                Transition preset
                <select
                  aria-label="Transition preset"
                  value={transitionPresetId}
                  disabled={isTransitioning}
                  onChange={(event) =>
                    setTransitionPresetId(event.target.value as DoorEntrancePresetId)
                  }
                  className="min-h-11 border border-[#5f4933] bg-[#0c0907] px-3 text-sm font-normal normal-case tracking-normal text-[#e9dfcd] focus:outline-none focus:ring-2 focus:ring-[#d39952] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {doorEntrancePresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={isTransitioning}
                onClick={startTransition}
                className="min-h-11 self-end border border-[#c98d48] bg-[#c98d48] px-5 text-sm font-bold text-[#100c08] transition-colors hover:bg-[#dda762] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d39952] focus-visible:ring-offset-4 focus-visible:ring-offset-[#070504] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start full-screen transition
              </button>
            </div>
          </div>
        </section>
      </div>

      {selectedPreset && (
        <PresetDetailModal preset={selectedPreset} onClose={closeDetail} />
      )}
    </main>
      <FullScreenDoorTransition
        ref={transitionRef}
        onActiveChange={setIsTransitioning}
        onComplete={({ preset, destination }) =>
          navigate(destination, { state: { presetId: preset } })
        }
      />
    </>
  );
};

export default Index;
