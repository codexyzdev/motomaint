# Requirements Document

## Introduction

MotoMaint es una PWA mobile-first para registrar y rastrear mantenimientos de motocicletas. Este documento especifica los requisitos para migrar la aplicación existente (vanilla HTML/CSS/JS con ES modules y localStorage) a Next.js 16 con App Router, React 19, TypeScript, y Tailwind CSS v4, preservando fielmente toda la funcionalidad, diseño visual y experiencia de usuario originales.

La migración no cambia el backend ni el modelo de datos: localStorage sigue siendo la capa de persistencia con el mismo esquema y prefijo (`motomaint:`).

---

## Glossary

- **App**: La aplicación MotoMaint completa en Next.js.
- **Motor de Cálculo**: Módulo que computa el estado de cada servicio (km restantes, días restantes, status).
- **Capa de Datos**: Módulo que abstrae todas las operaciones CRUD sobre localStorage.
- **Storage**: Abstracción sobre localStorage con prefijo `motomaint:`.
- **Moto**: Entidad que representa la motocicleta del usuario: `{ marca, modelo, kmActual, createdAt, updatedAt }`.
- **TipoServicio**: Entidad que representa un tipo de mantenimiento configurable: `{ id, name, icon, intervalKm, intervalDays, enabled }`.
- **Registro**: Entidad que representa un mantenimiento realizado: `{ id, serviceId, serviceName, serviceIcon, km, date, notes }`.
- **Ajustes**: Entidad de configuración general: `{ currency, language, notifications }`.
- **StatusServicio**: Estado calculado de un servicio: `ok`, `warning` (≥85% del intervalo), o `urgent` (intervalo superado).
- **Modal**: Componente bottom sheet que se desliza desde la parte inferior de la pantalla.
- **Toast**: Notificación temporal no bloqueante que aparece en la parte inferior de la pantalla.
- **FAB**: Floating Action Button, botón de acción principal flotante.
- **Onboarding**: Vista de registro inicial de la moto (primera ejecución).
- **Dashboard**: Vista principal con estado de servicios e historial.
- **Settings**: Vista de configuración de la moto y los servicios.
- **PWA**: Progressive Web App con soporte offline e instalación en dispositivo.

---

## Requirements

---

### Requisito 1: Capa de persistencia (Storage)

**User Story:** Como desarrollador, quiero una abstracción sobre localStorage, para que el resto de la app nunca acceda directamente a localStorage y pueda intercambiarse el backend en el futuro.

#### Criterios de aceptación

1. THE Storage SHALL exponer las operaciones asíncronas: `get(key): Promise<T | null>`, `set(key, value): Promise<void>`, `remove(key): Promise<void>`, `getAll(): Promise<Record<string, unknown>>` y `clear(): Promise<void>`.
2. THE Storage SHALL usar el prefijo `motomaint:` en todas las claves de localStorage.
3. WHEN `get` es invocado con una clave inexistente, THE Storage SHALL retornar `null`.
4. WHEN `set` es invocado con un valor, THE Storage SHALL serializar el valor a JSON antes de almacenarlo.
5. WHEN `get` es invocado con una clave existente, THE Storage SHALL deserializar el JSON y retornar el valor original.
6. IF `get` lanza una excepción de localStorage, THEN THE Storage SHALL capturar el error, registrarlo con `console.error` y retornar `null`.
7. IF `set`, `remove`, `getAll` o `clear` lanzan una excepción de localStorage, THEN THE Storage SHALL registrar el error con `console.error` y relanzar la excepción.
8. THE Storage SHALL ser implementado en TypeScript con tipos explícitos para la interfaz del adaptador.
9. FOR ALL valores `v` donde `v` es un primitivo (string, number, boolean, null) o un objeto/array compuesto recursivamente de primitivos, el resultado de `get(key)` después de `set(key, v)` SHALL ser estructuralmente equivalente a `v` (propiedad round-trip).

---

### Requisito 2: Capa de datos (Data)

