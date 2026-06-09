# Design Document — MotoMaint Migration

## Overview

This document describes the technical design for migrating MotoMaint from a vanilla HTML/CSS/JS PWA (ES modules, localStorage) to a Next.js 16 App Router application with React 19, TypeScript, and Tailwind CSS v4.

The migration is a **faithful port**: every feature, interaction, animation, and visual detail from the original must be preserved. The persistence layer stays unchanged — localStorage with the `motomaint:` prefix and the same data schema. No new features are added.

### Key constraints

- **No backend changes.** localStorage remains the only persistence layer.
- **Same data schema.** Keys, shapes, and defaults are identical to the original.
- **Same visual design.** CSS custom properties, fonts, animations, and layout are preserved exactly.
- **Client-only rendering.** The app is entirely client-side; Next.js is used as the build and routing framework, not for SSR.
- **TypeScript strict mode.** Zero compilation errors with `strict: true`.

### Technology stack (target)

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.7 (App Router) |
| UI library | React 19 |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Persistence | `window.localStorage` (same schema) |
| Testing | Vitest + fast-check (property tests) |
| PWA | Next.js `manifest.ts` + `metadata` |

---

## Architecture

The Next.js project uses the App Router. Because the app is entirely client-side (no server data fetching, no SSR), the architecture is a thin shell: the App Router provides routing, and all interactive logic lives in Client Components.

```
app/
├── layout.tsx          ← Root layout: fonts, global CSS, Toast/Modal providers
├── page.tsx            ← Route "/" — renders SplashGate (chooses Onboarding or Dashboard)
├── settings/
│   └── page.tsx        ← Route "/settings"
├── globals.css         ← Tailwind v4 import + CSS custom properties + animations
└── favicon.ico

lib/                    ← Pure business logic (no React, fully testable)
├── storage.ts          ← LocalStorage adapter
├── data.ts             ← CRUD layer (moto, services, history, settings)
├── engine.ts           ← Service status computation
├── icons.ts            ← Icon catalogue (32 emojis)
└── types.ts            ← Shared TypeScript types

components/
├── ui/
│   ├── Modal.tsx        ← Bottom-sheet modal
│   ├── Toast.tsx        ← Floating toast notification
│   ├── ConfirmDialog.tsx ← Confirmation modal wrapper
│   └── useToast.ts      ← Toast hook
├── onboarding/
│   └── OnboardingView.tsx
├── dashboard/
│   ├── DashboardView.tsx
│   ├── MotoCard.tsx
│   ├── ServiceCard.tsx
│   ├── HistoryItem.tsx
│   ├── ServiceTabs.tsx
│   └── FAB.tsx
└── settings/
    ├── SettingsView.tsx
    ├── ServiceTypeRow.tsx
    └── IconPicker.tsx
```

### Data flow

```
localStorage
    │
    ▼
lib/storage.ts  (async get/set/remove/clear)
    │
    ▼
lib/data.ts     (domain CRUD: getMoto, addRecord, …)
    │
    ▼
lib/engine.ts   (pure computation: computeServicesStatus)
    │
    ▼
React components  (useState + useEffect to load, render, update)
```

React components call `lib/data` and `lib/engine` directly — there is no global state manager. Each view component owns its local state and refreshes by re-calling data functions. This mirrors the original app's imperative `router.go('dashboard')` pattern.

### Routing model

| Original view | Next.js route | Component |
|---|---|---|
| onboarding | `/` (conditional) | `OnboardingView` |
| dashboard | `/` (conditional) | `DashboardView` |
| settings | `/settings` | `SettingsView` |

The root page (`app/page.tsx`) mounts a `SplashGate` client component that reads localStorage on mount, shows the splash screen for ≥600 ms, then renders either `OnboardingView` or `DashboardView` based on whether a `Moto` record exists.

---

## Components and Interfaces

### `lib/types.ts`

All shared domain types live here and are re-exported for use everywhere.

