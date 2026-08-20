# Architecture
<!-- engine: react-native -->

Owned by: Build/Tooling Engineer. Update when structure changes — this is
what the App Engineer builds against.

> Stub pack: structure below is a reasonable Expo + React Native default,
> review before first real use.

## Stack
React Native, Expo, TypeScript

## Folder structure
```
src/
  screens/      one screen component per file
  components/   shared UI components
  hooks/        custom React hooks
  store/        global state (Zustand / Redux / Context)
  services/     API clients, device services
  config/       constants.ts, theme.ts — no magic numbers elsewhere
  App.tsx       root component and navigation bootstrap
assets/
  raw/          source files (generated or hand-made), not directly loaded
  build/        optimized assets loaded by the app
```

## App / scene flow
Describe screen navigation flow (Splash → Onboarding → Home → Detail, etc.)
once decided.

## State management
Describe how app state persists across screens (AsyncStorage, Zustand store,
server-side session) once decided.

## Asset pipeline
1. Source files land in `assets/raw/` (hand-made or via `tools/asset-gen/`)
2. Build Engineer optimizes them into `assets/build/`
3. App code loads only by key, defined in `docs/ASSETS.md` — never a raw
   path
