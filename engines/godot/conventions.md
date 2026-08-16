# Godot 4 — stack & conventions

> Stub pack: conventions below are a starting point, review before first
> real use.

## Stack
- Engine: Godot 4 (GDScript)
- Build: Godot editor + export presets
- Package manager: none (GDScript standard library)

## Conventions
- Scenes live in `scenes/`, one `.tscn` per screen/level/prefab.
- Entity scripts in `scripts/entities/`.
- Shared systems (state, input, audio) as autoload singletons in `scripts/systems/`.
- No inline magic numbers for balance values — pull from `scripts/config/balance.gd`.
