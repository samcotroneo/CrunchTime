# CrunchTime — Multi-Agent App Scaffold

A markdown-driven multi-agent setup for building apps with Claude Code
and/or GitHub Copilot. Engine-agnostic at the core; per-engine conventions
live in `engines/` (Phaser 3 and Godot 4 for games, Capacitor and React
Native for mobile apps, and more).

## Starting a new project

Requirements: Node.js ≥ 18. Nothing else.

### Option A — GitHub template (recommended)

Click **"Use this template"** on the GitHub repo page. GitHub creates a fresh
repo in your account with no CrunchTime commit history — ready to push
directly to your project remote.

Then clone your new repo locally and continue from step 1 below.

> Maintainer note: enable template mode under
> Settings → General → Template repository.

### Option B — degit (no template button needed)

```bash
npx degit samcotroneo/CrunchTime my-app
cd my-app
git init && git remote add origin <your-repo-url>
```

`degit` copies the files without git history. Good if you don't have access
to click "Use this template".

### Option C — plain clone (keeps upstream link)

```bash
git clone https://github.com/samcotroneo/CrunchTime.git my-app
cd my-app
git remote rename origin upstream
git remote add origin <your-repo-url>
```

Choose this if you want to pull scaffold updates from CrunchTime later
(see [Keeping up to date](#keeping-up-to-date)). Note: your project history
will start from the first CrunchTime commit.

---

After getting a copy, run these three steps:

1. **`node tools/setup.mjs`** — installs tool dependencies, creates
   `tools/asset-gen/.env` from the example, and verifies the `AGENTS.md`
   mirrors. Safe to re-run.

2. **`node tools/project-init/init-project.mjs`** — staged questionnaire
   that picks your engine pack (Phaser, Capacitor, React Native, Godot, …)
   and seeds `docs/SPEC.md`, `docs/ARCHITECTURE.md`, `docs/ASSETS.md`, and
   `docs/TASKS.md`. Chat-first alternative:
   `.github/chatmodes/project-init.chatmode.md`. Re-running it later
   refines the brief; switching engines restamps `docs/ARCHITECTURE.md`.

3. *(Optional)* **Asset generation** — if you'll generate assets, add your
   `OPENAI_API_KEY` to `tools/asset-gen/.env` and test with a dry run:
   ```
   node tools/asset-gen/generate.mjs \
     --manifest docs/ASSETS.md \
     --dry-run
   ```
   The default pipeline is manifest-driven batch generation (`docs/ASSETS.md`).
   Keep ad-hoc per-key generation for debugging only.

### Keeping the mirrors in sync

`AGENTS.md` is canonical; `CLAUDE.md` and `.github/copilot-instructions.md`
mirror it. After editing `AGENTS.md`, run `node tools/setup.mjs --sync` to
refresh the copies (setup warns you when they drift). Prefer symlinks?
`node tools/setup.mjs --symlinks`.

## Retrofitting an existing project

Already have a Capacitor (or other) project with working code? Use the
**retrofit flow** instead of starting from the template.

### Step 1 — add the scaffold to your repo

Clone CrunchTime into a temporary location, then copy the scaffold directories
into your existing project root:

```bash
# in a temporary location outside your project
git clone --depth 1 https://github.com/samcotroneo/CrunchTime.git /tmp/crunchtime-scaffold

# back in your existing project root — copy what you need
cp -r /tmp/crunchtime-scaffold/docs ./docs
cp -r /tmp/crunchtime-scaffold/tools ./tools
cp -r /tmp/crunchtime-scaffold/engines ./engines
cp -r /tmp/crunchtime-scaffold/.github ./.github
cp /tmp/crunchtime-scaffold/AGENTS.md ./AGENTS.md
cp /tmp/crunchtime-scaffold/CLAUDE.md ./CLAUDE.md

rm -rf /tmp/crunchtime-scaffold
```

Skip any file that already exists in your repo to avoid clobbering it.
These directories are self-contained and won't conflict with `src/` or your
existing build config.

### Step 2 — run setup and init

```bash
node tools/setup.mjs
node tools/project-init/init-project.mjs
```

The init questionnaire **re-reads whatever is already in `docs/`** and
pre-fills every prompt, so you can confirm or overwrite each answer. Select
the matching engine pack (e.g. `capacitor`). Answer the Stage 5
engine-expert questions from your existing code.

### Step 3 — archaeology pass

Run the **retrofit chatmode** (`.github/chatmodes/retrofit.chatmode.md`).
This is an Engine Expert sweep of your existing source that:

- fills `docs/ARCHITECTURE.md §Engine notes` with what is actually
  installed (plugins, auth library, state management, routing, OTA, CI)
- marks already-built features and screens as `status: implemented` in
  `docs/SPEC.md`
- catalogues existing assets in `docs/ASSETS.md`
- writes a state-of-the-world handoff entry in `docs/TASKS.md`
- files any spotted defects in `docs/BUGS.md`

The key difference from a green-field init: the questionnaire *describes*
what exists; the retrofit chatmode *discovers* implementation details the
questionnaire cannot infer; and you manually review doc statuses to
distinguish `implemented` from `ready` from `draft`.

## Keeping up to date

When CrunchTime ships scaffold improvements (new engine packs, tooling fixes,
chatmode updates), pull them into your project repo without overwriting your
product code.

### Projects created from Option C (plain clone with `upstream` remote)

```bash
git fetch upstream
git checkout -b sync/upstream-$(date +%Y%m%d)
git merge upstream/main
# resolve any conflicts, then:
node tools/setup.mjs
node tools/project-init/init-project.mjs
git push origin sync/upstream-$(date +%Y%m%d)
# open a PR to merge the sync branch into your main branch
```

### Projects created from Option A or B (template / degit — no upstream remote)

Add the CrunchTime remote first, then follow the same flow:

```bash
git remote add upstream https://github.com/samcotroneo/CrunchTime.git
git fetch upstream
git checkout -b sync/upstream-$(date +%Y%m%d)
git merge upstream/main --allow-unrelated-histories
# resolve conflicts, then:
node tools/setup.mjs
node tools/project-init/init-project.mjs
git push origin sync/upstream-$(date +%Y%m%d)
# open a PR to merge into main
```

`--allow-unrelated-histories` is only needed the first time (your repo has
no shared commit ancestry with CrunchTime).

Full conflict-resolution guidance and the agent-run checklist are in
`docs/MIGRATIONS.md`.

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

## Lead orchestration
Use `.github/chatmodes/take-the-lead.chatmode.md` when you want the Lead to
assess the current milestone, route the squad by lane, and propose the next
handoffs in `docs/TASKS.md`. Good trigger phrases include “take the lead” and
“it’s crunch time”. For lower AI-credit usage, keep it chatmode-first: let
Lead route the next one or two handoffs, reuse the docs as shared state, and
avoid spawning extra worker sessions unless the work is truly independent.

`node tools/lead/lead.mjs` is a lightweight CLI companion. It detects whether
your environment supports chatmodes and routes you to the chatmode if it does.
When chatmodes are not available it prints a textual lead brief — in-flight
work, open blockers from `docs/BUGS.md`, and aging open questions — so you can
start the next handoff without an interactive session.

### Default model policy (cost-oriented)
- Lead/coordinator work: `gpt-5.6-sol` with high reasoning effort.
- Sub-agent default: `gpt-5.6-luna`.
- Escalation path for harder sub-tasks: `gpt-5.6-sol` with medium reasoning
  effort.
- `gpt-5.6-terra` is non-default and should only be used by explicit exception.
- If runtime policy blocks preferred settings, fall back to the spawning
  agent's current model/settings.

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
