// === TELEGRAM/CLIENT.RS — Wrapper del cliente MTProto (Grammers v0.7) ===

use anyhow::{anyhow, Result};
use grammers_client::{Client, Config, SignInError};
use grammers_client::types::LoginToken;
use grammers_session::Session;
use std::path::PathBuf;
use tokio::sync::Mutex;

/// Credenciales de la API de Telegram
pub struct ApiCredentials {
    pub api_id: i32,
    pub api_hash: String,
    pub phone_number: String,
}

/// Wrapper sobre grammers_client::Client que maneja la sesión y reconexión.
/// Se almacenará como estado global de Tauri en un Arc<Mutex<Option<TelegramClient>>>.
pub struct TelegramClient {
    pub client: Client,
    pub session_path: PathBuf,
    // El login token se guarda entre request_code() y sign_in()
    pub login_token: Mutex<Option<LoginToken>>,
    pub phone_number: String,
}

impl TelegramClient {
    /// Crea una nueva conexión con el servidor de Telegram.
    /// Si hay una sesión guardada en session_path, la reutiliza para reconectarse.
    pub async fn connect(credentials: ApiCredentials, session_path: &str) -> Result<Self> {
        // Carga la sesión guardada o crea una nueva vacía
        let session = Session::load_file_or_create(session_path)
            .map_err(|e| anyhow!("No se pudo cargar la sesión: {}", e))?;

        let config = Config {
            session,
            api_id: credentials.api_id,
            api_hash: credentials.api_hash,
            params: Default::default(),
        };

        log::info!("Conectando a los servidores de Telegram...");

        // En grammers v0.7, connect() devuelve Client directamente (no una tupla)
        let client = Client::connect(config)
            .await
            .map_err(|e| anyhow!("Error de conexión con Telegram: {}", e))?;

        // El cliente maneja su propia red internamente, pero debemos llamar
        // step() en background para procesar eventos entrantes
        let bg_client = client.clone();
        tokio::spawn(async move {
            loop {
                match bg_client.step().await {
                    Ok(_) => {} // Evento procesado o ping completado
                    Err(e) => {
                        log::error!("Error en el worker de Telegram: {}", e);
                        break;
                    }
                }
            }
        });

        log::info!("Conexión establecida con Telegram.");

        Ok(Self {
            client,
            session_path: PathBuf::from(session_path),
            login_token: Mutex::new(None),
            phone_number: credentials.phone_number,
        })
    }

    /// Envía el código OTP al número de teléfono vinculado a la cuenta.
    pub async fn request_code(&self) -> Result<()> {
        log::info!("Solicitando código OTP para {}", self.phone_number);

        // En grammers v0.7, solo se pasa el teléfono (api_id/hash ya están en Config)
        let token = self.client
            .request_login_code(&self.phone_number)
            .await
            .map_err(|e| anyhow!("Error al solicitar código OTP: {}", e))?;

        *self.login_token.lock().await = Some(token);
        log::info!("Código OTP solicitado. Revisa tu app de Telegram.");
        Ok(())
    }

    /// Verifica el código OTP y completa el proceso de autenticación.
    pub async fn sign_in(&self, code: &str) -> Result<()> {
        log::info!("Verificando código de inicio de sesión...");
        let mut token_lock = self.login_token.lock().await;

        if let Some(token) = token_lock.take() {
            match self.client.sign_in(&token, code).await {
                Ok(_user) => {
                    log::info!("¡Sesión iniciada exitosamente!");
                    // Persiste la sesión para que el próximo inicio sea automático
                    self.client
                        .session()
                        .save_to_file(&self.session_path)
                        .map_err(|e| anyhow!("No se pudo guardar la sesión: {}", e))?;
                    Ok(())
                }
                Err(SignInError::PasswordRequired(_)) => {
                    // Reponemos el token por si el usuario quiere reintentar con 2FA en el futuro
                    Err(anyhow!(
                        "2FA activado. El soporte para verificación en dos pasos llegará pronto."
                    ))
                }
                Err(e) => Err(anyhow!("Código incorrecto: {}", e)),
            }
        } else {
            Err(anyhow!("No hay un código pendiente. Por favor vuelve al paso anterior."))
        }
    }

    /// Cierra la sesión y limpia el archivo de sesión local.
    pub async fn sign_out(&self) -> Result<()> {
        self.client
            .sign_out_disconnect()
            .await
            .map_err(|e| anyhow!("Error al cerrar sesión: {}", e))?;

        if self.session_path.exists() {
            std::fs::remove_file(&self.session_path)?;
        }

        log::info!("Sesión cerrada y archivos de sesión eliminados.");
        Ok(())
    }
}
