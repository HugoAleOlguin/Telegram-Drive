# Telegram Drive — AI Agent Guide

## Quick Start

```bash
npm run tauri dev    # Dev (needs Admin terminal for ports)
npm run tauri build  # Production build
npm run portable     # Copy .exe as portable
```

## Architecture

```
Frontend (React+TS)          Backend (Rust+Tauri)
┌─────────────────┐          ┌──────────────────┐
│ App.tsx         │          │ lib.rs           │
│  ├ LoginPage    │◄────────►│  ├ commands/     │
│  └ DrivePage    │  invoke()│  │  ├ auth.rs    │
│                 │          │  │  ├ files.rs   │
│ services/       │          │  │  └ updater.rs │
│  tauri-bridge.ts│◄────────►│  ├ telegram/     │
│                 │  Result  │  │  └ client.rs  │
│ components/     │          │  └ db/           │
│  FileCard       │          │     └ schema.rs  │
│  FileIcon       │          │                  │
│  ContextMenu    │          │ SQLite local DB  │
│  RenameDialog   │          │ (files index)    │
│  ApiGuide       │          │                  │
└─────────────────┘          └──────────────────┘
```

## Key Constraints (DO NOT BREAK)

1. **Dark theme only** — No light mode. `tokens.css` has no `[data-theme="light"]`.
2. **Custom backgrounds** — User can select image background and blur level via Settings.
3. **No snake game** — Completely removed.
4. **No folder management** — Simplified mode, only Saved Messages (`folder_id = 'self'`).
5. **All UI text goes through `t()`** — i18n keys in `src/locales/index.tsx`.
6. **`@keyframes` only in `global.css`** — Module CSS files use utility classes.
7. **Shared utils in `src/utils/`** — `format.ts`, `accent-colors.ts`.

## File Map

### Frontend Entry Points
| File | Purpose |
|------|---------|
| `src/main.tsx` | React root, mounts App |
| `src/App.tsx` | Router: loading → login → drive. Applies accent on mount |
| `src/types/index.ts` | `TelegramCredentials`, `DriveFile` interfaces |
| `src/locales/index.tsx` | i18n context (EN/ES). `useTranslation()` returns `{t, ml, lang, setLang}` |

### Pages
| File | Purpose |
|------|---------|
| `src/pages/LoginPage/LoginPage.tsx` | 2-step auth: (1) API credentials → (2) OTP code |
| `src/pages/DrivePage/DrivePage.tsx` | Main app: file grid/list, search, filters, settings, upload queue |

### Components
| Component | Purpose |
|-----------|---------|
| `FileCard` | File display in grid or list view. Uses `formatSize` from utils |
| `FileIcon` | SVG icons per file type. `FILE_COLORS`, `FILE_BG`, `FILE_LABEL` exports |
| `ContextMenu` | Right-click menu. Props: `x, y, items[], onClose` |
| `RenameDialog` | Modal for renaming. Props: `currentName, onConfirm, onCancel` |
| `ApiGuide` | Step-by-step guide modal for API credentials. Uses images in `public/guia/` |

### Services
| File | Purpose |
|------|---------|
| `src/services/tauri-bridge.ts` | Thin wrapper over `invoke()`. Exports: auth, file CRUD, sync |
| `src/services/updater.ts` | Frontend update state machine. Calls Rust commands |

### Utils
| File | Purpose |
|------|---------|
| `src/utils/format.ts` | `formatSize(bytes)` — shared file size formatter |
| `src/utils/accent-colors.ts` | `ACCENT_COLORS` array + `applyAccentColor(hex)` |

### Styles
| File | Purpose |
|------|---------|
| `src/styles/tokens.css` | CSS custom properties. Dark theme only. |
| `src/styles/global.css` | Reset, animations, utility classes (`.fade-in`, `.truncate`, etc.) |

### Rust Backend
| File | Purpose |
|------|---------|
| `src-tauri/src/lib.rs` | Tauri builder, `AppState` (TelegramClient + SQLite), command registration |
| `src-tauri/src/commands/auth.rs` | `auth_login`, `auth_verify_code`, `auth_logout`, `auth_check_session` |
| `src-tauri/src/commands/files.rs` | `list_files`, `upload_file`, `download_file`, `delete_file`, `rename_file`, `sync_files` |
| `src-tauri/src/commands/updater.rs` | `check_update`, `download_update`, `install_update` (GitHub Releases) |
| `src-tauri/src/telegram/client.rs` | `TelegramClient` wrapper over grammers. Connect, auth, upload, download, delete |
| `src-tauri/src/db/schema.rs` | SQLite schema: `files` table + `config` table |

