# Implementation Plan: MotoMaint Migration

## Overview

Migrate MotoMaint from vanilla HTML/CSS/JS to Next.js 16 App Router, React 19, TypeScript strict mode, and Tailwind CSS v4. The migration is a faithful port: every feature, interaction, animation, and visual detail must be preserved. localStorage with the `motomaint:` prefix remains the sole persistence layer. No new features are added.

The implementation follows the architecture defined in the design document, building from the pure business logic layer upward to UI components and routing.

---

## Tasks

- [ ] 1. Configure project foundation and testing infrastructure
  - Install pinned dev dependencies: `vitest@2.1.9`, `fast-check@3.22.0`, `@vitest/coverage-v8@2.1.9`, `@testing-library/react@16.1.0`, `@testing-library/jest-dom@6.6.3`, `jsdom@25.0.1`
  - Add `vitest.config.ts` with jsdom environment, setup file, and path aliases matching `tsconfig.json`
  - Add `__tests__/setup.ts` with a localStorage mock (`vi.stubGlobal`) that resets between tests
  - Confirm `tsconfig.json` has `strict: true` and includes all source directories
  - Add `test` and `test:coverage` scripts to `package.json`
  - _Requirements: 18.6_

- [ ] 2. Define shared TypeScript types
  - [ ] 2.1 Create `lib/types.ts` with all exported interfaces: `Moto`, `TipoServicio`, `Registro`, `Ajustes`, `ServicioCalculado`, `ToastType`, `StorageAdapter`, `BackupPayload`
    - Types must match the exact field names and types specified in the design document
    - `ServicioCalculado` extends `TipoServicio` with the computed fields from the design
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

- [ ] 3. Implement the Storage layer
  - [ ] 3.1 Create `lib/storage.ts` implementing the `StorageAdapter` interface with the `motomaint:` prefix
    - Implement `get`, `set`, `remove`, `getAll`, `clear` as async methods
    - `get` catches all errors, logs with `console.error`, and returns `null`
    - `set`, `remove`, `getAll`, `clear` log and rethrow on error
    - Export a singleton `storage` instance
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ]* 3.2 Write property test for Storage round-trip (Property 1)
    - **Property 1: Storage round-trip**
    - **Validates: Requirements 1.5, 1.9**
    - Use `fc.jsonValue()` for arbitrary JSON-serializable values; assert `storage.get(key)` after `storage.set(key, v)` deep-equals `v`
    - Tag: `// Feature: motomaint-migration, Property 1: Storage round-trip`

  - [ ]* 3.3 Write property test for Storage key prefix (Property 2)
    - **Property 2: Storage key prefix**
    - **Validates: Requirements 1.2, 1.4**
    - For any string `key`, after `storage.set(key, value)` assert `localStorage` contains `'motomaint:' + key` and no bare `key`
    - Tag: `// Feature: motomaint-migration, Property 2: Storage key prefix`

  - [ ]* 3.4 Write property test for missing key returns null (Property 3)
    - **Property 3: Missing key returns null**
    - **Validates: Requirements 1.3**
    - For any unset string `key` on a fresh storage, `storage.get(key)` returns `null`
    - Tag: `// Feature: motomaint-migration, Property 3: Missing key returns null`

  - [ ]* 3.5 Write unit tests for Storage error handling
    - Stub `localStorage.getItem` to throw; assert `get` returns `null` and logs
    - Stub `localStorage.setItem` to throw; assert `set` rethrows
    - _Requirements: 1.6, 1.7_

- [ ] 4. Checkpoint — storage layer
  - Run `pnpm test --run` and confirm all storage tests pass; run `pnpm build` to confirm zero TypeScript errors. Ask the user if anything needs clarification before continuing.

