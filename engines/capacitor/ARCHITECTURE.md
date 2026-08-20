# Architecture
<!-- engine: capacitor -->

Owned by: Build/Tooling Engineer. Update when structure changes — this is
what the App Engineer builds against.

> Stub pack: structure below is a reasonable Capacitor + React + Vite default.
> The Engine Expert stage of project init will tailor this to your chosen web
> framework and native feature set.

## Stack
Capacitor 6, React + Vite, TypeScript

## Folder structure
```
src/
  screens/      one screen/page component per file
  components/   shared UI components
  hooks/        custom React hooks
  store/        global state (Zustand / React Context)
  services/     API clients, Capacitor plugin wrappers
  config/       constants.ts, theme.ts — no magic values elsewhere
  main.tsx      app entry point
ios/            Capacitor-managed iOS native project (commit this)
android/        Capacitor-managed Android native project (commit this)
assets/
  raw/          source files (generated or hand-made), not directly loaded
  build/        optimised assets loaded by the app
capacitor.config.ts  Capacitor configuration
```

## App / screen flow
Describe screen navigation flow (Splash → Onboarding → Home → Detail, etc.)
once decided.

## State management
Describe how app state persists across screens (Capacitor Preferences,
Zustand store, server-side session) once decided.

## Asset pipeline
1. Source files land in `assets/raw/` (hand-made or via `tools/asset-gen/`)
2. Build Engineer optimises them into `assets/build/`
3. App code loads only by key, defined in `docs/ASSETS.md` — never a raw path

## Engine notes
Engine Expert findings go here after the project init Engine Expert stage
runs. Includes web-framework-specific patterns, native plugin choices, and
OTA update configuration for this project.
