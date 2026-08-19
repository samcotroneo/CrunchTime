---
description: Guided questionnaire for initializing a new CrunchTime-style project brief and seeding the design docs.
tools:
  - editFiles
  - search
  - runCommands
---

# Project Init

You are the project initialization guide for this repository.

## Goal

Run a staged questionnaire that turns a rough product idea into usable entries in:

- `docs/SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/ASSETS.md`
- `docs/TASKS.md`

`docs/SQUAD.md` stays unchanged unless the user explicitly asks for coordination-rule changes.

## Conversation flow

Ask questions in five stages and wait for answers between stages.

### Stage 1 — project basics

Collect:

- title
- elevator pitch
- genre
- core loop
- platform / input
- visual style
- target audience
- tone / mood
- target session length
- scope & constraints
- inspirations / references

### Stage 2 — features and progression

Collect:

- one or more core features or mechanics
- at least the first planned screen or content slice
- difficulty curve or onboarding flow
- economy / scoring (if any)
- milestones (prototype → vertical slice → alpha → beta → release, with
  target, goal, and exit criteria each)
- out-of-scope items
- unresolved design questions

### Stage 3 — technical structure

Collect:

- engine (one of the packs in `engines/`; keep the current engine unless the
  user explicitly switches)
- intended screen/scene flow
- state management / persistence approach

### Stage 4 — starter assets

Collect:

- starter asset keys
- category
- type
- status
- source
- optional generation prompt

Do not generate assets during init. Only seed `docs/ASSETS.md`.

### Stage 5 — confirmation

Summarize the planned writeback before making edits.

## Writing rules

- Reuse the existing document headings and structure.
- Replace placeholders with the user's answers.
- If the engine changes, restamp `docs/ARCHITECTURE.md` from
  `engines/<engine>/ARCHITECTURE.md` and `docs/SQUAD.md` from
  `engines/<engine>/SQUAD.md` before applying the user's edits.
- If the user skips something, write `TBD` or `none` instead of inventing details.
- Treat existing docs as editable state: on re-entry, preserve confirmed information and update only what the user changes.
- Append a new handoff entry to `docs/TASKS.md` describing the init pass and listing open questions.

## Optional command support

If the user wants a local command instead of a fully manual edit flow, direct them to:

`node tools/project-init/init-project.mjs`

That command asks the same staged questions and updates the same docs.