- [ ] 5. Implement the Data layer
  - [ ] 5.1 Create `lib/data.ts` with the `DEFAULT_SERVICES` array (8 built-in services) and all domain methods on the exported `data` object
    - Implement `getMoto`, `saveMoto`, `updateKm` (clamp to `Math.max(0, parseInt(v) || 0)`, throw if no moto)
    - Implement `getServices` (initialize and persist defaults when storage is empty/null/length 0), `saveServices`, `addService` (ID format `svc_<timestamp>_<random>`), `updateService`, `removeService`
    - Implement `getHistory`, `addRecord` (unshift for newest-first), `removeRecord`
    - Implement `getSettings`, `saveSettings`
    - Implement `reset`, `exportAll`, `importAll` (validate `version === 1`, throw `'Formato de backup inválido'`, import only present keys)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 12.6_

  - [ ]* 5.2 Write property test for updateKm clamps to zero (Property 4)
    - **Property 4: updateKm clamps to zero**
    - **Validates: Requirements 2.7**
    - For arbitrary negative integers and NaN-producing strings, `data.updateKm(input)` stores `0`
    - Tag: `// Feature: motomaint-migration, Property 4: updateKm clamps to zero`

  - [ ]* 5.3 Write property test for addRecord inserts at head (Property 5)
    - **Property 5: addRecord inserts at head**
    - **Validates: Requirements 2.9**
    - For any non-empty history array and any new record, after `data.addRecord` the new record is at index 0 and prior records follow in original order
    - Tag: `// Feature: motomaint-migration, Property 5: addRecord inserts at head`

  - [ ]* 5.4 Write property test for importAll partial import (Property 6)
    - **Property 6: importAll partial import does not overwrite omitted keys**
    - **Validates: Requirements 2.11**
    - For any strict subset `S` of `{moto, services, history, settings}`, after `importAll` with only `S`, the omitted keys remain unchanged in storage
    - Tag: `// Feature: motomaint-migration, Property 6: importAll partial import does not overwrite omitted keys`

  - [ ]* 5.5 Write unit tests for Data layer edge cases
    - `getServices` with empty storage returns all 8 default services
    - `updateKm` with no moto throws `'No hay moto registrada'`
    - `importAll(null)` throws `'Formato de backup inválido'`
    - `importAll({ version: 2 })` throws `'Formato de backup inválido'`
    - `exportAll` returns correct `{ version: 1, exportedAt, moto, services, history, settings }` shape
    - _Requirements: 2.6, 2.8, 2.10_

- [ ] 6. Checkpoint — data layer
  - Run `pnpm test --run` and confirm all data tests pass. Ask the user if any data behaviors need adjustment.

