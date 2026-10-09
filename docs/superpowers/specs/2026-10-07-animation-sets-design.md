# Explicit compatible animation sets

User approved writing a plan, reviewing it, then implementing without another
approval pause. Prior discussion establishes: presets explicitly select a set;
the set owns exact door/camera/handle/time/fade/sound tracks; motion compatibility
is enforced; era is classification, not enough to determine the path. Enter/Leave
names traversal presets, not rotation sign or set type. Existing mount API and
preset IDs remain stable; no public arbitrary motion/material/set mixing.

Use one set ID per reusable behavior, not per source video. Members of the same
set share exact tracks except optional handle presence. Source comparisons
classify behavior rather than invent measured 3D coordinates. Iron Enter and
Yellow Enter/Leave share 1996 single micro-open advance; Iron Leave uses 1996
single wide-swing advance, based on prior local video review. Blue double,
1998 single and 1999 closed-wait single retain their current profiles in separate
sets. Record the visual-classification evidence and exact-fit limitations.

Registered presets explicitly declare animationSet. Existing style-only custom
presets retain the current motion/era default as fallback. Legacy presets without
style or set retain old animation behavior. An explicit unknown, incompatible,
era-mismatched or style-less set fails; it never silently falls back. Detail
shows the resolved set ID; switching traversal updates the preset and set display.
Preview edits remain temporary and the normal/production editors stay hidden.