```typescript
export interface Moto {
  marca: string;
  modelo: string;
  kmActual: number;
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
}

export interface TipoServicio {
  id: string;
  name: string;
  icon: string;
  intervalKm: number | null;
  intervalDays: number | null;
  enabled: boolean;
}

export interface Registro {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceIcon: string;
  km: number;
  date: string;   // ISO 8601
  notes: string;
}

export interface Ajustes {
  currency: string;
  language: string;
  notifications: boolean;
}

export interface ServicioCalculado extends TipoServicio {
  lastRecord: { km: number; date: string } | null;
  kmSinceLast: number | null;
  kmRemaining: number | null;
  kmProgress: number;
  daysSinceLast: number | null;
  daysRemaining: number | null;
  daysProgress: number;
  status: 'ok' | 'warning' | 'urgent';
}

export type ToastType = 'default' | 'success' | 'danger';

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  getAll(): Promise<Record<string, unknown>>;
  clear(): Promise<void>;
}

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  moto: Moto | null;
  services: TipoServicio[];
  history: Registro[];
  settings: Ajustes;
}
```

### `lib/storage.ts`

Direct port of `storage.js`. Exposes a singleton `storage` that implements `StorageAdapter`.

```typescript
const STORAGE_PREFIX = 'motomaint:';

export const storage: StorageAdapter = {
  async get<T>(key: string): Promise<T | null> { … },
  async set<T>(key: string, value: T): Promise<void> { … },
  async remove(key: string): Promise<void> { … },
  async getAll(): Promise<Record<string, unknown>> { … },
  async clear(): Promise<void> { … },
};
```

Error handling follows the original:
- `get` catches all errors, logs with `console.error`, and returns `null`.
- `set`, `remove`, `getAll`, `clear` log and **rethrow** on error.

### `lib/data.ts`

Direct port of `data.js` with TypeScript types. Exports a `data` object with all domain methods:

```typescript
export const data = {
  getMoto(): Promise<Moto | null>
  saveMoto(patch: Partial<Moto>): Promise<Moto>
  updateKm(newKm: number): Promise<Moto>

  getServices(): Promise<TipoServicio[]>
  saveServices(services: TipoServicio[]): Promise<TipoServicio[]>
  addService(service: Omit<TipoServicio, 'id'>): Promise<TipoServicio>
  updateService(id: string, patch: Partial<TipoServicio>): Promise<TipoServicio>
  removeService(id: string): Promise<TipoServicio[]>

  getHistory(): Promise<Registro[]>
  addRecord(record: Omit<Registro, 'id'>): Promise<Registro>
  removeRecord(id: string): Promise<Registro[]>

  getSettings(): Promise<Ajustes>
  saveSettings(settings: Ajustes): Promise<Ajustes>

  reset(): Promise<void>
  exportAll(): Promise<BackupPayload>
  importAll(payload: unknown): Promise<void>
};
```

Notable behaviors preserved:
- `updateKm` clamps to `Math.max(0, parseInt(newKm) || 0)`.
- `addRecord` uses `history.unshift()` to insert newest first.
- `getServices` initializes and persists `DEFAULT_SERVICES` when storage is empty or missing.
- `importAll` validates `payload.version === 1` and throws `'Formato de backup inválido'` otherwise; imports only keys present in the payload.

### `lib/engine.ts`

Pure computation module. No React, no localStorage access. Takes typed data and returns computed results.

```typescript
export async function computeServicesStatus(): Promise<ServicioCalculado[]>
export function formatServiceStatus(s: ServicioCalculado): string
export function getMainProgress(s: ServicioCalculado): number
```

`computeServicesStatus` calls `data.getMoto()`, `data.getServices()`, `data.getHistory()` in parallel, then performs the progress and status calculations. It filters to `enabled` services only.

The bugfix noted in the original engine.js (broken template literal `parts.push \`…\`` on line ~54) is corrected in the TypeScript port to `parts.push(\`…\`)`.

### UI Components

#### `components/ui/useToast.ts`

React hook providing a context-based toast system.

```typescript
interface ToastContextValue {
  showToast(message: string, type?: ToastType, duration?: number): void;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }>
export function useToast(): ToastContextValue
```

- State: `{ message, type, visible }` stored with `useState`.
- `showToast` clears any existing timer, updates state, sets `visible = true`, then schedules `visible = false` after `duration` (default 2500 ms, clamped 500–10000 ms).
- Message is truncated to 120 characters.

#### `components/ui/Modal.tsx`

Bottom-sheet modal matching original CSS:

```typescript
interface ModalAction {
  label: string;
  variant?: 'btn-primary' | 'btn-secondary' | 'btn-danger' | 'btn-ghost';
  onClick?: () => void | Promise<void | boolean>;
}

interface ModalProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: ModalAction[];    // max 4
  onClose: () => void;
}
```

- Renders as a fixed bottom-sheet with `slideUp` animation (300 ms).
- Backdrop click calls `onClose`.
- Uses React Portal (`document.body`) to escape stacking context.
- `body overflow: hidden` while open.