- [ ] 7. Implement the Calculation Engine
  - [ ] 7.1 Create `lib/engine.ts` with `computeServicesStatus`, `formatServiceStatus`, and `getMainProgress`
    - `computeServicesStatus`: fetch moto, services, history in parallel; filter to `enabled`; compute `kmSinceLast`, `kmRemaining`, `kmProgress`, `daysSinceLast`, `daysRemaining`, `daysProgress`, and `status` per the rules in the design
    - No-history fallback: km > 0 → use km as `kmSinceLast`; days → `daysRemaining = intervalDays`, `daysProgress = 0`
    - `urgent` when any `remaining <= 0`; `warning` when any `progress >= 0.85` and not urgent; else `ok`
    - `formatServiceStatus`: return `'Vencido hace X km'`/`'Vencido hace X días'`/`'Pronto: X km · Y días'`/`'Faltan X km · Y días'`/`'Sin configurar'`
    - `getMainProgress`: return `Math.max(...configuredProgresses)` or `0` if none
    - Fix the original template literal bug (`parts.push(\`…\`)`)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

  - [ ]* 7.2 Write property test for progress clamped to [0, 1] (Property 7)
    - **Property 7: Progress values are clamped to [0, 1]**
    - **Validates: Requirements 3.2, 3.3, 3.11, 3.12**
    - For arbitrary `kmSinceLast ≥ 0` and `intervalKm > 0`, assert `kmProgress ∈ [0, 1]`; same for days
    - Tag: `// Feature: motomaint-migration, Property 7: Progress values are clamped to [0, 1]`

  - [ ]* 7.3 Write property test for only enabled services in output (Property 8)
    - **Property 8: Only enabled services appear in computed output**
    - **Validates: Requirements 3.1**
    - For any list of `TipoServicio` with mixed `enabled`, `computeServicesStatus` returns only items with `enabled === true`
    - Tag: `// Feature: motomaint-migration, Property 8: Only enabled services appear in computed output`

  - [ ]* 7.4 Write property test for status assignment correctness (Property 9)
    - **Property 9: Status assignment correctness**
    - **Validates: Requirements 3.5, 3.6, 3.7, 3.8**
    - For any computed `ServicioCalculado`: urgent if any `remaining <= 0`; warning if any `progress >= 0.85` and not urgent; else ok
    - Tag: `// Feature: motomaint-migration, Property 9: Status assignment correctness`

  - [ ]* 7.5 Write property test for getMainProgress (Property 10)
    - **Property 10: getMainProgress returns maximum configured progress**
    - **Validates: Requirements 3.10**
    - For any `ServicioCalculado`, `getMainProgress(s)` equals `Math.max` of configured progresses, or `0` if none configured
    - Tag: `// Feature: motomaint-migration, Property 10: getMainProgress returns maximum configured progress`

  - [ ]* 7.6 Write unit tests for engine edge cases
    - Service with no history and km > 0: uses km as `kmSinceLast`
    - Service with `intervalDays` and no history: `daysProgress = 0`, `daysRemaining = intervalDays`
    - `formatServiceStatus` for each of: urgent-km, urgent-days, warning, ok, unconfigured
    - `getMainProgress` returns 0 for unconfigured service
    - _Requirements: 3.4, 3.9, 3.10_

- [ ] 8. Create the icon catalogue
  - [ ] 8.1 Create `lib/icons.ts` exporting the `ICONS` array of 32 emojis matching the original catalogue
    - _Requirements: 12.8_

- [ ] 9. Implement formatting helpers
  - [ ] 9.1 Create `lib/helpers.ts` with `formatDate(iso: string): string` and `formatNumber(n: number): string`
    - `formatDate`: return `'Hoy'`, `'Ayer'`, `'Hace N días'` (N in [2–6]), or locale date string; return `''` for invalid ISO input
    - `formatNumber`: use `Intl.NumberFormat` with locale `es-CO` and thousand separators
    - _Requirements: 15.9, 15.10, 15.11, 15.12, 15.13_

  - [ ]* 9.2 Write property test for formatDate 'Hace N días' (Property 11)
    - **Property 11: formatDate returns 'Hace N días' for N in [2, 6]**
    - **Validates: Requirements 15.12**
    - For any integer N ∈ [2, 6], `formatDate` applied to a timestamp exactly N calendar days before today returns `'Hace N días'`
    - Tag: `// Feature: motomaint-migration, Property 11: formatDate returns 'Hace N días' for N in [2, 6]`

  - [ ]* 9.3 Write unit tests for formatDate and formatNumber
    - Today's date returns `'Hoy'`
    - Yesterday returns `'Ayer'`
    - Invalid ISO string returns `''`
    - `formatNumber(1000)` returns `'1.000'` (es-CO separator)
    - _Requirements: 15.10, 15.11, 15.13_

- [ ] 10. Checkpoint — business logic
  - Run `pnpm test --run` and confirm all lib tests pass; run `tsc --noEmit` to confirm zero errors. Ask the user before proceeding to UI.

