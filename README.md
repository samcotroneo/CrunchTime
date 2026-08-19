# Game Agent Team — Starter Scaffold

A markdown-driven multi-agent setup for building games with Claude Code
and/or GitHub Copilot. Engine-agnostic at the core; per-engine conventions
live in `engines/` (Phaser 3 included, Godot 4 stubbed).

## Setup

Requirements: Node.js ≥ 18. Nothing else.

Get a copy:
- **GitHub template:** click "Use this template" on the repo page.
  (Maintainer: enable it under Settings → Template repository.)
- **Fresh copy without git history:** `npx degit <owner>/<repo> my-game && cd my-game`
- **Plain clone:** `git clone <url> my-game && cd my-game`

Then:

1. `node tools/setup.mjs` — installs tool dependencies, creates
   `tools/asset-gen/.env` from the example, and verifies the `AGENTS.md`
   mirrors. Safe to re-run.
2. `node tools/project-init/init-project.mjs` — staged questionnaire that
   picks your engine pack and seeds `docs/SPEC.md`, `docs/ARCHITECTURE.md`,
   `docs/ASSETS.md`, and `docs/TASKS.md`. Chat-first alternative:
   `.github/chatmodes/project-init.chatmode.md`. Re-running it later
   refines the brief; switching engines restamps `docs/ARCHITECTURE.md`.
3. If you'll generate assets, add your `OPENAI_API_KEY` to
   `tools/asset-gen/.env` and test with a dry run:
   ```
   node tools/asset-gen/generate.mjs \
     --manifest docs/ASSETS.md \
     --dry-run
   ```
   The default pipeline is manifest-driven batch generation (`docs/ASSETS.md`).
   Keep ad-hoc per-key generation for debugging only.

### Updating a game repo from core scaffold changes

If your game lives in its own repo and you want latest scaffold updates from
this core repo, follow the guide in `docs/MIGRATIONS.md`.
(`Upstream sync (for repos created from GitHub template)`).

### Keeping the mirrors in sync

`AGENTS.md` is canonical; `CLAUDE.md` and `.github/copilot-instructions.md`
mirror it. After editing `AGENTS.md`, run `node tools/setup.mjs --sync` to
refresh the copies (setup warns you when they drift). Prefer symlinks?
`node tools/setup.mjs --symlinks`.

## How the team works
See `docs/SQUAD.md` for roster and coordination rules. Short version: Lead
routes work, Designer and Build Engineer can work concurrently, Reviewer
always gates QA, everyone logs handoffs in `docs/TASKS.md`.

## Evaluating the team
`docs/EVAL.md` defines the effectiveness rubric (rework rate, review
cycles, open-question aging, throughput, scope drift). The handoff log
carries the data — run `node tools/retro/retro.mjs` for the scorecard, or
use `.github/chatmodes/retro.chatmode.md` for a guided retro that turns
findings into convention changes.

## Bugs and releases
QA files and verifies defects in `docs/BUGS.md` (severity + lifecycle
defined there). Releases follow `docs/RELEASES.md`: milestone-mapped
versioning, a checklist gated on bug status, and
`node tools/release/release.mjs --version <x.y.z>` to generate
`CHANGELOG.md` from completed TASKS.md entries.

## Adding a new engine
Copy an existing folder in `engines/`, edit its `pack.json`,
`ARCHITECTURE.md`, and `conventions.md`. The init flow discovers packs
automatically — see `engines/README.md`.

## Adding audio generation later
Copy `tools/asset-gen/providers/_template.mjs` to `providers/<name>.mjs`,
implement `generate()`, set `AUDIO_PROVIDER=<name>` in `.env`. Nothing
else needs to change.

## Structured asset generation notes
- `docs/ASSETS.md` now carries a structured brief per `needs-generation` asset
  (`brief_*` fields) plus output contract fields (`output_*`).
- Optional `reference_images` lets providers condition output on local image
  references.
- The generator writes provenance sidecars (`<asset>.meta.json`) for
  reproducibility and audit trails.

## A note on Copilot's agent file format
This scaffold uses `.github/chatmodes/*.chatmode.md`. Some Copilot
surfaces (e.g. Visual Studio's custom agents) instead expect
`.github/agents/*.agent.md` with similar content — this convention is
still evolving, so check current GitHub/VS Code/Visual Studio docs if a
file isn't picked up on your setup.
