export interface TelegramCredentials {
  apiId: number;
  apiHash: string;
  phoneNumber: string;
}

export interface DriveFile {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  folderId: string;
  telegramFileId: string;
  createdAt: number;
  isEncrypted: boolean;
  thumbnailPath: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  parentId: string | null;
  channelId: number;
  createdAt: number;
  fileCount: number;
}

export interface DiskScanEntry {
  path: string;
  name: string;
  relPath: string;
  isDir: boolean;
}
