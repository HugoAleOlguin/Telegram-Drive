// === TELEGRAM/DOWNLOAD.RS — Descarga y streaming de archivos ===
// Stub para Fase 4: descarga con resume y streaming de media

use anyhow::Result;

/// Descarga un archivo de Telegram al sistema de archivos local.
/// Soporta resume: si el archivo ya existe parcialmente, continúa desde donde quedó.
pub async fn download_file(
    _telegram_file_id: &str,
    _dest_path: &str,
) -> Result<()> {
    // TODO: Fase 4 — implementar:
    // 1. Obtener metadatos del archivo via file_id
    // 2. Verificar si existe descarga parcial (Resume)
    // 3. client.iter_download(&media).await con progress
    // 4. Guardar al dest_path
    todo!("Implementar en Fase 4: descarga con resume")
}

/// Obtiene una URL de streaming temporal para reproducir media sin descargar completo.
/// Funciona creando un servidor HTTP local en un puerto aleatorio que proxea chunks de Telegram.
pub async fn get_stream_url(_telegram_file_id: &str) -> Result<String> {
    // TODO: Fase 4 — implementar servidor HTTP local de streaming
    // Similar a como lo hace VLC con archivos de red
    todo!("Implementar en Fase 4: streaming via servidor HTTP local")
}
