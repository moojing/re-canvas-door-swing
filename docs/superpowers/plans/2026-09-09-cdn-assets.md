# CDN assets implementation plan

Goal: Keep runtime media out of retro-horror-door installs while supporting pinned CDN delivery, self hosting and local sample development.

Architecture: Preserve authored media in the existing source location. An independent retro-horror-door-assets workspace publishes an explicit runtime allowlist into textures/, models/ and sounds/. The library contains URL constants, rebases owned URLs per mount using assetBaseUrl, and keeps explicit URL overrides unchanged. No runtime dependency on the asset package. Sample defaults to locally staged media; a separate npm package mode uses an isolated install and CDN.

- [x] Add failing core URL and package media boundary tests.
- [x] Implement pinned asset URL resolution and integrate mount/reset/play/seek.
- [x] Build independent assets package and stage local sample assets.
- [x] Add isolated npm beta sample mode and release instructions.
- [x] Run core/package/browser tests, lint and build; inspect sample and package sizes.

Publication: Prepare beta versions but do not claim CDN availability until packages are published and fetched successfully. Publish assets first, then library, with beta dist-tag. Confirm npm ownership/authentication before publishing.

Follow-up: move the local default into the library asset resolver via a repository-only Vite build define; remove all sample component asset options. Verify default resolution, explicit override precedence, CDN behavior, and the existing local browser asset delivery test.

Superseded asset delivery details: the approved local-module architecture now lives in docs/design/asset-loading.md. Production media is owned by door-assets; sample staging and the development URL define have been removed.
