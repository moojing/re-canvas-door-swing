# POC Gallery Design

## Goal

Add a lightweight `/poc` index that shows all current door-animation proofs of concept in one place. The index uses static thumbnails and opens the existing animated route when a card is selected.

The gallery, its thumbnails, and every linked POC must contain no original game pixels. Generated artwork and deterministic procedural materials are allowed.

## Scope

The first gallery release contains exactly these entries:

| ID | Title | Verification target | Route | Thumbnail |
| --- | --- | --- | --- | --- |
| A11 | Heavy Water Door | Primitive relief geometry with a procedural heavy-metal finish. | `/poc/a11` | `/poc-thumbnails/a11.png` |
| B10 | Sewer Gate | Extruded interlocking teeth with opposing vertical motion. | `/poc/b10` | `/poc-thumbnails/b10.png` |
| C03 | Lift Platform | Primitive lift platform with procedural rust and mesh. | `/poc/c03` | `/poc-thumbnails/c03.png` |
| B05 | Arched Double Gate | Generated arched iron leaves with mirrored inward swing. | `/poc/b05` | `/poc-thumbnails/b05.png` |
| B06 | Heavy Water Double Door | Generated Normal and Frozen leaves with valve-first motion. | `/poc/b06` | `/poc-thumbnails/b06.png` |

This work does not change feasibility classifications, evaluation CSV data, or the sibling evaluation gallery.

## Provenance Boundary

The following are prohibited from the gallery, thumbnails, and linked POC runtime dependency graph:

- Original game screenshots, extracted frames, or crops.
- Files under ignored `materials/`, frame-extract, or gallery directories.
- Runtime URLs under `textures/poc-*`.
- Embedded `data:image` payloads or remote image URLs.

Current safe routes remain unchanged in principle:

- B10 uses generated and programmatically drawn textures.
- C03 uses primitive geometry and procedural materials.
- B05 uses independently generated front artwork and procedural geometry.
- B06 uses independently generated Normal and Frozen artwork on shallow 3D leaves.

A11 is the exception and must be remediated before gallery thumbnails are captured. Its runtime image-loader and `textures/poc-a11` dependency will be removed. The existing primitive relief geometry stays, while deterministic project-owned metal color and roughness maps replace all screenshot-derived face, rail, panel, housing, and wheel textures. User-facing copy must no longer describe screenshot textures.

Automated provenance checks will inspect executable source after removing comments, enumerate shipped gallery assets, and reject prohibited runtime paths or image sources. Thumbnail SHA-256 values will be recorded so later replacement is intentional and reviewable.

## Page Architecture

### Gallery data

A small immutable data module owns each card's ID, title, description, route, thumbnail path, and thumbnail identity. The UI renders from this module rather than duplicating routes or labels in markup.

### Gallery page

`PocGallery` renders a dark industrial archive with five equal-weight cards:

- Desktop: two or three columns depending on available width.
- Mobile: one column.
- Static 16:9 thumbnail with a restrained hover reveal.
- ID, title, one-sentence verification target, and an `Open animation` affordance.
- The complete card is one accessible internal link.

The page must not mount iframes, canvases, or any POC component. Loading the index therefore creates no WebGL contexts and does not run five animation loops.

The route is `/poc`. Existing `/poc/{id}` routes remain the animation destinations.

### Thumbnail failure

If a thumbnail fails to decode, the card retains its dimensions and shows a dark ID-based placeholder. Tests still fail when a committed thumbnail is absent, so the fallback protects the interface without hiding repository errors.

## Thumbnail Capture

Thumbnails are committed PNG files under `packages/sample/public/poc-thumbnails/`.

Each thumbnail is captured from the POC's WebGL canvas at progress zero after its safe assets have loaded. B06 is captured with the default Normal variant. A11 is captured only after its procedural replacement is active.

The canonical browser viewport is `1440x1000` CSS pixels. The capture is a centered `960x540` CSS-pixel clip around the WebGL canvas area. For fixed-height 520-pixel canvases, the remaining 20 vertical pixels come from the adjacent safe page background, split evenly above and below. The clip excludes controls, headings, browser chrome, and unrelated UI. The committed PNG must be exactly `960x540` pixels; device-scale overrides are disabled during capture so CSS and output pixels match one to one.

The capture workflow must not read the sibling gallery, ignored materials, source videos, or extracted frames. The resulting PNGs are runtime-only previews and are not used as 3D materials.

## Testing

Automated checks cover:

- The gallery registry contains exactly A11, B10, C03, B05, and B06 with unique routes and thumbnail paths.
- Every thumbnail exists, is a valid PNG with the agreed dimensions, and matches its recorded SHA-256.
- The shipped thumbnail directory contains no extra files.
- A11 procedural material output is deterministic, opaque, and visibly varied.
- A11 and gallery runtime dependencies contain no prohibited image source after comments are excluded.
- The `/poc` route builds and all existing B05, B06, C03, and B10 tests remain green.

Browser verification covers desktop and mobile layouts, all five thumbnails, card navigation, A11 procedural rendering, animation playback, and the absence of original game imagery.

## Acceptance Criteria

- `/poc` displays five equal-weight static-thumbnail cards.
- Selecting any card opens the corresponding existing animated POC route.
- The index creates no WebGL canvas and remains responsive on mobile.
- No gallery thumbnail or linked runtime POC loads original game pixels.
- A11 uses only project-owned procedural appearance assets.
- Tests, lint, production build, and browser verification pass.
