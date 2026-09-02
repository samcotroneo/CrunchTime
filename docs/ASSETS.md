# Asset Manifest

Owned by: Build/Tooling Engineer (schema, tooling, packing/import pipeline,
CI checks). Style content of each brief is Designer's call — see
`docs/ART_STYLE.md` (root policy) and `engines/<engine>/ART_STYLE.md`
(engine overlay), both of which every `needs-generation` entry below must
satisfy. QA audits this file against what's actually loaded in code *and*
against the art style policy (see checklist at the bottom).

## Schema
```
key:                               unique id used in code, e.g. this.load.atlas('player-idle', ...)
category:                          art | audio
type:                              spritesheet | atlas | sfx | music | loop
status:                            needs-generation | placeholder | final
source:                            kenney.nl (CC0) | commissioned | generated | placeholder

# Structured generation brief (required when status=needs-generation) — this is
# the authoritative spec for the asset. Do not rely on the legacy `generation`
# field below.
brief_subject:                     what the asset is
brief_style:                       style direction (must align with docs/ART_STYLE.md + engine overlay)
brief_camera:                      framing/camera guidance
brief_palette:                     color/palette guidance
brief_mood:                        emotional/tone guidance
brief_constraints:                 hard requirements
brief_negative_constraints:        explicit "do not include"
brief_output_spec:                 render/output specifics

# Output contract (required when status=needs-generation)
output_path:                       path relative to this file (e.g. ../assets/raw/player-idle.png)
output_format:                     png | wav | mp3 | etc
output_width:                      integer px (optional for audio)
output_height:                     integer px (optional for audio)
output_transparent_background:     true | false

# Style profile pin (required when status=needs-generation)
style_profile_version:             version this brief was written against, e.g. 1.0.0 (must match docs/ART_STYLE.md `style_profile_version`)
style_profile_ref:                 doc + section this brief follows, e.g. docs/ART_STYLE.md#color-system, engines/phaser/ART_STYLE.md#tilesets

# Optional guidance
reference_images:                  comma-separated relative paths to reference images

# Legacy field (deprecated, non-authoritative — migration only)
generation:                        old freeform prompt; do not add to new entries, and do not use to satisfy the brief_* requirements above
```

## Assets

### app-icon
- category: art
- type: atlas
- status: needs-generation
- source: generated
- brief_subject: app icon for a productivity mobile app
- brief_style: clean flat design with bold colors
- brief_camera: flat front-facing icon framing
- brief_palette: bold primary colors with white background
- brief_mood: friendly and professional
- brief_constraints: transparent background, centered composition, no text
- brief_negative_constraints: no watermark, no logos, no UI chrome
- brief_output_spec: single icon image
- output_path: ../assets/raw/app-icon.png
- output_format: png
- output_width: 1024
- output_height: 1024
- output_transparent_background: true
- style_profile_version: 1.0.0
- style_profile_ref: docs/ART_STYLE.md#color-system
- reference_images: none
- generation: "flat design app icon, bold colors, transparent background"

### bg-music-main
- category: audio
- type: music
- status: needs-generation
- source: generated
- brief_subject: background music for a focused work / productivity session
- brief_style: ambient instrumental with a calm, steady groove
- brief_camera: none
- brief_palette: soft tonal palette with clean lead
- brief_mood: focused and calm
- brief_constraints: seamless loop, no vocals
- brief_negative_constraints: no abrupt intro/outro, no clipping
- brief_output_spec: 45-60 seconds loop-ready bed
- output_path: ../assets/raw/bg-music-main.wav
- output_format: wav
- output_transparent_background: false
- style_profile_version: 1.0.0
- style_profile_ref: docs/ART_STYLE.md#material--lighting--rendering
- reference_images: none

---
Add new entries above this line. Default robust flow:
`node tools/asset-gen/generate.mjs --manifest docs/ASSETS.md`

Single-key from manifest:
`node tools/asset-gen/generate.mjs --manifest docs/ASSETS.md --key <key>`

Debug mode (ad-hoc, not default):
`node tools/asset-gen/generate.mjs --key <key> --category <category> --prompt "<prompt>" --out <path>`

## Style profile pin
Every `needs-generation` entry must set `style_profile_version` (matching
the current `style_profile_version` in `docs/ART_STYLE.md`) and
`style_profile_ref` (the specific doc/section it was briefed against —
root policy, engine overlay, or both). If `docs/ART_STYLE.md` bumps its
version, entries pinned to an older version are considered stale until
Designer re-briefs or re-approves them.

## External skills / agents
Assets produced outside `tools/asset-gen/` (image/video/audio generation
skills, style-transfer tools, or any third-party agent — e.g. Impeccable)
are entered into this manifest the same way as anything else and are
**not** exempt from the schema or from `docs/ART_STYLE.md`. Set `source`
to name the tool/skill used, still fill in the structured `brief_*` and
`output_*` fields, and pin `style_profile_version`/`style_profile_ref`.
An externally generated asset that skips the structured brief or does not
match the pinned style profile does not get marked `final`.

## Validation checklist (CI/QA enforceable)
Applies to every entry with `status: needs-generation` or `final`:
- [ ] All `brief_*` fields are present and non-empty (the legacy
      `generation` field does not count).
- [ ] `output_path`, `output_format`, and (for art) `output_width`/
      `output_height` are present and `output_path`'s extension matches
      `output_format`.
- [ ] `style_profile_version` is set and matches the current
      `docs/ART_STYLE.md` version.
- [ ] `style_profile_ref` points at a real section in `docs/ART_STYLE.md`
      and/or the active engine's `ART_STYLE.md` overlay.
- [ ] `key` is unique, lowercase, alphanumeric-with-dashes, and matches
      the load key used in `src/`.
- [ ] Any `reference_images` paths exist in the repo.

Build Engineer wires the mechanically-checkable parts of this list (schema
presence, key format, path/extension matches) into CI; Designer/QA cover
the judgment calls (style/palette/reference-board conformance) manually,
per `docs/ART_STYLE.md`'s own validation checklist.
