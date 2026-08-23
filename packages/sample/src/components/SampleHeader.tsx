import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { doorAnimationConfigs } from "retro-horror-door";
import { shouldCollapseAnimationLinks } from "@/dev/animationPresets";

const linkClassName =
  "flex items-center gap-1.5 text-[#c98d48] transition-colors hover:text-[#f0bd78] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d39952] focus-visible:ring-offset-4 focus-visible:ring-offset-[#070504]";
const menuLinkClassName =
  "block px-3 py-2 text-[#d8c9b5] hover:bg-[#16110d] hover:text-[#f1e7d6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d39952] focus-visible:ring-inset";

const SampleHeader = () => {
  const animations = doorAnimationConfigs;
  const dropdown = shouldCollapseAnimationLinks(doorAnimationConfigs.length);

  return (
    <header className="sticky top-0 z-40 -mx-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#5f4933]/60 bg-[#070504]/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
      <Link to="/" className="font-[Georgia,serif] text-xl text-[#f1e7d6]">
        Retro Horror Door
      </Link>
      <nav
        aria-label="Project links"
        className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold uppercase tracking-[0.14em] sm:justify-end"
      >
        <a
          href="https://github.com/moojing/re-canvas-door-swing#readme"
          target="_blank"
          rel="noreferrer"
          className={linkClassName}
        >
          GitHub README
          <ArrowUpRight aria-hidden="true" size={14} />
        </a>
        <a
          href="https://re-door-gallery.pages.dev/stakeholder-selection"
          target="_blank"
          rel="noreferrer"
          className={linkClassName}
        >
          Stakeholder picker
          <ArrowUpRight aria-hidden="true" size={14} />
        </a>
        {dropdown ? (
          <details className="relative">
            <summary className={`${linkClassName} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
              Animations
            </summary>
            <ul className="absolute right-0 z-50 mt-2 min-w-[14rem] border border-[#5f4933] bg-[#0c0907] py-2 normal-case tracking-normal">
              {animations.map((animation) => (
                <li key={animation.id}>
                  <Link
                    to={`/dev/animations/${animation.id}`}
                    className={menuLinkClassName}
                  >
                    {animation.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/dev/animations"
                  className={`${menuLinkClassName} border-t border-[#4b3928] text-[#c98d48]`}
                >
                  All animations
                </Link>
              </li>
            </ul>
          </details>
        ) : (
          animations.map((animation) => (
            <Link
              key={animation.id}
              to={`/dev/animations/${animation.id}`}
              className={linkClassName}
            >
              {animation.label}
            </Link>
          ))
        )}
      </nav>
    </header>
  );
};

export default SampleHeader;
