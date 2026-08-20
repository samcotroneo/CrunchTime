# SQUAD.md — Team Roster & Coordination

`AGENTS.md` defines what this project is. This file defines who does what
and how work moves between agents.

## Roster

| Agent | Owns | Can run in parallel with |
|---|---|---|
| Lead | Routing, breaking the spec into tasks, retros | — (coordinates the rest) |
| Designer | `docs/SPEC.md`, level/mechanic specs | Build Engineer |
| Engine Expert | `docs/ARCHITECTURE.md` §Engine notes (one-shot at init) | Designer, Build Engineer |
| Gameplay Engineer | `src/` implementation | — |
| Build Engineer | Build config, asset packing, `tools/asset-gen/`, releases | Designer, Engine Expert |
| Reviewer | Code review against `AGENTS.md` conventions | — |
| QA | Playtesting, bug reports (`docs/BUGS.md`), `docs/ASSETS.md` audits | — |

## Coordination rules

1. Designer and Build Engineer may work concurrently — design specs and
   build tooling rarely conflict.
2. Engine Expert runs once, immediately after project init, before Gameplay
   Engineer starts. It asks engine-specific questions (target platform, physics
   backend, save strategy, etc.) and writes findings into
   `docs/ARCHITECTURE.md §Engine notes`.
3. Gameplay Engineer only starts once the relevant SPEC section is marked
   `status: ready` AND Engine Expert has written its notes.
3. Reviewer is always a gate. No feature moves to QA until Reviewer has
   signed off in `docs/TASKS.md`.
4. QA is always last in a feature's lifecycle, never parallel to Engineer
   on the same feature.
5. Lead runs retros at the cadence defined in `docs/EVAL.md` — via
   `.github/chatmodes/retro.chatmode.md` or `node tools/retro/retro.mjs`.
6. Bugs flow QA → Engineer → QA through `docs/BUGS.md` statuses; only QA
   marks a bug `verified`.

## Handoff protocol

Agents don't message each other directly — coordination happens through
files:

- Before starting work, check `docs/TASKS.md` for open items in your lane.
- On finishing a unit of work, append an entry to `docs/TASKS.md`: what
  changed, why, and any open questions for the next agent.
- Never mark your own work "reviewed" or "tested" — only Reviewer and QA
  make those calls.

## Access policy

- Designer, QA: read-only on `src/`. QA also writes `docs/BUGS.md`.
- Engine Expert: read-only on `src/`; writes only `docs/ARCHITECTURE.md`.
- Gameplay Engineer: read/write on `src/`, no access to `tools/asset-gen/`.
- Build Engineer: read/write on `tools/`, build config, `docs/ASSETS.md`,
  `docs/RELEASES.md`, `CHANGELOG.md`; read-only elsewhere.
- Reviewer: read-only on code, writes only to `docs/TASKS.md`.
- Lead: read everywhere, writes only to `docs/TASKS.md`.

Each agent's `tools:` field (in `.claude/agents/` or `.github/chatmodes/`)
should reflect this table. For stricter path-level enforcement, check your
tool's current permissions/settings docs — this table is the policy those
settings should implement.
