# Engine Packs

One folder per supported engine or platform. The core scaffold (`AGENTS.md`,
`docs/SQUAD.md`, `tools/`) stays engine-neutral; everything engine-specific
lives in a pack.

## Pack anatomy

```
engines/<name>/
  pack.json         { "name": "<name>", "label": "Human readable", "status": "ready|stub" }
  ARCHITECTURE.md   template stamped into docs/ARCHITECTURE.md by project init
  SPEC.md           template stamped into docs/SPEC.md by project init (optional; falls back to generic)
  SQUAD.md          template stamped into docs/SQUAD.md by project init (domain-specific role names)
  conventions.md    stack + coding conventions for this engine (linked from AGENTS.md)
```

`ARCHITECTURE.md` templates must include an `<!-- engine: <name> -->` marker
near the top so the init flow can detect which engine a project currently
uses, and must keep the `## Stack` heading. All other section headings are
pack-defined. Packs that support the architecture questionnaire (screen flow,
state management) should include `## Scene flow`, `## State management`, and
`## Asset pipeline` headings — the init flow edits those sections in place
when present.

`SPEC.md` templates let a pack provide domain-specific product spec sections
(e.g. Mechanics + Levels for game engines, Features + Screens for app
engines). If a pack omits `SPEC.md`, the generic `docs/SPEC.md` template is
left in place unchanged.

`SQUAD.md` templates restore the domain-specific role names and terminology
appropriate for the engine (e.g. "Gameplay Engineer" and "Playtesting" for
game engines; "App Engineer" and "User testing" for mobile app engines).
The shared `docs/SQUAD.md` in a project is stamped from this template at
init time — edit the template here to change defaults for new projects.

## Adding a new engine

1. Copy an existing pack folder and rename it.
2. Edit `pack.json`, `ARCHITECTURE.md`, `SPEC.md`, and `conventions.md` for the engine.
3. Nothing else to wire up — `tools/project-init/init-project.mjs` discovers
   packs by scanning this directory.
