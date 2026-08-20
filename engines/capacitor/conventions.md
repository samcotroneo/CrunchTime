# Capacitor — stack & conventions

> Stub pack: conventions below are a starting point. The Engine Expert stage
> of project init will ask about your web framework and native features, then
> populate `docs/ARCHITECTURE.md` with project-specific guidance.

## Stack
- Runtime: Capacitor 6
- Web layer: React + Vite (default; Vue, Angular, and vanilla also supported)
- Language: TypeScript
- Native: iOS (Xcode) + Android (Android Studio) via Capacitor native projects
- Package manager: npm

## Conventions

### Project structure
- Web source in `src/` (framework-specific layout, see your `docs/ARCHITECTURE.md`).
- Capacitor config at `capacitor.config.ts` (or `.json`) in the repo root.
- Native projects in `ios/` and `android/` — do not hand-edit generated files;
  use `npx cap sync` to propagate web build + plugin changes.
- No inline magic values — pull from `src/config/constants.ts`.

### Capacitor sync discipline
- Always run `npx cap sync` after `npm run build` before opening the native
  project. Stale native builds that don't match the web bundle are the most
  common source of "works in browser, breaks on device" bugs.
  > Source: Capacitor docs — Deploying to Native
  > https://capacitorjs.com/docs/basics/workflow

### Plugin selection
- Prefer official `@capacitor/*` plugins over community alternatives where they
  exist (Camera, Filesystem, Preferences, Push Notifications, etc.). Official
  plugins are versioned and tested against each Capacitor major.
  > Source: Capacitor docs — Official plugins
  > https://capacitorjs.com/docs/plugins

- For community plugins, pin exact versions in `package.json` (`"1.2.3"` not
  `"^1.2.3"`). Plugin authors frequently introduce breaking native changes in
  minor bumps.
  > Source: Capacitor Community — Plugin quality guidelines
  > https://github.com/capacitor-community

### Secure storage
- Never store tokens or credentials in `localStorage` or `sessionStorage`.
  Use `@capacitor/preferences` for non-sensitive config, and a native secure
  enclave plugin (`@capacitor/secure-storage` or `capacitor-native-biometric`)
  for credentials.
  > Source: OWASP Mobile Security — Insecure Data Storage (M2)
  > https://owasp.org/www-project-mobile-top-10/
  > Source: Capacitor Preferences docs
  > https://capacitorjs.com/docs/apis/preferences

### Web view behaviour
- Set `server.androidScheme = 'https'` in `capacitor.config.ts`. Running on
  `http://localhost` on Android triggers mixed-content restrictions and breaks
  some Web APIs (e.g. Clipboard, WebAuthn).
  > Source: Capacitor docs — Configuration
  > https://capacitorjs.com/docs/config

- Keep the `Content-Security-Policy` meta tag in `index.html` restrictive.
  Capacitor apps run in a full-privilege WKWebView/WebView; XSS in a Capacitor
  app can access native bridge methods.
  > Source: Capacitor docs — Security
  > https://capacitorjs.com/docs/guides/security

### Native project hygiene
- Commit `ios/` and `android/` to version control. Treating them as generated
  output means losing native plugin configurations on clean checkouts.
  > Source: Capacitor docs — Committing Native Project Code
  > https://capacitorjs.com/docs/basics/workflow#committing-your-native-project

- Add `ios/App/Pods/`, `android/.gradle/`, and `android/build/` to
  `.gitignore`. Pods and Gradle caches are large, reproducible, and must not
  be committed.
  > Source: Capacitor community best practices
  > https://capacitorjs.com/docs/getting-started/environment-setup

### TypeScript
- Enable `"strict": true`. Use typed wrappers around Capacitor plugin calls so
  that platform-specific return shapes are caught at compile time.
  > Source: TypeScript docs — strict flag
  > https://www.typescriptlang.org/tsconfig#strict

### OTA updates
- If using live updates, gate them behind a feature flag and always test
  rollback before shipping. Live update failures that leave users on a broken
  bundle with no rollback path require a full app store release to fix.
  > Source: Capawesome Live Update docs
  > https://capawesome.io/plugins/live-update/
  > Source: Ionic Appflow docs
  > https://ionic.io/docs/appflow/deploy/intro
