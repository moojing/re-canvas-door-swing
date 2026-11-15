# Vanilla renderer boundaries

`mountDoorEntrance` remains the public DOM entry point. The modules under
`packages/door-lib/src/renderer/` are internal and have no package subpath exports.

| Module | Owns |
| --- | --- |
| `vanilla.ts` | Mounting, preset selection, preview overrides, animation RAF, public playback methods and completion/progress callbacks |
| `renderer/scene.ts` | Three.js renderer and scene, door/handle geometry and materials, asset loading, resize observation, overlays and scene disposal |
| `renderer/camera.ts` | Responsive camera composition, protected-phase fitting/cache, phone projection offsets and saved-frame reapplication after resize |
| `renderer/audio.ts` | Audio element, media events, gesture unlocking, playback generations, delayed starts, sound progress and timeline synchronization |
| `renderer/progress.ts` | Shared progress clamping for these runtime modules |

Camera fitting receives a narrow geometry adapter and per-frame metadata. It
does not resolve presets or own playback. Audio reads current configuration and
playback state through getters so asynchronous callbacks observe the same live
state as before extraction. The mounting coordinator retains the order of
play/reset/seek/unmount operations; audio listener attachment remains at the
same mount phase.

The framework-free `core/` modules continue to own authored animation data,
sampling and retiming. They do not import the DOM/Three.js renderer modules.

This extraction changes module ownership only. It does not change released
presets, camera paths, asset lifecycle policy, source-video QA status, or the
frozen regression oracle. Further lifecycle or playback-controller changes
should be reviewed separately.
