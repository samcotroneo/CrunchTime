# Asset Manifest

Owned by: Build/Tooling Engineer. QA audits this against what's actually
loaded in code.

## Schema
```
key:                               unique id used in code, e.g. this.load.atlas('player-idle', ...)
category:                          art | audio
type:                              spritesheet | atlas | sfx | music | loop
status:                            needs-generation | placeholder | final
source:                            kenney.nl (CC0) | commissioned | generated | placeholder

# Structured generation brief (required when status=needs-generation)
brief_subject:                     what the asset is
brief_style:                       style direction (engine/game-wide consistency)
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

# Optional guidance
reference_images:                  comma-separated relative paths to reference images

# Legacy field (migration only)
generation:                        old freeform prompt (kept for backward compatibility)
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
- reference_images: none

---
Add new entries above this line. Default robust flow:
`node tools/asset-gen/generate.mjs --manifest docs/ASSETS.md`

Single-key from manifest:
`node tools/asset-gen/generate.mjs --manifest docs/ASSETS.md --key <key>`

Debug mode (ad-hoc, not default):
`node tools/asset-gen/generate.mjs --key <key> --category <category> --prompt "<prompt>" --out <path>`
