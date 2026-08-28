---
name: prototype-door-animation
description: Use when creating or revising a 3D door animation or re-canvas-door-swing preset, including checking gallery references, deciding whether animation already exists, generating front/back door textures, adding handle models, and launching the sample for visual verification.
---

# Prototype Door Animation

Build or revise a reference-faithful door animation/preset without copying protected game or film assets. Treat the door as a production asset: the animation, front texture, back texture, edge treatment, handle/accessory geometry, registry entry, tests, and local verification must agree with each other.

## Repository Context

For `re-canvas-door-swing` work, expect two sibling repositories to be relevant:

- `re-canvas-door-swing`: the library and sample app that ships runtime presets.
- `re-door-gallery`: the source of truth for evaluated door records, stakeholder selections, reports, and estimation CSVs.

Before changing a preset, verify both repos exist locally. Use the gallery repo for classification/reference context, but do not copy gallery records, source videos, frame grabs, thumbnails, or reference metadata into the publishable door library.

## Workflow

1. Inspect the requested door in the gallery first. Identify its category, stakeholder id/label, reference animation, front/back views, hinge side, handle side, accessories, and whether it belongs to an existing Phase plan.
2. Inspect `re-canvas-door-swing` next. Check existing animation configs, preset registry, texture conventions, asset folders, docs/plans, and the sample page. Determine whether the animation behavior is already implemented.
3. If the animation already exists, do not reimplement it. Generate or prepare only the missing runtime assets, then wire them into a new preset or update the existing preset.
4. If the animation does not exist, implement the smallest reusable animation behavior that matches the reference. Keep the vanilla scene limited to door leaves and handles/accessories unless the project docs explicitly require more.
5. Generate original front and back door textures when needed. Usually produce one front texture and one back texture. Keep their visible features spatially corresponding: if the handle is on the viewer's right on the front, it must appear on the viewer's left on the back so it represents the same physical location through the door.
6. Derive side/edge surfaces in code from the door textures and geometry when practical. The edge should look consistent with the front/back material, but should not require maintaining a separate heavy image unless the reference clearly needs one.
7. For mirrored variants, prefer metadata or UV transforms over duplicating bitmap files. Verify front and back mirroring independently; back-plane orientation compensation and preset-level mirroring are separate concerns.
8. For handles or accessories, first inspect project docs for approved asset sources. Then inspect existing project assets. Reuse suitable licensed/local resources when available. If a required model is not available, tell the user what to download and where it should be placed instead of inventing provenance.
9. Place 3D handle/accessory models at the physically plausible position on the moving door leaf. Match front/back handedness, pivot, scale, and motion timing. If the handle moves, drive it before the door leaf begins to swing.
10. Update tests close to the behavior changed: core preset registry tests for preset metadata, package-boundary tests for renderer invariants, browser tests for catalog/modal behavior, and focused sample tests when routes or selection behavior changes.
11. Launch the local sample server when the implementation is ready and give the user the actual URL. If the expected port is occupied, use the server's chosen fallback URL and clearly say which one to verify.
12. Check the sample visually at closed, half-open, and fully-open states. Confirm front/back alignment, edge texture quality, hinge direction, handle side, handle scale, and that no stale demo/POC preset appears in the production catalog.

## Asset Rules

- Keep library-owned runtime assets under `packages/door-lib/src/assets/`.
- Keep sample-only assets under `packages/sample/public/` only when they are not part of the published library.
- Do not add source videos, frame grabs, gallery thumbnails, or classification metadata to the package.
- Prefer compressed production formats such as WebP for door textures.
- Record useful generation/provenance notes in project docs when the repo already has a place for them.
- Never imitate a named film, game, or proprietary asset exactly; create an original texture guided by observed structure, material, age, and layout.

## Geometry And Material Guidance

- Identify the door leaf, hinge edge, handle/accessory pivot, visible front/back faces, and thickness faces before editing.
- Do not add a frame, sill, floor, center support, rivets, lock plates, or unrelated scene geometry unless it is visible in the reference or explicitly requested.
- Apply material to every visible surface. Base PBR material alone is insufficient when the camera can see the door edge.
- Match the requested finish. For corroded, non-reflective iron, use low metalness and high roughness. For aged wood, keep grain scale coherent across rails and panels.
- Use cinematic lighting sparingly: enough contrast to read the surface without hiding the material.

## Verification

Before reporting completion:

- Confirm both gallery and swing repos were checked, or state which one was unavailable.
- Confirm whether the animation was reused or newly implemented.
- Confirm front/back texture features represent the same physical positions.
- Confirm edge treatment is generated or mapped consistently with the door panel.
- Confirm handles/accessories use approved or existing assets, or that the user was told exactly what missing asset is needed.
- Confirm generated/downloaded runtime assets are in the repo location that will ship or be served.
- Run the relevant project tests, lint, and build. Report existing warnings separately from new failures.
- Leave a local server running for the user when requested or when visual confirmation is part of the task.

## Fast Decisions

| Situation | Default action |
| --- | --- |
| Existing animation matches | Reuse it; only generate/apply missing images or models. |
| Front/back handle sides disagree | Fix texture mirroring or regenerate the pair before tuning animation. |
| Door side texture is missing | Generate/mix an edge treatment in code from the door material. |
| Accessory model is required | Check docs, then assets; if absent, ask the user to download the specific model. |
| Opposite-hand variant | Prefer hinge-side and mirror metadata over duplicate textures. |
| Old demo appears on sample home | Remove or hide it from the public preset registry, not with a sample-only duplicated list. |
| No frame | Keep only the moving door leaf/leaves and allowed handle/accessory geometry. |
| Handle turns first | Use or add a handle phase before the door-angle phase; rotate around the handle base. |
