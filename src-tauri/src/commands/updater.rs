use serde::{Deserialize, Serialize};
use std::io::Read;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub available: bool,
    pub latest_version: String,
    pub download_url: Option<String>,
    pub release_notes: Option<String>,
}

fn is_newer(a: &str, b: &str) -> bool {
    fn parse(v: &str) -> Vec<u32> {
        v.trim_start_matches('v')
            .split('.')
            .filter_map(|s| s.parse().ok())
            .collect()
    }
    let va = parse(a);
    let vb = parse(b);
    for (x, y) in va.iter().zip(vb.iter()) {
        if x != y {
            return x < y;
        }
    }
    va.len() < vb.len()
}

#[derive(Deserialize)]
struct GithubRelease {
    #[serde(rename = "tag_name")]
    tag_name: String,
    #[serde(default)]
    body: String,
    assets: Vec<GithubAsset>,
}

#[derive(Deserialize)]
struct GithubAsset {
    name: String,
    #[serde(rename = "browser_download_url")]
    browser_download_url: String,
}

#[tauri::command]
pub async fn check_update(current_version: String) -> Result<UpdateInfo, String> {
    let url = "https://api.github.com/repos/HugoAleOlguin/Telegram-Drive/releases/latest";

    let response = ureq::get(url)
        .set("User-Agent", "Telegram-Drive/1.0")
        .set("Accept", "application/vnd.github.v3+json")
        .call()
        .map_err(|e| format!("Error al conectar con GitHub: {}", e))?;

    let mut body = String::new();
    response
        .into_reader()
        .read_to_string(&mut body)
        .map_err(|e| format!("Error al leer respuesta: {}", e))?;

    let release: GithubRelease =
        serde_json::from_str(&body).map_err(|e| format!("Error al parsear respuesta: {}", e))?;

    let latest_version = release.tag_name.trim_start_matches('v').to_string();
    let is_available = is_newer(&current_version, &latest_version);

    let download_url = release
        .assets
        .iter()
        .find(|a| a.name.ends_with(".exe") || a.name.ends_with(".EXE"))
        .map(|a| a.browser_download_url.clone());

    Ok(UpdateInfo {
        available: is_available,
        latest_version,
        download_url,
        release_notes: Some(release.body),
    })
}

#[tauri::command]
pub async fn download_update(url: String) -> Result<String, String> {
    let temp_dir = std::env::temp_dir().join("tg-drive-update");
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Error al crear directorio temporal: {}", e))?;

    let exe_name = "Telegram Drive.exe";
    let output_path = temp_dir.join(exe_name);

    if output_path.exists() {
        std::fs::remove_file(&output_path).ok();
    }

    let response = ureq::get(&url)
        .set("User-Agent", "Telegram-Drive/1.0")
        .call()
        .map_err(|e| format!("Error al descargar actualización: {}", e))?;

    let mut reader = response.into_reader();
    let mut file = std::fs::File::create(&output_path)
        .map_err(|e| format!("Error al crear archivo temporal: {}", e))?;

    std::io::copy(&mut reader, &mut file)
        .map_err(|e| format!("Error al escribir archivo: {}", e))?;

    Ok(output_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn install_update(temp_path: String) -> Result<(), String> {
    let current_exe = std::env::current_exe()
        .map_err(|e| format!("Error al obtener ruta del ejecutable: {}", e))?;

    let bat_content = format!(
        "@echo off\n\
         title Actualizando Telegram Drive...\n\
         echo Esperando a que la aplicacion se cierre...\n\
         timeout /t 3 /nobreak >nul\n\
         echo Copiando nueva version...\n\
         copy /Y \"{temp}\" \"{exe}\" >nul\n\
         if errorlevel 1 (\n\
             echo Error: No se pudo reemplazar el ejecutable. Reintentando...\n\
             timeout /t 2 /nobreak >nul\n\
             copy /Y \"{temp}\" \"{exe}\" >nul\n\
         )\n\
         if exist \"{temp}\" del /f /q \"{temp}\"\n\
         start \"\" \"{exe}\"\n\
         del \"%~f0\"\n",
        temp = temp_path,
        exe = current_exe.display(),
    );

    let bat_path = std::env::temp_dir().join("tg-update.bat");
    std::fs::write(&bat_path, bat_content)
        .map_err(|e| format!("Error al crear script de actualización: {}", e))?;

    let _ = std::process::Command::new("cmd")
        .args(["/c", "start", "/min", bat_path.to_str().unwrap()])
        .spawn()
        .map_err(|e| format!("Error al lanzar actualización: {}", e))?;

    Ok(())
}
