# Phaser 3 — Art Style Overlay
<!-- engine: phaser -->

Read `docs/ART_STYLE.md` first — this narrows that root policy for a 2D
game rendered with Phaser 3. Owned by: Designer. Does not restate the root
policy; only adds/constrains where a Phaser project needs concrete rules
the root doc can't assume.

## Camera
- State the intended camera/framing once here (top-down, side-scroller,
  isometric, fixed-screen) and keep every scene consistent with it. Mixing
  framings across scenes is the fastest way to break cohesion.
- Note the design resolution and safe-area margins so sprites are drawn at
  a silhouette-readable size at that resolution, not just "looks fine
  zoomed in."

## Sprites & spritesheets
- One consistent pixel-per-unit (or "world unit size") across all
  character/prop sprites — no mixing of scales between assets meant to
  share a scene.
- Consistent outline/line-weight treatment (or explicitly none) across all
  sprites, matching `docs/ART_STYLE.md`'s shape language.
- Consistent light direction and shading style across sprites so nothing
  looks pasted in from a different set.
- Pack related sprites into a single atlas (see
  `engines/phaser/conventions.md` — Texture atlases) with a shared naming
  scheme; do not brief atlas frames independently of their sibling frames.

## Tilesets
- One tile size and one grid convention (orthogonal/isometric/hex) per
  world; tilesets must share the palette and material rules from
  `docs/ART_STYLE.md`.
- Edge/transition tiles must be briefed together with their neighboring
  biome tiles so seams read cleanly — never generate a transition tile in
  isolation from the tiles it transitions between.

## World readability
- Foreground (player, interactables) must remain visually distinct from
  background/tileset art at all times — reserve a palette band or
  silhouette treatment for interactable elements and don't reuse it for
  background decoration.
- UI/HUD art follows the same color system as world art but should sit in
  a value range that stays legible over any background tile in the game.

## Applies on top of
`docs/ART_STYLE.md` (root policy, cohesion rules, style profile version,
external-skill compliance) and `engines/phaser/conventions.md` (technical
stack conventions, e.g. atlas packing, scale manager).
