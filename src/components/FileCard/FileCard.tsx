import type { DriveFile } from '../../types';
import styles from './FileCard.module.css';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

interface Props {
  file: DriveFile;
  view: 'grid' | 'list';
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const ICONS: Record<string, string> = {
  image: '🖼️', video: '🎬', audio: '🎵', document: '📄', archive: '📦', code: '💻',
};

function category(mime: string): string {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.includes('pdf') || mime.includes('document') || mime.includes('text')) return 'document';
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z') || mime.includes('tar')) return 'archive';
  if (mime.includes('javascript') || mime.includes('json') || mime.includes('xml')) return 'code';
  return 'other';
}

const COLORS: Record<string, string> = {
  image: 'hsl(280 80% 55% / 0.15)', video: 'hsl(0 80% 55% / 0.15)',
  audio: 'hsl(160 70% 45% / 0.15)', document: 'hsl(200 80% 50% / 0.15)',
  archive: 'hsl(38 90% 55% / 0.15)', code: 'hsl(120 60% 45% / 0.15)',
  other: 'hsl(0 0% 50% / 0.1)',
};

export function FileCard({ file, view, isSelected, onSelect }: Props) {
  const cat = category(file.mimeType);
  const ext = file.name.split('.').pop()?.toUpperCase() ?? '';

  if (view === 'list') {
    return (
      <div className={`${styles.listRow} ${isSelected ? styles.selected : ''}`}
        onClick={() => onSelect(file.id)}
        role="row" aria-selected={isSelected} tabIndex={0}
        aria-label={file.name}>
        <div className={styles.listName}>
          <span>{ICONS[cat] ?? '📎'}</span>
          <span className="truncate">{file.name}</span>
          {file.isEncrypted && <span title="Cifrado">🔒</span>}
        </div>
        <span>{formatSize(file.sizeBytes)}</span>
        <span>{ext}</span>
        <span>{formatDate(file.createdAt)}</span>
      </div>
    );
  }

  return (
    <div className={`${styles.gridCard} ${isSelected ? styles.selected : ''}`}
      onClick={() => onSelect(file.id)}
      role="gridcell" aria-selected={isSelected} tabIndex={0}
      aria-label={file.name}>
      <div className={styles.iconWrap} style={{ background: COLORS[cat] ?? COLORS.other }}>
        <span>{ICONS[cat] ?? '📎'}</span>
        {file.isEncrypted && <div className={styles.badge}>🔒</div>}
      </div>
      <span className={styles.name} title={file.name}>{file.name}</span>
      <span className={styles.size}>{formatSize(file.sizeBytes)}</span>
    </div>
  );
}
