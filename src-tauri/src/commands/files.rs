use serde::{Deserialize, Serialize};
use tauri::{command, State};
use uuid::Uuid;
use crate::commands::folders::DriveFolder;
use crate::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DriveFile {
    pub id: String,
    pub name: String,
    pub size_bytes: i64,
    pub mime_type: String,
    pub folder_id: String,
    pub telegram_file_id: String,
    pub created_at: i64,
    pub is_encrypted: bool,
    pub thumbnail_url: Option<String>,
}

#[command]
pub async fn list_files(state: State<'_, AppState>, folder_id: String) -> Result<Vec<DriveFile>, String> {
    let conn = state.db_conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, name, size_bytes, mime_type, folder_id, telegram_file_id, created_at, is_encrypted, thumbnail_url \
         FROM files WHERE folder_id = ?1 ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([folder_id], |row| {
        Ok(DriveFile {
            id: row.get(0)?,
            name: row.get(1)?,
            size_bytes: row.get(2)?,
            mime_type: row.get(3)?,
            folder_id: row.get(4)?,
            telegram_file_id: row.get(5)?,
            created_at: row.get(6)?,
            is_encrypted: row.get::<_, i32>(7)? == 1,
            thumbnail_url: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut files = Vec::new();
    for row in rows {
        if let Ok(file) = row {
            files.push(file);
        }
    }
    Ok(files)
}

#[command]
pub async fn upload_file(state: State<'_, AppState>, file_path: String, folder_id: String) -> Result<String, String> {
    let path = std::path::Path::new(&file_path);
    let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
    let size_bytes = std::fs::metadata(path).map(|m| m.len() as i64).unwrap_or(1024);
    let id = Uuid::new_v4().to_string();
    let telegram_file_id = format!("td_file_{}", id);
    let created_at = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() as i64;

    let conn = state.db_conn.lock().unwrap();
    conn.execute(
        "INSERT INTO files (id, name, size_bytes, mime_type, folder_id, telegram_file_id, created_at, synced_at, is_encrypted) \
         VALUES (?1, ?2, ?3, 'application/octet-stream', ?4, ?5, ?6, unixepoch(), 0)",
        rusqlite::params![id, name, size_bytes, folder_id, telegram_file_id, created_at],
    ).map_err(|e| e.to_string())?;

    Ok(id)
}

#[command]
pub async fn download_file(_file_id: String, _dest_path: String) -> Result<(), String> {
    Ok(())
}

#[command]
pub async fn delete_file(state: State<'_, AppState>, file_id: String) -> Result<(), String> {
    let conn = state.db_conn.lock().unwrap();
    conn.execute("DELETE FROM files WHERE id = ?1", rusqlite::params![file_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn rename_file(_file_id: String, _new_name: String) -> Result<(), String> {
    Ok(())
}

#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub files: Vec<DriveFile>,
    pub folders: Vec<DriveFolder>,
    pub query: String,
}

#[command]
pub async fn search_files(query: String) -> Result<SearchResult, String> {
    Ok(SearchResult { files: vec![], folders: vec![], query })
}

#[command]
pub async fn sync_index() -> Result<(), String> {
    Ok(())
}
