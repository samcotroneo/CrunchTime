# Asset Manifest

Owned by: Build/Tooling Engineer. QA audits this against what's actually
loaded in code.

## Schema
```
key:          unique id used in code, e.g. this.load.atlas('player-idle', ...)
category:     art | audio
type:         spritesheet | atlas | sfx | music | loop
status:       needs-generation | placeholder | final
source:       kenney.nl (CC0) | commissioned | generated | placeholder
generation:   (optional) prompt used, if generated
```

## Assets

### player-idle
- category: art
- type: spritesheet (4 frames, 32x32)
- status: needs-generation
- source: generated
- generation: "16-bit pixel art character, idle animation frame, transparent background"

### bg-music-main
- category: audio
- type: music
- status: needs-generation
- source: (no audio provider configured yet — see AUDIO_PROVIDER in .env)

---
Add new entries above this line. From `tools/asset-gen/`, run:
`node generate.mjs --key <key> --category <category> --prompt "<prompt>" --out <path>`
to fill a `needs-generation` entry.
