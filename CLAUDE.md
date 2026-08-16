<!-- Mirrors /AGENTS.md. Keep in sync, or replace with a symlink:
     ln -sf AGENTS.md CLAUDE.md -->

# AGENTS.md

Shared instructions for every agent (human or AI) working on this project.
This is the canonical file. `CLAUDE.md` and `.github/copilot-instructions.md`
mirror it — keep all three in sync, or replace the copies with symlinks
(see README.md).

@docs/SQUAD.md

## Stack
- Engine: Phaser 3 (TypeScript)
- Build: Vite
- Package manager: npm

## Conventions
- Scenes live in `src/scenes/`, one Phaser.Scene subclass per file.
- Entities/game objects in `src/entities/`.
- Shared systems (state, input, audio) in `src/systems/`.
- No inline magic numbers for balance values — pull from `src/config/balance.ts`.
- Asset keys always match the `key` field in `docs/ASSETS.md`. Never load a
  raw file path directly in game code.

## Docs every agent must read before acting
- `docs/GDD.md` — what the game is and how it plays
- `docs/ARCHITECTURE.md` — how the codebase is organized
- `docs/ASSETS.md` — asset manifest and generation status
- `docs/SQUAD.md` — team roster and how agents coordinate
- `docs/TASKS.md` — current work and handoff log (append here when you finish something)

## Secrets
Never read, print, or paste the contents of `.env`. Asset generation
credentials belong only to `tools/asset-gen/` and are read from environment
variables at runtime — no agent needs to see the key value to do its job.