**User Story:** Como desarrollador, quiero una capa de datos tipada en TypeScript, para que toda la lógica de acceso a los datos de la moto, servicios, historial y ajustes esté centralizada y sea type-safe.

#### Criterios de aceptación

1. THE Capa_de_Datos SHALL exponer operaciones para la entidad Moto: `getMoto`, `saveMoto`, `updateKm`.
2. THE Capa_de_Datos SHALL exponer operaciones para la entidad TipoServicio: `getServices`, `saveServices`, `addService`, `updateService`, `removeService`.
3. THE Capa_de_Datos SHALL exponer operaciones para la entidad Registro: `getHistory`, `addRecord`, `removeRecord`.
4. THE Capa_de_Datos SHALL exponer operaciones para la entidad Ajustes: `getSettings`, `saveSettings`.
5. THE Capa_de_Datos SHALL exponer operaciones de utilidad: `reset`, `exportAll`, `importAll`.
6. WHEN `getServices` es invocado y el Storage retorna `null`, un array vacío, o un array de longitud 0, THE Capa_de_Datos SHALL inicializar y persistir los 8 servicios por defecto: cambio de aceite, mantenimiento general, lavada, cadena, llantas, filtro de aire, bujía y frenos.
7. WHEN `updateKm` es invocado con un valor negativo o no numérico, THE Capa_de_Datos SHALL almacenar 0 como valor mínimo.
8. IF `updateKm` es invocado y no existe una Moto en Storage, THEN THE Capa_de_Datos SHALL lanzar un error con el mensaje `'No hay moto registrada'`.
9. WHEN `addRecord` es invocado, THE Capa_de_Datos SHALL insertar el nuevo registro al inicio del array (más reciente primero).
10. IF `importAll` es invocado con un payload `null`, `undefined`, o con campo `version` distinto de `1`, THEN THE Capa_de_Datos SHALL lanzar un error con el mensaje `'Formato de backup inválido'` sin modificar ningún dato en Storage.
11. WHEN `importAll` es invocado con un payload válido que omite alguna clave (moto, services, history, settings), THE Capa_de_Datos SHALL importar únicamente las claves presentes, sin sobrescribir las omitidas.
12. THE Capa_de_Datos SHALL definir y exportar interfaces TypeScript para Moto, TipoServicio, Registro y Ajustes.

---

### Requisito 3: Motor de cálculo de servicios (Engine)

**User Story:** Como usuario, quiero ver el estado actual de cada servicio de mi moto, para saber qué mantenimientos están próximos o vencidos.

#### Criterios de aceptación

1. THE Motor_de_Cálculo SHALL calcular el estado de cada TipoServicio habilitado a partir de los km actuales de la Moto, el historial de Registros y la configuración de intervalos.
2. WHEN un TipoServicio tiene `intervalKm` configurado (valor no nulo), THE Motor_de_Cálculo SHALL calcular `kmSinceLast`, `kmRemaining` y `kmProgress` (valor entre 0 y 1 inclusive).
3. WHEN un TipoServicio tiene `intervalDays` configurado (valor no nulo), THE Motor_de_Cálculo SHALL calcular `daysSinceLast`, `daysRemaining` y `daysProgress` (valor entre 0 y 1 inclusive).
4. WHEN un TipoServicio no tiene Registros previos y la Moto tiene km mayores a 0, THE Motor_de_Cálculo SHALL asumir que los km actuales son los km transcurridos desde el último servicio. WHEN un TipoServicio no tiene Registros previos y tiene `intervalDays` configurado, THE Motor_de_Cálculo SHALL asignar `daysRemaining = intervalDays` y `daysProgress = 0`.
5. THE Motor_de_Cálculo SHALL asignar StatusServicio `urgent` cuando algún intervalo configurado cumple `kmRemaining <= 0` o `daysRemaining <= 0`.
6. THE Motor_de_Cálculo SHALL asignar StatusServicio `warning` cuando algún intervalo configurado cumple `kmProgress >= 0.85` o `daysProgress >= 0.85`, y el estado no sea ya `urgent`.
7. THE Motor_de_Cálculo SHALL asignar StatusServicio `ok` cuando ninguna de las condiciones de `urgent` ni `warning` se cumpla para ningún intervalo configurado.
8. WHEN un TipoServicio tiene tanto `intervalKm` como `intervalDays`, THE Motor_de_Cálculo SHALL asignar el peor StatusServicio entre ambos criterios.
9. THE Motor_de_Cálculo SHALL exportar `formatServiceStatus(s)` que retorne: `'Vencido hace X km'` o `'Vencido hace X días'` cuando `status === 'urgent'`; `'Pronto: X km · Y días'` cuando `status === 'warning'`; `'Faltan X km · Y días'` cuando `status === 'ok'`; y `'Sin configurar'` cuando ningún intervalo está configurado.
10. THE Motor_de_Cálculo SHALL exportar `getMainProgress(s)` que retorne el máximo entre `kmProgress` y `daysProgress` para los intervalos configurados, y `0` si ningún intervalo está configurado.
11. FOR ALL valores de `kmSinceLast` entre 0 e `intervalKm`, `kmProgress` SHALL ser mayor o igual a 0 y menor o igual a 1.
12. FOR ALL valores de `daysSinceLast` entre 0 e `intervalDays`, `daysProgress` SHALL ser mayor o igual a 0 y menor o igual a 1.

