use anyhow::{anyhow, Result};
use grammers_client::{Client, Config, SignInError};
use grammers_client::types::{InputMessage, LoginToken, Media};
use grammers_session::Session;
use std::path::PathBuf;
use tokio::sync::Mutex;

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

    pub async fn sign_out(&self) -> Result<()> {
        self.client.sign_out_disconnect().await
            .map_err(|e| anyhow!("Error al cerrar sesión: {}", e))?;
        if self.session_path.exists() {
            std::fs::remove_file(&self.session_path)?;
        }
        Ok(())
    }
}
