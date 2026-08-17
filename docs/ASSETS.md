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

### player-idle
- category: art
- type: spritesheet (4 frames, 32x32)
- status: needs-generation
- source: generated
- brief_subject: player idle sprite for a top-down food-courier game
- brief_style: 16-bit pixel art with crisp readable silhouette
- brief_camera: orthographic top-down character framing
- brief_palette: warm food-court colors with medium contrast
- brief_mood: energetic and playful
- brief_constraints: transparent background, centered sprite, no text
- brief_negative_constraints: no watermark, no logos, no UI
- brief_output_spec: single frame concept reference for later spritesheet expansion
- output_path: ../assets/raw/player-idle.png
- output_format: png
- output_width: 1024
- output_height: 1024
- output_transparent_background: true
- reference_images: none
- generation: "16-bit pixel art character, idle animation frame, transparent background"

### bg-music-main
- category: audio
- type: music
- status: needs-generation
- source: generated
- brief_subject: main gameplay loop music for arcade time-management gameplay
- brief_style: upbeat chiptune-inspired game soundtrack
- brief_camera: none
- brief_palette: bright tonal palette with clean lead
- brief_mood: focused but cheerful
- brief_constraints: seamless loop, no vocals
- brief_negative_constraints: no abrupt intro/outro, no clipping
- brief_output_spec: 45-60 seconds loop-ready bed
- output_path: ../assets/raw/bg-music-main.wav
- output_format: wav
- output_transparent_background: false
- reference_images: none

---
Add new entries above this line. Default robust flow:
`node /home/runner/work/CrunchTime/CrunchTime/tools/asset-gen/generate.mjs --manifest /home/runner/work/CrunchTime/CrunchTime/docs/ASSETS.md`

Single-key from manifest:
`node /home/runner/work/CrunchTime/CrunchTime/tools/asset-gen/generate.mjs --manifest /home/runner/work/CrunchTime/CrunchTime/docs/ASSETS.md --key <key>`

Debug mode (ad-hoc, not default):
`node /home/runner/work/CrunchTime/CrunchTime/tools/asset-gen/generate.mjs --key <key> --category <category> --prompt "<prompt>" --out <path>`