---

### Requisito 4: Routing y navegación

**User Story:** Como usuario, quiero que la app me lleve automáticamente a la vista correcta según si ya tengo una moto registrada, para no tener que navegar manualmente.

#### Criterios de aceptación

1. WHEN la App carga por primera vez y no existe una Moto en Storage, THE App SHALL mostrar la vista Onboarding.
2. WHEN la App carga y ya existe una Moto en Storage, THE App SHALL mostrar la vista Dashboard.
3. WHEN el usuario completa el Onboarding, THE App SHALL navegar al Dashboard sin recargar la página completa.
4. WHEN el usuario navega a Settings desde el Dashboard, THE App SHALL mostrar la vista Settings.
5. WHEN el usuario presiona el botón de retroceso en Settings, THE App SHALL regresar al Dashboard.
6. THE App SHALL implementar el routing usando el App Router de Next.js con rutas `/` (Dashboard/Onboarding), `/settings`.
7. WHILE la App determina la vista inicial, THE App SHALL mostrar una pantalla de splash con el logo de MotoMaint y una animación durante al menos 600ms.
8. THE App SHALL ser una Single Page App sin recarga completa entre vistas.

---

### Requisito 5: Vista Onboarding

**User Story:** Como usuario nuevo, quiero registrar mi moto la primera vez, para que la app pueda calcular el estado de mis servicios.

#### Criterios de aceptación

1. THE Vista_Onboarding SHALL mostrar un formulario con los campos: Marca (texto, requerido, máximo 50 caracteres), Modelo (texto, requerido, máximo 50 caracteres), y Kilometraje actual (número, requerido, mínimo 0, máximo 999999).
2. WHEN el usuario envía el formulario con Marca y Modelo no vacíos tras aplicar `.trim()`, THE Vista_Onboarding SHALL guardar la Moto en Storage (con `kmActual` = valor ingresado o 0 si se dejó vacío) y mostrar un Toast de éxito.
3. WHEN la Moto se guarda exitosamente, THE Vista_Onboarding SHALL navegar al Dashboard.
4. IF el usuario envía el formulario con Marca o Modelo vacíos (o compuestos solo de espacios), THEN THE Vista_Onboarding SHALL mostrar un Toast de error con el mensaje `'Marca y modelo son requeridos'` sin navegar.
5. THE Vista_Onboarding SHALL mostrar la ilustración SVG de la moto con animación de flotación continua con ciclo de 3s ease-in-out.
6. THE Vista_Onboarding SHALL mostrar el texto "Tu moto, bien cuidada" con la palabra "bien cuidada" en degradado naranja definido por las variables `--primary` y `--primary-light` del tema.

---

