// === TIPOS CENTRALES — Telegram Drive ===

/** Estado de autenticación del usuario */
export type AuthStatus = 
  | 'idle'
  | 'entering_phone'
  | 'waiting_code'
  | 'waiting_password'
  | 'authenticated'
  | 'error';

/** Credenciales de la API de Telegram (obtenidas en my.telegram.org) */
export interface TelegramCredentials {
  apiId: number;
  apiHash: string;
  phoneNumber: string;
}

/** Carpeta virtual del Drive (mapea a un canal privado de Telegram o a Saved Messages) */
export interface DriveFolder {
  id: string;             // channel_id o 'saved_messages'
  name: string;
  parentId: string | null;
  telegramChannelId: string;
  createdAt: number;      // Unix timestamp
  fileCount?: number;
}

/** Archivo del Drive (mapea a un mensaje con adjunto en Telegram) */
export interface DriveFile {
  id: string;             // `${messageId}@${channelId}`
  name: string;
  sizeBytes: number;
  mimeType: string;
  folderId: string;
  telegramFileId: string; // file_id de Telegram (para descarga/streaming)
  createdAt: number;      // Unix timestamp
  isEncrypted: boolean;
  thumbnailUrl?: string;
}

/** Tipo de archivo por categoría (para íconos y filtros) */
export type FileCategory =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'archive'
  | 'code'
  | 'other';

/** Estado de un upload en progreso */
export interface UploadTask {
  id: string;             // UUID local
  fileName: string;
  totalBytes: number;
  uploadedBytes: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorMessage?: string;
  folderId: string;
}

/** Resultado de búsqueda */
export interface SearchResult {
  files: DriveFile[];
  folders: DriveFolder[];
  query: string;
}

/** Vista del explorador de archivos */
export type ExplorerView = 'grid' | 'list';

/** Orden de los archivos */
export type SortBy = 'name' | 'size' | 'date';
export type SortOrder = 'asc' | 'desc';

/** Respuesta genérica de comandos Tauri */
export interface TauriResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
