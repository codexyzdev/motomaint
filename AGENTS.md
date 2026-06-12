# AGENTS.md

Single-package Next.js 16 PWA. **Use `pnpm`**, not npm/yarn (lockfile and `vercel.json` assume pnpm).

## Commands

| Task | Command | Notes |
|---|---|---|
| Dev server | `pnpm dev` | Listens on **port 1234** (`next dev --port 1234` in `package.json`). The README's `localhost:3000` is wrong. |
| Build | `pnpm build` | |
| Start (prod) | `pnpm start` | |
| Lint | `pnpm lint` | `eslint` (flat config, extends `eslint-config-next`). |
| Test (watch) | `pnpm test` | Vitest, jsdom env, see `__tests__/setup.ts`. |
| Test (CI) | `pnpm test:coverage` | v8 coverage. |

There is **no typecheck script** — `next build` (or your editor's TS server) is the type check.

## Architecture

- `app/` — Next.js App Router. Routes: `/` (splash gate → onboarding/dashboard), `/settings`. `app/layout.tsx` wires `Providers` → `ErrorBoundary` → `ThemeProvider` → `ToastProvider` → `SyncProvider`.
- `components/` — grouped by feature: `dashboard/`, `onboarding/`, `settings/`, `ui/`. Top-level `GoogleLoginButton.tsx`, `SyncProvider.tsx`, `SyncStatus.tsx` are app-wide wiring.
- `lib/` — domain code. **Read these before touching anything else:**
  - `data.ts` — single API surface (`data.getMoto`, `data.saveMoto`, `data.addRecord`, `data.exportAll`, …). Everything else in the app should go through `data.*`; don't reach into `storage` directly.
  - `storage.ts` — localStorage adapter. All keys are prefixed with `motomaint:`. Replace this file to change the backend.
  - `engine.ts` — **pure** functions (`computeServicesStatus`, `formatServiceStatus`, `getMainProgress`). No React, no localStorage. Safe to unit-test in isolation.
  - `types.ts` — `Moto`, `TipoServicio`, `Registro`, `Ajustes`, `BackupPayload` (versioned, current `version: 1`).
  - `dataEvents.ts` — pub-sub: `emitDataChanged()` / `onDataChanged(cb)`. Every write in `data.ts` emits; components subscribe to refresh. Use this instead of prop-drilling refresh signals.
  - `authEvents.ts` — pub-sub for auth state: `notifyAuthChange(bool)` / `subscribeAuthChange(cb)`.
  - `useAuthStatus.ts` — React 19 hook (`useSyncExternalStore`) that returns `{ isAuthenticated, hasValidToken }` reactively. Use this in any client component that needs to react to login/logout.
  - `googleAuth.ts` — Google OAuth token storage (implicit flow, localStorage). `saveAccessToken`, `loadAccessToken`, `clearAccessToken`, `getAuthState`, `getValidAccessToken`. No server-side exchange; tokens are received directly from Google via the implicit flow.
  - `googleDrive.ts` — Google Drive API client (`uploadBackup`, `downloadBackup`, `findOrCreateFolder`, `findBackupFile`, `getLastBackupInfo`). Reads token from `googleAuth.ts`. All calls are client-side; no backend.
  - `globalSync.ts` — auto-sync orchestrator. `initAutoSync()` mounts a `onDataChanged` listener that pushes to Drive after a 3s debounce, and a `subscribeAuthChange` listener that pulls from Drive on login if the cloud backup is newer than local. Mounted once by `components/SyncProvider.tsx`.
- `app/providers.tsx` — `GoogleOAuthProvider` from `@react-oauth/google`. **No** NextAuth, **no** SessionProvider, **no** server-side auth.

## Auth & Google Drive

**Single stack**: `@react-oauth/google` (implicit OAuth flow). There is no server-side auth — no `next-auth`, no `app/api/auth/*`, no `client_secret` in `.env`.

- `components/GoogleLoginButton.tsx` uses `useGoogleLogin({ scope: 'drive.file' })` to get an `access_token` directly from Google, saves it to `localStorage` via `googleAuth.ts`, and notifies `authEvents`.
- `components/SyncProvider.tsx` (in `app/layout.tsx`) kicks off `initAutoSync()`, which:
  - **On data change** (`onDataChanged`): debounces 3s, then calls `googleDrive.uploadBackup()`.
  - **On auth change** (`subscribeAuthChange(true)`): calls `googleDrive.downloadBackup()` and, if the cloud `exportedAt` is newer than local, calls `data.importAll()` + `emitDataChanged()` to restore.
  - **On tab hidden / beforeunload**: force-sync any pending changes.
- The `access_token` lives ~1h. When it expires, the next Drive call gets a 401, `googleDrive.ts` clears the token via `clearAccessToken()`, and the user is prompted to re-login from settings.
- Backup file: `motomaint-backup.json` in a Drive folder named `MotoMaint`. Backup payload schema is `BackupPayload` in `lib/types.ts` (`version: 1` — bump and migrate if changing shape).

## Environment

`.env` is gitignored *and* currently tracked locally with real secrets — **do not commit changes to it, and don't paste it anywhere**. The only required var is `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. The legacy `AUTH_*`, `GOOGLE_CLIENT_SECRET`, and `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` vars in `.env` are no longer used and can be removed (but again, don't commit the change).

