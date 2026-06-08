use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle, Emitter, Manager, State};
use grammers_client::types::Media;
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
    pub thumbnail_path: String,
}

fn query_files(conn: &rusqlite::Connection, folder_id: &str) -> Result<Vec<DriveFile>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, name, size_bytes, mime_type, folder_id, telegram_file_id, created_at, is_encrypted, thumbnail_path \
         FROM files WHERE folder_id = ?1 ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(rusqlite::params![folder_id], |row| {
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
pub async fn list_files(state: State<'_, AppState>, folder_id: String) -> Result<Vec<DriveFile>, String> {
    let conn = state.db_conn.lock().unwrap();
    query_files(&conn, &folder_id)
}

/// Reads a local file and returns its raw bytes.
/// Used by the frontend to load background images without the asset protocol.
#[command]
pub async fn read_image_bytes(file_path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&file_path).map_err(|e| format!("read_image_bytes error: {}", e))
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct UploadProgressPayload {
    task_id: String,
    bytes_sent: i64,
    total_bytes: i64,
}

#[command]
pub async fn upload_file(app: AppHandle, state: State<'_, AppState>, task_id: String, file_path: String, folder_id: String) -> Result<String, String> {
    let path = std::path::Path::new(&file_path);
    let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
    let size_bytes = std::fs::metadata(&path).map(|m| m.len() as i64).map_err(|e| e.to_string())?;
    let created_at = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() as i64;
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    let mime = mime_from_ext(ext);

    // Look up packed_chat if uploading to a channel folder
    let packed_hex: Option<String> = if folder_id != "self" {
        let conn = state.db_conn.lock().unwrap();
        Some(conn.query_row(
            "SELECT packed_chat FROM folders WHERE id = ?1",
            rusqlite::params![folder_id],
            |row| row.get(0),
        ).map_err(|e| format!("Folder not found: {}", e))?)
    } else {
        None
    };

    let client_lock = state.telegram_client.lock().await;
    let tg = client_lock.as_ref().ok_or("No hay sesión activa")?;

    let _ = app.emit("upload-progress", UploadProgressPayload {
        task_id: task_id.clone(),
        bytes_sent: 0,
        total_bytes: size_bytes,
    });

    let app_clone = app.clone();
    let task_id_clone = task_id.clone();

    let (msg_id, file_id) = if let Some(ref hex) = packed_hex {
        // Upload to channel
        tg.upload_to_chat(hex, &file_path, move |bytes_read, total_size| {
            let _ = app_clone.emit("upload-progress", UploadProgressPayload {
                task_id: task_id_clone.clone(),
                bytes_sent: bytes_read as i64,
                total_bytes: total_size as i64,
            });
        }).await.map_err(|e| e.to_string())?
    } else {
        // Upload to Saved Messages (original behavior)
        tg.upload_document_stream(&file_path, move |bytes_read, total_size| {
            let _ = app_clone.emit("upload-progress", UploadProgressPayload {
                task_id: task_id_clone.clone(),
                bytes_sent: bytes_read as i64,
                total_bytes: total_size as i64,
            });
        }).await.map_err(|e| e.to_string())?
    };

    let id = format!("{}@{}", msg_id, folder_id);

    // Thumbnail logic (only for images in saved messages to keep it simple)
    let thumb_path = if mime.starts_with("image/") && folder_id == "self" {
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
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, unixepoch(), 0, ?8)",
        rusqlite::params![id, name, size_bytes, mime, folder_id, file_id, created_at, thumb_path],
    ).map_err(|e| e.to_string())?;
    Ok(id)
}


#[command]
pub async fn download_file(state: State<'_, AppState>, file_id: String, dest_path: String) -> Result<(), String> {
    let parts: Vec<&str> = file_id.split('@').collect();
    if parts.len() != 2 { return Err("ID inválido".into()) }
    let msg_id: i32 = parts[0].parse().map_err(|_| "ID inválido")?;
    let folder_id = parts[1];

    if folder_id == "self" {
        let client_lock = state.telegram_client.lock().await;
        let tg = client_lock.as_ref().ok_or("No hay sesión")?;
        tg.download_document(msg_id, &dest_path).await.map_err(|e| e.to_string())
    } else {
        let packed_hex: String = {
            let conn = state.db_conn.lock().unwrap();
            conn.query_row(
                "SELECT packed_chat FROM folders WHERE id = ?1",
                rusqlite::params![folder_id],
                |row| row.get(0),
            ).map_err(|e| format!("Folder not found: {}", e))?
        };
        let client_lock = state.telegram_client.lock().await;
        let tg = client_lock.as_ref().ok_or("No hay sesión")?;
        tg.download_from_chat(&packed_hex, msg_id, &dest_path).await.map_err(|e| e.to_string())
    }
}

#[command]
pub async fn delete_file(state: State<'_, AppState>, file_id: String) -> Result<(), String> {
    let parts: Vec<&str> = file_id.split('@').collect();
    if parts.len() != 2 { return Err("ID inválido".into()) }
    let msg_id: i32 = parts[0].parse().map_err(|_| "ID inválido")?;
    let folder_id = parts[1].to_string();

    // Remove thumbnail
    {
        let conn = state.db_conn.lock().unwrap();
        let old: Result<String, _> = conn.query_row(
            "SELECT thumbnail_path FROM files WHERE id = ?1", rusqlite::params![file_id], |r| r.get(0)
        );
        if let Ok(tp) = old { if !tp.is_empty() { let _ = std::fs::remove_file(&tp); } }
    }

    // Delete from Telegram
    if folder_id == "self" {
        let client_lock = state.telegram_client.lock().await;
        if let Some(tg) = client_lock.as_ref() {
            tg.delete_document(msg_id).await.map_err(|e| e.to_string())?;
        }
    } else {
        let packed_hex: String = {
            let conn = state.db_conn.lock().unwrap();
            conn.query_row(
                "SELECT packed_chat FROM folders WHERE id = ?1",
                rusqlite::params![folder_id],
                |row| row.get(0),
            ).map_err(|e| format!("Folder not found: {}", e))?
        };
        let client_lock = state.telegram_client.lock().await;
        if let Some(tg) = client_lock.as_ref() {
            tg.delete_from_chat(&packed_hex, msg_id).await.map_err(|e| e.to_string())?;
        }
    }

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
pub async fn sync_files(_app: AppHandle, state: State<'_, AppState>, folder_id: String) -> Result<Vec<DriveFile>, String> {
    // Step 1: fetch messages from Telegram (no DB lock)
    let messages = if folder_id == "self" {
        let client_lock = state.telegram_client.lock().await;
        let tg = client_lock.as_ref().ok_or("No hay sesión")?;
        tg.fetch_saved_messages().await.map_err(|e| e.to_string())?
    } else {
        let packed_hex: String = {
            let conn = state.db_conn.lock().unwrap();
            conn.query_row(
                "SELECT packed_chat FROM folders WHERE id = ?1",
                rusqlite::params![folder_id],
                |row| row.get(0),
            ).map_err(|e| format!("Folder not found: {}", e))?
        };
        let client_lock = state.telegram_client.lock().await;
        let tg = client_lock.as_ref().ok_or("No hay sesión")?;
        tg.fetch_chat_messages(&packed_hex).await.map_err(|e| e.to_string())?
    };

    // Step 2: process messages and insert into DB
    {
        let conn = state.db_conn.lock().unwrap();
        for msg in &messages {
            let msg_id = msg.id();
            let id = format!("{}@{}", msg_id, folder_id);

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
                        let file_id_val = doc.id().to_string();

                        conn.execute(
                            "INSERT OR IGNORE INTO files (id, name, size_bytes, mime_type, folder_id, telegram_file_id, created_at, synced_at, is_encrypted, thumbnail_path) \
                             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, unixepoch(), 0, '')",
                            rusqlite::params![id, name, size, mime, folder_id, file_id_val, date],
                        ).ok();
                    }
                    _ => {}
                }
            }
        }
    }

    // Step 3: return file list for this folder
    list_files(state, folder_id).await
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DiskScanEntry {
    pub path: String,
    pub name: String,
    pub rel_path: String,
    pub is_dir: bool,
}

