# Architecture
<!-- engine: godot -->

Owned by: Build/Tooling Engineer. Update when structure changes — this is
what the Gameplay Engineer builds against.

> Stub pack: structure below is a reasonable Godot 4 default, review before
> first real use.

## Stack
Godot 4, GDScript

## Folder structure
```
scenes/         .tscn scene files, one per screen/level/prefab
scripts/
  entities/     game object scripts (player, enemies, pickups)
  systems/      cross-cutting autoload singletons: input, save/load, audio
  config/       balance.gd, constants.gd — no magic numbers elsewhere
assets/
  raw/          source files (generated or hand-made), not directly loaded
  build/        imported/optimized assets, loaded by the game
project.godot   engine project file
```

## Scene flow
Describe scene transitions here (MainMenu → Level → GameOver, etc.) once
decided.

## State management
Describe how game state persists across scenes (autoload singleton, save
file) once decided.

## Asset pipeline
1. Source files land in `assets/raw/` (hand-made or via `tools/asset-gen/`)
2. Build Engineer optimizes/imports them into `assets/build/`
3. Game code loads only by key, defined in `docs/ASSETS.md` — never a raw
   path