- [ ] 11. Implement global styles and theme
  - [ ] 11.1 Replace `app/globals.css` with the full theme: Tailwind v4 import, `:root` CSS custom properties (`--bg`, `--primary`, etc.), all six keyframe animations (`fadeIn`, `fadeOut`, `slideIn`, `slideUp`, `pop`, `float`, `pulse`), base reset, and utility classes from the original `styles.css`
    - Include `env(safe-area-inset-bottom)` safe area rules
    - Include radial gradient background on `body`
    - Mobile-first layout with max-width 480px centered
    - _Requirements: 16.1, 16.3, 16.4, 16.5, 16.6, 16.7_

- [ ] 12. Implement the root layout
  - [ ] 12.1 Update `app/layout.tsx` to load `Inter` and `Space Grotesk` from `next/font/google`, apply them as CSS variables, add the PWA meta tags (`viewport` with `viewport-fit=cover`, `apple-mobile-web-app-capable`), and wrap children with `ToastProvider` and a root React Error Boundary
    - _Requirements: 16.2, 17.3, 17.4_

- [ ] 13. Implement the PWA manifest
  - [ ] 13.1 Create `app/manifest.ts` (Next.js metadata API) or `public/manifest.json` with `name: "MotoMaint"`, `display: "standalone"`, `background_color: "#0f1115"`, `theme_color: "#0f1115"`, and icon references
    - _Requirements: 17.1_

- [ ] 14. Implement UI primitives (Toast, Modal, ConfirmDialog)
  - [ ] 14.1 Create `components/ui/useToast.ts` with `ToastContext`, `ToastProvider`, and `useToast` hook
    - `showToast(message, type?, duration?)`: truncate message to 120 chars, clamp duration to [500, 10000] ms, default 2500 ms
    - Replacing a visible toast resets the timer
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [ ] 14.2 Create `components/ui/Toast.tsx` that reads `useToast` context and renders the fixed-position toast element
    - Position: `bottom: 100px`, z-index 200; applies `show`, `success`, `danger` CSS classes matching original styles
    - _Requirements: 15.2, 15.3_

  - [ ] 14.3 Create `components/ui/Modal.tsx` as a bottom-sheet modal using a React Portal
    - Accepts `title`, `subtitle?`, `children`, `actions?` (max 4), `onClose`
    - `slideUp` animation (300 ms); backdrop click calls `onClose`; sets `body overflow: hidden` while open
    - _Requirements: 15.5, 15.6, 15.7_

  - [ ] 14.4 Create `components/ui/ConfirmDialog.tsx` wrapping `Modal` with confirm/cancel actions
    - Props: `title`, `message`, `confirmLabel?`, `cancelLabel?`, `danger?`, `onConfirm`, `onCancel`
    - _Requirements: 15.8_

  - [ ]* 14.5 Write unit tests for Toast and Modal UI components
    - `showToast` with valid message → toast appears; disappears after `duration`
    - `showToast` called twice → second replaces first
    - Modal backdrop click → `onClose` called
    - ConfirmDialog confirm button → `onConfirm` called
    - _Requirements: 15.2, 15.4, 15.7_

- [ ] 15. Implement the Onboarding view
  - [ ] 15.1 Create `components/onboarding/OnboardingView.tsx` as a client component
    - Controlled form with `marca` (max 50 chars), `modelo` (max 50 chars), `kmActual` (min 0, max 999999)
    - Submit: trim and validate; on empty marca/modelo show danger toast `'Marca y modelo son requeridos'` without navigating; on success call `data.saveMoto`, show success toast, invoke `onComplete` callback
    - Floating motorcycle SVG with `animation: float 3s ease-in-out infinite`
    - "Tu moto, bien cuidada" heading with "bien cuidada" in `--primary`→`--primary-light` gradient
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 15.2 Write unit tests for OnboardingView
    - Submit with valid data → `saveMoto` called, `onComplete` invoked
    - Submit with empty marca → danger toast shown, `onComplete` NOT called
    - Submit with whitespace-only modelo → danger toast shown
    - _Requirements: 5.2, 5.3, 5.4_

