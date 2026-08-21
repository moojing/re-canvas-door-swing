import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  doorEntrancePresetMap,
  type DoorEntrancePresetId,
} from "retro-horror-door";

type TransitionLocationState = {
  presetId?: DoorEntrancePresetId;
};

const TransitionComplete = () => {
  const location = useLocation();
  const state = location.state as TransitionLocationState | null;
  const preset = state?.presetId
    ? doorEntrancePresetMap[state.presetId]
    : undefined;

  return (
    <main className="grid min-h-screen place-items-center bg-[#070504] px-5 py-10 text-[#e9dfcd] sm:px-8">
      <section className="w-full max-w-xl border border-[#5f4933]/70 bg-[#0c0907] p-7 sm:p-10">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#c98d48]">
          Door transition
        </p>
        <h1 className="mt-4 font-[Georgia,serif] text-4xl leading-tight text-[#f1e7d6] sm:text-5xl">
          Destination reached
        </h1>
        {preset ? (
          <p className="mt-5 text-base leading-7 text-[#cfc0ac]">
            Completed with <span className="font-semibold text-[#f1e7d6]">{preset.label}</span>.
          </p>
        ) : (
          <p className="mt-5 text-base leading-7 text-[#cfc0ac]">
            <span>No preset was selected</span>. Return to the catalog to start a door transition.
          </p>
        )}
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 border border-[#c98d48] px-4 py-2.5 text-sm font-semibold text-[#e8bc82] transition-colors hover:bg-[#c98d48] hover:text-[#100c08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d39952] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0c0907]"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Return to preset catalog
        </Link>
      </section>
    </main>
  );
};

export default TransitionComplete;