### Requisito 6: Vista Dashboard — Tarjeta de moto

**User Story:** Como usuario, quiero ver y actualizar el kilometraje de mi moto desde la pantalla principal, para mantener actualizado el cálculo de servicios.

#### Criterios de aceptación

1. THE Vista_Dashboard SHALL mostrar una tarjeta con el nombre de la moto (marca + modelo), el km actual y los botones de ajuste rápido: `−100`, `+100`, `+500` y `Editar`.
2. WHEN el usuario presiona un botón de ajuste rápido de km, THE Vista_Dashboard SHALL actualizar el km en Storage y reflejar el nuevo valor en pantalla en ≤100ms.
3. IF el botón `−100` llevaría el km por debajo de 0, THEN THE Vista_Dashboard SHALL almacenar 0 y mostrar 0 en pantalla.
4. WHEN el usuario presiona el botón `Editar` de km, THE Vista_Dashboard SHALL abrir el Modal de edición de kilometraje.
5. WHEN el usuario presiona el ícono de edición junto al nombre de la moto, THE Vista_Dashboard SHALL abrir el Modal de edición de moto.
6. IF existen servicios con StatusServicio `urgent`, THEN THE Vista_Dashboard SHALL mostrar un alert con estilo rojo indicando la cantidad de servicios vencidos y no mostrar alert amarillo simultáneamente.
7. IF no hay servicios con StatusServicio `urgent` pero sí con `warning`, THEN THE Vista_Dashboard SHALL mostrar un alert con estilo amarillo indicando la cantidad de servicios por vencer.
8. IF no hay servicios con StatusServicio `urgent` ni `warning`, THEN THE Vista_Dashboard SHALL no mostrar ningún alert.

---

### Requisito 7: Vista Dashboard — Tabs de Servicios e Historial

**User Story:** Como usuario, quiero alternar entre la lista de servicios y el historial de mantenimientos en el Dashboard, para consultar ambos desde la misma pantalla.

#### Criterios de aceptación

1. THE Vista_Dashboard SHALL mostrar dos tabs: `Servicios` e `Historial`.
2. WHEN el usuario presiona el tab `Servicios`, THE Vista_Dashboard SHALL mostrar la lista de servicios habilitados con su estado.
3. WHEN el usuario presiona el tab `Historial`, THE Vista_Dashboard SHALL mostrar los últimos 30 registros del historial.
4. THE Vista_Dashboard SHALL mostrar la tab `Servicios` activa por defecto al cargar.
5. WHEN no hay servicios habilitados, THE Vista_Dashboard SHALL mostrar un estado vacío con el mensaje `'No hay servicios configurados. Ve a Ajustes para agregar.'`.
6. WHEN no hay registros en el historial, THE Vista_Dashboard SHALL mostrar un estado vacío con el mensaje `'Sin mantenimientos registrados aún. ¡Registra el primero!'`.

---

### Requisito 8: Vista Dashboard — Tarjetas de servicios

**User Story:** Como usuario, quiero ver el estado de cada servicio con barra de progreso, para entender de un vistazo qué mantenimientos necesito hacer.

#### Criterios de aceptación

1. THE Vista_Dashboard SHALL renderizar una tarjeta por cada TipoServicio habilitado con: icono, nombre, texto de estado, barra de progreso y botón de marcar como hecho.
2. THE Vista_Dashboard SHALL aplicar el color correspondiente a la barra de progreso: rojo para `urgent`, amarillo para `warning`, naranja para `ok`.
3. WHEN el usuario presiona una tarjeta de servicio (fuera del botón de check), THE Vista_Dashboard SHALL abrir el Modal de detalle del servicio.
4. WHEN el usuario presiona el botón de check de un servicio, THE Vista_Dashboard SHALL abrir el Modal de registro de mantenimiento con ese servicio preseleccionado.

---

### Requisito 9: Vista Dashboard — Historial

**User Story:** Como usuario, quiero ver y eliminar registros del historial, para mantener actualizado el registro de mantenimientos.

#### Criterios de aceptación

