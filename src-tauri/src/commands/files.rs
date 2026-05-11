// === COMMANDS/FILES.RS — Comandos CRUD de archivos ===

use serde::{Deserialize, Serialize};
use tauri::command;

/// Representa un archivo del Drive (serializable a/desde JSON para el frontend)
#[derive(Debug, Serialize, Deserialize, Clone)]
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

/// Resultado de una búsqueda full-text
#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub files: Vec<DriveFile>,
    pub query: String,
}

/// Lista los archivos de una carpeta desde el índice SQLite local.
/// Llama a Telegram solo si la carpeta no está en caché o si force_refresh=true.
#[command]
pub async fn list_files(folder_id: String) -> Result<Vec<DriveFile>, String> {
    log::info!("list_files: folder_id={}", folder_id);
    // TODO: Fase 2 — consultar SQLite local: SELECT * FROM files WHERE folder_id = ?
    Ok(vec![])
}

/// Sube un archivo a Telegram con chunked upload y emite eventos de progreso.
/// Los eventos se emiten via tauri::AppHandle para que el frontend los escuche.
#[command]
pub async fn upload_file(file_path: String, folder_id: String) -> Result<String, String> {
    log::info!("upload_file: path={}, folder_id={}", file_path, folder_id);
    // TODO: Fase 3 — telegram::upload::upload_chunked(path, folder_id, handle).await
    Ok("task_id_placeholder".to_string())
}

/// Descarga un archivo de Telegram a un directorio local con soporte de resume.
#[command]
pub async fn download_file(file_id: String, dest_path: String) -> Result<(), String> {
    log::info!("download_file: file_id={}, dest={}", file_id, dest_path);
    // TODO: Fase 4 — telegram::download::download_file(file_id, dest_path).await
    Ok(())
}

/// Elimina un archivo de Telegram (elimina el mensaje que contiene el adjunto).
#[command]
pub async fn delete_file(file_id: String) -> Result<(), String> {
    log::info!("delete_file: file_id={}", file_id);
    // TODO: Fase 3 — client.delete_messages(channel, vec![msg_id]).await
    Ok(())
}

/// Renombra un archivo editando el caption del mensaje de Telegram.
#[command]
pub async fn rename_file(file_id: String, new_name: String) -> Result<(), String> {
    log::info!("rename_file: file_id={}, new_name={}", file_id, new_name);
    // TODO: Fase 3 — client.edit_message(channel, msg_id, new_name).await
    Ok(())
}

/// Búsqueda full-text sobre el índice SQLite usando FTS5.
/// Respuesta en < 100ms porque no toca la red.
#[command]
pub async fn search_files(query: String) -> Result<SearchResult, String> {
    log::info!("search_files: query={}", query);
    // TODO: Fase 5 — SELECT * FROM files_fts WHERE files_fts MATCH ?
    Ok(SearchResult { files: vec![], query })
}

/// Fuerza una re-sincronización del índice SQLite con el estado actual de Telegram.
#[command]
pub async fn sync_index() -> Result<(), String> {
    log::info!("sync_index: iniciando sincronización");
    // TODO: Fase 2 — recorrer todos los canales td_folder_*, indexar mensajes nuevos
    Ok(())
}