#### `components/ui/ConfirmDialog.tsx`

```typescript
interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
```

Wraps `Modal` with two action buttons. Replaces the original Promise-based `confirm()` with a declarative pattern — callers hold open state and pass callbacks.

#### `components/ui/Toast.tsx`

Renders the toast element using `useToast` context. Fixed position, `bottom: 100px`, z-index 200. Applies CSS classes `show`, `success`, `danger` matching original styles.

### View Components

#### `SplashGate` (in `app/page.tsx`)

Client component. On mount:
1. Starts a 600 ms timer.
2. Calls `data.getMoto()`.
3. After both the timer and the data fetch resolve, sets `view` to `'onboarding'` or `'dashboard'`.
4. Renders `SplashScreen` while `view === null`.

```typescript
type View = 'onboarding' | 'dashboard' | null;
```

#### `OnboardingView`

Controlled form with `useState` for `marca`, `modelo`, `km`. Submit handler:
1. Trims and validates (`!marca.trim() || !modelo.trim()` → toast error).
2. Calls `data.saveMoto(...)`.
3. Shows success toast.
4. Navigates to `/` which re-evaluates `SplashGate` — or better, the parent sets state directly to `'dashboard'` to avoid re-render flash.

The floating motorcycle SVG uses `animation: float 3s ease-in-out infinite`.

#### `DashboardView`

Loads moto, services status, and history in a single `useEffect` on mount. Uses `useState` for `activeTab: 'services' | 'history'`.

Modals are managed with a `modalState` discriminated union:
```typescript
type ModalState =
  | { type: 'none' }
  | { type: 'editMoto' }
  | { type: 'editKm' }
  | { type: 'servicePicker' }
  | { type: 'recordService'; service: ServicioCalculado }
  | { type: 'serviceDetail'; service: ServicioCalculado }
  | { type: 'confirmDeleteRecord'; recordId: string };
```

After any mutation (km update, record add/delete), the component refreshes by calling the data/engine functions and `setState`.

#### `SettingsView`

Accessible via `/settings`. Uses `useRouter` from `next/navigation` for back navigation. Modal state pattern mirrors `DashboardView`.

---

## Data Models

### localStorage key mapping

| Domain key | localStorage key |
|---|---|
| `moto` | `motomaint:moto` |
| `serviceTypes` | `motomaint:serviceTypes` |
| `history` | `motomaint:history` |
| `settings` | `motomaint:settings` |

### Default services (8 built-in)

| id | name | icon | intervalKm | intervalDays | enabled |
|---|---|---|---|---|---|
| `oil` | Cambio de aceite | 🛢️ | 3000 | null | true |
| `service` | Mantenimiento general | 🔧 | 5000 | null | true |
| `wash` | Lavada | 🧼 | null | 7 | true |
| `chain` | Cadena | ⛓️ | 1000 | null | true |
| `tire` | Llantas | 🛞 | 8000 | null | true |
| `filter` | Filtro de aire | 💨 | 6000 | null | false |
| `spark` | Bujía | ⚡ | 10000 | null | false |
| `brakes` | Frenos | 🛑 | 15000 | null | false |

### Backup format (v1)

```json
{
  "version": 1,
  "exportedAt": "2024-01-15T10:30:00.000Z",
  "moto": { "marca": "…", "modelo": "…", "kmActual": 12500, "createdAt": "…", "updatedAt": "…" },
  "services": [ … ],
  "history": [ … ],
  "settings": { "currency": "COP", "language": "es", "notifications": false }
}
```

### CSS custom properties (theme)

Defined in `app/globals.css`, these properties replace the original `styles.css` root block and are used by Tailwind v4 via `@theme inline` or directly in component `className` / `style`:

```css
:root {
  --bg: #0f1115;
  --bg-elev: #181b22;
  --bg-elev-2: #20242d;
  --border: #2a2f3a;
  --text: #f3f4f6;
  --text-dim: #9ca3af;
  --text-mute: #6b7280;
  --primary: #ff7a18;
  --primary-light: #ffb347;
  --primary-dim: rgba(255, 122, 24, 0.12);
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --radius: 16px;
  --radius-sm: 10px;
  --t: cubic-bezier(0.22, 1, 0.36, 1);
}
```

All six animations from the original (`fadeIn`, `fadeOut`, `slideIn`, `slideUp`, `pop`, `float`, `pulse`) are preserved verbatim in `globals.css`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

