import { Link } from "react-router-dom";
import {
  POC_GALLERY_ITEMS,
  resolvePocThumbnailUrl,
} from "./pocGalleryData";

const PocGallery = () => (
  <main className="min-h-screen bg-[#070504] text-[#e9dfcd] [background-image:radial-gradient(circle_at_50%_-15%,rgba(120,72,32,0.28),transparent_42%),radial-gradient(circle_at_90%_100%,rgba(67,39,20,0.2),transparent_36%)]">
    <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
      <header className="mb-10 border-l border-[#b77a38]/70 pl-5 sm:mb-14 sm:pl-7">
        <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[#c58a45]">
          Door motion studies / 01-07
        </p>
        <h1 className="max-w-3xl font-[Georgia,serif] text-4xl leading-[1.02] tracking-[-0.035em] text-[#f1e7d6] sm:text-5xl lg:text-6xl">
          Proof of Concept Archive
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-[#aa9f90] sm:text-base">
          Seven focused entrance studies, preserved as focused animation
          records. Select an entry to inspect its movement and material system.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {POC_GALLERY_ITEMS.map((item) => (
          <Link
            key={item.id}
            to={item.route}
            className="group flex h-full flex-col overflow-hidden border border-[#5f4933]/60 bg-[#0c0907]/90 shadow-[0_18px_50px_rgba(0,0,0,0.25)] transition-colors duration-300 hover:border-[#a46f36]/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d39952] focus-visible:ring-offset-4 focus-visible:ring-offset-[#070504]"
          >
            <div className="relative aspect-video overflow-hidden border-b border-[#5f4933]/45 bg-[#090705]">
              <div
                className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,#21170f_0%,#090705_68%)]"
                aria-hidden="true"
              >
                <span className="font-[Georgia,serif] text-4xl tracking-[0.18em] text-[#7c5a35]/70">
                  {item.id}
                </span>
              </div>
              <img
                src={resolvePocThumbnailUrl(
                  import.meta.env.BASE_URL,
                  item.thumbnailPath,
                )}
                alt={`${item.title} animation preview`}
                loading="lazy"
                className="relative z-10 h-full w-full object-cover grayscale-[0.15] transition duration-500 group-hover:scale-[1.025] group-hover:grayscale-0"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
              <span className="absolute left-4 top-4 z-20 border border-[#c58a45]/55 bg-[#080604]/90 px-2.5 py-1 text-[0.65rem] font-bold tracking-[0.24em] text-[#d8a05a]">
                {item.id}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-5 sm:p-6">
              <h2 className="font-[Georgia,serif] text-2xl leading-tight text-[#eee2d0]">
                {item.title}
              </h2>
              <p className="mt-3 flex-1 text-sm leading-6 text-[#a89d8e]">
                {item.description}
              </p>
              <span className="mt-6 flex items-center gap-2 border-t border-[#4b3928]/65 pt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#c98d48]">
                Open animation
                <span
                  className="transition-transform duration-300 group-hover:translate-x-1 group-focus-visible:translate-x-1"
                  aria-hidden="true"
                >
                  &rarr;
                </span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </main>
);

export default PocGallery;