- [ ] 16. Implement the SplashGate and root page
  - [ ] 16.1 Replace `app/page.tsx` with a `SplashGate` client component
    - On mount: start 600 ms timer and call `data.getMoto()` in parallel
    - Show splash screen (logo + animation) while `view === null`
    - After both resolve: if moto exists render `DashboardView`, else render `OnboardingView`
    - Pass `onComplete` callback to `OnboardingView` to transition directly to `DashboardView` without page reload
    - _Requirements: 4.1, 4.2, 4.3, 4.7, 4.8_

- [ ] 17. Implement the Dashboard — MotoCard and alert banner
  - [ ] 17.1 Create `components/dashboard/MotoCard.tsx`
    - Display moto name (marca + modelo), current km, quick-adjust buttons (`−100`, `+100`, `+500`, `Editar`)
    - Quick-adjust calls `data.updateKm` and updates parent state in ≤100 ms; clamps to 0 for negative results
    - Edit-km button opens km modal; edit-name icon opens moto modal
    - Render urgent (red) or warning (yellow) alert banner per status counts; never show both simultaneously
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [ ] 18. Implement the Dashboard — ServiceCard, HistoryItem, ServiceTabs, FAB
  - [ ] 18.1 Create `components/dashboard/ServiceCard.tsx`
    - Render icon, name, status text, progress bar (red/yellow/orange by status), check button
    - Card click (outside check button) opens service-detail modal; check button opens record modal
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 18.2 Create `components/dashboard/HistoryItem.tsx`
    - Render service icon, service name, km, relative date (`formatDate`), notes (if present)
    - Delete button shows `ConfirmDialog` before removing record
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 18.3 Create `components/dashboard/ServiceTabs.tsx`
    - Two tabs: `Servicios` and `Historial`; `Servicios` active by default
    - Empty states: `'No hay servicios configurados. Ve a Ajustes para agregar.'` and `'Sin mantenimientos registrados aún. ¡Registra el primero!'`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ] 18.4 Create `components/dashboard/FAB.tsx`
    - Show text `Registrar mantenimiento` on screens > 480px; show only `+` icon on ≤480px
    - _Requirements: 10.1_

- [ ] 19. Implement the DashboardView and its modals
  - [ ] 19.1 Create `components/dashboard/DashboardView.tsx` orchestrating all dashboard sub-components
    - Load moto, computed services, and history in a single `useEffect` on mount
    - Manage `activeTab` state and `modalState` discriminated union (`none | editMoto | editKm | servicePicker | recordService | serviceDetail | confirmDeleteRecord`)
    - FAB opens `servicePicker` modal; service selection transitions to `recordService` modal
    - After any mutation (km update, record add/delete) refresh by re-calling data/engine functions
    - Limit history display to last 30 records
    - Include inline modal implementations (or separate modal component files) for: EditMoto, EditKm, ServicePicker (2-column grid with icon/name/status), RecordService (km field defaults to current moto km, notes optional), ServiceDetail
    - Saving a record updates moto km if record km > current km; shows success toast; closes modal
    - _Requirements: 7.2, 7.3, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 19.2 Write unit tests for DashboardView
    - Renders moto name and km
    - km `−100` button clamps at 0
    - Shows urgent alert when `urgentCount > 0`
    - Shows warning alert when only `warningCount > 0`
    - `showToast` success after record saved
    - _Requirements: 6.2, 6.3, 6.6, 6.7, 10.6_

