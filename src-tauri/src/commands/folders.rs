use serde::{Deserialize, Serialize};
use tauri::{command, State};
use crate::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DriveFolder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub channel_id: i64,
    pub created_at: i64,
    pub file_count: i64,
}

fn get_folder_full_path(conn: &rusqlite::Connection, name: &str, parent_id: Option<&str>) -> Result<String, String> {
    let mut parts = Vec::new();
    parts.push(name.to_string());

    let mut current_parent = parent_id.map(|s| s.to_string());
    while let Some(pid) = current_parent {
        let mut stmt = conn.prepare("SELECT name, parent_id FROM folders WHERE id = ?1").map_err(|e| e.to_string())?;
        let parent_info = stmt.query_row(rusqlite::params![pid], |row| {
            let p_name: String = row.get(0)?;
            let p_parent: Option<String> = row.get(1)?;
            Ok((p_name, p_parent))
        });

        match parent_info {
            Ok((p_name, p_parent)) => {
                parts.push(p_name);
                current_parent = p_parent;
            }
            Err(_) => {
                break;
            }
        }
    }

    parts.reverse();
    Ok(format!("[TD] {}", parts.join(" > ")))
}

async fn rename_descendants_tg(
    state: &AppState,
    parent_id: String,
) -> Result<(), String> {
    let children: Vec<(String, String, String)> = {
        let conn = state.db_conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, packed_chat FROM folders WHERE parent_id = ?1").map_err(|e| e.to_string())?;
        let list: Vec<(String, String, String)> = stmt.query_map(rusqlite::params![parent_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        }).map_err(|e| e.to_string())?
          .filter_map(|r| r.ok())
          .collect();
        list
    };

    for (child_id, child_name, child_packed) in children {
        let new_full_path = {
            let conn = state.db_conn.lock().unwrap();
            get_folder_full_path(&conn, &child_name, Some(&parent_id))?
        };

        {
            let client_lock = state.telegram_client.lock().await;
            let tg = client_lock.as_ref().ok_or("No hay sesión activa")?;
            tg.rename_channel(&child_packed, &new_full_path).await.map_err(|e| e.to_string())?;
        }

        Box::pin(rename_descendants_tg(state, child_id)).await?;
    }

    Ok(())
}

#[command]
pub async fn create_folder(
    state: State<'_, AppState>,
    name: String,
    parent_id: Option<String>,
) -> Result<DriveFolder, String> {
    let full_path = {
        let conn = state.db_conn.lock().unwrap();
        get_folder_full_path(&conn, &name, parent_id.as_deref())?
    };

    let (channel_id, packed_hex) = {
        let client_lock = state.telegram_client.lock().await;
        let tg = client_lock.as_ref().ok_or("No hay sesión activa")?;
        tg.create_channel(&full_path).await.map_err(|e| e.to_string())?
    };

    let id = format!("folder_{}", channel_id);
    let created_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let conn = state.db_conn.lock().unwrap();
    conn.execute(
        "INSERT INTO folders (id, name, parent_id, packed_chat, channel_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, name, parent_id, packed_hex, channel_id, created_at],
    ).map_err(|e| e.to_string())?;

    Ok(DriveFolder {
        id,
        name,
        parent_id,
        channel_id,
        created_at,
        file_count: 0,
    })
}

