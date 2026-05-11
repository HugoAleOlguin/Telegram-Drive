// === COMMANDS/AUTH.RS — Comandos de autenticación Telegram ===
// Maneja el flujo: API credentials → OTP → sesión persistida

use serde::Deserialize;
use tauri::command;

/// Credenciales de la API de Telegram (obtenidas en my.telegram.org)
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TelegramCredentials {
    pub api_id: i32,
    pub api_hash: String,
    pub phone_number: String,
}

use crate::AppState;
use crate::telegram::client::{ApiCredentials, TelegramClient};
use tauri::{AppHandle, Manager, State};

/// Inicia el proceso de autenticación con las credenciales API.
/// Envía el código OTP al número de teléfono vinculado a la cuenta.
#[command]
pub async fn auth_login(
    app: AppHandle,
    state: State<'_, AppState>,
    credentials: TelegramCredentials,
) -> Result<(), String> {
    log::info!("auth_login: iniciando con api_id={} y teléfono={}", credentials.api_id, credentials.phone_number);
    
    // Obtenemos una ruta para guardar la sesión, e.g. en el directorio de la app
    let app_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    std::fs::create_dir_all(&app_dir).unwrap_or_default();
    let session_path = app_dir.join("telegram.session");

    let api_creds = ApiCredentials {
        api_id: credentials.api_id,
        api_hash: credentials.api_hash,
        phone_number: credentials.phone_number,
    };

    // Conectamos el cliente (esto iniciará el worker en background)
    let client = TelegramClient::connect(api_creds, session_path.to_str().unwrap())
        .await
        .map_err(|e| e.to_string())?;

    // Solicitamos el código OTP
    client.request_code().await.map_err(|e| e.to_string())?;

    // Guardamos el cliente en el estado de Tauri
    *state.telegram_client.lock().await = Some(client);

    Ok(())
}

/// Verifica el código OTP enviado por Telegram al teléfono del usuario.
/// Si la cuenta tiene 2FA, el siguiente paso pedirá la contraseña.
#[command]
pub async fn auth_verify_code(state: State<'_, AppState>, code: String) -> Result<(), String> {
    log::info!("auth_verify_code: verificando código OTP");
    let client_lock = state.telegram_client.lock().await;
    
    if let Some(client) = client_lock.as_ref() {
        client.sign_in(&code).await.map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("No hay un intento de conexión activo. Por favor, reinicia el login.".to_string())
    }
}

/// Cierra la sesión actual y elimina el archivo de sesión persistida.
#[command]
pub async fn auth_logout(state: State<'_, AppState>) -> Result<(), String> {
    log::info!("auth_logout: cerrando sesión");
    let mut client_lock = state.telegram_client.lock().await;
    
    if let Some(client) = client_lock.take() {
        client.sign_out().await.map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

/// Verifica si existe una sesión guardada válida para auto-login.
/// Retorna true si hay sesión activa, false si hay que hacer login manual.
#[command]
pub async fn auth_check_session() -> Result<bool, String> {
    log::info!("auth_check_session: verificando sesión existente");
    // TODO: Fase 1 — leer session file y verificar validez
    // Por ahora retorna false para que siempre muestre el login en dev
    Ok(false)
}
