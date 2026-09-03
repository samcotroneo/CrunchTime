# Asset Manifest

Owned by: Build/Tooling Engineer (schema, tooling, packing/import pipeline,
CI checks). Style content of each brief is Designer's call — see
`docs/ART_STYLE.md` (root policy) and `engines/<engine>/ART_STYLE.md`
(engine overlay), both of which every active (`needs-generation` or `final`)
entry below must satisfy. QA audits this file against what's actually loaded in code *and*
against the art style policy (see checklist at the bottom).

## Schema
```
key:                               unique id used in code, e.g. this.load.atlas('player-idle', ...)
category:                          image | audio | video
type:                              image: spritesheet | atlas | icon | illustration | texture
                                    audio: sfx | music | loop
                                    video: clip | loop | cutscene | background
status:                            needs-generation | placeholder | final
source:                            kenney.nl (CC0) | commissioned | generated | placeholder
source_tool:                       provider, commissioned tool, or external skill name

# Common generation brief (required when status=needs-generation or final)
brief_subject:                     what the asset is
brief_style:                       visual or sonic style (must align with root + engine policy)
brief_mood:                        emotional/tone direction
brief_constraints:                 hard requirements
brief_negative_constraints:        explicit exclusions
brief_output_spec:                 render/export specifics

# Image-only brief fields
brief_camera:                      framing/camera guidance
brief_palette:                     color/palette guidance

# Audio-only brief fields
brief_tempo:                       tempo/rhythm or pacing guidance
brief_looping:                     loop boundary and seamlessness guidance

# Video-only brief fields
brief_camera:                      framing/camera guidance
brief_palette:                     color/palette guidance
brief_timeline:                    shot/motion/timing guidance

# Common output contract (required when status=needs-generation or final)
output_path:                       path relative to this file (e.g. ../assets/raw/player-idle.png)
output_format:                     png | wav | mp3 | etc

# Image/video output fields
output_width:                      integer px
output_height:                     integer px
output_transparent_background:     true | false

# Video-only output fields
output_fps:                        positive integer frames per second
output_duration_seconds:            positive number

# Audio-only output fields
output_sample_rate:                positive integer Hz (optional)
output_channels:                   positive integer (optional)

# Style profile pins (required when status=needs-generation or final)
style_profile_version:             version this brief was written against, e.g. 1.1.0 (must match docs/ART_STYLE.md `style_profile_version`)
style_profile_ref:                 doc + section this brief follows, e.g. docs/ART_STYLE.md#color-system, engines/phaser/ART_STYLE.md#tilesets
engine_style_profile_version:      version of the active engine overlay
engine_style_profile_ref:          active engine overlay section

# Optional image/video guidance
reference_images:                  comma-separated relative paths to reference images

# Legacy field (deprecated, non-authoritative — migration only)
generation:                        old freeform prompt; do not add to new entries, and do not use to satisfy the brief_* requirements above
```

## Assets

### app-icon
- category: image
- type: icon
- status: needs-generation
- source: generated
- source_tool: tools/asset-gen/openai
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
- style_profile_version: 1.1.0
- style_profile_ref: docs/ART_STYLE.md#color-system
- engine_style_profile_version: 1.0.0
- engine_style_profile_ref: engines/react-native/ART_STYLE.md#iconography
- reference_images: none
- generation: "flat design app icon, bold colors, transparent background"

### bg-music-main
- category: audio
- type: music
- status: needs-generation
- source: generated
- source_tool: tools/asset-gen/template
- brief_subject: background music for a focused work / productivity session
- brief_style: ambient instrumental with a calm, steady groove
- brief_tempo: steady, unobtrusive groove
- brief_looping: seamless loop with no audible boundary
- brief_mood: focused and calm
- brief_constraints: seamless loop, no vocals
- brief_negative_constraints: no abrupt intro/outro, no clipping
- brief_output_spec: 45-60 seconds loop-ready bed
- output_path: ../assets/raw/bg-music-main.wav
- output_format: wav
- style_profile_version: 1.1.0
- style_profile_ref: docs/ART_STYLE.md#media-contracts
- engine_style_profile_version: 1.0.0
- engine_style_profile_ref: engines/phaser/ART_STYLE.md#audio-direction
- reference_images: none

---
Add new entries above this line. Default robust flow:
`node tools/asset-gen/generate.mjs --manifest docs/ASSETS.md`

Single-key from manifest:
`node tools/asset-gen/generate.mjs --manifest docs/ASSETS.md --key <key>`

Debug mode (ad-hoc, not default):
`node tools/asset-gen/generate.mjs --key <key> --category <category> --prompt "<prompt>" --out <path>`

## Style profile pin
Every active entry (`needs-generation` or `final`) must set
`style_profile_version`/`style_profile_ref` for the root policy. Once an
active engine is selected in `docs/ARCHITECTURE.md`, it must also set
`engine_style_profile_version`/`engine_style_profile_ref` for that overlay.
If either profile changes, entries pinned to an older version are stale until
Designer re-briefs or re-approves them. Generation also records a content
digest in the provenance sidecar.

## External skills / agents
Assets produced outside `tools/asset-gen/` (image/video/audio generation
skills, style-transfer tools, or any third-party agent — e.g. Impeccable)
are entered into this manifest the same way as anything else and are
**not** exempt from the schema or from `docs/ART_STYLE.md`. Set `source_tool` to name the tool/skill used, still fill in the
category-appropriate structured brief and output fields, and pin both
style profiles.
An externally generated asset that skips the structured brief or does not
match the pinned style profile does not get marked `final`.

## Validation checklist (CI/QA enforceable)
Applies to every entry with `status: needs-generation` or `final`:
- [ ] Common brief fields are present and non-empty (the legacy
      `generation` field does not count).
- [ ] Image/video entries have their camera/palette fields; audio entries
      have tempo/looping fields; video entries have a timeline.
- [ ] `output_path`/`output_format` are present and the extension matches;
      image/video entries also have dimensions, and video has fps/duration.
      `final` entries must point to an existing non-empty output file.
- [ ] `source_tool` is present for generated or commissioned entries.
- [ ] `style_profile_version` is set and matches the current
      `docs/ART_STYLE.md` version.
- [ ] `style_profile_ref` points at a real section in the root policy; when
      an engine is active, `engine_style_profile_ref` points at a real section
      in that engine's overlay.
- [ ] `key` is unique, lowercase, alphanumeric-with-dashes, and matches
      the load key used in `src/`.
- [ ] Any `reference_images` paths exist in the repo.

Build Engineer wires the mechanically-checkable parts of this list into
`node tools/asset-gen/validate-assets.mjs` and CI; Designer/QA cover the
judgment calls (style/palette/reference-board conformance) manually, per
`docs/ART_STYLE.md`'s own validation checklist.