#[command]
pub async fn list_folders(
    state: State<'_, AppState>,
    parent_id: Option<String>,
) -> Result<Vec<DriveFolder>, String> {
    let conn = state.db_conn.lock().unwrap();

    let row_mapper = |row: &rusqlite::Row| -> rusqlite::Result<DriveFolder> {
        Ok(DriveFolder {
            id: row.get(0)?,
            name: row.get(1)?,
            parent_id: row.get(2)?,
            channel_id: row.get(3)?,
            created_at: row.get(4)?,
            file_count: row.get(5)?,
        })
    };

    let folders: Vec<DriveFolder> = if let Some(pid) = &parent_id {
        let mut stmt = conn.prepare(
            "SELECT f.id, f.name, f.parent_id, f.channel_id, f.created_at, \
             (SELECT COUNT(*) FROM files WHERE folder_id = f.id) as file_count \
             FROM folders f WHERE f.parent_id = ?1 ORDER BY f.name ASC"
        ).map_err(|e| e.to_string())?;
        let result: Vec<DriveFolder> = stmt.query_map(rusqlite::params![pid], row_mapper)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        result
    } else {
        let mut stmt = conn.prepare(
            "SELECT f.id, f.name, f.parent_id, f.channel_id, f.created_at, \
             (SELECT COUNT(*) FROM files WHERE folder_id = f.id) as file_count \
             FROM folders f WHERE f.parent_id IS NULL ORDER BY f.name ASC"
        ).map_err(|e| e.to_string())?;
        let result: Vec<DriveFolder> = stmt.query_map([], row_mapper)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        result
    };

    Ok(folders)
}

#[command]
pub async fn rename_folder(
    state: State<'_, AppState>,
    folder_id: String,
    new_name: String,
) -> Result<(), String> {
    // 1. Get current folder info (parent_id and packed_chat)
    let (parent_id, packed_hex) = {
        let conn = state.db_conn.lock().unwrap();
        conn.query_row(
            "SELECT parent_id, packed_chat FROM folders WHERE id = ?1",
            rusqlite::params![folder_id],
            |row| Ok((row.get::<_, Option<String>>(0)?, row.get::<_, String>(1)?)),
        ).map_err(|e| e.to_string())?
    };

    // 2. Update folder name in SQLite first so get_folder_full_path sees the updated name
    {
        let conn = state.db_conn.lock().unwrap();
        conn.execute(
            "UPDATE folders SET name = ?1 WHERE id = ?2",
            rusqlite::params![new_name, folder_id],
        ).map_err(|e| e.to_string())?;
    }

    // 3. Get the new full path title of the renamed folder
    let new_full_path = {
        let conn = state.db_conn.lock().unwrap();
        get_folder_full_path(&conn, &new_name, parent_id.as_deref())?
    };

    // 4. Rename channel in Telegram
    {
        let client_lock = state.telegram_client.lock().await;
        let tg = client_lock.as_ref().ok_or("No hay sesión activa")?;
        tg.rename_channel(&packed_hex, &new_full_path).await.map_err(|e| e.to_string())?;
    }

    // 5. Recursively update Telegram channel names for all descendants
    rename_descendants_tg(&state, folder_id).await?;

    Ok(())
}

#[command]
pub async fn delete_folder(
    state: State<'_, AppState>,
    folder_id: String,
) -> Result<(), String> {
    // 1. Get packed_chat from SQLite
    let packed_hex: String = {
        let conn = state.db_conn.lock().unwrap();
        conn.query_row(
            "SELECT packed_chat FROM folders WHERE id = ?1",
            rusqlite::params![folder_id],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?
    };

    // 2. Delete channel from Telegram
    {
        let client_lock = state.telegram_client.lock().await;
        let tg = client_lock.as_ref().ok_or("No hay sesión activa")?;
        tg.delete_channel(&packed_hex).await.map_err(|e| e.to_string())?;
    }

    // 3. Delete from SQLite (folder + its files + orphan children)
    let conn = state.db_conn.lock().unwrap();
    conn.execute("DELETE FROM files WHERE folder_id = ?1", rusqlite::params![folder_id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM folders WHERE id = ?1", rusqlite::params![folder_id])
        .map_err(|e| e.to_string())?;

    // Move child folders to root (simple approach instead of recursive delete)
    conn.execute("UPDATE folders SET parent_id = NULL WHERE parent_id = ?1", rusqlite::params![folder_id])
        .map_err(|e| e.to_string())?;

    Ok(())
}
