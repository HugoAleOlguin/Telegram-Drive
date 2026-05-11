// === LIB.RS — Entry point del backend Rust (Tauri) ===

// Declaración de módulos del proyecto
mod commands;
mod db;
mod telegram;

use commands::auth;
use commands::files;
use commands::folders;

use std::sync::Arc;
use tokio::sync::Mutex;
use crate::telegram::client::TelegramClient;

pub struct AppState {
    pub telegram_client: Arc<Mutex<Option<TelegramClient>>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    let app_state = AppState {
        telegram_client: Arc::new(Mutex::new(None)),
    };

    tauri::Builder::default()
        .manage(app_state)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // Registra todos los comandos Tauri disponibles desde el frontend
        .invoke_handler(tauri::generate_handler![
            // Autenticación
            auth::auth_login,
            auth::auth_verify_code,
            auth::auth_logout,
            auth::auth_check_session,
            // Archivos
            files::list_files,
            files::upload_file,
            files::download_file,
            files::delete_file,
            files::rename_file,
            files::search_files,
            files::sync_index,
            // Carpetas
            folders::list_folders,
            folders::create_folder,
            folders::delete_folder,
        ])
        .run(tauri::generate_context!())
        .expect("Error al inicializar Telegram Drive");
}
