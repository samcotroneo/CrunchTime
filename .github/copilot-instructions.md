<!-- Mirrors /AGENTS.md. Keep in sync, or replace with a symlink:
     ln -sf ../../AGENTS.md .github/copilot-instructions.md
     (node tools/setup.mjs --sync refreshes this copy) -->

# AGENTS.md

Shared instructions for every agent (human or AI) working on this project.
This is the canonical file. `CLAUDE.md` and `.github/copilot-instructions.md`
mirror it — keep all three in sync, or replace the copies with symlinks
(see README.md).

@docs/SQUAD.md

## Stack
Defined per project in `docs/ARCHITECTURE.md`, stamped from
`engines/<engine>/` by the project-init flow. Engine packs live in
`engines/` — see `engines/README.md` to add one.

## Conventions
- Engine-specific stack and coding conventions live in
  `engines/<engine>/conventions.md` — read the pack matching the engine
  marker in `docs/ARCHITECTURE.md`.
- Asset keys always match the `key` field in `docs/ASSETS.md`. Never load a
  raw file path directly in product code.

## Docs every agent must read before acting
- `docs/GDD.md` — the product spec: what it is and how it works
- `docs/ARCHITECTURE.md` — how the codebase is organized
- `docs/ASSETS.md` — asset manifest and generation status
- `docs/SQUAD.md` — team roster and how agents coordinate
- `docs/EVAL.md` — effectiveness rubric and retro cadence
- `docs/BUGS.md` — defect tracker (QA files and verifies)
- `docs/RELEASES.md` — versioning and release checklist
- `docs/TASKS.md` — current work and handoff log (append here when you finish something)

## Secrets
Never read, print, or paste the contents of `.env`. Asset generation
credentials belong only to `tools/asset-gen/` and are read from environment
variables at runtime — no agent needs to see the key value to do its job.