1. THE Vista_Dashboard SHALL mostrar cada Registro con: icono del servicio, nombre del servicio, km del registro, fecha relativa y notas (si existen).
2. WHEN el usuario presiona el botón de eliminar de un Registro, THE Vista_Dashboard SHALL mostrar un diálogo de confirmación antes de eliminar.
3. WHEN el usuario confirma la eliminación, THE Vista_Dashboard SHALL eliminar el Registro de Storage y actualizar la lista en pantalla.

---

### Requisito 10: FAB y Modal de registro de mantenimiento

**User Story:** Como usuario, quiero registrar un mantenimiento rápidamente desde el Dashboard, para no tener que navegar a otra pantalla.

#### Criterios de aceptación

1. THE Vista_Dashboard SHALL mostrar un FAB con el texto `Registrar mantenimiento` visible en pantallas anchas y solo el ícono `+` en móvil (≤480px).
2. WHEN el usuario presiona el FAB, THE Vista_Dashboard SHALL abrir el Modal selector de servicio.
3. THE Modal_Selector_Servicio SHALL mostrar los servicios habilitados en una cuadrícula de 2 columnas con icono, nombre y estado de cada uno.
4. WHEN el usuario selecciona un servicio en el Modal_Selector_Servicio, THE App SHALL cerrar ese modal y abrir el Modal de registro con el servicio seleccionado.
5. THE Modal_Registro SHALL mostrar el icono y nombre del servicio, un campo de km (con el valor actual de la moto por defecto) y un campo de notas opcional.
6. WHEN el usuario guarda el registro, THE Modal_Registro SHALL persistir el Registro en Storage, actualizar el km de la moto si el km del servicio es mayor, mostrar un Toast de éxito y navegar al Dashboard.

---

### Requisito 11: Vista Settings — Moto

**User Story:** Como usuario, quiero editar los datos de mi moto desde Ajustes, para corregir el nombre o el kilometraje.

#### Criterios de aceptación

1. THE Vista_Settings SHALL mostrar una fila con los datos actuales de la moto (marca, modelo, km).
2. WHEN el usuario presiona la fila de la moto, THE Vista_Settings SHALL abrir el Modal de edición de moto.
3. THE Modal_Edición_Moto SHALL tener campos para Marca, Modelo y Kilometraje actual.
4. WHEN el usuario guarda los cambios de la moto, THE Vista_Settings SHALL persistir los datos en Storage y mostrar un Toast de éxito.

---

### Requisito 12: Vista Settings — Gestión de servicios

**User Story:** Como usuario, quiero agregar, editar, activar/desactivar y eliminar tipos de servicio, para personalizar los mantenimientos de mi moto.

#### Criterios de aceptación

1. THE Vista_Settings SHALL mostrar la lista de todos los TipoServicio (habilitados y deshabilitados) con nombre, icono e intervalo configurado.
2. WHEN el usuario presiona una fila de TipoServicio, THE Vista_Settings SHALL abrir el Modal de edición de servicio.
3. THE Modal_Edición_Servicio SHALL tener campos para: nombre, icon picker, intervalo en km e intervalo en días.
4. THE Modal_Edición_Servicio SHALL mostrar botones `Activar`/`Desactivar` y `Eliminar` cuando se edita un servicio existente (no en creación).
5. WHEN el usuario presiona el botón `Agregar servicio personalizado`, THE Vista_Settings SHALL abrir el Modal de edición de servicio en modo creación (sin botones de toggle/eliminar).
6. WHEN el usuario guarda un servicio nuevo, THE Capa_de_Datos SHALL asignarle un ID único con el formato `svc_<timestamp>_<random>`.
7. WHEN el usuario presiona `Eliminar`, THE Modal_Edición_Servicio SHALL mostrar un diálogo de confirmación antes de eliminar el servicio.
8. THE Modal_Edición_Servicio SHALL incluir un icon picker con los 32 emojis del catálogo de iconos.
9. IF el usuario guarda un servicio sin nombre, THEN THE Modal_Edición_Servicio SHALL mostrar un Toast de error `'El nombre es requerido'` sin cerrar el modal.

