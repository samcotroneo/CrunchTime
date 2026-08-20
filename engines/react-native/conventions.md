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

### Project structure
- Screens live in `src/screens/`, one component file per screen.
- Shared UI components in `src/components/`.
- Custom hooks in `src/hooks/`.
- Global state and stores in `src/store/`.
- External API and device service wrappers in `src/services/`.
- No inline magic values — pull from `src/config/constants.ts` or `src/config/theme.ts`.
- Build: `npx expo build` (or EAS Build) produces per-platform bundles.
- Testing: `npx jest` for unit/component tests; Detox or Maestro for E2E.

### Render performance
- Wrap expensive pure components in `React.memo`. Use `useCallback` for
  handlers passed as props and `useMemo` for derived values — but only where
  profiling shows a real cost; premature memoization adds maintenance burden.
  > Source: React docs — Optimizing Performance
  > https://react.dev/learn/render-and-commit
  > Source: React Native docs — Performance overview
  > https://reactnative.dev/docs/performance

- Use `FlatList` (or `FlashList` for very long data) instead of
  `ScrollView + .map()` for lists longer than ~20 items. `FlatList` virtualises
  off-screen items; `ScrollView` renders them all up front.
  > Source: React Native docs — FlatList vs ScrollView
  > https://reactnative.dev/docs/flatlist
  > Source: Shopify FlashList — Why FlatList is slow
  > https://shopify.github.io/flash-list/docs/

### Navigation
- Prefer Expo Router (file-based routing) for new projects — it aligns with
  web routing conventions and makes deep linking work without extra
  configuration.
  > Source: Expo Router docs — Introduction
  > https://docs.expo.dev/router/introduction/

- Pass only serialisable primitives (strings, numbers) as route params. Passing
  objects silently breaks on Android's native navigation stack.
  > Source: React Navigation docs — Passing parameters
  > https://reactnavigation.org/docs/params/

### State management
- Keep server-derived state in React Query (or SWR) and UI/ephemeral state in
  Zustand. Conflating server cache with client UI state in one store leads to
  stale-data bugs and complex invalidation logic.
  > Source: TkDodo — Practical React Query
  > https://tkdodo.eu/blog/practical-react-query

### Storage
- Use `expo-secure-store` for tokens and credentials, `@react-native-async-storage/async-storage`
  for non-sensitive app preferences. Never store secrets in AsyncStorage; it is
  unencrypted on both platforms.
  > Source: Expo docs — SecureStore
  > https://docs.expo.dev/versions/latest/sdk/securestore/

### OTA updates
- Use EAS Update for over-the-air JS bundle updates between store releases.
  Configure `updates.checkAutomatically = "ON_LOAD"` and test rollback before
  shipping critical fixes.
  > Source: Expo docs — EAS Update
  > https://docs.expo.dev/eas-update/introduction/

### Native modules / bridging
- Prefer Expo SDK modules and community packages from the Expo ecosystem over
  custom native modules. Custom bridging requires separate maintenance for each
  native platform and breaks Expo Go.
  > Source: Expo docs — Using third-party libraries
  > https://docs.expo.dev/workflow/using-libraries/

### TypeScript
- Enable `"strict": true`. Use `as const` for literal union types (e.g. route
  names, action types) to prevent accidental widening to `string`.
  > Source: TypeScript docs — strict flag
  > https://www.typescriptlang.org/tsconfig#strict
