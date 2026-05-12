mod commands;
mod db;
mod telegram;

use std::sync::{Arc, Mutex};
use tokio::sync::Mutex as TokioMutex;
use crate::telegram::client::TelegramClient;

pub struct AppState {
    pub telegram_client: Arc<TokioMutex<Option<TelegramClient>>>,
    pub db_conn: Arc<Mutex<rusqlite::Connection>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    let mut app_dir = dirs::data_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    app_dir.push("telegram-drive");
    std::fs::create_dir_all(&app_dir).unwrap_or_default();

    let db_path = app_dir.join("local_index.db");
    let db_conn = db::schema::initialize_database(db_path.to_str().unwrap())
        .expect("Failed to initialize SQLite database");

    let app_state = AppState {
        telegram_client: Arc::new(TokioMutex::new(None)),
        db_conn: Arc::new(Mutex::new(db_conn)),
    };

    tauri::Builder::default()
        .manage(app_state)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::auth::auth_login,
            commands::auth::auth_verify_code,
            commands::auth::auth_logout,
            commands::auth::auth_check_session,
            commands::files::list_files,
            commands::files::upload_file,
            commands::files::download_file,
            commands::files::delete_file,
            commands::files::rename_file,
            commands::files::get_thumbnail,
            commands::files::sync_files,
            commands::folders::list_folders,
            commands::folders::create_folder,
            commands::folders::delete_folder,
        ])
        .run(tauri::generate_context!())
        .expect("Error al inicializar Telegram Drive");
}
