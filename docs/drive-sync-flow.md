# Flujo de sincronización con Google Drive

## Arquitectura

```
GoogleOAuthProvider          ← app/providers.tsx
  └─ SyncProvider            ← components/SyncProvider.tsx
       └─ initAutoSync()     ← lib/globalSync.ts
  └─ GoogleLoginButton       ← components/GoogleLoginButton.tsx
  └─ SyncStatus              ← components/SyncStatus.tsx (solo en settings)
```

No hay servidor — todo es cliente contra la API REST de Google Drive.

## Storage

| Qué | Dónde | Clave | Vive |
|---|---|---|---|
| Access token | `sessionStorage` | `motomaint:google_access_token` | 1h, se borra al cerrar pestaña |
| Datos de la app | `localStorage` | `motomaint:moto`, `motomaint:serviceTypes`, `motomaint:history`, `motomaint:settings` | Persiste |
| Backup fileId cacheado | `localStorage` | `motomaint:backup_file_id` | Persiste (se limpia al cerrar sesión) |

## Login y restauración

```
Usuario abre app
  ├─ sessionStorage vacío → no hay token
  └─ data.getMoto() = null → onboarding

Usuario hace clic "Conectar con Google Drive"
  └─ useGoogleLogin() → popup OAuth (scope: drive.file)
  └─ onSuccess(tokenResponse)
       └─ saveAccessToken()
            ├─ sessionStorage.setItem(token)
            ├─ invalidateAuthState()
            └─ notifyAuthChange(true)

Listener en globalSync.ts
  └─ pullFromDriveIfNewer()
       ├─ getValidAccessToken() → sessionStorage
       ├─ downloadBackup()
       │    ├─ 1. stored fileId en localStorage
       │    │    └─ GET /drive/v3/files/{fileId}?alt=media
       │    └─ 2. fallback: search by name
       │         └─ GET /drive/v3/files?q=name='motomaint-backup.json'
       │              └─ GET /drive/v3/files/{id}?alt=media
       ├─ data.importAll(cloud)
       └─ emitDataChanged()

page.tsx escucha onDataChanged
  └─ data.getMoto() → existe → setView('dashboard')
```

Si no hay backup en Drive, `downloadBackup()` retorna `null` y el flujo sigue normal hacia onboarding.

## Escritura (auto-sync)

```
Usuario crea/modifica datos
  └─ onDataChanged → scheduleSync()
       └─ 3s debounce → performSync()
            ├─ data.exportAll()
            ├─ uploadBackup(payload)
            │    ├─ findOrCreateFolder() → busca/crea carpeta "MotoMaint"
            │    ├─ PATCH si el archivo ya existe
            │    └─ POST multipart si es la primera vez
            └─ storeFileId(fileId) → localStorage
```

El debounce de 3s evita múltiples uploads durante ediciones rápidas.

## Cierre de sesión

```
"Desconectar Google" (SyncStatus.tsx)
  ├─ googleLogout()
  ├─ clearAccessToken()
  │    └─ sessionStorage.removeItem('motomaint:google_access_token')
  ├─ data.reset()
  │    └─ storage.clear()
  │         └─ elimina TODAS las keys motomaint:* de localStorage
  │              ├─ moto, serviceTypes, history, settings
  │              └─ backup_file_id (el fileId cacheado)
  ├─ emitDataChanged()
  └─ router.push('/')
```

## Errores y diagnóstico

| Error | Causa | Dónde se ve |
|---|---|---|
| Popup no se abre | Bloqueador de popups, COOP header | `onNonOAuthError` → texto rojo bajo el botón |
| "Failed to search for folder" | Scope `drive.file` sin acceso a la carpeta | `lastSyncError` → `SyncStatus.tsx` |
| "Token expired" | Token >1h sin refresh | `clearAccessToken()` → force re-login |
| `downloadBackup()` retorna null | No hay backup en Drive (primera vez) | Flujo normal → onboarding |

## Notas

- **Scope `drive.file`**: solo ve archivos creados por esta app (mismo OAuth client ID). Si el backup se subió con otro client ID, no será visible.
- **Token en sessionStorage**: se pierde al cerrar la pestaña. El usuario debe re-autenticarse cada vez que abre la app (por diseño, ver AGENTS.md).
- **fileId cacheado**: evita search queries en cada restauración. Se actualiza en cada upload y se limpia al cerrar sesión.
- **URL encoding**: las queries a Drive API usan `URLSearchParams` para encoding correcto.
- **Versión**: `@react-oauth/google` ≥ 0.13.5 (v0.13.4 era un "test build").
