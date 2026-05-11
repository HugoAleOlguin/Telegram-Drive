// === COMMANDS/FOLDERS.RS — Comandos de gestión de carpetas ===

use serde::{Deserialize, Serialize};
use tauri::command;

/// Representa una carpeta del Drive (mapea a un canal privado de Telegram)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DriveFolder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub telegram_channel_id: String,
    pub created_at: i64,
    pub file_count: Option<i64>,
}

/// Lista todas las carpetas del Drive:
/// - La raíz (Saved Messages) siempre aparece primero
/// - Los canales privados con prefijo "td_folder_" se muestran como carpetas
#[command]
pub async fn list_folders() -> Result<Vec<DriveFolder>, String> {
    log::info!("list_folders: listando carpetas del drive");
    // TODO: Fase 2 — client.iter_dialogs() filtrando por nombre td_folder_*
    Ok(vec![])
}

/// Crea una nueva carpeta creando un canal privado en Telegram.
/// El nombre del canal se formatea como "td_folder_{name}" para identificarlo.
#[command]
pub async fn create_folder(name: String, parent_id: Option<String>) -> Result<DriveFolder, String> {
    log::info!("create_folder: name={}, parent_id={:?}", name, parent_id);
    // TODO: Fase 3 — client.create_channel(format!("td_folder_{}", name)).await
    Err("Not implemented yet".to_string())
}

/// Elimina una carpeta (archiva el canal privado de Telegram).
/// Los archivos dentro siguen existiendo en Telegram pero el índice local los marca como eliminados.
#[command]
pub async fn delete_folder(folder_id: String) -> Result<(), String> {
    log::info!("delete_folder: folder_id={}", folder_id);
    // TODO: Fase 3 — client.delete_channel(channel_id).await
    Ok(())
}
