# Art Style Policy

Owned by: Designer (authoritative — see `docs/SQUAD.md`). This is the
engine-agnostic baseline every generated or commissioned asset must satisfy.
Engine packs add a more specific overlay on top of this file — see
`## Engine overlays` below. This file (plus the current engine overlay) is
what makes a set of independently generated assets look like they belong to
the same product.

Any change to this file, or to `style_profile_version` below, is a Designer
approval gate: no other agent may bump the version or redefine a section
without Designer sign-off logged in `docs/TASKS.md`.

## style_profile_version
`1.0.0`

Bump this (semver) whenever a section below changes meaning, not just
wording. `docs/ASSETS.md` entries pin the version they were briefed against
via `style_profile_version`, so QA can flag assets generated against a
stale profile.

## Visual pillars
TBD — 2-4 short phrases describing tone, genre/category, and target
audience. Every other section should trace back to these.

## Shape language
TBD — round vs. angular, silhouette rules, level of geometric detail.

## Color system
TBD — primary/secondary/accent palette (name or hex references), and any
explicitly forbidden colors or combinations.

## Material / lighting / rendering
TBD — roughness, lighting direction, bloom/rim-light or flat-shading
conventions, line weight, texture density. Applies to both art and any
motion/video output.

## Reference board
TBD — links or paths to 10-20 pinned reference assets that define the
target look, plus 3-5 anti-references (what this project should *not*
look like) and, once available, one "hero" asset that best represents the
final style.

## Do / Don't
TBD — a short bullet list of concrete do/don't examples, updated as the
team learns what breaks cohesion in practice.

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
Outputs produced by external skills or agents (image/video/audio
generation assistants, style-transfer tools, or any third-party pipeline
not defined in `tools/asset-gen/`) are **not exempt** from this policy.
Before an externally produced asset is accepted into `docs/ASSETS.md` as
`final`, it must still satisfy:
- this file's visual pillars, palette, and reference board, and
- the active engine's `ART_STYLE.md` overlay, and
- the structured schema and output contract in `docs/ASSETS.md`.

Record the tool/skill used in the asset's manifest entry so drift can be
traced back to its source. An asset that looks good in isolation but does
not match the pinned style profile is a QA-flagged defect, not a style
exception.

## Validation checklist (per asset, before marking `final`)
- [ ] Matches `style_profile_version` recorded on the asset entry, or the
      entry has been re-briefed against the current version.
- [ ] Consistent with the reference board (no unexplained deviation).
- [ ] Palette matches the color system (or a documented, Designer-approved
      exception).
- [ ] Respects the active engine overlay's constraints
      (`engines/<engine>/ART_STYLE.md`).
- [ ] No forbidden elements (text/watermarks/logos unless the brief
      explicitly calls for them).
- [ ] Source/tool recorded (`tools/asset-gen`, commissioned, or named
      external skill).

QA runs this checklist as part of its `docs/ASSETS.md` audit (see
`docs/SQUAD.md`); Build Engineer wires whatever of it is mechanically
checkable into CI (naming/format/size, required-field presence).
