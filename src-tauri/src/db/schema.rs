use rusqlite::{Connection, Result};

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

CREATE TABLE IF NOT EXISTS config (
    key     TEXT PRIMARY KEY,
    value   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files (folder_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files (created_at DESC);

CREATE TABLE IF NOT EXISTS folders (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    parent_id   TEXT,
    packed_chat TEXT NOT NULL,
    channel_id  INTEGER NOT NULL,
    created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders (parent_id);
";

pub fn initialize_database(db_path: &str) -> Result<Connection> {
    let conn = Connection::open(db_path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    conn.execute_batch(SCHEMA_SQL)?;
    let _ = conn.execute_batch("ALTER TABLE files ADD COLUMN thumbnail_path TEXT NOT NULL DEFAULT ''");
    // Migration: drop old folders table (pre-channel version) and recreate with new schema
    let needs_migration = conn.query_row(
        "SELECT COUNT(*) FROM pragma_table_info('folders') WHERE name = 'packed_chat'",
        [],
        |row| row.get::<_, i64>(0),
    ).unwrap_or(0) == 0;
    if needs_migration {
        let _ = conn.execute_batch("DROP TABLE IF EXISTS folders");
        let _ = conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS folders (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                parent_id   TEXT,
                packed_chat TEXT NOT NULL,
                channel_id  INTEGER NOT NULL,
                created_at  INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders (parent_id);"
        );
        log::info!("db::schema: migrated folders table to channel-based schema");
    }
    log::info!("db::schema: initialized at {}", db_path);
    Ok(conn)
}
