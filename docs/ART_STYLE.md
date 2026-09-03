# Art Style Policy

Owned by: Designer (authoritative — see `docs/SQUAD.md`). This is the
engine-agnostic baseline every generated or commissioned image, audio, or
video asset must satisfy.
Engine packs add a more specific overlay on top of this file — see
`## Engine overlays` below. This file (plus the current engine overlay) is
what makes a set of independently generated assets look like they belong to
the same product.

Any change to this file, or to `style_profile_version` below, is a Designer
approval gate: no other agent may bump the version or redefine a section
without Designer sign-off logged in `docs/TASKS.md`.

## style_profile_version
`1.1.0`

Bump this (semver) whenever a section below changes meaning, not just
wording. `docs/ASSETS.md` entries pin the version they were briefed against
via `style_profile_version`, so QA can flag assets generated against a
stale profile.

## Visual pillars
- Calm, focused utility with friendly confidence.
- Clear at a glance, with purposeful emphasis and low visual noise.
- Inclusive and accessible across small screens and gameplay distances.

## Shape language
- Prefer simple geometric silhouettes with intentional negative space.
- Use softly rounded UI corners (8px baseline) and consistent 2px visual
  strokes where outlines are needed.
- Avoid gratuitous bevels, ornamental micro-detail, and ambiguous silhouettes.

## Color system
- Ink: `#172033`; surface: `#F8FAFC`; muted surface: `#E2E8F0`.
- Primary: `#4F46E5`; secondary: `#0F766E`; success: `#15803D`;
  warning: `#B45309`; danger: `#B91C1C`.
- Use semantic colors with WCAG AA contrast. Do not use neon saturation,
  red/green-only state pairs, or low-contrast muted text for essential data.

## Material / lighting / rendering
- Default to matte, flat, or lightly textured surfaces with restrained
  depth; avoid photorealism and glossy plastic.
- Use a consistent upper-left light direction for dimensional art, with
  soft shadows and no unmotivated bloom or lens effects.
- Keep texture density low enough that silhouettes and semantic details
  survive target-size rendering. Apply the same restraint to video.

## Reference board
Baseline anchors: accessible flat-product iconography, matte geometric
illustration, restrained editorial motion, and readable game silhouettes.
Each initialized project must replace these anchors with 10-20 pinned
reference paths, 3-5 anti-references, and one approved hero asset before
its first production release.

## Do / Don't
- Do preserve whitespace, silhouette clarity, semantic color meaning, and
  consistent light/stroke treatment.
- Do not add text, logos, watermarks, noisy gradients, or decorative detail
  that competes with the primary action unless the brief explicitly calls
  for it.

## Media contracts
`docs/ASSETS.md` separates media by category:
- `image` follows visual pillars, shape language, color, rendering, and the
  active engine overlay.
- `audio` follows the product tone plus sonic style, pacing, looping, and
  export requirements; visual-only fields do not apply.
- `video` follows the image rules plus camera, timeline, motion continuity,
  frame rate, duration, and export requirements.

The category-specific contract is authoritative for required fields. Do not
invent visual constraints for audio or omit timing constraints from video.

## Engine overlays
Game vs. app/web products need different concrete constraints on top of
this baseline (camera and tileset rules make no sense for a web screen;
typography and spacing tokens make no sense for a sprite sheet). The
engine pack in use for this project supplies that overlay:
`engines/<engine>/ART_STYLE.md`. Read this root policy first, then the
overlay for the active engine (see `docs/ARCHITECTURE.md` for which engine
is stamped in). The overlay must not contradict this file — it narrows and
specializes it.

## External skills / agents
Outputs produced by external skills or agents (image/audio/video
generation assistants, style-transfer tools, or any third-party pipeline
not defined in `tools/asset-gen/`) are **not exempt** from this policy.
Before an externally produced asset is accepted into `docs/ASSETS.md` as
`final`, it must still satisfy:
- this file's category-appropriate direction (visual pillars, palette, and
  reference board for image/video; product tone, sonic direction, and
  approved sonic references named in the brief for audio), and
- the active engine's `ART_STYLE.md` overlay, and
- the structured schema and output contract in `docs/ASSETS.md`.

Record the tool/skill used in the asset's manifest entry so drift can be
traced back to its source. An asset that looks good in isolation but does
not match the pinned style profile is a QA-flagged defect, not a style
exception.

## Validation checklist (per asset, before marking `final`)
- [ ] Matches `style_profile_version` recorded on the asset entry, or the
      entry has been re-briefed against the current version.
- [ ] Image/video assets are consistent with the reference board and color
      system (or have a documented, Designer-approved exception).
- [ ] Audio assets match the approved sonic direction and do not inherit
      visual-only requirements.
- [ ] Respects the active engine overlay's constraints
      (`engines/<engine>/ART_STYLE.md`).
- [ ] No forbidden elements (text/watermarks/logos unless the brief
      explicitly calls for them).
- [ ] Source/tool recorded (`tools/asset-gen`, commissioned, or named
      external skill).

QA runs this checklist as part of its `docs/ASSETS.md` audit (see
`docs/SQUAD.md`); Build Engineer wires whatever of it is mechanically
checkable into CI (naming/format/size, required-field presence).
