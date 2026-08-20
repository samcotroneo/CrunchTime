# Phaser 3 — stack & conventions

## Stack
- Engine: Phaser 3 (TypeScript)
- Build: Vite
- Package manager: npm

## Conventions

### Project structure
- Scenes live in `src/scenes/`, one `Phaser.Scene` subclass per file.
- Entities/game objects in `src/entities/`.
- Shared systems (state, input, audio) in `src/systems/`.
- No inline magic numbers for balance values — pull from `src/config/balance.ts`.
- Build: `npm run build` (Vite) produces the static web bundle in `dist/`.

### Scene lifecycle
- Do all asset loading in `preload()`, all object creation in `create()`, and
  all frame-by-frame logic in `update()`. Never load assets in `create()` or
  `update()`.
  > Source: Phaser 3 official docs — Scene lifecycle
  > https://newdocs.phaser.io/docs/3.60.0/Phaser.Scene

- Destroy listeners and timers in the scene's `shutdown` event (not just
  `destroy`) so they are cleaned up on scene restarts via `scene.restart()`.
  > Source: Phaser 3 docs — Scene Events (shutdown vs destroy)
  > https://newdocs.phaser.io/docs/3.60.0/Phaser.Scenes.Events

### Texture atlases
- Pack sprites into texture atlases (e.g. via TexturePacker or `phaser-vite-plugin`)
  rather than loading individual PNGs. A single atlas draw call is far cheaper
  than N separate texture binds on the GPU.
  > Source: Phaser 3 docs — Texture Atlas
  > https://phaser.io/tutorials/creating-sprite-sheets-with-texturepacker/index

### Object pooling
- Use `this.physics.add.group({ classType, maxSize })` or `Phaser.GameObjects.Group`
  with `createMultiple` to pre-allocate objects that spawn frequently (bullets,
  particles). Avoid `new` inside `update()` to prevent GC spikes.
  > Source: Phaser 3 docs — Group.createMultiple
  > https://newdocs.phaser.io/docs/3.60.0/Phaser.GameObjects.Group#createMultiple
  > Source: Phaser Labs — Object Pooling
  > https://phaser.io/tutorials/object-pooling/index

### Timers and tweens
- Use `this.time.addEvent()` and `this.tweens.add()` instead of `setTimeout` /
  `setInterval`. Phaser timers pause with the scene and respect time-scale,
  native timers do not.
  > Source: Phaser 3 docs — Time.Clock
  > https://newdocs.phaser.io/docs/3.60.0/Phaser.Time.Clock

### Audio
- Use an audio sprite (single file + JSON map) instead of many individual audio
  files. This reduces HTTP requests and is required for reliable audio unlock on
  iOS Safari.
  > Source: Phaser 3 docs — Sound.AudioSprite
  > https://newdocs.phaser.io/docs/3.60.0/Phaser.Sound.WebAudioSoundManager
  > Source: MDN — Autoplay policy (browser audio unlock)
  > https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices

### Camera
- Always set `camera.setBounds()` matching the world size when the world is
  larger than the viewport. Unbounded cameras drift on resize events.
  > Source: Phaser 3 docs — Cameras.Scene2D.Camera#setBounds
  > https://newdocs.phaser.io/docs/3.60.0/Phaser.Cameras.Scene2D.Camera#setBounds

### TypeScript
- Enable `"strict": true` in `tsconfig.json`. Phaser 3 ships official type
  declarations; strict mode catches null-dereference bugs that are extremely
  common in `preload`/`create` ordering mistakes.
  > Source: Phaser 3 TypeScript project template
  > https://github.com/phaserjs/template-vite-ts
  > Source: TypeScript docs — strict flag
  > https://www.typescriptlang.org/tsconfig#strict

### Input
- Register input handlers in `create()` and remove them in the scene's
  `shutdown` event. Stale handlers from destroyed scenes accumulate and fire
  on future scenes.
  > Source: Phaser 3 docs — Input.Keyboard.KeyboardPlugin#removeAllKeys
  > https://newdocs.phaser.io/docs/3.60.0/Phaser.Input.Keyboard.KeyboardPlugin

### Scale / responsive layout
- Use `Phaser.Scale.FIT` (or `SMOOTH`) with a fixed design resolution and let
  Phaser handle scaling. Avoid computing viewport dimensions manually in game
  code; query `this.scale.gameSize` when needed.
  > Source: Phaser 3 docs — Scale Manager
  > https://newdocs.phaser.io/docs/3.60.0/Phaser.Scale.ScaleManager