- [ ] 20. Implement the Settings view and its modals
  - [ ] 20.1 Create `app/settings/page.tsx` and `components/settings/SettingsView.tsx`
    - Show moto row (marca, modelo, km); click opens EditMoto modal; save persists and shows toast
    - List all service types (enabled + disabled) via `ServiceTypeRow`
    - Each row click opens EditService modal
    - `Agregar servicio personalizado` button opens EditService in create mode (no toggle/delete buttons)
    - Export button: calls `data.exportAll`, builds JSON blob, triggers download as `motomaint-backup-YYYY-MM-DD.json`
    - Import button: opens hidden `<input type="file" accept=".json">`; on valid file restore and navigate to `/`; on invalid show danger toast `'Archivo inválido'`
    - Reset button (`Borrar todo y empezar de cero`, danger style): `ConfirmDialog` with message `'Se eliminarán la moto, servicios e historial. Esta acción no se puede deshacer.'`; on confirm call `data.reset`, navigate to `/`
    - Use `useRouter` from `next/navigation` for back navigation to `/`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 12.5, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 14.1, 14.2, 14.3, 4.5_

  - [ ] 20.2 Create `components/settings/IconPicker.tsx`
    - Render a grid of the 32 emojis from `lib/icons.ts`; highlight the currently selected icon
    - _Requirements: 12.8_

  - [ ] 20.3 Create `components/settings/ServiceTypeRow.tsx` and the EditService modal
    - EditService modal: fields for name, icon (uses `IconPicker`), interval km, interval days
    - Show `Activar`/`Desactivar` and `Eliminar` buttons only in edit mode (not create mode)
    - `Eliminar` shows `ConfirmDialog` before removing
    - Validate name required; show toast `'El nombre es requerido'` without closing if empty
    - ID format `svc_<timestamp>_<random>` assigned by `data.addService`
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.7, 12.9_

  - [ ]* 20.4 Write unit tests for SettingsView
    - Export button triggers file download
    - Import with invalid JSON shows danger toast `'Archivo inválido'`
    - Reset confirm → `data.reset` called, navigates to `/`
    - EditService with empty name → shows toast `'El nombre es requerido'`, modal stays open
    - _Requirements: 13.2, 13.6, 14.3, 12.9_

- [ ] 21. Wire up routing and navigation
  - [ ] 21.1 Confirm `app/settings/page.tsx` exports `SettingsView` and is accessible at `/settings`
    - Dashboard's settings icon uses `<Link href="/settings">` or `router.push('/settings')`
    - Settings back button uses `router.back()` (or `router.push('/')`)
    - Confirm no full page reloads between views
    - _Requirements: 4.4, 4.5, 4.6, 4.8_

- [ ] 22. Final checkpoint — full integration
  - Run `pnpm test --run` and confirm all tests pass
  - Run `tsc --noEmit` and confirm zero TypeScript errors
  - Run `pnpm build` and confirm a clean production build
  - Verify PWA manifest fields are present in the build output
  - Ask the user if anything needs adjustment before closing.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; all core implementation tasks must be completed.
- Each task references specific requirements for full traceability.
- All `storage` calls must be inside `useEffect` or event handlers — never during SSR — to prevent Next.js hydration mismatches.
- Checkpoints validate incremental correctness; do not skip them.
- Property tests use a minimum of 100 iterations (`numRuns: 100`) and are tagged with `// Feature: motomaint-migration, Property N: <title>`.
- Unit tests complement property tests; both are needed.
- The icon catalogue (`lib/icons.ts`) must match the original 32 emojis exactly.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["3.1", "8.1", "9.1", "11.1", "12.1", "13.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.4", "3.5", "5.1"] },
    { "id": 3, "tasks": ["5.2", "5.3", "5.4", "5.5", "7.1", "9.2", "9.3"] },
    { "id": 4, "tasks": ["7.2", "7.3", "7.4", "7.5", "7.6", "14.1"] },
    { "id": 5, "tasks": ["14.2", "14.3", "14.4", "15.1"] },
    { "id": 6, "tasks": ["14.5", "15.2", "16.1", "17.1", "18.1", "18.2", "18.3", "18.4"] },
    { "id": 7, "tasks": ["19.1", "20.1", "20.2", "20.3"] },
    { "id": 8, "tasks": ["19.2", "20.4", "21.1"] }
  ]
}
```
