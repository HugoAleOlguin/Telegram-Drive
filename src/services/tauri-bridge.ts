import { invoke } from '@tauri-apps/api/core';
import type { TelegramCredentials, DriveFile, DriveFolder, DiskScanEntry } from '../types';

export async function authLogin(credentials: TelegramCredentials): Promise<void> {
  return invoke('auth_login', { credentials });
}

export async function authVerifyCode(code: string): Promise<void> {
  return invoke('auth_verify_code', { code });
}

export async function authLogout(): Promise<void> {
  return invoke('auth_logout');
}

export async function authCheckSession(): Promise<boolean> {
  return invoke('auth_check_session');
}

export async function listFiles(folderId: string = 'self'): Promise<DriveFile[]> {
  return invoke('list_files', { folderId });
}

export async function uploadFile(taskId: string, filePath: string, folderId: string = 'self'): Promise<string> {
  return invoke('upload_file', { taskId, filePath, folderId });
}

export async function downloadFile(fileId: string, destPath: string): Promise<void> {
  return invoke('download_file', { fileId, destPath });
}

export async function deleteFile(fileId: string): Promise<void> {
  return invoke('delete_file', { fileId });
}

export async function renameFile(fileId: string, newName: string): Promise<void> {
  return invoke('rename_file', { fileId, newName });
}

export async function syncFiles(folderId: string = 'self'): Promise<DriveFile[]> {
  return invoke('sync_files', { folderId });
}

export async function createFolder(name: string, parentId?: string): Promise<DriveFolder> {
  return invoke('create_folder', { name, parentId: parentId ?? null });
}

export async function listFolders(parentId?: string): Promise<DriveFolder[]> {
  return invoke('list_folders', { parentId: parentId ?? null });
}

export async function renameFolder(folderId: string, newName: string): Promise<void> {
  return invoke('rename_folder', { folderId, newName });
}

export async function deleteFolder(folderId: string): Promise<void> {
  return invoke('delete_folder', { folderId });
}

/** Reads a local file and returns raw bytes as Uint8Array. Used for background images. */
export async function readImageBytes(filePath: string): Promise<number[]> {
  return invoke('read_image_bytes', { filePath });
}

export async function scanDiskItem(path: string): Promise<DiskScanEntry[]> {
  return invoke('scan_disk_item', { path });
}
