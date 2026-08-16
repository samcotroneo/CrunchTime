# Architecture

Owned by: Build/Tooling Engineer. Update when structure changes — this is
what the Gameplay Engineer builds against.

## Stack
Phaser 3, TypeScript, Vite

## Folder structure
```
src/
  scenes/       one Phaser.Scene subclass per file
  entities/     game objects (player, enemies, pickups)
  systems/      cross-cutting: input, save/load, audio manager
  config/       balance.ts, constants.ts — no magic numbers elsewhere
  main.ts       Phaser.Game bootstrap
assets/
  raw/          source files (generated or hand-made), not directly loaded
  build/        packed atlases + optimized audio, loaded by the game
```

## Scene flow
Describe scene transitions here (Boot → Preload → MainMenu → Game →
GameOver, etc.) once decided.

## State management
Describe how game state persists across scenes (Phaser registry, a shared
store, save file) once decided.

## Asset pipeline
1. Source files land in `assets/raw/` (hand-made or via `tools/asset-gen/`)
2. Build Engineer packs them into `assets/build/` (atlases, audio sprites)
3. Game code loads only by key, defined in `docs/ASSETS.md` — never a raw
   path
