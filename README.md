# MotoMaint 🏍️

> **MotoMaint** es una aplicación web *mobile-first* diseñada para gestionar y llevar el control del mantenimiento de tu motocicleta. Nunca más olvides cuándo toca hacer el próximo cambio de aceite, revisión de frenos o mantenimiento general.

![MotoMaint Screenshot](./public/icon-192.png) <!-- Reemplaza esto con un screenshot real de tu app -->

## ✨ Características Principales

- 📱 **Diseño Mobile-First**: Interfaz moderna, responsiva y oscura (Dark Theme) con animaciones fluidas, diseñada para sentirse como una app nativa en tu teléfono.
- 🏍️ **Perfil de tu Moto**: Personaliza el nombre/modelo de tu motocicleta y ajusta el kilometraje actual de forma rápida.
- 🔧 **Control de Mantenimientos**: Registra servicios y recibe notificaciones visuales sobre qué mantenimientos están por vencer o ya vencidos en base al kilometraje.
- 🕒 **Historial de Servicios**: Mantén un registro detallado de todos los mantenimientos realizados, cuándo se hicieron y a qué kilometraje.
- 💾 **Almacenamiento Local**: Los datos se guardan de forma segura en tu navegador (IndexedDB) para un acceso rápido y sin necesidad de conexión a internet.

## 🚀 Tecnologías

El proyecto está construido utilizando las últimas tecnologías web:

- [Next.js 16](https://nextjs.org/) - Framework de React (App Router)
- [React 19](https://react.dev/) - Biblioteca para interfaces de usuario
- [Tailwind CSS v4](https://tailwindcss.com/) - Framework de utilidades CSS para un estilizado rápido y moderno
- [TypeScript](https://www.typescriptlang.org/) - Tipado estático para código más robusto
- **IndexedDB** - Base de datos en el navegador para almacenamiento persistente

## 🛠️ Instalación y Uso Local

Para correr este proyecto en tu máquina local, sigue estos pasos:

### 1. Clonar el repositorio
```bash
git clone https://github.com/codexyzdev/motomaint.git
cd motomaint
```

### 2. Instalar dependencias
Asegúrate de tener [Node.js](https://nodejs.org/) instalado. Luego ejecuta:
```bash
npm install
# o con pnpm
pnpm install
```

### 3. Ejecutar el servidor de desarrollo
```bash
npm run dev
# o con pnpm
pnpm dev
```
La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## 📂 Estructura del Proyecto

- `app/` - Rutas, páginas y estilos globales de Next.js.
- `components/` - Componentes reutilizables de UI (botones, modales, tarjetas).
- `lib/` - Lógica de negocio y configuración de base de datos local (IndexedDB).
- `public/` - Archivos estáticos como iconos y manifest para PWA.

## 👨‍💻 Autor

**codexyzdev**
- GitHub: [@codexyzdev](https://github.com/codexyzdev)

---

⭐ Si este proyecto te resulta útil, ¡no olvides darle una estrella en GitHub!
