# Backend en Rust - Deep Dive técnico

El backend de Telegram Drive está construido en Rust sobre **Tauri 2** y la biblioteca **grammers** (un cliente asíncronico de MTProto en puro Rust de alto rendimiento).

---

## 1. Gestión de Estado (`AppState`)

El estado compartido de Tauri se define en [lib.rs](file:///c:/Users/HuGOD777/proyectos%20prime/telegram%20drive/src-tauri/src/lib.rs):
```rust
pub struct AppState {
    pub telegram_client: Arc<TokioMutex<Option<TelegramClient>>>,
    pub db_conn: Arc<Mutex<rusqlite::Connection>>,
}
```
* **`telegram_client`**: Es un `Arc<tokio::sync::Mutex>` que envuelve una sesión activa opcional. Se usa un mutex asíncrono de Tokio porque las llamadas de red a grammers son asíncronas (`.await`) y se realizan a lo largo de varias tareas.
* **`db_conn`**: Es un `Arc<std::sync::Mutex>` que protege la conexión única de SQLite (`rusqlite::Connection`). Las operaciones en SQLite son rápidas y síncronas, por lo que se utiliza el mutex estándar de la librería estándar para evitar sobrecarga asíncrona.

---

## 2. Cliente de Telegram (`client.rs`)

El wrapper [client.rs](file:///c:/Users/HuGOD777/proyectos%20prime/telegram%20drive/src-tauri/src/telegram/client.rs) implementa los métodos para interactuar con la API de Telegram.

### El Event Loop de Telegram
Cuando el cliente se conecta, es fundamental ejecutar el loop de eventos en segundo plano para procesar respuestas de red del servidor MTProto de Telegram:
```rust
let bg_client = client.clone();
tokio::spawn(async move {
    loop {
        match bg_client.step().await {
            Ok(_) => {}
            Err(e) => {
                log::error!("Error en el worker de Telegram: {}", e);
                break;
            }
        }
    }
});
```
Si este worker en segundo plano se detiene, la aplicación perderá la conexión y los comandos `.await` del cliente se bloquearán permanentemente.

### Métodos de Red Clave
* `upload_document`: Sube bytes locales al servidor usando `client.upload_file()` y luego envía el mensaje al propio usuario (`me`) a través de `client.send_message(me, InputMessage::text("").file(uploaded))`.
* `download_document`: Recupera el mensaje por su ID usando `get_messages_by_id` y llama a `msg.download_media(dest_path)`.
* `cache_preview`: Descarga la vista previa del mensaje de Telegram a una ruta específica. Se ejecuta en segundo plano durante la subida de imágenes.

---

## 3. Comandos de Archivos (`files.rs`)

El archivo [files.rs](file:///c:/Users/HuGOD777/proyectos%20prime/telegram%20drive/src-tauri/src/commands/files.rs) maneja la lógica de negocio y las consultas SQL.

### Mapeo de Extensiones y Tipos MIME
La función interna `mime_from_ext` mapea la extensión del archivo a su tipo MIME correspondiente. Esto le ayuda al frontend a clasificar los archivos por categorías (imagen, video, audio, etc.):
```rust
fn mime_from_ext(ext: &str) -> String {
    match ext.to_lowercase().as_str() {
        "jpg"|"jpeg" => "image/jpeg",
        "png" => "image/png",
        // ...
        _ => "application/octet-stream",
    }.to_string()
}
```

### Descarga Automática de Miniaturas (Thumbnails)
Al subir una imagen, se intenta guardar automáticamente una copia pequeña como miniatura en el directorio de caché de la aplicación:
```rust
let thumb_path = if mime.starts_with("image/") {
    if let Some(dir) = app.path().app_cache_dir().ok() {
        std::fs::create_dir_all(&dir).unwrap_or_default();
        let dest = dir.join(format!("thumb_{}.jpg", msg_id));
        if tg.cache_preview(msg_id, &dest.to_string_lossy()).await.unwrap_or(false) {
            dest.to_string_lossy().to_string()
        } else { String::new() }
    } else { String::new() }
} else { String::new() };
```
Esta miniatura se almacena localmente y se indexa en la base de datos para renderizarla rápidamente en el frontend en el componente `FileCard`.

---

## 4. Sistema de Actualización (`updater.rs`)

El módulo [updater.rs](file:///c:/Users/HuGOD777/proyectos%20prime/telegram%20drive/src-tauri/src/commands/updater.rs) implementa un actualizador de software autónomo y robusto para Windows sin dependencias pesadas:

1. **`check_update`**: Realiza una petición GET a la API de GitHub Releases del repositorio público. Lee la etiqueta `tag_name` (ej. `v1.6.7`), la compara con la versión actual usando lógica semántica de semver (`is_older_than`) y busca un asset que termine en `.exe`.
2. **`download_update`**: Descarga el archivo `.exe` nuevo en un directorio temporal (`%TEMP%/tg-drive-update/Telegram Drive.exe`).
3. **`install_update`**: Genera dinámicamente un archivo por lotes `.bat` temporal en `%TEMP%/tg-update.bat` que realiza la sustitución del binario en caliente:
   ```bat
   @echo off
   timeout /t 3 /nobreak >nul
   copy /Y "RUTA_TEMPORAL_NUEVO_EXE" "RUTA_EXE_ACTUAL" >nul
   del "RUTA_TEMPORAL_NUEVO_EXE"
   start "" "RUTA_EXE_ACTUAL"
   del "%~f0"
   ```
   Luego ejecuta el script `.bat` minimizado y cierra el proceso actual inmediatamente. El script espera 3 segundos (para dar tiempo a que finalice la ejecución de la app vieja), copia y sobreescribe el ejecutable original, inicia la nueva versión actualizada y se autoelimina.