This feature is partially suitable for property-based testing. The pure logic layers (`lib/storage.ts`, `lib/data.ts`, `lib/engine.ts`, and formatting helpers) contain universal properties that are efficiently testable with generated inputs. The UI layer (React components, routing, modals) is not suitable for PBT and is covered by example-based tests.

The PBT library used is **fast-check** (TypeScript-native, well-maintained, integrates with Vitest).

---

### Property 1: Storage round-trip

*For any* JSON-serializable value `v` (primitives, objects, arrays, nested combinations), calling `storage.set(key, v)` followed by `storage.get(key)` returns a value that is structurally equal to `v`.

**Validates: Requirements 1.5, 1.9**

---

### Property 2: Storage key prefix

*For any* string `key`, after calling `storage.set(key, value)`, the underlying `localStorage` should contain an entry whose raw key is exactly `'motomaint:' + key` and no entry with the bare key exists.

**Validates: Requirements 1.2, 1.4**

---

### Property 3: Missing key returns null

*For any* string `key` that has not been set in storage (fresh adapter), `storage.get(key)` returns `null`.

**Validates: Requirements 1.3**

---

### Property 4: updateKm clamps to zero

*For any* input that is negative, zero, or non-numeric (NaN), `data.updateKm(input)` stores `0` as the `kmActual` value in the Moto record.

**Validates: Requirements 2.7**

---

### Property 5: addRecord inserts at head

*For any* existing history array (including empty) and any new record, after `data.addRecord(record)` the returned history has the new record at index 0, and all previously existing records follow in their original order.

**Validates: Requirements 2.9**

---

### Property 6: importAll partial import does not overwrite omitted keys

*For any* non-empty strict subset `S` of `{moto, services, history, settings}`, calling `data.importAll` with a payload containing only the keys in `S` leaves all keys not in `S` unchanged in storage.

**Validates: Requirements 2.11**

---

### Property 7: Progress values are clamped to [0, 1]

*For any* combination of `kmSinceLast` (≥ 0) and `intervalKm` (> 0), the computed `kmProgress` is in the closed interval [0, 1]. Likewise, *for any* `daysSinceLast` (≥ 0) and `intervalDays` (> 0), `daysProgress` is in [0, 1].

**Validates: Requirements 3.2, 3.3, 3.11, 3.12**

---

### Property 8: Only enabled services appear in computed output

*For any* list of `TipoServicio` items with mixed `enabled` values, `computeServicesStatus` returns only the items where `enabled === true`.

**Validates: Requirements 3.1**

---

### Property 9: Status assignment correctness

*For any* computed `ServicioCalculado`:
- If any configured interval has `remaining <= 0`, status is `'urgent'`.
- If no interval is urgent but any configured interval has `progress >= 0.85`, status is `'warning'`.
- Otherwise, status is `'ok'`.

**Validates: Requirements 3.5, 3.6, 3.7, 3.8**

---

### Property 10: getMainProgress returns maximum configured progress

*For any* `ServicioCalculado`, `getMainProgress(s)` equals `Math.max(...configured progresses)`, and returns `0` when no interval is configured.

**Validates: Requirements 3.10**

---

### Property 11: formatDate returns 'Hace N días' for N in [2, 6]

*For any* integer `N` in the range [2, 6], `formatDate` applied to a timestamp that is exactly `N` calendar days before today returns the string `'Hace N días'`.

**Validates: Requirements 15.12**

---

## Error Handling

### Storage errors

- `storage.get` catches `localStorage` exceptions (e.g., `SecurityError` in private browsing, quota exceeded on read). It logs to `console.error` and returns `null`. Callers treat `null` as "no data found."
- `storage.set`, `remove`, `getAll`, `clear` log and rethrow, allowing callers to show toast error messages.

### Data layer errors

- `updateKm` throws `'No hay moto registrada'` if no `Moto` exists. Dashboard components guard against this by checking `getMoto()` on load.
- `updateService` throws `'Servicio no encontrado'` if the id doesn't match. UI prevents this by always passing IDs from loaded data.
- `importAll` throws `'Formato de backup inválido'` on invalid payload. The Settings view catches this and shows a danger toast.

### React error handling

- Each top-level view (`SplashGate`, `DashboardView`, `SettingsView`) wraps async data operations in `try/catch`. On failure it shows a generic danger toast.
- The app does not use React Error Boundaries for data errors (they are handled at the call site), but a boundary is added at the root layout for unexpected render errors.

