// === DB/SCHEMA.RS — Esquema SQLite e inicialización de la base de datos ===

use rusqlite::{Connection, Result};

/// SQL para crear el esquema completo de la base de datos local.
/// Usa IF NOT EXISTS para que sea idempotente en cada arranque.
const SCHEMA_SQL: &str = "
CREATE TABLE IF NOT EXISTS files (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    size_bytes      INTEGER NOT NULL DEFAULT 0,
    mime_type       TEXT NOT NULL DEFAULT 'application/octet-stream',
    folder_id       TEXT NOT NULL DEFAULT 'self',
    telegram_file_id TEXT NOT NULL DEFAULT '',
    created_at      INTEGER NOT NULL,
    synced_at       INTEGER NOT NULL DEFAULT 0,
    is_encrypted    INTEGER NOT NULL DEFAULT 0,
    thumbnail_path  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS folders (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    parent_id           TEXT,
    telegram_channel_id TEXT NOT NULL,
    created_at          INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS config (
    key     TEXT PRIMARY KEY,
    value   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files (folder_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files (created_at DESC);
";

/// Inicializa la base de datos SQLite local.
/// La DB se crea en el directorio de datos de la app (gestionado por Tauri).
pub fn initialize_database(db_path: &str) -> Result<Connection> {
    let conn = Connection::open(db_path)?;
    
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    conn.execute_batch(SCHEMA_SQL)?;

    // Migración para DBs existentes sin thumbnail_path
    let _ = conn.execute_batch("ALTER TABLE files ADD COLUMN thumbnail_path TEXT NOT NULL DEFAULT ''");

    log::info!("db::schema: base de datos inicializada en {}", db_path);
    Ok(conn)
}
