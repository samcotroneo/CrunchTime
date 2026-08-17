# Tasks & Handoff Log

Append-only. Every agent adds an entry when it finishes a unit of work.
Newest entries at the top.

## Format
```
### [date] — [agent] — [feature/area]
**Did:** what changed
**Why:**
**Status:** changes-requested | ready-for-review | reviewed | ready-for-qa | done
**Review cycles:** 0 (times Reviewer sent this back; increments per changes-requested round)
**Scope changed:** yes/no (did the work drift from the GDD/task as routed?)
**Open questions:** (for the next agent, or none)
```
New fields are optional on older entries — the retro tool treats missing
values as unknown, not zero. `changes-requested` entries are what make
rework loops countable; always log one when Reviewer sends work back.

---

### 2026-08-17 — Lead — upstream sync migration guide
**Did:** Added `/home/runner/work/CrunchTime/CrunchTime/docs/MIGRATIONS.md` with an agent-oriented upstream sync playbook for game repos created from GitHub template (remote setup, sync branch flow, first-sync unrelated-history fallback, and post-merge refresh commands). Linked the guide from `README.md`.
**Why:** Teams need a repeatable, low-conflict way to pull scaffold updates into existing game repos.
**Status:** ready-for-review
**Review cycles:** 0
**Scope changed:** no
**Open questions:** Should we also add a `degit`/history-less migration track in the same doc, or keep this guide template-focused?

### 2026-08-17 — Build Engineer — robust asset-gen pipeline
**Did:** Rebuilt `tools/asset-gen` around manifest-driven batch generation from `docs/ASSETS.md`, added a structured brief schema (`brief_*`) and output contract (`output_*`), deterministic layered prompt assembly, bounded retry/critique loop, provenance sidecars (`.meta.json`), validation + quality gates, partial-run continuation, `.env` auto-load, and updated provider contracts. Added reference image support end-to-end (`reference_images` schema, debug flag, OpenAI edits path with MIME detection). Updated `docs/ASSETS.md` and `README.md` with new workflow and migration guidance from legacy `generation` prompts.
**Why:** Per-key ad-hoc prompting produced inconsistent results; the pipeline needed stronger structure, reproducibility, and robustness for production usage.
**Status:** ready-for-review
**Review cycles:** 0
**Scope changed:** no
**Open questions:** Should we add a dedicated audio provider next so `bg-music-main` can run through the same robust flow instead of being skipped when `AUDIO_PROVIDER` is unset?

### 2026-08-16 — Lead — setup experience
**Did:** Fixed broken onboarding pieces (added `.gitignore` covering `.env`, created the missing `tools/asset-gen/.env.example` and `.github/copilot-instructions.md` mirror), added `tools/setup.mjs` bootstrap (node check, tool installs, `.env` creation, mirror drift detection with `--sync`/`--symlinks` repair), and rewrote the README setup as a quickstart covering template-repo, degit, and clone paths.
**Why:** The old setup had steps referencing files that didn't exist and manual copy/symlink work; onboarding should be three commands.
**Status:** ready-for-review
**Review cycles:** 0
**Scope changed:** no
**Open questions:** "Use this template" requires flipping the repo setting on GitHub — not doable from the repo itself.

### 2026-08-16 — Lead — lifecycle gaps: milestones, bugs, releases
**Did:** Added a `## Milestones` section to `docs/GDD.md` (wired through the project-init flow and chatmode), created `docs/BUGS.md` (severity scheme + open→in-progress→fixed→verified lifecycle), and added release management: `docs/RELEASES.md` (milestone-mapped versioning + checklist) with `tools/release/release.mjs` generating `CHANGELOG.md` from completed TASKS.md entries. Updated SQUAD lanes/access, engine pack build/export notes, README, and EVAL.md (release health metric).
**Why:** The scaffold covered design→build→review→QA→retro but had no milestone structure, no defect tracking, and no path from "built" to "shipped".
**Status:** ready-for-review
**Review cycles:** 0
**Scope changed:** no
**Open questions:** Release health (open blocker/major bugs) is manual in EVAL.md — worth teaching retro.mjs to parse BUGS.md once real bug data exists?

### 2026-08-16 — Lead — evaluation loop
**Did:** Added `docs/EVAL.md` (effectiveness rubric: rework rate, review cycles, open-question aging, throughput, scope drift), extended the `docs/TASKS.md` entry format with Review cycles / Scope changed fields and a `changes-requested` status, built `tools/retro/retro.mjs` to score the log, and added `.github/chatmodes/retro.chatmode.md` for guided retros.
**Why:** Evaluation needs to be baked into the workflow so the project structure keeps improving; the handoff log now doubles as the metrics data source.
**Status:** ready-for-review
**Review cycles:** 0
**Scope changed:** no
**Open questions:** Targets in EVAL.md are starting heuristics — revisit after the first real retro cycle.

### 2026-08-16 — Lead — multi-engine support
**Did:** Added engine packs under `engines/` (phaser ready, godot stub), taught `tools/project-init/init-project.mjs` and the project-init chatmode to pick an engine and restamp `docs/ARCHITECTURE.md` from the pack template when it changes, and made `AGENTS.md`/`CLAUDE.md` engine-neutral (engine conventions now live in `engines/<engine>/conventions.md`).
**Why:** The scaffold was Phaser-specific; engine packs let new engines (and their skills) be added as drop-in folders without touching the core scaffold.
**Status:** ready-for-review
**Open questions:** Godot pack content is a stub — needs a Godot-experienced pass before first real use. Should engine packs also own per-engine skills/chatmodes, or keep those global?

### 2026-08-16 — Lead — project init flow
**Did:** Added a staged project-init questionnaire via `.github/chatmodes/project-init.chatmode.md` and `tools/project-init/init-project.mjs`, then documented the workflow in `README.md`.
**Why:** New projects need a repeatable way to turn initial answers into seeded design docs before implementation work begins.
**Status:** ready-for-review
**Open questions:** none

### 2026-08-16 — Lead — placeholder cleanup
**Did:** Removed the empty placeholder files `docs/Init.txt`, `tools/Init.txt`, and `tools/asset-gen/providers/Init.txt`.
**Why:** These files were unnecessary scaffolding leftovers and can be safely removed.
**Status:** ready-for-review
**Open questions:** none

### Example — Lead — Project setup
**Did:** Initialized agent team structure and docs.
**Why:** Establish shared conventions before feature work starts.
**Status:** done
**Open questions:** none
