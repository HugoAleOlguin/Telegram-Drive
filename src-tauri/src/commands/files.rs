use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle, Manager, State};
use grammers_client::types::Media;
use crate::AppState;
use std::path::PathBuf;

fn cache_dir(app: &AppHandle) -> PathBuf {
    let mut d = app.path().app_cache_dir().unwrap_or_else(|_| std::env::temp_dir().join("tg-drive"));
    d.push("thumbs");
    let _ = std::fs::create_dir_all(&d);
    d
}

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
    pub thumbnail_path: String,
}

fn query_files(conn: &rusqlite::Connection) -> Result<Vec<DriveFile>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, name, size_bytes, mime_type, folder_id, telegram_file_id, created_at, is_encrypted, thumbnail_path \
         FROM files WHERE folder_id = 'self' ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(DriveFile {
            id: row.get(0)?,
            name: row.get(1)?,
            size_bytes: row.get(2)?,
            mime_type: row.get(3)?,
            folder_id: row.get(4)?,
            telegram_file_id: row.get(5)?,
            created_at: row.get(6)?,
            is_encrypted: row.get::<_, i32>(7)? == 1,
            thumbnail_path: row.get::<_, String>(8).unwrap_or_default(),
        })
    }).map_err(|e| e.to_string())?;

    let mut files = Vec::new();
    for row in rows {
        if let Ok(f) = row { files.push(f); }
    }
    Ok(files)
}

fn mime_from_ext(ext: &str) -> String {
    match ext.to_lowercase().as_str() {
        "jpg"|"jpeg" => "image/jpeg", "png" => "image/png", "gif" => "image/gif",
        "webp" => "image/webp", "mp4" => "video/mp4", "mp3" => "audio/mpeg",
        "pdf" => "application/pdf", "zip" => "application/zip", "rar" => "application/vnd.rar",
        "7z" => "application/x-7z-compressed", "tar" => "application/x-tar",
        "gz" => "application/gzip", "txt" => "text/plain", "json" => "application/json",
        "js" => "application/javascript", "ts" => "text/typescript",
        "html"|"htm" => "text/html", "css" => "text/css",
        "doc"|"docx" => "application/msword", "xls"|"xlsx" => "application/vnd.ms-excel",
        _ => "application/octet-stream",
    }.to_string()
}

#[command]
pub async fn list_files(state: State<'_, AppState>) -> Result<Vec<DriveFile>, String> {
    let conn = state.db_conn.lock().unwrap();
    query_files(&conn)
}

#[command]
pub async fn upload_file(app: AppHandle, state: State<'_, AppState>, file_path: String) -> Result<String, String> {
    let path = std::path::Path::new(&file_path);
    let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
    let size_bytes = std::fs::metadata(&path).map(|m| m.len() as i64).map_err(|e| e.to_string())?;
    let created_at = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() as i64;
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    let mime = mime_from_ext(ext);

    let client_lock = state.telegram_client.lock().await;
    let tg = client_lock.as_ref().ok_or("No hay sesión activa")?;
    let (msg_id, file_id) = tg.upload_document(&file_path).await.map_err(|e| e.to_string())?;
    let id = format!("{}@self", msg_id);

    let thumb_path = if mime.starts_with("image/") {
        if let Some(dir) = app.path().app_cache_dir().ok() {
            std::fs::create_dir_all(&dir).unwrap_or_default();
            let dest = dir.join(format!("thumb_{}.jpg", msg_id));
            if tg.cache_preview(msg_id, &dest.to_string_lossy()).await.unwrap_or(false) {
                dest.to_string_lossy().to_string()
            } else { String::new() }
        } else { String::new() }
    } else { String::new() };

    drop(client_lock);

    let conn = state.db_conn.lock().unwrap();
    conn.execute(
        "INSERT INTO files (id, name, size_bytes, mime_type, folder_id, telegram_file_id, created_at, synced_at, is_encrypted, thumbnail_path) \
         VALUES (?1, ?2, ?3, ?4, 'self', ?5, ?6, unixepoch(), 0, ?7)",
        rusqlite::params![id, name, size_bytes, mime, file_id, created_at, thumb_path],
    ).map_err(|e| e.to_string())?;
    Ok(id)
}

#[command]
pub async fn download_file(state: State<'_, AppState>, file_id: String, dest_path: String) -> Result<(), String> {
    let parts: Vec<&str> = file_id.split('@').collect();
    if parts.len() != 2 { return Err("ID inválido".into()) }
    let msg_id: i32 = parts[0].parse().map_err(|_| "ID inválido")?;

    let client_lock = state.telegram_client.lock().await;
    let tg = client_lock.as_ref().ok_or("No hay sesión")?;
    tg.download_document(msg_id, &dest_path).await.map_err(|e| e.to_string())
}

