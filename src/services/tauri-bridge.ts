// === TAURI BRIDGE — Capa de comunicación con el backend Rust ===
// Centraliza todos los invoke() para que nunca se llamen directamente en componentes

import { invoke } from '@tauri-apps/api/core';
import type {
  TelegramCredentials,
  DriveFolder,
  DriveFile,
  UploadTask,
  SearchResult,
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

/** Lista los archivos de una carpeta (desde el índice SQLite local) */
export async function listFiles(folderId: string): Promise<DriveFile[]> {
  return invoke('list_files', { folderId });
}

/** Sube un archivo al Drive con progreso via eventos Tauri */
export async function uploadFile(filePath: string, folderId: string): Promise<UploadTask> {
  return invoke('upload_file', { filePath, folderId });
}

/** Descarga un archivo a un directorio local */
export async function downloadFile(fileId: string, destPath: string): Promise<void> {
  return invoke('download_file', { fileId, destPath });
}

/** Elimina un archivo (elimina el mensaje de Telegram) */
export async function deleteFile(fileId: string): Promise<void> {
  return invoke('delete_file', { fileId });
}

/** Renombra un archivo (edita el caption del mensaje) */
export async function renameFile(fileId: string, newName: string): Promise<void> {
  return invoke('rename_file', { fileId, newName });
}

// --- Búsqueda ---

/** Búsqueda full-text sobre el índice SQLite local */
export async function searchFiles(query: string): Promise<SearchResult> {
  return invoke('search_files', { query });
}

// --- Sincronización ---

/** Fuerza una re-sincronización del índice local con Telegram */
export async function syncIndex(): Promise<void> {
  return invoke('sync_index');
}
