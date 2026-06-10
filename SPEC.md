# Spec: Cloud Sync con Supabase

## Objective

Agregar sincronización en la nube usando Supabase. Los datos del usuario (moto, servicios, historial) se respaldan en Postgres y son accesibles desde cualquier dispositivo. El usuario crea una cuenta, hace login, y sus datos se sincronizan automáticamente.

**Usuario:** Dueño de moto que quiere acceder a su cuaderno de mantenimiento desde cualquier dispositivo.

## Tech Stack

- **Backend:** Supabase (Postgres + Auth + Realtime)
- **Cliente:** `@supabase/supabase-js`
- **Framework:** Next.js 16 (App Router)
- **Estrategia:** localStorage como cache local, Supabase como source of truth

## Assumptions

1. Supabase ya tiene proyecto creado por el usuario
2. El usuario configurará las variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
3. Los datos actuales en localStorage se migran a Supabase al hacer login por primera vez
4. Si no hay conexión, la app funciona con localStorage (offline-first)

## Data Model

### Tablas en Supabase

```sql
-- Tabla de perfiles (extensión de auth.users)
create table profiles (
  id uuid references auth.users primary key,
  created_at timestamptz default now()
);

-- Tabla de motos
create table motos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  marca text not null,
  modelo text not null,
  kmActual integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabla de tipos de servicio
create table servicios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  icon text not null,
  intervalKm integer,
  intervalDays integer,
  enabled boolean default true,
  created_at timestamptz default now()
);

-- Tabla de registros de mantenimiento
create table registros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  serviceId uuid references servicios(id) on delete cascade,
  serviceName text not null,
  serviceIcon text not null,
  km integer not null,
  date timestamptz not null,
  notes text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table motos enable row level security;
alter table servicios enable row level security;
alter table registros enable row level security;

-- Políticas RLS
create policy "Users can only see their own data"
 on profiles for select using (auth.uid() = id);

create policy "Users can only insert their own data"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can only update their own data"
  on profiles for update using (auth.uid() = id);

-- Repetir políticas similares para motos, servicios, registros
```

## Project Structure

```
lib/
├── supabase.ts          # Cliente de Supabase (nuevo)
├── data.ts              # Refactorizado para usar Supabase o localStorage
├── types.ts             # Tipos existentes

components/
├── auth/
│   ├── AuthModal.tsx    # Modal de login/register (nuevo)
│   └── AuthProvider.tsx # Provider de autenticación (nuevo)
├── settings/
│   └── SettingsView.tsx # Agregar botón de logout y estado de sync
```

## Commands

```bash
Install: pnpm add @supabase/supabase-js
Build: pnpm run build
Dev: pnpm run dev
Lint: pnpm run lint
```

## Sync Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        APP START                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │ ¿Hay usuario logueado?    │
              └─────────────┬─────────────┘
                    ┌──────┴──────┐
                    │ │
 Sí No
                    │            │
                    ▼            ▼
 ┌──────────────┐  ┌──────────────────┐
        │ Sync desde   │  │ Usar localStorage │
        │ Supabase    │  │ (offline-first)  │
        └──────┬──────┘  └──────────────────┘
 │
               ▼
    ┌──────────────────────┐
    │ ¿Datos en localStorage│
    │ sin sincronizar?     │
    └──────────┬───────────┘
               │
              Sí (primera vez)
               │
               ▼
    ┌──────────────────────┐
    │ Migrar datos locales  │
    │ a Supabase           │
    └──────────────────────┘
```

## Auth Modal

```tsx
// Componente de login/register
export function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (isLogin) {
      await supabase.auth.signInWithPassword({ email, password });
    } else {
      await supabase.auth.signUp({ email, password });
    }
    setLoading(false);
    onClose();
  }

  return (
    <Modal title={isLogin ? 'Iniciar sesión' : 'Crear cuenta'}>
      <form onSubmit={handleSubmit}>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit" disabled={loading}>
          {loading ? 'Cargando...' : isLogin ? 'Entrar' : 'Registrarse'}
        </button>
      </form>
      <button onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
      </button>
    </Modal>
  );
}
```

## Boundaries

**Always:**
- Mantener localStorage como fallback offline
- Usar RLS en Supabase para seguridad
- No exponer claves de API en código cliente (usar anon key)

**Ask first:**
- Cambiar el schema de base de datos
- Agregar más tablas o relaciones
- Cambiar la estrategia de sync

**Never:**
- Guardar datos de usuarios en localStorage cuando están logueados (ya no es necesario)
- Compartir datos entre usuarios

## Open Questions

1. ¿Prefieres autenticación por email/password o prefieres OAuth (Google, GitHub)?
2. ¿Cuántos dispositivos estima el usuario que usarán?
3. ¿Necesitas que los datos sean privados por usuario o está bien que sean públicos?

## Success Criteria

- [ ] Usuario puede crear cuenta y hacer login
- [ ] Datos se sincronizan a Supabase tras login
- [ ] App funciona offline con localStorage si no hay conexión
- [ ] Al hacer logout, los datos locales permanecen
- [ ] Nuevo dispositivo puede acceder a los datos del usuario
