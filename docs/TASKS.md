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
**Scope changed:** yes/no (did the work drift from the SPEC/task as routed?)
**Open questions:** (for the next agent, or none)
```
New fields are optional on older entries — the retro tool treats missing
values as unknown, not zero. `changes-requested` entries are what make
rework loops countable; always log one when Reviewer sends work back.

---

### 2026-08-20 — Lead — model routing defaults
**Did:** Added a project-level model routing policy for agent orchestration in `AGENTS.md` and surfaced the same defaults in `README.md`. Defaults now specify Lead work on `gpt-5.6-sol` (high reasoning), sub-agents on `gpt-5.6-luna`, escalation to `gpt-5.6-sol` (medium reasoning), Terra as non-default, and a fallback path to the spawning agent's settings when policy/runtime restrictions block preferences.
**Why:** Keep agent quality predictable while minimizing model cost by making lightweight execution the default and defining clear escalation/fallback rules.
**Status:** ready-for-review
**Review cycles:** 0
**Scope changed:** no
**Open questions:** none

### 2026-08-19 — Product Engineer — de-game-ify core scaffold

**Did:** Removed game-specific terminology from all repo-level / core scaffold files so CrunchTime works equally well for mobile apps (and other non-game projects). Changes:
- `README.md`: neutral headline ("CrunchTime — Multi-Agent App Scaffold"), `my-app` example, "project repo" language
- `docs/SPEC.md`: generic product spec template (Category, Core value proposition, Features, Screens, Progression & polish) replacing the game GDD template
- `docs/ARCHITECTURE.md`: engine-agnostic stub (no Phaser hardcoding); project init stamps it from the chosen engine pack
- `docs/BUGS.md`: "Product Engineer" and "broken feature" instead of "Gameplay Engineer" / "broken mechanic"
- `docs/MIGRATIONS.md`: "project repo" instead of "game repo"
- `docs/ASSETS.md`: neutral example assets (`app-icon`, generic `bg-music-main`)
- `engines/phaser/SPEC.md`, `engines/godot/SPEC.md`: game-specific SPEC templates moved here; project init stamps `docs/SPEC.md` from the chosen engine pack
- `engines/react-native/`: new mobile app engine pack stub (pack.json, ARCHITECTURE.md, SPEC.md, SQUAD.md, conventions.md)
- `engines/README.md`: generalized required headings (removed `## Scene flow` / `## State management` requirement; added `SPEC.md` to pack anatomy)
- `tools/project-init/init-project.mjs`: engine-aware spec stamping; generic questionnaire for non-game engines (Category, Features, Screens, User flow); game questionnaire for Phaser/Godot; path fixed from `docs/GDD.md` → `docs/SPEC.md`

**Why:** The repo was game-only in its default state; using it for mobile apps required fighting against game terminology throughout the docs and tooling.
**Status:** done
**Review cycles:** 0
**Scope changed:** no
**Open questions:** Godot pack's SPEC.md is identical to Phaser's (both are game GDD) — needs a Godot-specific pass if desired. React Native pack is a stub — needs real conventions review before first production use.

### 2026-08-19 — Lead — lead orchestration efficiency tuning
**Did:** Tightened `.github/chatmodes/take-the-lead.chatmode.md` to read the full required doc set (`docs/ARCHITECTURE.md` and `docs/ASSETS.md` included), default to one Lead session plus one worker, favor chatmode-first routing, keep worker tasks narrowly scoped, and avoid parallel agents unless lanes are truly independent. Updated `README.md` with lightweight usage guidance.
**Why:** Multi-agent coordination can burn credits quickly; the Lead flow should bias toward milestone routing with minimal session fan-out.
**Status:** ready-for-review
**Review cycles:** 0
**Scope changed:** no
**Open questions:** none

### 2026-08-19 — Lead — lead orchestration chatmode
**Did:** Added `.github/chatmodes/take-the-lead.chatmode.md` so the Lead can read the core coordination docs, identify the active milestone, route work by squad lane/order, and propose `docs/TASKS.md` handoffs. Updated `README.md` to advertise the new flow and trigger phrases.
**Why:** The scaffold had project-init and retro entrypoints but no equivalent guided Lead mode for day-to-day milestone orchestration.
**Status:** ready-for-review
**Review cycles:** 0
**Scope changed:** no
**Open questions:** Should a later pass add a local `node tools/lead/lead.mjs` wrapper, or is the chatmode enough?

### 2026-08-17 — Lead — upstream sync migration guide
**Did:** Added `docs/MIGRATIONS.md` with an agent-oriented upstream sync playbook for game repos created from GitHub template (remote setup, sync branch flow, first-sync unrelated-history fallback, and post-merge refresh commands). Linked the guide from `README.md`.
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
