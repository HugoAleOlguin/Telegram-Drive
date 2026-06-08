# Telegram Drive

Tauri desktop app que usa Telegram como almacenamiento cloud ilimitado.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript + Vite 7 |
| Backend | Rust + Tauri 2 |
| Telegram | grammers (MTProto userbot) |
| DB local | SQLite (rusqlite) |
| State | TanStack Query |
| i18n | EN / ES |

## Estructura del Proyecto

```
src/
  App.tsx                    # Router loading/login/drive
  main.tsx                   # Entry point
  types/index.ts             # TypeScript interfaces
  locales/index.tsx          # i18n (EN/ES)
  utils/
    format.ts                # formatSize()
    accent-colors.ts         # ACCENT_COLORS + applyAccentColor()
  styles/
    global.css               # Reset, animations, utility classes
    tokens.css               # CSS custom properties (dark theme only)
  pages/
    LoginPage/               # API credentials + OTP verification
    DrivePage/               # Main file browser (grid/list, filters, search)
  components/
    FileCard/                # File card (grid + list views)
    FileIcon/                # File type icons with colors
    ContextMenu/             # Right-click context menu
    RenameDialog/            # Rename file modal
    ApiGuide/                # API credentials help modal
  services/
    tauri-bridge.ts          # Frontend → Rust invoke() layer
    updater.ts               # GitHub release update checker

src-tauri/
  src/
    lib.rs                   # Tauri app builder, state management
    commands/
      mod.rs                 # Module exports
      auth.rs                # Login, verify, logout, session check
      files.rs               # Upload, download, delete, rename, sync
      updater.rs             # Check, download, install updates
    telegram/
      client.rs              # grammers Telegram client wrapper
    db/
      schema.rs              # SQLite schema + initialization
```

## Comandos

```bash
# Desarrollo (requiere terminal como Administrador por puertos)
npm run tauri dev

# Build producción
npm run tauri build

# Build solo frontend
npm run build

# Crear exe portable
npm run portable
```

## Arquitectura

### Flujo de autenticación
1. Usuario ingresa API ID, API Hash y teléfono
2. `authLogin()` → Rust inicia sesión grammers
3. Telegram envía código OTP
4. `authVerifyCode()` → Rust verifica y guarda sesión
5. Sesión persiste en archivo `.session`

### Flujo de archivos
1. `syncFiles()` → Rust lee Saved Messages de Telegram → SQLite
2. `listFiles()` → Lee índice SQLite
3. `uploadFile()` → Sube archivo vía grammers → actualiza SQLite
4. `downloadFile()` → Descarga de Telegram a ruta local
5. `deleteFile()` → Borra mensaje de Telegram + índice SQLite
6. `renameFile()` → Solo renombra en índice local

### Update system
1. `checkUpdate()` → Consulta GitHub Releases API
2. `downloadUpdate()` → Descarga `.exe` a temp
3. `installUpdate()` → Ejecuta el nuevo `.exe` y cierra el actual

## CSS Tokens

Tema **dark-only** (AMOLED black). Sin tema claro.

- `--tg-accent` / `--tg-accent-dark` / `--tg-accent-dim`: Color principal configurable
- `--surface-*`: Superficies (bg, panel, input, hover, divider)
- `--text-*`: Jerarquía de texto (primary, secondary, muted)
- `--shadow-*`: Sombras
- `--radius-*`: Bordes redondeados
- `--space-*`: Espaciado

## Convenciones

- **Sin tema claro**: Solo dark mode AMOLED
- **Sin fondos personalizados**: Background fijo oscuro con glassmorphism
- **Sin snake game**: Eliminado completamente
- **Sin carpetas**: Modo simplificado, solo Saved Messages
- **i18n**: Todos los textos visibles pasan por `t()`
- **CSS**: `@keyframes` solo en `global.css`, módulos usan las clases utilitarias
- **Utils**: Funciones compartidas en `src/utils/`

## Bugs Fixados en esta limpieza

| Bug | Fix |
|-----|-----|
| `IconVideo` usaba `FILE_COLORS.image` | → `FILE_COLORS.video` |
| Video label decía `'IMG'` | → `'VID'` |
| `RenameDialog` strings hardcodeados en español | → Usa `t()` |
| `is_newer()` en Rust tenía nombre invertido | → `is_older_than()` |
| Duplicate `@keyframes` en 4 archivos CSS | → Solo en `global.css` |
| `formatSize` duplicado en DrivePage y FileCard | → `src/utils/format.ts` |
| Accent color map duplicado en App y DrivePage | → `src/utils/accent-colors.ts` |

## Código Eliminado

| Categoría | Archivos/Líneas |
|-----------|----------------|
| Snake game | `SnakeGame.tsx` + `.css` (346 líneas) |
| FileExplorer (no usado) | `FileExplorer.tsx` + `.css` (96 líneas) |
| FolderTree (no usado) | `FolderTree.tsx` + `.css` (102 líneas) |
| SearchBar (no usado) | `SearchBar.tsx` + `.css` (77 líneas) |
| Background/blur UI | ~80 líneas en DrivePage + CSS |
| Theme picker | ~20 líneas en DrivePage + CSS |
| Light theme CSS | ~40 líneas en tokens.css |
| Unused CSS tokens | ~60 líneas (gradients, solids, accent presets) |
| Duplicate @keyframes | ~15 líneas en 4 archivos |
| Unused translation keys | 16 líneas (snake, bg, theme) |
| Unused Rust code | `folders.rs` (37 líneas), `get_thumbnail` (22 líneas) |
| Unused deps | `@tauri-apps/plugin-shell`, `thiserror`, `uuid` |

## Resultado

- **CSS**: 46.83kB → 38.78kB (-17%)
- **JS**: 300.71kB → 288.53kB (-4%)
- **0 warnings** TypeScript
- **0 warnings** Rust
- **0 errors** build
