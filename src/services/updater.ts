import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { exit } from '@tauri-apps/plugin-process';

export interface UpdateInfo {
  available: boolean;
  latestVersion: string;
  downloadUrl: string | null;
  releaseNotes: string | null;
}

export type UpdateState =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'available'; info: UpdateInfo }
  | { type: 'uptodate'; latestVersion: string }
  | { type: 'downloading'; progress: number }
  | { type: 'downloaded'; tempPath: string }
  | { type: 'error'; message: string };

export async function checkForUpdate(): Promise<UpdateInfo> {
  const currentVersion = await getVersion();
  return invoke<UpdateInfo>('check_update', { currentVersion });
}

export async function downloadUpdate(url: string): Promise<string> {
  return invoke<string>('download_update', { url });
}

export async function installUpdate(tempPath: string): Promise<void> {
  await invoke('install_update', { tempPath });
  await exit(0);
}
