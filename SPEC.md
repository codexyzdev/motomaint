# Spec: Cloud Sync con Google Drive

## Objective

Agregar sincronización en la nube usando Google Drive. El usuario hace login con su cuenta Google, y sus datos se respaldan automáticamente como JSON en su Google Drive. Puede acceder desde cualquier dispositivo con la misma cuenta.

**Usuario:** Dueño de moto que quiere acceder a su cuaderno de mantenimiento desde cualquier dispositivo, sin depender de un servidor propio.

## Tech Stack

- **Auth:** Google OAuth 2.0 (@react-oauth/google)
- **Drive API:** googleapis npm package
- **Storage:** Google Drive (archivo JSON)
- **Framework:** Next.js 16 (App Router)
- **Estrategia:** localStorage como cache local, Google Drive como backup en la nube

## Assumptions

1. El usuario tiene cuenta Google
2. El developer (yo) tiene credenciales OAuth de Google Cloud Console
3. Los datos se guardan en un archivo `motomaint-backup.json` en la carpeta raíz del Drive del usuario
4. Si no hay conexión, la app funciona con localStorage (offline-first)

## Google Cloud Setup (pasos para el developer)

1. Crear proyecto en [console.cloud.google.com](https://console.cloud.google.com)
2. Habilitar **Google Drive API** en APIs y servicios
3. Crear credenciales **OAuth 2.0 Client ID**
4. Configurar pantalla de consentimiento OAuth (tipo: External, usuarios registrados)
5. Añadir scopes:
   - `https://www.googleapis.com/auth/drive.file` (solo archivos de la app)

## Project Structure

```
lib/
├── googleAuth.ts       # Cliente de Google Auth (nuevo)
├── googleDrive.ts      # Funciones de Google Drive API (nuevo)
├── data.ts            # Refactorizado para sincronizar con Drive
├── types.ts           # Tipos existentes

components/
├── auth/
│   ├── GoogleLoginButton.tsx  # Botón "Continuar con Google" (nuevo)
│   └── SyncStatus.tsx         # Indicador de estado de sync (nuevo)
├── settings/
│   └── SettingsView.tsx       # Agregar botón de logout y sync manual
```

## Commands

```bash
Install: pnpm add @react-oauth/google googleapis
Build: pnpm run build
Dev: pnpm run dev
Lint: pnpm run lint
```

## Environment Variables

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
```

## Data Model

### Archivo en Google Drive

```json
{
  "version": 1,
  "exportedAt": "2024-01-15T10:30:00Z",
  "moto": {
    "id": "uuid",
    "marca": "Yamaha",
    "modelo": "MT-03",
    "kmActual": 15000
  },
  "services": [
    {
      "id": "uuid",
      "name": "Cambio de aceite",
      "icon": "🛢️",
      "intervalKm": 3000,
      "intervalDays": 90,
      "enabled": true
    }
  ],
  "history": [
    {
      "id": "uuid",
      "serviceId": "uuid",
      "serviceName": "Cambio de aceite",
      "serviceIcon": "🛢️",
      "km": 15000,
      "date": "2024-01-15T10:30:00Z",
      "notes": "Cambio completo"
    }
  ]
}
```

## Sync Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        APP START                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │ ¿Hay token de Google?     │
              └─────────────┬─────────────┘
                    ┌──────┴──────┐
                    │ │
                   Sí           No
                    │            │
                    ▼            ▼
         ┌──────────────────┐  ┌──────────────────┐
         │ Buscar archivo en  │  │ Mostrar botón    │
         │ Google Drive       │  │ "Conectar Google"│
         └─────────┬──────────┘  └──────────────────┘
                   │
         ┌───────┴───────┐
 │              │
    Existe         No existe
         │              │
         ▼ ▼
  ┌──────────────┐  ┌──────────────┐
  │ Descargar    │  │ Crear archivo │
  │ JSON del     │  │ nuevo en     │
  │ Drive        │  │ Drive        │
  └──────┬───────┘  └───────────────┘
         │
         ▼
  ┌──────────────────┐
  │ Cargar datos en  │
  │ localStorage     │
  └──────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    CAMBIOS EN DATOS                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │ ¿Hay token de Google?     │
              └─────────────┬─────────────┘
                    ┌──────┴──────┐
                    │            │
                   Sí           No
                    │            │
                    ▼            ▼
         ┌──────────────────┐  ┌──────────────────┐
         │ Actualizar archivo│  │ Guardar en │
         │ en Google Drive   │  │ localStorage     │
         └──────────────────┘  └──────────────────┘
```

## GoogleLoginButton Component

```tsx
'use client';

import { useGoogleLogin } from '@react-oauth/google';

export function GoogleLoginButton() {
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      // Guardar token en localStorage
      localStorage.setItem('google_token', tokenResponse.access_token);
      // Iniciar sync
 },
    scope: 'https://www.googleapis.com/auth/drive.file',
  });

  return (
    <button onClick={() => login()}>
      <GoogleIcon />
      Continuar con Google
    </button>
  );
}
```

## GoogleDrive Functions

```typescript
const FILE_NAME = 'motomaint-backup.json';
const DRIVE_FOLDER = 'appDataFolder'; // Carpeta privada de la app

export async function uploadToDrive(token: string, data: object) {
  const existingFile = await findFileInDrive(token, FILE_NAME);

  if (existingFile) {
    // Update existing file
    await fetch(`https://www.googleapis.com/drive/v3/files/${existingFile.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mimeType: 'application/json' }),
    });
  } else {
    // Create new file
    await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: FILE_NAME,
        parents: [DRIVE_FOLDER],
        mimeType: 'application/json',
      }),
    });
  }
}

