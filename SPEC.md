# Spec: Theme Switching with next-themes

## Objective

Agregar alternancia de tema (light/dark) usando `next-themes`. Mantener el CSS existente en `globals.css` y solo agregar variables CSS para el tema claro. El tema se persistirá en localStorage y será accesible via context.

**Usuario:** El usuario puede alternar entre tema oscuro, tema claro, y tema del sistema desde Settings. El ciclo es: dark → light → system → dark.

## Tech Stack

- Framework: Next.js 16 (App Router)
- Theme: [next-themes](https://www.npmjs.com/package/next-themes) - última versión
- Styling: CSS variables en `globals.css` + Tailwind CSS v4
- Persistencia: localStorage via next-themes

## Assumptions

1. El proyecto usa App Router (confirmado)
2. Tailwind v4 está configurado con `@tailwindcss/postcss` (sin tailwind.config.js)
3. El tema oscuro actual usa variables CSS en `:root` (`--ink`, `--paper`, `--accent`, etc.)
4. No hay ThemeProvider existente - next-themes provee el suyo
5. Settings tiene un componente `SettingsView.tsx` donde se agregará el toggle

## Commands

```bash
Install: npm install next-themes
Build: npm run build
Dev: npm run dev
Lint: npm run lint
```

## Project Structure

```
app/
├── globals.css         # Variables CSS existentes + variables light mode
├── layout.tsx         # Envuelve ThemeProvider de next-themes
└── settings/
    └── page.tsx       # Settings page

components/
├── settings/
│   ├── SettingsView.tsx  # Donde irá el ThemeToggle
│   └── ThemeToggle.tsx    # Componente toggle (nuevo)
└── ui/                   # Componentes existentes (sin cambios)
```

## Code Style

**ThemeToggle component (nuevo):**

Ciclo: dark → light → system → dark

```tsx
'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const themes = ['dark', 'light', 'system'] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="icon-btn" style={{ width: 36, height: 36 }} />;

  function handleClick() {
    const currentIndex = themes.indexOf(theme as any);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  }

  return (
    <button className="icon-btn" onClick={handleClick} aria-label="Cambiar tema">
      {/* Iconos SVG inline: luna (dark), sol (light), monitor (system) */}
    </button>
  );
}
```

**CSS variables light mode en globals.css:**

```css
[data-theme='light'] {
  --ink: #ffffff;
  --paper: #1a1a1a;
  --accent: #3b82f6;
  --stamp-ok: #22c55e;
  --stamp-warn: #eab308;
  --stamp-urgent: #ef4444;
  --bg-primary: #f8fafc;
  --bg-secondary: #e2e8f0;
  --bg-tertiary: #cbd5e1;
}
```

## Testing Strategy

- Verificar que el toggle cambia el tema visualmente
- Verificar que el tema se persiste al recargar la página
- Verificar que no hay hydration mismatch (usar `mounted` state)
- Verificar que el `data-theme` attribute se aplica al `<html>`

## Boundaries

**Always:**
- Usar `useTheme` de next-themes para acceder al tema
- Esperar a que el componente se monte (`mounted` state) antes de mostrar el toggle
- Mantener las variables CSS existentes del tema oscuro

**Ask first:**
- Cambiar la estructura de CSS existente
- Agregar nuevas dependencias además de next-themes

**Never:**
- Eliminar las variables CSS del tema oscuro
- Usar `localStorage` directamente (next-themes lo maneja)
