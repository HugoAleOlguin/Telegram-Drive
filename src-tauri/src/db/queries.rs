// === DB/QUERIES.RS — Queries del índice SQLite local ===
// Contiene funciones de lectura/escritura sobre el índice de metadatos

use rusqlite::{Connection, Result, params};

/// Inserta o actualiza un archivo en el índice local.
/// Usa INSERT OR REPLACE para manejar re-sincronizaciones.
pub fn upsert_file(
    conn: &Connection,
    id: &str,
    name: &str,
    size_bytes: i64,
    mime_type: &str,
    folder_id: &str,
    telegram_file_id: &str,
    created_at: i64,
    is_encrypted: bool,
) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO files
         (id, name, size_bytes, mime_type, folder_id, telegram_file_id, created_at, synced_at, is_encrypted)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, unixepoch(), ?8)",
        params![id, name, size_bytes, mime_type, folder_id, telegram_file_id, created_at, is_encrypted as i32],
    )?;
    Ok(())
}

/// Obtiene todos los archivos de una carpeta ordenados por fecha (más reciente primero).
pub fn get_files_by_folder(conn: &Connection, folder_id: &str) -> Result<Vec<(String, String, i64, String, i64, bool)>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, size_bytes, mime_type, created_at, is_encrypted
         FROM files WHERE folder_id = ?1
         ORDER BY created_at DESC"
    )?;
    
    let rows = stmt.query_map(params![folder_id], |row| {
        Ok((
            row.get::<_, String>(0)?,  // id
            row.get::<_, String>(1)?,  // name
            row.get::<_, i64>(2)?,     // size_bytes
            row.get::<_, String>(3)?,  // mime_type
            row.get::<_, i64>(4)?,     // created_at
            row.get::<_, bool>(5)?,    // is_encrypted
        ))
    })?;
    
    rows.collect()
}

/// Búsqueda full-text usando el índice FTS5.
/// Query soporta operadores FTS5: "term*", "term1 OR term2", etc.
pub fn search_files_fts(conn: &Connection, query: &str) -> Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT files.id FROM files
         JOIN files_fts ON files.rowid = files_fts.rowid
         WHERE files_fts MATCH ?1
         LIMIT 100"
    )?;
    
    let ids: Result<Vec<String>> = stmt
        .query_map(params![query], |row| row.get(0))?
        .collect();
    
    ids
}

/// Elimina un archivo del índice local.
pub fn delete_file(conn: &Connection, file_id: &str) -> Result<()> {
    conn.execute("DELETE FROM files WHERE id = ?1", params![file_id])?;
    Ok(())
}