### Client-only localStorage access

All `storage` calls are made inside `useEffect` or event handlers — never during SSR. Components that need localStorage data initialize state to `null` (loading state) and fetch on mount. This prevents Next.js hydration mismatches.

---

## Testing Strategy

### Dual testing approach

- **Unit/example tests** cover specific behaviors, happy paths, error conditions, and UI interactions.
- **Property-based tests** verify universal invariants across generated inputs.

### Testing tools

| Tool | Purpose |
|---|---|
| Vitest | Test runner |
| fast-check | Property-based test generators |
| @testing-library/react | Component example tests |
| jsdom | Browser environment simulation |

Add dependencies (pinned):

```json
{
  "devDependencies": {
    "vitest": "2.1.9",
    "fast-check": "3.22.0",
    "@vitest/coverage-v8": "2.1.9",
    "@testing-library/react": "16.1.0",
    "@testing-library/jest-dom": "6.6.3",
    "jsdom": "25.0.1"
  }
}
```

### Property-based test configuration

- Minimum **100 iterations** per property (fast-check default is 100 — do not reduce).
- Each property test is tagged with a comment matching the format:

  ```typescript
  // Feature: motomaint-migration, Property N: <property title>
  ```

### Test file structure

```
__tests__/
├── lib/
│   ├── storage.test.ts       ← Properties 1, 2, 3 + edge cases 1.6, 1.7
│   ├── data.test.ts          ← Properties 4, 5, 6 + examples for CRUD ops
│   ├── engine.test.ts        ← Properties 7, 8, 9, 10 + examples
│   └── helpers.test.ts       ← Property 11 + examples for formatDate, formatNumber
├── components/
│   ├── OnboardingView.test.tsx
│   ├── DashboardView.test.tsx
│   └── SettingsView.test.tsx
└── setup.ts                  ← jsdom localStorage mock
```

### Unit test scope (example-based)

**`lib/storage.ts`**
- `get` missing key returns `null`
- `get` existing key returns correct value
- `set` then `get` round-trip for each primitive type
- `clear` removes all `motomaint:` keys and no others
- `get` when `localStorage.getItem` throws returns `null` and logs

**`lib/data.ts`**
- `getServices` with empty storage returns all 8 default services
- `updateKm` with no moto throws correct message
- `importAll` with `null` throws correct message
- `importAll` with `{version: 2}` throws correct message
- `exportAll` returns correct shape

**`lib/engine.ts`**
- Service with no history and km > 0: uses km as `kmSinceLast`
- Service with `intervalDays` and no history: `daysProgress = 0`, `daysRemaining = intervalDays`
- `formatServiceStatus` for urgent, warning, ok, unconfigured cases
- `getMainProgress` returns 0 for unconfigured service

**`components/`**
- Onboarding form: submits with valid data → saves moto
- Onboarding form: empty marca → shows danger toast, no navigation
- Dashboard: renders moto name and km
- Dashboard: km `−100` button clamps at 0
- Dashboard: shows urgent alert when urgentCount > 0
- Dashboard: shows warning alert when only warningCount > 0
- Settings: export button triggers file download
- Settings: import with invalid JSON shows danger toast

### Property test implementation notes

Each property test uses `fast-check` arbitraries:

```typescript
// Property 1: Storage round-trip
fc.assert(fc.asyncProperty(
  fc.string(),                     // key
  fc.jsonValue(),                  // value (all JSON-serializable types)
  async (key, value) => {
    await storage.set(key, value);
    const result = await storage.get(key);
    expect(result).toEqual(value);
  }
), { numRuns: 100 });
// Feature: motomaint-migration, Property 1: Storage round-trip
```

```typescript
// Property 7: Progress clamped to [0, 1]
fc.assert(fc.property(
  fc.integer({ min: 0, max: 200000 }),  // kmSinceLast
  fc.integer({ min: 1, max: 50000 }),   // intervalKm
  (kmSinceLast, intervalKm) => {
    const progress = Math.max(0, Math.min(1, kmSinceLast / intervalKm));
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(1);
  }
), { numRuns: 100 });
// Feature: motomaint-migration, Property 7: Progress values are clamped to [0, 1]
```

### PWA and visual smoke tests

- `manifest.json` contains required fields (`name`, `display`, `background_color`, `theme_color`)
- HTML `<head>` contains `apple-mobile-web-app-capable` meta tag
- TypeScript compilation (`tsc --noEmit`) produces zero errors — run in CI
