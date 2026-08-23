import { Link } from "react-router-dom";
import {
  doorAnimationConfigs,
  doorEntrancePresets,
} from "retro-horror-door";
import SampleHeader from "@/components/SampleHeader";
import { presetsForAnimation } from "@/dev/animationPresets";
import PresetAnimationPreview from "./PresetAnimationPreview";

const DevAnimationList = () => (
  <main className="min-h-screen bg-[#070504] px-5 py-10 text-[#e9dfcd] sm:px-8 lg:px-10">
    <SampleHeader />
    <p className="mt-10 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#c58a45]">
      Developer verify
    </p>
    <h1 className="mt-3 font-[Georgia,serif] text-4xl text-[#f1e7d6]">
      Animations
    </h1>
    <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {doorAnimationConfigs.map((animation) => {
        const presets = presetsForAnimation(animation.id, doorEntrancePresets);
        const preview = presets[0];
        return (
          <li key={animation.id}>
            <Link
              to={`/dev/animations/${animation.id}`}
              className="flex h-full flex-col overflow-hidden border border-[#5f4933]/60 bg-[#0c0907] hover:border-[#c98d48]"
            >
              <div className="relative h-56 overflow-hidden border-b border-[#5f4933]/45 bg-[#090705]">
                {preview ? (
                  <PresetAnimationPreview preset={preview} progress={0.4} />
                ) : (
                  <p className="flex h-full items-center justify-center px-4 text-sm text-[#aa9f90]">
                    No published presets
                  </p>
                )}
              </div>
              <span className="flex items-end justify-between gap-3 p-5">
                <span>
                  <span className="block font-[Georgia,serif] text-xl text-[#eee2d0]">
                    {animation.label}
                  </span>
                  <span className="mt-1 block font-mono text-xs text-[#a89d8e]">
                    {animation.id}
                  </span>
                </span>
                <span className="shrink-0 text-xs uppercase tracking-[0.14em] text-[#c98d48]">
                  {presets.length} {presets.length === 1 ? "preset" : "presets"}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  </main>
);

export default DevAnimationList;
