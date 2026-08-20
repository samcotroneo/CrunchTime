# React Native (Expo) — stack & conventions

> Stub pack: conventions below are a starting point, review before first
> real use.

## Stack
- Framework: React Native with Expo
- Language: TypeScript
- Navigation: Expo Router (file-based) or React Navigation
- State: Zustand (recommended) or React Context
- Package manager: npm or yarn

## Conventions
- Screens live in `src/screens/`, one component file per screen.
- Shared UI components in `src/components/`.
- Custom hooks in `src/hooks/`.
- Global state and stores in `src/store/`.
- External API and device service wrappers in `src/services/`.
- No inline magic values — pull from `src/config/constants.ts` or `src/config/theme.ts`.
- Build: `npx expo build` (or EAS Build) produces per-platform bundles.
- Testing: `npx jest` for unit/component tests; Detox or Maestro for E2E.
