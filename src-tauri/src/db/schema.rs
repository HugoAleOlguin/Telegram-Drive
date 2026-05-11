// === DB/SCHEMA.RS — Esquema SQLite e inicialización de la base de datos ===

use rusqlite::{Connection, Result};

/// SQL para crear el esquema completo de la base de datos local.
/// Usa IF NOT EXISTS para que sea idempotente en cada arranque.
const SCHEMA_SQL: &str = "
-- Índice de archivos sincronizados desde Telegram
CREATE TABLE IF NOT EXISTS files (
    id              TEXT PRIMARY KEY,   -- '{message_id}@{channel_id}'
    name            TEXT NOT NULL,
    size_bytes      INTEGER NOT NULL DEFAULT 0,
    mime_type       TEXT NOT NULL DEFAULT 'application/octet-stream',
    folder_id       TEXT NOT NULL,      -- channel_id o 'saved_messages'
    telegram_file_id TEXT NOT NULL,     -- file_id de Telegram (para descarga)
    created_at      INTEGER NOT NULL,   -- Unix timestamp
    synced_at       INTEGER NOT NULL,   -- Cuándo se indexó localmente
    is_encrypted    INTEGER NOT NULL DEFAULT 0
);

-- Índice de carpetas (canales privados de Telegram)
CREATE TABLE IF NOT EXISTS folders (
    id                  TEXT PRIMARY KEY,   -- channel_id de Telegram
    name                TEXT NOT NULL,
    parent_id           TEXT,               -- NULL = carpeta raíz
    telegram_channel_id TEXT NOT NULL,
    created_at          INTEGER NOT NULL
);

-- Configuración y estado de la sesión
CREATE TABLE IF NOT EXISTS config (
    key     TEXT PRIMARY KEY,
    value   TEXT NOT NULL
);

-- FTS5: Búsqueda full-text sobre nombres de archivo
CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
    name,
    mime_type,
    folder_id UNINDEXED,
    content='files',
    content_rowid='rowid'
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files (folder_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders (parent_id);
";

/// Inicializa la base de datos SQLite local.
/// La DB se crea en el directorio de datos de la app (gestionado por Tauri).
pub fn initialize_database(db_path: &str) -> Result<Connection> {
    let conn = Connection::open(db_path)?;
    
    // Activa WAL mode para mejor rendimiento en lecturas concurrentes
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    
    // Crea el esquema si no existe
    conn.execute_batch(SCHEMA_SQL)?;
    
    log::info!("db::schema: base de datos inicializada en {}", db_path);
    
    Ok(conn)
}