## Storage

- **localStorage**, not IndexedDB — the README is stale. The schema is versioned JSON blobs keyed under `moto`, `serviceTypes`, `history`, `settings` (see `KEYS` in `lib/data.ts`). The Google access token is keyed under `motomaint:google_access_token` in `lib/googleAuth.ts`.
- Default service catalog lives in `DEFAULT_SERVICES` in `lib/data.ts`. New users get it auto-seeded on first `getServices()` call.

## Style and conventions

- **Path alias is `@/*` → `./*` (project root)**, not `./src/*`. Both `tsconfig.json` and `vitest.config.ts` agree on this.
- **TypeScript strict**, `target: ES2017`. No `any`-by-default culture.
- **shadcn/ui, new-york style.** Add primitives with `npx shadcn@latest add <component>`; they land in `components/ui/`. `lib/utils.ts` is the `cn` helper.
- **Tailwind v4** via `@tailwindcss/postcss` (no `tailwind.config.js` — config lives in `app/globals.css`).
- UI strings and metadata are **Spanish (es-CO)** by default (`lang="es"`, OpenGraph `locale: 'es_CO'`). Keep new copy consistent.
- No comments in code unless asked.
- For React state that mirrors an external source (localStorage, custom pub-sub), prefer `useSyncExternalStore` over `useState` + `useEffect` — the React 19 eslint rule `react-hooks/set-state-in-effect` will reject the latter.

## Testing

- No real tests are checked in yet — `__tests__/setup.ts` is the only file in `__tests__/`. Put new tests in `__tests__/**/*.test.{ts,tsx}`.
- The setup installs a fresh in-memory `localStorage` polyfill and clears it in `beforeEach`. Tests that touch `data.*` will go through the real storage adapter against this mock.
- Pure modules in `lib/engine.ts` are the easiest place to start; `lib/data.ts` works too but you'll want to assert on the `dataEvents` event after writes.

## Repo quirks

- **`pnpm-workspace.yaml` exists but is not a monorepo** — it only declares `allowBuilds`/`onlyBuiltDependencies`/`ignoredBuiltDependencies` for native packages. There are no workspace packages. Don't add `apps/*` or `packages/*` globs to it.
- **Stale deletion in `git status`:** `app-example-google-drive/Ahorro-Compartido-2026` shows as a deleted file. Stage and drop it; it's an old example scaffold.
- **Vercel deploy:** `vercel.json` pins `pnpm install` / `pnpm build`. Don't switch package managers without updating it.
- **Skills:** `.agents/skills/` and `.kiro/skills/` contain installed skill packs (Next.js, React, accessibility, etc.). Load them via the `skill` tool when relevant rather than re-deriving the conventions.
- **PWA:** `app/manifest.ts` is the source of truth (icons, theme color `#0c1118`). `public/` holds the actual icon assets.
- **Pre-existing lint errors:** there are React 19 `react-hooks/set-state-in-effect` and `react-hooks/refs` violations in `components/dashboard/DashboardView.tsx`, `components/dashboard/MotoCard.tsx`, `components/settings/SettingsView.tsx`, and `app/page.tsx`. These predate the Google auth refactor — don't try to "fix" them as part of unrelated work, and don't add new instances of the pattern.

## Reference docs

- `README.md` — user-facing; **stale** in places (storage type, dev port, mentions IndexedDB). Don't use it as a source of truth for setup details.
- `components.json` — shadcn config; read before adding primitives.
- [@react-oauth/google docs](https://github.com/MomenSherif/react-oauth/tree/master/packages/@react-oauth/google) — the auth library this app uses. `useGoogleLogin` returns an `access_token` directly (implicit flow); `GoogleLogin` is the prebuilt button that returns an `id_token` (NOT useful for Drive API calls).
