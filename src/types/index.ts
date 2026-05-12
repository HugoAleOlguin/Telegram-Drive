export interface TelegramCredentials {
  apiId: number;
  apiHash: string;
  phoneNumber: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  parentId: string | null;
  telegramChannelId: string;
  createdAt: number;
  fileCount?: number;
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
