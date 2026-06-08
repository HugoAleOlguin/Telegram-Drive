use anyhow::{anyhow, Result};
use grammers_client::{Client, Config, SignInError};
use grammers_client::types::{InputMessage, LoginToken, Media};
use grammers_session::Session;
use grammers_session::{PackedChat, PackedType};
use grammers_tl_types as tl;
use std::path::PathBuf;
use tokio::sync::Mutex;
use std::pin::Pin;
use std::task::{Context, Poll};
use tokio::io::{AsyncRead, ReadBuf};

pub struct ProgressReader<R, F: Fn(usize, usize) + Send + Sync + 'static> {
    inner: R,
    bytes_read: usize,
    total_size: usize,
    on_progress: F,
}

impl<R, F: Fn(usize, usize) + Send + Sync + 'static> Unpin for ProgressReader<R, F> {}

impl<R: AsyncRead + Unpin, F: Fn(usize, usize) + Send + Sync + 'static> AsyncRead for ProgressReader<R, F> {
    fn poll_read(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<std::io::Result<()>> {
        let this = self.get_mut();
        let prev_len = buf.filled().len();
        match Pin::new(&mut this.inner).poll_read(cx, buf) {
            Poll::Ready(Ok(())) => {
                let new_len = buf.filled().len();
                let bytes = new_len - prev_len;
                if bytes > 0 {
                    this.bytes_read += bytes;
                    (this.on_progress)(this.bytes_read, this.total_size);
                }
                Poll::Ready(Ok(()))
            }
            res => res,
        }
    }
}



pub struct ApiCredentials {
    pub api_id: i32,
    pub api_hash: String,
    pub phone_number: String,
}

pub struct TelegramClient {
    pub client: Client,
    pub session_path: PathBuf,
    pub login_token: Mutex<Option<LoginToken>>,
    pub phone_number: String,
}

impl TelegramClient {
    pub async fn connect(credentials: ApiCredentials, session_path: &str) -> Result<Self> {
        let session = Session::load_file_or_create(session_path)
            .map_err(|e| anyhow!("No se pudo cargar la sesión: {}", e))?;

        let config = Config {
            session,
            api_id: credentials.api_id,
            api_hash: credentials.api_hash,
            params: Default::default(),
        };

        let client = Client::connect(config)
            .await
            .map_err(|e| anyhow!("Error de conexión con Telegram: {}", e))?;

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

        Ok(Self {
            client,
            session_path: PathBuf::from(session_path),
            login_token: Mutex::new(None),
            phone_number: credentials.phone_number,
        })
    }

    pub async fn request_code(&self) -> Result<()> {
        let token = self.client
            .request_login_code(&self.phone_number)
            .await
            .map_err(|e| anyhow!("Error al solicitar código OTP: {}", e))?;
        *self.login_token.lock().await = Some(token);
        Ok(())
    }

    pub async fn sign_in(&self, code: &str) -> Result<()> {
        let mut token_lock = self.login_token.lock().await;
        if let Some(token) = token_lock.take() {
            match self.client.sign_in(&token, code).await {
                Ok(_user) => {
                    self.client.session().save_to_file(&self.session_path)
                        .map_err(|e| anyhow!("No se pudo guardar la sesión: {}", e))?;
                    Ok(())
                }
                Err(SignInError::PasswordRequired(_)) => Err(anyhow!("2FA activado. No soportado aún.")),
                Err(e) => Err(anyhow!("Código incorrecto: {}", e)),
            }
        } else {
            Err(anyhow!("No hay un código pendiente."))
        }
    }

    pub async fn upload_document(&self, file_path: &str) -> Result<(i32, String)> {
        let me = self.client.get_me().await?;
        let uploaded = self.client.upload_file(file_path).await
            .map_err(|e| anyhow!("Error al subir archivo a Telegram: {}", e))?;
        let msg = self.client
            .send_message(me, InputMessage::text("").file(uploaded))
            .await
            .map_err(|e| anyhow!("Error al enviar mensaje: {}", e))?;
        let doc_id = match msg.media() {
            Some(Media::Document(doc)) => doc.id().to_string(),
            _ => format!("msg_{}", msg.id()),
        };
        Ok((msg.id(), doc_id))
    }

