# Game Agent Team — Starter Scaffold

A markdown-driven multi-agent setup for building a Phaser.js game with
Claude Code and/or GitHub Copilot.

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
3. Fill in `docs/GDD.md` with your actual game concept before asking any
   agent to implement anything.
4. `cd tools/asset-gen && npm install` (no dependencies yet, sets up the
   package), then `cp .env.example .env` and add your `OPENAI_API_KEY`.
5. Test asset generation with a dry run:
   ```
   node generate.mjs --key player-idle --category art \
     --prompt "16-bit pixel art idle frame" \
     --out ../../assets/raw/player-idle.png --dry-run
   ```

## How the team works
See `docs/SQUAD.md` for roster and coordination rules. Short version: Lead
routes work, Designer and Build Engineer can work concurrently, Reviewer
always gates QA, everyone logs handoffs in `docs/TASKS.md`.

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
