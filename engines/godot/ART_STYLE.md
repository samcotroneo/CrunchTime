# Godot 4 — Art Style Overlay
<!-- engine: godot -->

Read `docs/ART_STYLE.md` first — this narrows that root policy for a
Godot 4 project. Owned by: Designer. Does not restate the root policy;
only adds/constrains where a Godot project needs concrete rules the root
doc can't assume.

## style_profile_version
`1.0.0`

## Camera
- Fix the camera mode (2D top-down, 2D side-scroller, isometric, or 3D
  perspective/orthographic) once here and keep every scene consistent
  with it. If 3D, record the target FOV/lens so props don't drift in
  apparent scale between scenes.
- Note the reference viewport size (`project.godot` display settings) so
  briefs specify silhouette-readable detail at that resolution.

## Sprites & tilesets (2D projects)
- One consistent pixel-per-unit across all `Sprite2D`/`AnimatedSprite2D`
  assets meant to share a scene — no mixing of scales.
- Tilesets share one tile size, one grid convention, and the palette/
  material rules from `docs/ART_STYLE.md`. Brief edge/transition tiles
  together with the tiles they connect so `TileSet` autotile terrains
  read cleanly.
- Consistent outline/line-weight and light-direction treatment across all
  sprites in a set.

## 3D materials (if applicable)
- Record a single baseline for roughness/metallic ranges and light
  direction/color temperature so meshes generated independently don't
  clash when placed in the same scene.
- Silhouette clarity still matters in 3D: avoid high-frequency surface
  detail that disappears at gameplay camera distance.

## World readability
- Player/interactable elements must read distinctly from background/
  environment art at all times — reserve part of the palette or a
  consistent rim-light/outline treatment for interactables only.
- HUD/UI art follows the shared color system but must stay legible over
  any in-game background.

## Audio direction
- Audio assets must support the game's intended pace and mood without
  masking gameplay feedback; brief loop points and loudness targets
  explicitly.

## Motion / video
- Video captures use the same camera, palette, silhouette, and world
  readability rules as gameplay, with timing that does not obscure the
  intended action.

## Applies on top of
`docs/ART_STYLE.md` (root policy, cohesion rules, style profile version,
external-skill compliance) and `engines/godot/conventions.md` (technical
stack conventions).
