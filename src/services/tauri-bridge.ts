// === TAURI BRIDGE — Capa de comunicación con el backend Rust ===
// Centraliza todos los invoke() para que nunca se llamen directamente en componentes

import { invoke } from '@tauri-apps/api/core';
import type {
  TelegramCredentials,
  DriveFolder,
  DriveFile,
} from '../types';

// --- Autenticación ---

/** Inicia el proceso de login enviando API ID y Hash a Rust */
export async function authLogin(credentials: TelegramCredentials): Promise<void> {
  return invoke('auth_login', { credentials });
}

/** Verifica el código OTP enviado por Telegram */
export async function authVerifyCode(code: string): Promise<void> {
  return invoke('auth_verify_code', { code });
}

/** Cierra sesión y elimina el archivo de sesión local */
export async function authLogout(): Promise<void> {
  return invoke('auth_logout');
}

/** Verifica si hay una sesión guardada válida */
export async function authCheckSession(): Promise<boolean> {
  return invoke('auth_check_session');
}

// --- Carpetas ---

/** Lista todas las carpetas del drive (Saved Messages + canales privados td_folder_*) */
export async function listFolders(): Promise<DriveFolder[]> {
  return invoke('list_folders');
}

/** Crea una nueva carpeta (crea un canal privado en Telegram) */
export async function createFolder(name: string, parentId: string | null): Promise<DriveFolder> {
  return invoke('create_folder', { name, parentId });
}

/** Elimina una carpeta y sus archivos */
export async function deleteFolder(folderId: string): Promise<void> {
  return invoke('delete_folder', { folderId });
}

// --- Archivos ---

/** Lista todos los archivos del drive */
export async function listFiles(): Promise<DriveFile[]> {
  return invoke('list_files');
}

/** Sube un archivo a Telegram */
export async function uploadFile(filePath: string): Promise<string> {
  return invoke('upload_file', { filePath });
}

/** Descarga un archivo desde Telegram */
export async function downloadFile(fileId: string, destPath: string): Promise<void> {
  return invoke('download_file', { fileId, destPath });
}

/** Elimina un archivo (borra el mensaje de Telegram + índice local) */
export async function deleteFile(fileId: string): Promise<void> {
  return invoke('delete_file', { fileId });
}

/** Renombra un archivo (solo nombre local, no modifica Telegram) */
export async function renameFile(fileId: string, newName: string): Promise<void> {
  return invoke('rename_file', { fileId, newName });
}

/** Obtiene/cachea thumbnail para un archivo, devuelve ruta local */
export async function getThumbnail(fileId: string): Promise<string> {
  return invoke('get_thumbnail', { fileId });
}

/** Sincroniza el índice local con Saved Messages de Telegram */
export async function syncFiles(): Promise<DriveFile[]> {
  return invoke('sync_files');
}
