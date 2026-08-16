# Phaser 3 — stack & conventions

## Stack
- Engine: Phaser 3 (TypeScript)
- Build: Vite
- Package manager: npm

## Conventions
- Scenes live in `src/scenes/`, one Phaser.Scene subclass per file.
- Entities/game objects in `src/entities/`.
- Shared systems (state, input, audio) in `src/systems/`.
- No inline magic numbers for balance values — pull from `src/config/balance.ts`.
