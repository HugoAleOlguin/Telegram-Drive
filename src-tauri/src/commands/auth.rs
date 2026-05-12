use serde::Deserialize;
use tauri::{command, AppHandle, Manager, State};
use crate::AppState;
use crate::telegram::client::{ApiCredentials, TelegramClient};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TelegramCredentials {
    pub api_id: i32,
    pub api_hash: String,
    pub phone_number: String,
}

#[command]
pub async fn auth_login(
    app: AppHandle,
    state: State<'_, AppState>,
    credentials: TelegramCredentials,
) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    std::fs::create_dir_all(&app_dir).unwrap_or_default();
    let session_path = app_dir.join("telegram.session");

    let api_creds = ApiCredentials {
        api_id: credentials.api_id,
        api_hash: credentials.api_hash.clone(),
        phone_number: credentials.phone_number.clone(),
    };

    let client = TelegramClient::connect(api_creds, session_path.to_str().unwrap())
        .await
        .map_err(|e| e.to_string())?;

    client.request_code().await.map_err(|e| e.to_string())?;

    {
        let conn = state.db_conn.lock().unwrap();
        let _ = conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('api_id', ?1)", rusqlite::params![credentials.api_id.to_string()]);
        let _ = conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('api_hash', ?1)", rusqlite::params![credentials.api_hash]);
        let _ = conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('phone_number', ?1)", rusqlite::params![credentials.phone_number]);
    }

    *state.telegram_client.lock().await = Some(client);
    Ok(())
}

#[command]
pub async fn auth_verify_code(state: State<'_, AppState>, code: String) -> Result<(), String> {
    let client_lock = state.telegram_client.lock().await;
    match client_lock.as_ref() {
        Some(client) => client.sign_in(&code).await.map_err(|e| e.to_string()),
        None => Err("No active login session".to_string()),
    }
}

#[command]
pub async fn auth_logout(state: State<'_, AppState>) -> Result<(), String> {
    let mut client_lock = state.telegram_client.lock().await;
    if let Some(client) = client_lock.take() {
        client.sign_out().await.map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[command]
pub async fn auth_check_session(app: AppHandle, state: State<'_, AppState>) -> Result<bool, String> {
    let app_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    let session_path = app_dir.join("telegram.session");
    if !session_path.exists() {
        return Ok(false);
    }

    let (api_id_str, api_hash, phone_number) = {
        let conn = state.db_conn.lock().unwrap();
        let api_id_str: String = conn.query_row("SELECT value FROM config WHERE key = 'api_id'", [], |r| r.get(0)).unwrap_or_default();
        let api_hash: String = conn.query_row("SELECT value FROM config WHERE key = 'api_hash'", [], |r| r.get(0)).unwrap_or_default();
        let phone_number: String = conn.query_row("SELECT value FROM config WHERE key = 'phone_number'", [], |r| r.get(0)).unwrap_or_default();
        (api_id_str, api_hash, phone_number)
    };

    if api_id_str.is_empty() || api_hash.is_empty() || phone_number.is_empty() {
        return Ok(false);
    }

    let api_creds = ApiCredentials {
        api_id: api_id_str.parse::<i32>().unwrap_or(0),
        api_hash,
        phone_number,
    };

    match TelegramClient::connect(api_creds, session_path.to_str().unwrap()).await {
        Ok(client) => {
            *state.telegram_client.lock().await = Some(client);
            Ok(true)
        }
        Err(_) => Ok(false),
    }
}
