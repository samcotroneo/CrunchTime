<!-- Mirrors /AGENTS.md. Keep in sync, or replace with a symlink:
     ln -sf AGENTS.md CLAUDE.md
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

## Agent model routing defaults
- Lead/coordinator work defaults to `gpt-5.6-sol` with `reasoning_effort: high`.
- Sub-agents default to `gpt-5.6-luna` for cost-efficient execution.
- Escalate sub-agent tasks to `gpt-5.6-sol` with `reasoning_effort: medium`
  when task complexity or quality risk is above lightweight scope.
- `gpt-5.6-terra` is not a default model for this project.
- Preference order for runtime routing:
  1. task-level override
  2. project defaults (this section)
  3. spawning agent's current model/settings
  4. platform default
- If a policy/runtime restriction blocks a preferred model or effort level,
  fall back to the spawning agent's current settings and continue.

## Docs every agent must read before acting
- `docs/SPEC.md` — the product spec: what it is and how it works
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
