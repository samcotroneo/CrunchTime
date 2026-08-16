# Engine Packs

One folder per supported game engine. The core scaffold (`AGENTS.md`,
`docs/SQUAD.md`, `tools/`) stays engine-neutral; everything engine-specific
lives in a pack.

## Pack anatomy

```
engines/<name>/
  pack.json         { "name": "<name>", "label": "Human readable", "status": "ready|stub" }
  ARCHITECTURE.md   template stamped into docs/ARCHITECTURE.md by project init
  conventions.md    stack + coding conventions for this engine (linked from AGENTS.md)
```

`ARCHITECTURE.md` templates must include an `<!-- engine: <name> -->` marker
near the top so the init flow can detect which engine a project currently
uses, and must keep the `## Scene flow` / `## State management` /
`## Asset pipeline` headings (the init flow edits those sections in place).

## Adding a new engine

1. Copy an existing pack folder and rename it.
2. Edit `pack.json`, `ARCHITECTURE.md`, and `conventions.md` for the engine.
3. Nothing else to wire up — `tools/project-init/init-project.mjs` discovers
   packs by scanning this directory.