#[command]
pub async fn delete_file(state: State<'_, AppState>, file_id: String) -> Result<(), String> {
    let parts: Vec<&str> = file_id.split('@').collect();
    if parts.len() != 2 { return Err("ID inválido".into()) }
    let msg_id: i32 = parts[0].parse().map_err(|_| "ID inválido")?;

    {
        let conn = state.db_conn.lock().unwrap();
        let old: Result<String, _> = conn.query_row(
            "SELECT thumbnail_path FROM files WHERE id = ?1", rusqlite::params![file_id], |r| r.get(0)
        );
        if let Ok(tp) = old { if !tp.is_empty() { let _ = std::fs::remove_file(&tp); } }
    }

    // Delete from Telegram
    let client_lock = state.telegram_client.lock().await;
    if let Some(tg) = client_lock.as_ref() {
        tg.delete_document(msg_id).await.map_err(|e| e.to_string())?;
    }
    drop(client_lock);

    // Delete from DB
    let conn = state.db_conn.lock().unwrap();
    conn.execute("DELETE FROM files WHERE id = ?1", rusqlite::params![file_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn rename_file(state: State<'_, AppState>, file_id: String, new_name: String) -> Result<(), String> {
    let conn = state.db_conn.lock().unwrap();
    conn.execute("UPDATE files SET name = ?1 WHERE id = ?2", rusqlite::params![new_name, file_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn get_thumbnail(app: AppHandle, state: State<'_, AppState>, file_id: String) -> Result<String, String> {
    let parts: Vec<&str> = file_id.split('@').collect();
    if parts.len() != 2 { return Err("ID inválido".into()) }
    let msg_id: i32 = parts[0].parse().map_err(|_| "ID inválido")?;

    let cached = cache_dir(&app).join(format!("thumb_{}.jpg", msg_id));
    if cached.exists() { return Ok(cached.to_string_lossy().to_string()); }

    let client_lock = state.telegram_client.lock().await;
    let tg = client_lock.as_ref().ok_or("No hay sesión")?;
    tg.cache_preview(msg_id, &cached.to_string_lossy()).await.map_err(|e| e.to_string())?;

    // Store path in db
    let conn = state.db_conn.lock().unwrap();
    let _ = conn.execute(
        "UPDATE files SET thumbnail_path = ?1 WHERE id = ?2",
        rusqlite::params![cached.to_string_lossy().to_string(), file_id],
    );

    Ok(cached.to_string_lossy().to_string())
}

#[command]
pub async fn sync_files(_app: AppHandle, state: State<'_, AppState>) -> Result<Vec<DriveFile>, String> {
    // Step 1: fetch messages from Telegram (no DB lock)
    let messages = {
        let client_lock = state.telegram_client.lock().await;
        let tg = client_lock.as_ref().ok_or("No hay sesión")?;
        let msgs = tg.fetch_saved_messages().await.map_err(|e| e.to_string())?;
        msgs
    };

    // Step 2: process messages and insert into DB
    {
        let conn = state.db_conn.lock().unwrap();
        for msg in &messages {
            let msg_id = msg.id();
            let id = format!("{}@self", msg_id);

            let already = conn.query_row(
                "SELECT COUNT(*) FROM files WHERE id = ?1", rusqlite::params![id],
                |row| row.get::<_, i64>(0)
            ).unwrap_or(0) > 0;
            if already { continue; }

            if let Some(media) = msg.media() {
                match media {
                    Media::Document(doc) => {
                        let name = doc.name().to_string();
                        if name.is_empty() { continue; }
                        let size = doc.size();
                        let mime = doc.mime_type().unwrap_or("application/octet-stream").to_string();
                        let date = msg.date().timestamp() as i64;
                        let file_id = doc.id().to_string();

                        // Can't download thumbnails here (would need Telegram lock + DB lock simultaneously)
                        // Just insert without thumbnail for now
                        conn.execute(
                            "INSERT OR IGNORE INTO files (id, name, size_bytes, mime_type, folder_id, telegram_file_id, created_at, synced_at, is_encrypted, thumbnail_path) \
                             VALUES (?1, ?2, ?3, ?4, 'self', ?5, ?6, unixepoch(), 0, '')",
                            rusqlite::params![id, name, size, mime, file_id, date],
                        ).ok();
                    }
                    _ => {}
                }
            }
        }
    }

    // Step 3: return full file list
    list_files(state).await
}
