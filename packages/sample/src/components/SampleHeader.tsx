import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

const linkClassName =
  "flex items-center gap-1.5 text-[#c98d48] transition-colors hover:text-[#f0bd78] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d39952] focus-visible:ring-offset-4 focus-visible:ring-offset-[#070504]";
const menuLinkClassName =
  "flex items-center gap-1.5 px-3 py-2 text-[#d8c9b5] hover:bg-[#16110d] hover:text-[#f1e7d6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d39952] focus-visible:ring-inset";

const headerLinks = [
  {
    label: "GitHub README",
    href: "https://github.com/moojing/re-canvas-door-swing#readme",
  },
  {
    label: "Stakeholder picker",
    href: "https://re-door-gallery.pages.dev/stakeholder-selection",
  },
  {
    label: "Animations",
    to: "/dev/animations",
  },
] as const;

const HeaderLink = ({
  link,
  className,
}: {
  link: (typeof headerLinks)[number];
  className: string;
}) =>
  "to" in link ? (
    <Link to={link.to} className={className}>
      {link.label}
    </Link>
  ) : (
    <a href={link.href} target="_blank" rel="noreferrer" className={className}>
      {link.label}
      <ArrowUpRight aria-hidden="true" size={14} />
    </a>
  );

const SampleHeader = () => (
  <header className="sticky top-0 z-40 -mx-5 flex items-center justify-between gap-4 border-b border-[#5f4933]/60 bg-[#070504]/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
    <Link to="/" className="shrink-0 font-[Georgia,serif] text-xl text-[#f1e7d6]">
      Retro Horror Door
    </Link>
    <nav
      aria-label="Project links"
      className="text-xs font-semibold uppercase tracking-[0.14em]"
    >
      <div className="hidden items-center gap-x-5 sm:flex">
        {headerLinks.map((link) => (
          <HeaderLink key={link.label} link={link} className={linkClassName} />
        ))}
      </div>
      <details className="relative sm:hidden">
        <summary className={`${linkClassName} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
          More
        </summary>
        <ul className="absolute right-0 z-50 mt-2 min-w-[14rem] border border-[#5f4933] bg-[#0c0907] py-2 normal-case tracking-normal">
          {headerLinks.map((link) => (
            <li key={link.label}>
              <HeaderLink link={link} className={menuLinkClassName} />
            </li>
          ))}
        </ul>
      </details>
    </nav>
  </header>
);

export default SampleHeader;
