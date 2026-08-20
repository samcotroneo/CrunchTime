# Godot 4 — stack & conventions

> Stub pack: conventions below are a starting point, review before first
> real use.

## Stack
- Engine: Godot 4 (GDScript)
- Build: Godot editor + export presets
- Package manager: none (GDScript standard library)

## Conventions

### Project structure
- Scenes live in `scenes/`, one `.tscn` per screen/level/prefab.
- Entity scripts in `scripts/entities/`.
- Shared systems (state, input, audio) as autoload singletons in `scripts/systems/`.
- No inline magic numbers for balance values — pull from `scripts/config/balance.gd`.
- Export: Godot export presets (`export_presets.cfg`) produce per-platform builds.

### Memory management
- Prefer `queue_free()` over `free()` for nodes. `queue_free()` defers deletion
  to the end of the frame, preventing use-after-free when the node is still in
  the call stack.
  > Source: Godot 4 docs — Node.queue_free
  > https://docs.godotengine.org/en/stable/classes/class_node.html#class-node-method-queue-free

- Release signal connections in `_exit_tree()` (not `_ready()`). Signals from
  autoload singletons outlive scenes and will fire on freed objects if
  disconnected only in `_on_tree_exited`.
  > Source: Godot 4 docs — Signals (disconnecting)
  > https://docs.godotengine.org/en/stable/getting_started/step_by_step/signals.html

### Signals over direct calls
- Communicate between loosely coupled nodes via signals rather than
  `get_node()` / `get_parent()` chains. This keeps the scene tree refactorable
  without hunting down hard-coded paths.
  > Source: Godot 4 docs — Best practices — Godot interfaces
  > https://docs.godotengine.org/en/stable/tutorials/best_practices/godot_interfaces.html

### Autoload singletons
- Keep autoloads to a minimum (GameManager, AudioBus, SaveData). Autoloads are
  globally accessible and create hidden coupling; prefer scene-local nodes with
  signal connections for everything else.
  > Source: Godot 4 docs — Autoload / singletons
  > https://docs.godotengine.org/en/stable/tutorials/scripting/singletons_autoload.html

### Typing GDScript
- Use static typing (`var x: int`, `func foo(n: Node) -> void`) throughout.
  Typed GDScript runs noticeably faster than untyped and surfaces bugs at
  editor parse time.
  > Source: Godot 4 docs — GDScript — Static typing
  > https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/static_typing.html

### Resource loading
- Use `ResourceLoader.load_threaded_request()` for large assets (levels, audio)
  loaded at runtime. Blocking `load()` on the main thread causes visible frame
  drops.
  > Source: Godot 4 docs — ResourceLoader
  > https://docs.godotengine.org/en/stable/classes/class_resourceloader.html

### Export variables
- Annotate tunable values with `@export` and group them with `@export_group`.
  This makes level designers and non-engineers able to tweak game feel without
  touching code.
  > Source: Godot 4 docs — @export annotation
  > https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_exports.html

### Physics layers
- Assign collision layers and masks explicitly in `ProjectSettings` and
  reference them by name constant, not raw integer bitmask. Magic bit-shift
  values break when the layer order changes.
  > Source: Godot 4 docs — Physics layers
  > https://docs.godotengine.org/en/stable/tutorials/physics/physics_introduction.html#collision-layers-and-masks
