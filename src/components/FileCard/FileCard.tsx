// === FILE CARD COMPONENT ===
// Muestra un archivo individual en vista grid o lista

import { motion } from 'framer-motion';
import type { DriveFile, ExplorerView, FileCategory } from '../../types';
import styles from './FileCard.module.css';

// Mapea MIME type a categoría para determinar el ícono
function getFileCategory(mimeType: string): FileCategory {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('tar')) return 'archive';
  if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('xml')) return 'code';
  return 'other';
}

// Ícono emoji por categoría
const CATEGORY_ICONS: Record<FileCategory, string> = {
  image: '🖼️',
  video: '🎬',
  audio: '🎵',
  document: '📄',
  archive: '📦',
  code: '💻',
  other: '📎',
};

// Colores de fondo del ícono por categoría
const CATEGORY_COLORS: Record<FileCategory, string> = {
  image: 'hsl(280 80% 55% / 0.15)',
  video: 'hsl(0 80% 55% / 0.15)',
  audio: 'hsl(160 70% 45% / 0.15)',
  document: 'hsl(200 80% 50% / 0.15)',
  archive: 'hsl(38 90% 55% / 0.15)',
  code: 'hsl(120 60% 45% / 0.15)',
  other: 'hsl(0 0% 50% / 0.1)',
};

// Formatea el tamaño del archivo a formato legible
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// Formatea timestamp a fecha legible
function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

interface FileCardProps {
  file: DriveFile;
  view: ExplorerView;
  isSelected: boolean;
  onSelect: (fileId: string) => void;
  onOpen: (file: DriveFile) => void;
}

export function FileCard({ file, view, isSelected, onSelect, onOpen }: FileCardProps) {
  const category = getFileCategory(file.mimeType);
  const icon = CATEGORY_ICONS[category];
  const bgColor = CATEGORY_COLORS[category];
  const extension = file.name.split('.').pop()?.toUpperCase() ?? '';

  if (view === 'list') {
    return (
      <div
        className={`${styles.listRow} ${isSelected ? styles.selected : ''}`}
        onClick={() => onSelect(file.id)}
        onDoubleClick={() => onOpen(file)}
        role="row"
        aria-selected={isSelected}
      >
        <div className={styles.listRowName}>
          <span style={{ fontSize: '1.2rem' }}>{icon}</span>
          <span className="truncate">{file.name}</span>
          {file.isEncrypted && <span title="Archivo cifrado">🔒</span>}
        </div>
        <span className={styles.listRowSize}>{formatFileSize(file.sizeBytes)}</span>
        <span className={styles.listRowType}>{extension}</span>
        <span className={styles.listRowDate}>{formatDate(file.createdAt)}</span>
      </div>
    );
  }

  return (
    <motion.div
      className={`${styles.gridCard} ${isSelected ? styles.selected : ''}`}
      onClick={() => onSelect(file.id)}
      onDoubleClick={() => onOpen(file)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
      role="gridcell"
      aria-selected={isSelected}
    >
      {/* Ícono o thumbnail */}
      <div className={styles.iconContainer} style={{ background: bgColor }}>
        {file.thumbnailUrl ? (
          <img src={file.thumbnailUrl} alt={file.name} className={styles.thumbnail} />
        ) : (
          <span>{icon}</span>
        )}
        {file.isEncrypted && (
          <div className={styles.encryptedBadge} title="Cifrado">🔒</div>
        )}
      </div>

      <span className={styles.fileName} title={file.name}>{file.name}</span>
      <span className={styles.fileSize}>{formatFileSize(file.sizeBytes)}</span>
    </motion.div>
  );
}
