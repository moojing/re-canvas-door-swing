# Yellow door traversal update

User follow-up: the 1996 yellow door still uses the old freeze/full-swing profile
and Toward/Away inspector rather than Enter/Leave presets.

- [x] Add failing camera/knob and complete-variant tests.
- [x] Share the continuous approach / broad-face fade behavior with Iron Enter,
  while retaining yellow-specific handle and stage times.
- [x] Register yellow Leave with opposite viewed assets and hinge; group it on
  the existing card and use the existing ID-backed Enter/Leave selector.
- [x] Verify original first and second transitions, rendered faces and knob action.
- [x] Run relevant core, package, browser, lint and build checks and record limits.

Reference: gallery materials/door-transitions/1-1/a02/a02-s5黃目字門.mp4.
Names Enter/Leave are traversal conventions; actual swing direction stays a
renderer property. No source files or new asset models ship with this change.