---

### Requisito 13: Vista Settings — Exportar e importar datos

**User Story:** Como usuario, quiero exportar e importar un respaldo JSON de mis datos, para no perder mi información al cambiar de dispositivo.

#### Criterios de aceptación

1. THE Vista_Settings SHALL mostrar un botón `Exportar respaldo (JSON)`.
2. WHEN el usuario presiona `Exportar respaldo`, THE Vista_Settings SHALL generar y descargar un archivo JSON con el formato `{ version: 1, exportedAt, moto, services, history, settings }` y nombre `motomaint-backup-YYYY-MM-DD.json`.
3. THE Vista_Settings SHALL mostrar un botón `Importar respaldo`.
4. WHEN el usuario presiona `Importar respaldo`, THE Vista_Settings SHALL abrir el selector de archivos del sistema operativo filtrando por `.json`.
5. WHEN el usuario selecciona un archivo JSON válido (version 1), THE Vista_Settings SHALL restaurar todos los datos en Storage, mostrar un Toast de éxito y navegar al Dashboard.
6. IF el usuario selecciona un archivo JSON con formato inválido, THEN THE Vista_Settings SHALL mostrar un Toast de error `'Archivo inválido'`.

---

### Requisito 14: Vista Settings — Reset total

**User Story:** Como usuario, quiero poder borrar todos mis datos y empezar de cero, para resetear la app completamente.

#### Criterios de aceptación

1. THE Vista_Settings SHALL mostrar un botón `Borrar todo y empezar de cero` con estilo de peligro.
2. WHEN el usuario presiona el botón de reset, THE Vista_Settings SHALL mostrar un diálogo de confirmación con el mensaje `'Se eliminarán la moto, servicios e historial. Esta acción no se puede deshacer.'`.
3. WHEN el usuario confirma el reset, THE Vista_Settings SHALL limpiar todas las claves de Storage con prefijo `motomaint:` y navegar al Onboarding.

---

### Requisito 15: Componentes de UI reutilizables

**User Story:** Como desarrollador, quiero componentes de UI encapsulados para Toast, Modal y diálogo de confirmación, para usarlos en cualquier vista sin duplicar lógica.

#### Criterios de aceptación

1. THE Sistema_UI SHALL proveer un hook `useToast()` que exponga `showToast(message: string, type?: ToastType, duration?: number)`, donde `message` tiene un máximo de 120 caracteres y `duration` está entre 500ms y 10000ms.
2. WHEN `showToast` es invocado, THE Toast SHALL aparecer en la parte inferior de la pantalla, encima del FAB, y desaparecer automáticamente después de `duration` ms (por defecto 2500ms).
3. THE Toast SHALL soportar los tipos: `default`, `success` (borde verde) y `danger` (borde rojo).
4. WHEN un Toast ya está visible y `showToast` es invocado nuevamente, THE Sistema_UI SHALL reemplazar el Toast visible con el nuevo mensaje y reiniciar el temporizador de desaparición.
5. THE Sistema_UI SHALL proveer un componente Modal que se renderice como bottom sheet con animación `slideUp` de 300ms.
6. THE Modal SHALL aceptar: título (string, obligatorio), subtítulo (string, opcional), contenido del body (ReactNode) y array de hasta 4 acciones (botones).
7. WHEN el usuario toca el backdrop fuera del Modal, THE Modal SHALL cerrarse.
8. THE Sistema_UI SHALL proveer un componente `ConfirmDialog` con props: `title`, `message`, `confirmLabel`, `cancelLabel`, `danger`, `onConfirm: () => void` y `onCancel: () => void`.
9. THE Sistema_UI SHALL proveer las funciones helper: `formatDate(iso: string)` que retorna fechas relativas en español, y `formatNumber(n: number)` que formatea números con separador de miles en locale `es-CO`.
10. WHEN `formatDate` recibe una fecha de hoy (mismo año, mes y día en timezone local), THE Sistema_UI SHALL retornar `'Hoy'`.
11. WHEN `formatDate` recibe una fecha de ayer (día anterior en timezone local), THE Sistema_UI SHALL retornar `'Ayer'`.
12. WHEN `formatDate` recibe una fecha de los últimos 7 días (excluyendo hoy y ayer), THE Sistema_UI SHALL retornar `'Hace N días'` donde N es el número de días completos transcurridos.
13. WHEN `formatDate` recibe un string que no es una fecha ISO 8601 válida, THE Sistema_UI SHALL retornar una cadena vacía `''`.

