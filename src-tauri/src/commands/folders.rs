use serde::{Deserialize, Serialize};
use tauri::{command, State};
use uuid::Uuid;
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
pub async fn list_folders(state: State<'_, AppState>) -> Result<Vec<DriveFolder>, String> {
    let conn = state.db_conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, name, parent_id, telegram_channel_id, created_at FROM folders ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(DriveFolder {
            id: row.get(0)?,
            name: row.get(1)?,
            parent_id: row.get(2)?,
            telegram_channel_id: row.get(3)?,
            created_at: row.get(4)?,
            file_count: None,
        })
    }).map_err(|e| e.to_string())?;

    let mut folders = Vec::new();
    for row in rows {
        if let Ok(folder) = row {
            folders.push(folder);
        }
    }
    Ok(folders)
}

#[command]
pub async fn create_folder(state: State<'_, AppState>, name: String, parent_id: Option<String>) -> Result<DriveFolder, String> {
    let id = Uuid::new_v4().to_string();
    let telegram_channel_id = format!("td_folder_{}", name);
    let created_at = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() as i64;

    let conn = state.db_conn.lock().unwrap();
    conn.execute(
        "INSERT INTO folders (id, name, parent_id, telegram_channel_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, name, parent_id, telegram_channel_id, created_at],
    ).map_err(|e| e.to_string())?;

    Ok(DriveFolder {
        id,
        name,
        parent_id,
        telegram_channel_id,
        created_at,
        file_count: None,
    })
}

#[command]
pub async fn delete_folder(state: State<'_, AppState>, folder_id: String) -> Result<(), String> {
    let conn = state.db_conn.lock().unwrap();
    conn.execute("DELETE FROM folders WHERE id = ?1", rusqlite::params![folder_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
