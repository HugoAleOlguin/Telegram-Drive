# Análisis de Mejoras Propuestas - Telegram Drive

Este documento contiene un desglose de las mejoras técnicas identificadas en el proyecto para optimizar la experiencia de usuario (UX), el rendimiento y la seguridad de la aplicación, priorizando la funcionalidad sobre la complejidad.

---

## 1. Soporte para Autenticación de Dos Pasos (2FA) de Telegram

### Problema
Actualmente, si un usuario tiene habilitado 2FA en su cuenta de Telegram, la aplicación devuelve un error no controlado en `client.rs` línea 76:
```rust
Err(SignInError::PasswordRequired(_)) => Err(anyhow!("2FA activado. No soportado aún.")),
```
Esto bloquea el acceso de usuarios con cuentas seguras.

### Solución Propuesta (Funcionalidad Directa)
Añadir una tercera fase en la UI de inicio de sesión o solicitar la contraseña directamente en caso de requerirse.
* **Modificación en Rust (`auth.rs` / `client.rs`)**:
  Modificar `sign_in` para retornar un tipo de resultado específico indicando si requiere contraseña. Enviar la contraseña desde el frontend si es necesario:
  ```rust
  // En client.rs
  pub async fn sign_in_with_password(&self, password: &str) -> Result<()> {
      let mut token_lock = self.login_token.lock().await;
      // ... resolver usando el cliente de grammers
      self.client.check_password(password).await?;
      self.client.session().save_to_file(&self.session_path)?;
      Ok(())
  }
  ```
* **Modificación en Frontend (`LoginPage.tsx`)**:
  Si el puente Tauri devuelve un código de estado o error `2FA_REQUIRED`, mostrar un formulario de contraseña de verificación para enviar a un comando `auth_verify_password`.

---

## 2. Seguimiento de Progreso de Subida/Descarga (Event-Based Progress)

### Problema
Actualmente, las subidas y descargas de archivos son llamadas IPC síncronas que bloquean la cola de tareas hasta que se completan. El frontend solo ve un estado estático de `uploading` o `done`, pero no sabe qué porcentaje del archivo se ha completado.

### Solución Propuesta (Sencilla y Funcional)
Utilizar el sistema de emisión de eventos de Tauri (`app.emit()`) para transmitir eventos de progreso desde el loop de subida de grammers hacia el frontend.
* **Modificación en Rust (`client.rs` / `files.rs`)**:
  Crear un callback o wrap en el lector de bytes que emita eventos periódicos.
  ```rust
  // Ejemplo conceptual en Rust usando Tauri AppHandle
  app.emit("upload-progress", ProgressPayload {
      task_id: task_id.clone(),
      bytes_sent: current_bytes,
      total_bytes: total_size,
  }).unwrap();
  ```
* **Modificación en Frontend (`DrivePage.tsx`)**:
  Escuchar el evento global en React:
  ```typescript
  import { listen } from '@tauri-apps/api/event';
  
  useEffect(() => {
    const unlisten = listen('upload-progress', (event: any) => {
      const { taskId, bytesSent, totalBytes } = event.payload;
      // Actualizar el porcentaje correspondiente en uploadQueue
    });
    return () => { unlisten.then(f => f()); };
  }, []);
  ```

---

## 3. Base de Datos Asíncrona (Evitar Bloquear el Hilo de Tokio)

### Problema
El backend utiliza la conexión única de `rusqlite` y bloquea el hilo con un Mutex estándar de la biblioteca estándar de Rust (`std::sync::Mutex`). Si hay muchas lecturas y escrituras pesadas al mismo tiempo (ej: sincronización masiva de miles de archivos), se bloquearán los comandos entrantes.

### Solución Propuesta
Migrar a `tokio-rusqlite`, que ejecuta las consultas SQL en un pool de hilos separado administrado por Tokio para evitar el bloqueo del event loop principal.
* **Modificación en Rust (`lib.rs` / `files.rs`)**:
  Reemplazar el mutex en `AppState`:
  ```rust
  pub struct AppState {
      pub db_conn: tokio_rusqlite::Connection, // gestionado de forma asíncrona
  }
  ```
  Las consultas se reescriben usando métodos asíncronos nativos:
  ```rust
  let conn = state.db_conn.clone();
  conn.call(|conn| {
      // Código síncrono de rusqlite ejecutado en un hilo de trabajo
      Ok(())
  }).await.map_err(|e| e.to_string())?;
  ```

---

## 4. Sincronización Paginada e Incremental de Mensajes Guardados

### Problema
`sync_files` lee los últimos 200 mensajes mediante `fetch_saved_messages`. Si el usuario tiene más de 200 archivos guardados en su chat, nunca aparecerán en la base de datos local a menos que se implemente una paginación.

### Solución Propuesta
Utilizar el parámetro `offset_id` o `offset_date` en la API de grammers para pedir mensajes antiguos de forma incremental.
* **En Rust (`client.rs`)**:
  ```rust
  pub async fn fetch_saved_messages_paginated(&self, offset_id: i32) -> Result<Vec<Message>> {
      let me = self.client.get_me().await?;
      let mut iter = self.client.iter_messages(me).offset_id(offset_id);
      // ... leer lote de mensajes
  }
  ```
* Se puede añadir un botón de "Cargar más" o sincronizar incrementalmente en segundo plano dividiendo las cargas por páginas.

---

## 5. Extracción de Miniaturas para Videos y Pre-visualizaciones en Frontend

### Problema
Actualmente, las miniaturas solo se generan para imágenes (`mime.starts_with("image/")`). Los videos, PDF y otros documentos muestran iconos de colores estáticos.

### Solución Propuesta (Priorizando Funcionalidad sobre Complejidad)
1. **Para Videos**:
   Telegram a menudo genera y adjunta automáticamente una miniatura para los videos que se envían. En `sync_files` y `upload_file`, podemos comprobar si el documento adjunto contiene una preview integrada en los metadatos de su formato de archivo en la API de Telegram y descargarla del mismo modo que las imágenes:
   ```rust
   // En client.rs
   // Si el archivo de video de Telegram tiene una miniatura adjunta en doc.thumbs(), podemos descargarla:
   if let Some(thumb) = doc.thumbs().first() {
       self.client.download_media(thumb, dest_path).await?;
   }
   ```
2. **Caché en Frontend**:
   Mostrar la ruta local temporal del thumbnail (`thumbnail_path` en SQLite) en el tag `<img src={convertFileSrc(file.thumbnailPath)} />` usando el método `convertFileSrc` de Tauri para saltarse las restricciones de CORS de archivos locales.
