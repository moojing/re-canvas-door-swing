# Door Swing Social Preview Design

## Goal

Replace the Lovable social preview with a project-owned image that represents
the preset catalog, and remove all remaining Lovable metadata and tooling.

## Design

- Capture the sample home page catalog as a `1200x630` PNG at
  `packages/sample/public/social-preview.png`.
- Capture at a `1200x630` viewport, scrolled to the top with no modal open,
  after fonts load and every visible preset-preview canvas has rendered its
  initial state.
- Use `https://moojing.github.io/re-canvas-door-swing/social-preview.png` for
  both `og:image` and `twitter:image`.
- Set `og:title` to
  `Retro Horror Door — Playable Door Animation Presets`.
- Set `og:description` to
  `Browse and play reusable retro-horror 3D door entrance presets built with Three.js.`
- Add `og:image:alt` and `twitter:image:alt` as
  `Retro Horror Door preset catalog`.
- Remove the Lovable author, Twitter account, `lovable-tagger` Vite plugin, and
  dependency, then regenerate `package-lock.json` so it contains no tagger
  package records.
- Keep the image project-owned and derived only from the rendered sample; do
  not copy gallery source material or reference frames.

## Verification

- Assert the PNG dimensions and exact metadata copy and URLs.
- Search HTML, Vite configuration, package manifests, and the lockfile for any
  remaining case-insensitive `lovable` reference.
- Run the sample lint and production build.
- Visually confirm the image is legible at social-card size and shows the
  catalog rather than a third-party brand.