## Auth Flow

```
1. User enters API ID, API Hash, Phone → authLogin()
2. Rust: TelegramClient::connect() → requests OTP code
3. User enters OTP → authVerifyCode()
4. Rust: client.sign_in() → saves session to telegram.session
5. Session persists across restarts via authCheckSession()
```

## File Flow

```
Upload:   openDialog() → uploadFile(path) → Rust uploads to Saved Messages → inserts into SQLite
Download: save() dialog → downloadFile(id, destPath) → Rust downloads from Telegram
Delete:   deleteFile(id) → Rust deletes message from Telegram → removes from SQLite
Rename:   renameFile(id, newName) → Only updates local SQLite (Telegram message unchanged)
Sync:     syncFiles() → Rust fetches Saved Messages → inserts missing into SQLite → returns list
```

## Update Flow

```
check_update(currentVersion) → GitHub API → compares versions → returns UpdateInfo
download_update(url) → Downloads .exe to temp dir → returns temp path
install_update(tempPath) → Creates .bat script → replaces current .exe → restarts app
```

## Database Schema

```sql
files (
  id TEXT PRIMARY KEY,        -- "msgId@self"
  name TEXT NOT NULL,
  size_bytes INTEGER,
  mime_type TEXT,
  folder_id TEXT DEFAULT 'self',
  telegram_file_id TEXT,
  created_at INTEGER,          -- Unix timestamp
  synced_at INTEGER,
  is_encrypted INTEGER,
  thumbnail_path TEXT
)

config (
  key TEXT PRIMARY KEY,        -- 'api_id', 'api_hash', 'phone_number'
  value TEXT
)
```

## Tauri Commands (invoke names)

| Command | Rust Function | Returns |
|---------|--------------|---------|
| `auth_login` | `auth::auth_login` | `()` |
| `auth_verify_code` | `auth::auth_verify_code` | `()` |
| `auth_logout` | `auth::auth_logout` | `()` |
| `auth_check_session` | `auth::auth_check_session` | `bool` |
| `list_files` | `files::list_files` | `DriveFile[]` |
| `upload_file` | `files::upload_file` | `string (file id)` |
| `download_file` | `files::download_file` | `()` |
| `delete_file` | `files::delete_file` | `()` |
| `rename_file` | `files::rename_file` | `()` |
| `sync_files` | `files::sync_files` | `DriveFile[]` |
| `check_update` | `updater::check_update` | `UpdateInfo` |
| `download_update` | `updater::download_update` | `string (temp path)` |
| `install_update` | `updater::install_update` | `()` |

## Dependencies

### Frontend
- React 19, TypeScript, Vite 7
- TanStack Query (state/server cache)
- Tauri API (dialog, opener, process)

### Backend
- Tauri 2, grammers (Telegram MTProto)
- rusqlite (SQLite), tokio (async)
- ureq (HTTP for updates), serde (serialization)

## Common Tasks

### Add a new Tauri command
1. Add function in `src-tauri/src/commands/xxx.rs` with `#[command]`
2. Export in `src-tauri/src/commands/mod.rs`
3. Register in `src-tauri/src/lib.rs` invoke_handler
4. Add wrapper in `src/services/tauri-bridge.ts`

### Add a new translation key
1. Add to both `en` and `es` objects in `src/locales/index.tsx`
2. Use via `const { t } = useTranslation(); t('key')`

### Add a new CSS animation
1. Add `@keyframes` to `src/styles/global.css`
2. Create utility class like `.slide-up { animation: slideUp 0.3s ease-out; }`

## What Was Removed (Do NOT Re-add)

- Snake game
- Light theme / theme picker
- Folder management (FolderTree, folders.rs)
- FileExplorer, SearchBar standalone components
- getThumbnail command
- Unused CSS tokens (gradients, solids, accent presets)
- Unused npm deps: `@tauri-apps/plugin-shell`
- Unused Rust deps: `thiserror`, `uuid`

## Build Output

- CSS: ~39kB (gzipped ~7.5kB)
- JS: ~289kB (gzipped ~87kB)
- Rust binary: optimized release