---

### Requisito 16: Diseño visual y tema

**User Story:** Como usuario, quiero que la app migrada tenga exactamente el mismo aspecto visual que la app original, para no notar diferencia en la interfaz.

#### Criterios de aceptación

1. THE App SHALL implementar el tema oscuro usando las variables CSS definidas en el diseño original (--bg: #0f1115, --primary: #ff7a18, etc.).
2. THE App SHALL usar las fuentes `Inter` (texto general) y `Space Grotesk` (títulos y números grandes).
3. THE App SHALL usar Tailwind CSS v4 para los estilos utilitarios, complementado con variables CSS custom para los valores del tema.
4. THE App SHALL implementar todas las animaciones originales: `slideIn`, `slideUp`, `fadeIn`, `pop`, `float`, `pulse`.
5. THE App SHALL ser mobile-first con un ancho máximo de 480px centrado en pantalla.
6. THE App SHALL aplicar `env(safe-area-inset-bottom)` para compatibilidad con notch en iOS.
7. THE App SHALL implementar el fondo con degradado radial naranja sutil en la parte superior.

---

### Requisito 17: PWA y soporte offline

**User Story:** Como usuario, quiero instalar MotoMaint en mi dispositivo como una app nativa, para acceder a ella sin navegador y usarla sin conexión.

#### Criterios de aceptación

1. THE App SHALL incluir un `manifest.json` con `name: "MotoMaint"`, `display: "standalone"`, `background_color: "#0f1115"` y `theme_color: "#0f1115"`.
2. THE App SHALL funcionar completamente sin conexión a internet, dado que toda la persistencia es en localStorage.
3. THE App SHALL incluir el meta tag `viewport` con `width=device-width, initial-scale=1, viewport-fit=cover`.
4. THE App SHALL incluir el meta tag `apple-mobile-web-app-capable` para soporte en iOS.

---

### Requisito 18: Tipos TypeScript

**User Story:** Como desarrollador, quiero que toda la lógica de negocio esté completamente tipada en TypeScript, para tener seguridad de tipos en toda la capa de datos y el motor de cálculo.

#### Criterios de aceptación

1. THE App SHALL definir y exportar el tipo `Moto` con los campos `marca: string`, `modelo: string`, `kmActual: number`, `createdAt: string` y `updatedAt: string`.
2. THE App SHALL definir y exportar el tipo `TipoServicio` con los campos `id: string`, `name: string`, `icon: string`, `intervalKm: number | null`, `intervalDays: number | null` y `enabled: boolean`.
3. THE App SHALL definir y exportar el tipo `Registro` con los campos `id: string`, `serviceId: string`, `serviceName: string`, `serviceIcon: string`, `km: number`, `date: string` y `notes: string`.
4. THE App SHALL definir y exportar el tipo `Ajustes` con los campos `currency: string`, `language: string` y `notifications: boolean`.
5. THE App SHALL definir y exportar el tipo `ServicioCalculado` que extiende `TipoServicio` con los campos: `lastRecord: { km: number; date: string } | null`, `kmSinceLast: number | null`, `kmRemaining: number | null`, `kmProgress: number`, `daysSinceLast: number | null`, `daysRemaining: number | null`, `daysProgress: number` y `status: 'ok' | 'warning' | 'urgent'`.
6. WHEN el compilador TypeScript ejecuta sobre el proyecto con `strict: true`, THE App SHALL producir cero errores de compilación.
