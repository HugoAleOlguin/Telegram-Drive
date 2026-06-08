# Release v1.777 — Subcarpetas Jerárquicas, Drag & Drop QOL y Optimización Estática

## Novedades

### 1. Subcarpetas y Organización Jerárquica
- **Nombres Estructurados `[TD] Parent > Child`**: Los canales de Telegram creados ahora reflejan de manera exacta la ruta de directorios (ej: `[TD] Proyectos > Desarrollo > Documentos`).
- **Renombrado en Cascada**: Renombrar una carpeta propaga de manera recursiva e inmediata el cambio de título a los canales de todas sus subcarpetas descendientes.
- **Barra de Dirección Permanente**: La barra de breadcrumbs (`Mi Drive > Carpeta > Subcarpeta`) está siempre visible, incluyendo en el directorio raíz.
- **Menú Contextual de Clic Derecho**: Opción rápida de "Nueva carpeta" al hacer clic derecho sobre el fondo.

### 2. Rendimiento Absoluto (Cero Animaciones)
- **Interfaz 100% Estática**: Se eliminaron por completo todos los keyframes, transiciones y efectos visuales de CSS para lograr carga instantánea y nulo retardo visual.
- **Desplazamiento Directo**: Se forzó el comportamiento de desplazamiento instantáneo (`scroll-behavior: auto !important`) de forma global.
- **Limpieza de Ajustes**: Se eliminó el selector de "Animaciones" de la ventana de configuración, manteniendo la UI limpia y liviana.

### 3. Drag & Drop y Gestión de Subidas
- **Arrastre a Nivel de Ventana**: Detección nativa del arrastre de archivos sobre cualquier sección del programa mediante Tauri v2.
- **Subida de Carpetas Completas**: Soporte para arrastrar carpetas enteras de forma que se recrea su estructura de directorios recursivamente en Telegram.
- **Carga Progresiva**: Actualización en tiempo real de la lista de archivos a medida que cada subida finaliza, sin esperar al resto de la cola.
- **Cola de Progreso Detallada**: Muestra el progreso individual en bytes y porcentaje para cada archivo de forma independiente.

### 4. Icono ZIP Clásico de la Beta
- **Restauración de Icono Hexagonal**: Se restauró el icono ZIP clásico de la beta: un cubo isométrico plano con forma de hexágono y punto central sólido, libre de hovers.

---

# Release v1.6.5 — UI Refresh & Session Cleanup

## What's new

- **Dark theme redesigned** — true AMOLED black background (`#000000`), silver-toned text, deeper panels
- **Light theme refined** — warm grey surfaces instead of pure white, softer contrast
- **Telegram paper plane logo** on loading screen and login page
- **Logout confirmation modal** — warns that local data will be deleted, then fully clears session file, credentials, and localStorage
- **Larger default window** — 1100×750 (was 800×600)
- **Animated loading screen** — pulsing logo + bouncing dots
- **Staggered skeleton cards** — shimmer loading with fade-in delay per card

## Fixes

- External links (GitHub, Portfolio, my.telegram.org) now open in the system browser via Tauri's opener plugin
- `auth_logout` properly deletes `telegram.session` and config data from the local database

## Notes

- Session data is now fully removed on sign out. Files uploaded to Telegram remain intact.
