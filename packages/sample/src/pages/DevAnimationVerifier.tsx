import { ArrowLeft } from "lucide-react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  doorAnimationConfigs,
  doorEntrancePresets,
  getDoorAnimationConfig,
} from "retro-horror-door";
import {
  isKnownAnimation,
  presetsForAnimation,
  resolveVerifierPreset,
} from "@/dev/animationPresets";
import SampleHeader from "@/components/SampleHeader";
import AnimationPreviewWorkbench from "./AnimationPreviewWorkbench";
import NotFound from "./NotFound";

const DevAnimationVerifier = () => {
  const { animationId = "" } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const animationIds = doorAnimationConfigs.map(({ id }) => id);
  const known = isKnownAnimation(animationId, animationIds);
  const animation = known ? getDoorAnimationConfig(animationId) : null;
  const presets = known
    ? presetsForAnimation(animationId, doorEntrancePresets)
    : [];
  const preset = known
    ? resolveVerifierPreset(animationId, presets, searchParams.get("preset"))
    : null;
  const requestedReturn = (location.state as { from?: unknown } | null)?.from;
  const returnTo = requestedReturn === "/" ? "/" : "/dev/animations";

  if (!known || !animation) {
    return <NotFound />;
  }

  return (
    <main className="min-h-screen bg-[#070504] px-5 py-8 text-[#e9dfcd] sm:px-8 lg:px-10">
      <SampleHeader />
      <Link
        to={returnTo}
        className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#c98d48] hover:text-[#f0bd78] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d39952]"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        {returnTo === "/" ? "Back to catalog" : "Back to Animations"}
      </Link>
      <p className="mt-10 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#c58a45]">
        Animation detail
      </p>
      <h1 className="mt-3 font-[Georgia,serif] text-4xl text-[#f1e7d6]">
        {animation.label}
      </h1>

      {!preset ? (
        <p className="mt-10 text-[#aa9f90]">
          No published presets for this animation.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          <AnimationPreviewWorkbench key={preset.id} preset={preset} />
          <section className="border-t border-[#4b3928] pt-6" aria-label="Published presets">
            <h2 className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#827665]">
              Published presets
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {presets.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    aria-pressed={option.id === preset.id}
                    onClick={() => setSearchParams({ preset: option.id }, { state: { from: returnTo } })}
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
          </section>
        </div>
      )}
    </main>
  );
};

export default DevAnimationVerifier;
