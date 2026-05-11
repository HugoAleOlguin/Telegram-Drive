// === TELEGRAM/UPLOAD.RS — Upload de archivos con chunked upload y resume ===
// Stub para Fase 3: upload de archivos grandes con progreso

use anyhow::Result;

/// Sube un archivo a un canal/Saved Messages de Telegram con chunking automático.
/// Emite eventos de progreso para que el frontend los muestre en la barra de progreso.
///
/// Para archivos > 2GB: divide automáticamente en partes de 1.9GB y las sube secuencialmente.
pub async fn upload_chunked(
    _file_path: &str,
    _folder_id: &str,
    // _app_handle: tauri::AppHandle,  // Para emitir eventos de progreso
) -> Result<String> {
    // TODO: Fase 3 — implementar:
    // 1. Abrir archivo y calcular tamaño total
    // 2. Si > 2GB: dividir en chunks de 1.9GB
    // 3. client.upload_file(path).await con progress callback
    // 4. client.send_file(channel, uploaded_file).await
    // 5. Indexar en SQLite local
    // 6. Emitir evento "upload_progress" via app_handle.emit_all()
    todo!("Implementar en Fase 3: chunked upload con progreso")
}
