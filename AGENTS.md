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
- `components/` — grouped by feature: `dashboard/`, `onboarding/`, `settings/`, `ui/`. Top-level `SyncProvider.tsx`, `DriveSyncBootstrap.tsx`, `GoogleLoginButton.tsx`, `SyncStatus.tsx` are app-wide wiring.
- `lib/` — domain code. **Read these before touching anything else:**
  - `data.ts` — single API surface (`data.getMoto`, `data.saveMoto`, `data.addRecord`, `data.exportAll`, …). Everything else in the app should go through `data.*`; don't reach into `storage` directly.
  - `storage.ts` — localStorage adapter. All keys are prefixed with `motomaint:`. Replace this file to change the backend.
  - `engine.ts` — **pure** functions (`computeServicesStatus`, `formatServiceStatus`, `getMainProgress`). No React, no localStorage. Safe to unit-test in isolation.
  - `types.ts` — `Moto`, `TipoServicio`, `Registro`, `Ajustes`, `BackupPayload` (versioned, current `version: 1`).
  - `dataEvents.ts` — pub-sub: `emitDataChanged()` / `onDataChanged(cb)`. Every write in `data.ts` emits; components subscribe to refresh. Use this instead of prop-drilling refresh signals.
- `auth.ts` (root) — NextAuth v5 config with the Google provider, `drive.file` scope, and a custom JWT callback that handles token refresh.
- `app/api/auth/[...nextauth]/route.ts` — re-exports the NextAuth handlers.
- `app/api/auth/callback/route.ts` — **looks like dead code** (POST handler, not wired to any client). Don't add to it without verifying the caller; check git history first.

## Storage

- **localStorage**, not IndexedDB — the README is stale. The schema is versioned JSON blobs keyed under `moto`, `serviceTypes`, `history`, `settings` (see `KEYS` in `lib/data.ts`).
- Default service catalog lives in `DEFAULT_SERVICES` in `lib/data.ts`. New users get it auto-seeded on first `getServices()` call.

## Auth & Drive sync

Two parallel stacks coexist and are easy to confuse:

1. **NextAuth v5** (`auth.ts` at root) — used for the Google login button flow and exposes `session.accessToken` via `useSession()`. The `DriveSyncBootstrap` component consumes this token to download/upload the backup file on login.
2. **`@react-oauth/google`** client provider — set up in `app/providers.tsx`. Provides the `useGoogleLogin` hook used by `components/GoogleLoginButton.tsx`.

Correspondingly there are two Drive implementations:
- `lib/drive.ts` — uses NextAuth session access token (the one currently wired in via `DriveSyncBootstrap`).
- `lib/googleDrive.ts` + `lib/googleAuth.ts` — uses `@react-oauth/google` tokens in localStorage; appears to be the older path and is still referenced by some components.

Backup file: `motomaint-backup.json` in a Drive folder named `MotoMaint`. Backup payload schema is `BackupPayload` in `lib/types.ts` (`version: 1` — bump and migrate if changing shape).

## Environment

`.env` is gitignored *and* currently tracked locally with real secrets — **do not commit changes to it, and don't paste it anywhere**. Required vars:

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:1234` (must match the dev port)
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`

## Style and conventions

- **Path alias is `@/*` → `./*` (project root)**, not `./src/*`. Both `tsconfig.json` and `vitest.config.ts` agree on this.
- **TypeScript strict**, `target: ES2017`. No `any`-by-default culture.
- **shadcn/ui, new-york style.** Add primitives with `npx shadcn@latest add <component>`; they land in `components/ui/`. `lib/utils.ts` is the `cn` helper.
- **Tailwind v4** via `@tailwindcss/postcss` (no `tailwind.config.js` — config lives in `app/globals.css`).
- UI strings and metadata are **Spanish (es-CO)** by default (`lang="es"`, OpenGraph `locale: 'es_CO'`). Keep new copy consistent.
- No comments in code unless asked.

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

## Reference docs

- `SPEC.md` — current spec for the Google Drive cloud sync feature (data model, sync flow, env vars). Trust this over `README.md` for sync-related decisions.
- `README.md` — user-facing; **stale** in places (storage type, dev port). Don't use it as a source of truth for setup details.
- `components.json` — shadcn config; read before adding primitives.
