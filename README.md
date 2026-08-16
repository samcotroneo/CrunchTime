# Game Agent Team — Starter Scaffold

A markdown-driven multi-agent setup for building games with Claude Code
and/or GitHub Copilot. Engine-agnostic at the core; per-engine conventions
live in `engines/` (Phaser 3 included, Godot 4 stubbed).

## Setup

1. Copy everything in this archive into your project root (or use it to
   start a new repo).
2. `AGENTS.md` is the canonical shared context file. `CLAUDE.md` and
   `.github/copilot-instructions.md` are copies — keep edits in sync, or
   replace the copies with symlinks:
   ```
   ln -sf AGENTS.md CLAUDE.md
   ln -sf ../AGENTS.md .github/copilot-instructions.md
   ```
3. Initialize the project brief before asking implementation agents to build
   anything:
   - Chat-first: use `.github/chatmodes/project-init.chatmode.md` as the
     staged questionnaire prompt in Copilot-compatible surfaces.
   - Local command: `node tools/project-init/init-project.mjs`
4. The init flow asks which engine pack to use (from `engines/`) and writes
   answers back into `docs/GDD.md`, `docs/ARCHITECTURE.md`, `docs/ASSETS.md`,
   and appends a handoff entry to `docs/TASKS.md`. If you rerun it later, it
   can be used to refine the existing project brief. Switching engines on a
   rerun restamps `docs/ARCHITECTURE.md` from the new engine's pack template.
5. `cd tools/asset-gen && npm install` (no dependencies yet, sets up the
   package), then `cp .env.example .env` and add your `OPENAI_API_KEY`.
6. Test asset generation with a dry run:
   ```
   node generate.mjs --key player-idle --category art \
     --prompt "16-bit pixel art idle frame" \
     --out ../../assets/raw/player-idle.png --dry-run
   ```

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

## Adding a new engine
Copy an existing folder in `engines/`, edit its `pack.json`,
`ARCHITECTURE.md`, and `conventions.md`. The init flow discovers packs
automatically — see `engines/README.md`.

## Adding audio generation later
Copy `tools/asset-gen/providers/_template.mjs` to `providers/<name>.mjs`,
implement `generate()`, set `AUDIO_PROVIDER=<name>` in `.env`. Nothing
else needs to change.

## A note on Copilot's agent file format
This scaffold uses `.github/chatmodes/*.chatmode.md`. Some Copilot
surfaces (e.g. Visual Studio's custom agents) instead expect
`.github/agents/*.agent.md` with similar content — this convention is
still evolving, so check current GitHub/VS Code/Visual Studio docs if a
file isn't picked up on your setup.