export async function downloadFromDrive(token: string) {
  const file = await findFileInDrive(token, FILE_NAME);
  if (!file) return null;

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.json();
}
```

## Auth Modal (onboarding)

```tsx
export function OnboardingSync() {
  return (
    <div className="onboarding">
      <h1>Conecta tu Google Drive</h1>
      <p>
        Tus datos se respaldarán automáticamente en tu Google Drive.
 Accede desde cualquier dispositivo.
      </p>
      <GoogleLoginButton />
      <button className="btn-ghost">
        Omitir por ahora (solo modo local)
      </button>
    </div>
  );
}
```

## Settings - Sync Status

```tsx
export function SyncStatus() {
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('last_sync');
    if (stored) setLastSync(stored);
  }, []);

  async function handleManualSync() {
    const token = localStorage.getItem('google_token');
    if (!token) return;

    const data = await data.exportAll();
    await uploadToDrive(token, data);
    localStorage.setItem('last_sync', new Date().toISOString());
    setLastSync(new Date().toISOString());
  }

  return (
    <div className="sync-status">
      {lastSync && (
        <span>Última sincronización: {formatDate(lastSync)}</span>
      )}
      <button onClick={handleManualSync}>
        Sincronizar ahora
      </button>
      <button onClick={() => {
        localStorage.removeItem('google_token');
        // refresh
      }}>
        Desconectar Google
      </button>
    </div>
  );
}
```

## Boundaries

**Always:**
- Mantener localStorage como fallback offline
- Solo usar `drive.file` scope (no acceder a otros archivos)
- Guardar token en localStorage (no en cookies)

**Ask first:**
- Cambiar el nombre del archivo de backup
- Cambiar la estructura del JSON
- Agregar más servicios de cloud (Dropbox, etc.)

**Never:**
- Acceder a archivos fuera de la carpeta de la app
- Compartir datos con otros usuarios
- Guardar más datos de los necesarios

## Open Questions

1. ¿Quieres sync automático en cada cambio o solo cuando el usuario presiona un botón?
2. ¿Necesitas que los datos sean encriptados antes de subir a Drive?
3. ¿Prefieres mostrar el estado de sync en Settings o en el Dashboard?

## Success Criteria

- [ ] Usuario puede conectar su cuenta Google
- [ ] Datos se respaldan en Google Drive tras conexión
- [ ] App funciona offline con localStorage si no hay conexión
- [ ] Al desconectar, los datos locales permanecen
- [ ] Nuevo dispositivo puede acceder a los datos tras login
- [ ] Sync manual funciona desde Settings