    pub async fn upload_document_stream<F: Fn(usize, usize) + Send + Sync + 'static>(
        &self,
        file_path: &str,
        on_progress: F,
    ) -> Result<(i32, String)> {
        let path = std::path::Path::new(file_path);
        let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        let size = std::fs::metadata(&path)?.len() as usize;

        let file = tokio::fs::File::open(file_path).await?;
        let mut reader = ProgressReader {
            inner: file,
            bytes_read: 0,
            total_size: size,
            on_progress,
        };

        let me = self.client.get_me().await?;
        let uploaded = self.client.upload_stream(&mut reader, size, name).await
            .map_err(|e| anyhow!("Error al subir flujo a Telegram: {}", e))?;

        let msg = self.client
            .send_message(me, InputMessage::text("").file(uploaded))
            .await
            .map_err(|e| anyhow!("Error al enviar mensaje: {}", e))?;
        let doc_id = match msg.media() {
            Some(Media::Document(doc)) => doc.id().to_string(),
            _ => format!("msg_{}", msg.id()),
        };
        Ok((msg.id(), doc_id))
    }


    pub async fn delete_document(&self, msg_id: i32) -> Result<()> {
        let me = self.client.get_me().await?;
        self.client.delete_messages(me, &[msg_id]).await
            .map_err(|e| anyhow!("Error al eliminar mensaje: {}", e))?;
        Ok(())
    }

    pub async fn download_document(&self, msg_id: i32, dest_path: &str) -> Result<()> {
        let me = self.client.get_me().await?;
        let msgs = self.client.get_messages_by_id(me, &[msg_id]).await
            .map_err(|e| anyhow!("Error al obtener mensaje: {}", e))?;
        let msg = msgs.into_iter().next()
            .flatten()
            .ok_or(anyhow!("Mensaje {} no encontrado", msg_id))?;
        msg.download_media(dest_path).await
            .map_err(|e| anyhow!("Error al descargar: {}", e))?;
        Ok(())
    }

    /// Descarga una preview a cache (sin locks, solo Telegram)
    pub async fn cache_preview(&self, msg_id: i32, dest_path: &str) -> Result<bool> {
        let me = self.client.get_me().await?;
        let msgs = self.client.get_messages_by_id(me, &[msg_id]).await?;
        let msg = match msgs.into_iter().next().flatten() {
            Some(m) => m,
            None => return Ok(false),
        };
        msg.download_media(dest_path).await
            .map_err(|e| anyhow!("{}", e))
    }

    /// Solo obtiene mensajes de Saved Messages (sin DB lock)
    pub async fn fetch_saved_messages(&self) -> Result<Vec<grammers_client::types::Message>> {
        let me = self.client.get_me().await?;
        let mut iter = self.client.iter_messages(me);
        let mut msgs = Vec::new();
        loop {
            match iter.next().await {
                Ok(Some(msg)) => {
                    if msgs.len() >= 200 { break; }
                    msgs.push(msg);
                }
                Ok(None) => break,
                Err(e) => return Err(anyhow!("Error al obtener mensaje: {}", e)),
            }
        }
        Ok(msgs)
    }

    /// Create a private channel (broadcast) for folder storage
    pub async fn create_channel(&self, title: &str) -> Result<(i64, String)> {
        let result = self.client.invoke(&tl::functions::channels::CreateChannel {
            broadcast: true,
            megagroup: false,
            for_import: false,
            forum: false,
            title: title.to_string(),
            about: "Telegram Drive folder".to_string(),
            geo_point: None,
            address: None,
            ttl_period: None,
        }).await.map_err(|e| anyhow!("Error creating channel: {}", e))?;

        // Extract channel from response
        match result {
            tl::enums::Updates::Updates(updates) => {
                for chat in &updates.chats {
                    if let tl::enums::Chat::Channel(ch) = chat {
                        let packed = PackedChat {
                            ty: PackedType::Broadcast,
                            id: ch.id,
                            access_hash: ch.access_hash,
                        };
                        return Ok((ch.id, packed.to_hex()));
                    }
                }
                Err(anyhow!("Channel not found in response"))
            }
            _ => Err(anyhow!("Unexpected response type from CreateChannel"))
        }
    }

    /// Delete a channel by its packed hex
    pub async fn delete_channel(&self, packed_hex: &str) -> Result<()> {
        let packed = PackedChat::from_hex(packed_hex)
            .map_err(|e| anyhow!("Invalid packed chat: {}", e))?;

        let input_channel = packed.try_to_input_channel()
            .ok_or_else(|| anyhow!("Not a channel"))?;

        self.client.invoke(&tl::functions::channels::DeleteChannel {
            channel: input_channel,
        }).await.map_err(|e| anyhow!("Error deleting channel: {}", e))?;

        Ok(())
    }

    /// Rename a channel's title
    pub async fn rename_channel(&self, packed_hex: &str, new_title: &str) -> Result<()> {
        let packed = PackedChat::from_hex(packed_hex)
            .map_err(|e| anyhow!("Invalid packed chat: {}", e))?;

        let input_channel = packed.try_to_input_channel()
            .ok_or_else(|| anyhow!("Not a channel"))?;

        self.client.invoke(&tl::functions::channels::EditTitle {
            channel: input_channel,
            title: new_title.to_string(),
        }).await.map_err(|e| anyhow!("Error renaming channel: {}", e))?;

        Ok(())
    }

    /// Upload a file to a specific chat (channel)
    pub async fn upload_to_chat<F: Fn(usize, usize) + Send + Sync + 'static>(
        &self,
        packed_hex: &str,
        file_path: &str,
        on_progress: F,
    ) -> Result<(i32, String)> {
        let packed = PackedChat::from_hex(packed_hex)
            .map_err(|e| anyhow!("Invalid packed chat: {}", e))?;

        let path = std::path::Path::new(file_path);
        let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        let size = std::fs::metadata(&path)?.len() as usize;

        let file = tokio::fs::File::open(file_path).await?;
        let mut reader = ProgressReader {
            inner: file,
            bytes_read: 0,
            total_size: size,
            on_progress,
        };

        let uploaded = self.client.upload_stream(&mut reader, size, name).await
            .map_err(|e| anyhow!("Error uploading to channel: {}", e))?;

        let msg = self.client
            .send_message(packed, InputMessage::text("").file(uploaded))
            .await
            .map_err(|e| anyhow!("Error sending to channel: {}", e))?;

        let doc_id = match msg.media() {
            Some(Media::Document(doc)) => doc.id().to_string(),
            _ => format!("msg_{}", msg.id()),
        };
        Ok((msg.id(), doc_id))
    }

    /// Fetch messages from a specific chat (channel)
    pub async fn fetch_chat_messages(&self, packed_hex: &str) -> Result<Vec<grammers_client::types::Message>> {
        let packed = PackedChat::from_hex(packed_hex)
            .map_err(|e| anyhow!("Invalid packed chat: {}", e))?;

        let mut iter = self.client.iter_messages(packed);
        let mut msgs = Vec::new();
        loop {
            match iter.next().await {
                Ok(Some(msg)) => {
                    if msgs.len() >= 200 { break; }
                    msgs.push(msg);
                }
                Ok(None) => break,
                Err(e) => return Err(anyhow!("Error fetching channel messages: {}", e)),
            }
        }
        Ok(msgs)
    }

    /// Delete a message from a specific chat
    pub async fn delete_from_chat(&self, packed_hex: &str, msg_id: i32) -> Result<()> {
        let packed = PackedChat::from_hex(packed_hex)
            .map_err(|e| anyhow!("Invalid packed chat: {}", e))?;

        self.client.delete_messages(packed, &[msg_id]).await
            .map_err(|e| anyhow!("Error deleting from channel: {}", e))?;
        Ok(())
    }

    /// Download a file from a specific chat
    pub async fn download_from_chat(&self, packed_hex: &str, msg_id: i32, dest_path: &str) -> Result<()> {
        let packed = PackedChat::from_hex(packed_hex)
            .map_err(|e| anyhow!("Invalid packed chat: {}", e))?;

        let msgs = self.client.get_messages_by_id(packed, &[msg_id]).await
            .map_err(|e| anyhow!("Error getting message: {}", e))?;
        let msg = msgs.into_iter().next()
            .flatten()
            .ok_or(anyhow!("Message {} not found", msg_id))?;
        msg.download_media(dest_path).await
            .map_err(|e| anyhow!("Error downloading: {}", e))?;
        Ok(())
    }

    pub async fn sign_out(&self) -> Result<()> {
        self.client.sign_out_disconnect().await
            .map_err(|e| anyhow!("Error al cerrar sesión: {}", e))?;
        if self.session_path.exists() {
            std::fs::remove_file(&self.session_path)?;
        }
        Ok(())
    }
}
