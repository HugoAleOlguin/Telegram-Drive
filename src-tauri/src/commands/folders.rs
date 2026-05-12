use serde::{Deserialize, Serialize};
use tauri::{command, State};
use crate::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DriveFolder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub telegram_channel_id: String,
    pub created_at: i64,
    pub file_count: Option<i64>,
}

#[command]
pub async fn list_folders(_state: State<'_, AppState>) -> Result<Vec<DriveFolder>, String> {
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() as i64;
    Ok(vec![DriveFolder {
        id: "self".into(),
        name: "telegram-drive".into(),
        parent_id: None,
        telegram_channel_id: "self".into(),
        created_at: now,
        file_count: None,
    }])
}

#[command]
pub async fn create_folder(_state: State<'_, AppState>, _name: String, _parent_id: Option<String>) -> Result<DriveFolder, String> {
    Err("Modo simplificado: usa la carpeta 'telegram-drive' por defecto".into())
}

#[command]
pub async fn delete_folder(_state: State<'_, AppState>, _folder_id: String) -> Result<(), String> {
    Err("No se pueden eliminar carpetas en modo simplificado".into())
}
