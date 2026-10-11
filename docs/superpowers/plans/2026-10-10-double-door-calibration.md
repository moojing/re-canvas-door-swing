# Blue double-door calibration

The user approved the preceding source comparison and requested adjustment.
Use S3 `1-1/b02/b02-s3方塊門.mp4`, first passage, for both appearance and motion.
Keep the existing reusable double-door set and update its style-only fallback.

- [x] Add failing regressions for closed approach crop, a single micro hold,
  continuous late advance and visible leaves at fade start.
- [x] Fit the double profile to S3's longer closed wait and a viewer-away left leaf while the right stays closed.
  Honor the existing swing direction property in the double renderer; preserve
  the default direction for legacy callers.
- [x] Compare the actual model/handles at 1.6 aspect against original frames.
- [x] Run core/package tests, focused double browser tests, lint and build.
- [x] Record source observations in gallery and fitted values/limitations here;
  run gallery validation without disturbing ignored source assets.

No new public API, preset-specific timing override, reverse traversal or assets.
Sound crop and handle model remain existing approximations. The 4.32–5.15s sound window now follows the opening/fade timeline; the licensed audio is not an original-game recording.

Gallery validation was run and is blocked by the pre-existing 96 extra ignored
frame extracts. Source files and existing workspace changes were preserved.