#[command]
pub async fn scan_disk_item(path: String) -> Result<Vec<DiskScanEntry>, String> {
    let root_path = std::path::Path::new(&path);
    if !root_path.exists() {
        return Err("La ruta no existe".to_string());
    }

    let is_dir = root_path.is_dir();
    let name = root_path.file_name().unwrap_or_default().to_string_lossy().to_string();

    if !is_dir {
        return Ok(vec![DiskScanEntry {
            path: path.clone(),
            name,
            rel_path: "".to_string(),
            is_dir: false,
        }]);
    }

    let mut entries = Vec::new();
    // Add the root folder itself
    entries.push(DiskScanEntry {
        path: path.clone(),
        name: name.clone(),
        rel_path: "".to_string(),
        is_dir: true,
    });

    fn walk_dir(dir: &std::path::Path, root: &std::path::Path, entries: &mut Vec<DiskScanEntry>) -> std::io::Result<()> {
        if dir.is_dir() {
            for entry in std::fs::read_dir(dir)? {
                let entry = entry?;
                let entry_path = entry.path();
                let entry_name = entry_path.file_name().unwrap_or_default().to_string_lossy().to_string();
                let is_entry_dir = entry_path.is_dir();

                let rel = entry_path.strip_prefix(root)
                    .unwrap_or(&entry_path)
                    .to_string_lossy()
                    .to_string()
                    .replace('\\', "/");

                entries.push(DiskScanEntry {
                    path: entry_path.to_string_lossy().to_string(),
                    name: entry_name,
                    rel_path: rel,
                    is_dir: is_entry_dir,
                });

                if is_entry_dir {
                    walk_dir(&entry_path, root, entries)?;
                }
            }
        }
        Ok(())
    }

    if let Err(e) = walk_dir(root_path, root_path, &mut entries) {
        return Err(format!("Error escaneando directorio: {}", e));
    }

    Ok(entries)
}
