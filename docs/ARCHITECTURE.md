# Architecture

Owned by: Build/Tooling Engineer. Update when structure changes — this is
what the Product Engineer builds against.

> Not yet stamped. Run `node tools/project-init/init-project.mjs` to select
> an engine pack and populate this file.

## Stack
TBD — stamped from `engines/<name>/ARCHITECTURE.md` by project init.

## Folder structure
TBD

## App / scene flow
Describe screen transitions or app flow once decided.

## State management
Describe how app state persists (local storage, shared store, server) once decided.

## Asset pipeline
1. Source files land in `assets/raw/` (hand-made or via `tools/asset-gen/`)
2. Build Engineer optimizes/packs them into `assets/build/`
3. Product code loads only by key, defined in `docs/ASSETS.md` — never a raw
   path
