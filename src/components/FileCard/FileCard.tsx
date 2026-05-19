import type { DriveFile } from '../../types';
import { FileIcon, fileCategory, FILE_COLORS, FILE_BG, FILE_LABEL } from '../FileIcon/FileIcon';
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
  onPreview: (file: DriveFile) => void;
  onDownload: (file: DriveFile) => void;
  onDelete: (id: string) => void;
  onRename: (file: DriveFile) => void;
  onContextMenu: (e: React.MouseEvent, file: DriveFile) => void;
}

export function FileCard({ file, view, onPreview, onDownload, onDelete, onRename, onContextMenu }: Props) {
  const cat = fileCategory(file.mimeType);
  const ext = file.name.split('.').pop()?.toUpperCase() ?? '';

  if (view === 'list') {
    return (
      <div className={styles.listRow}
        onClick={() => onPreview(file)}
        onContextMenu={e => onContextMenu(e, file)}
        role="row" tabIndex={0}
        aria-label={file.name}
        onKeyDown={e => { if (e.key === 'Enter') onPreview(file); }}>
        <div className={styles.listName}>
          <FileIcon category={cat} size={16} />
          <span className="truncate">{file.name}</span>
        </div>
        <span>{formatSize(file.sizeBytes)}</span>
        <span>{ext}</span>
        <span>{formatDate(file.createdAt)}</span>
        <div className={styles.listActions}>
          <button className={styles.listAction} onClick={e => { e.stopPropagation(); onRename(file); }} aria-label="Rename" title="Rename">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button className={styles.listAction} onClick={e => { e.stopPropagation(); onDownload(file); }} aria-label="Download" title="Download">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button className={styles.listActionDanger} onClick={e => { e.stopPropagation(); onDelete(file.id); }} aria-label="Delete" title="Delete">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gridCard}
      onClick={() => onPreview(file)}
      onContextMenu={e => onContextMenu(e, file)}
      role="gridcell" tabIndex={0}
      aria-label={file.name}
      onKeyDown={e => { if (e.key === 'Enter') onPreview(file); }}>
      <div className={styles.iconWrap} style={{ background: FILE_BG[cat] }}>
        <FileIcon category={cat} size={36} />
        <span className={styles.fileTypeLabel} style={{ color: FILE_COLORS[cat], background: FILE_BG[cat] }}>{FILE_LABEL[cat]}</span>
      </div>
      <div className={styles.fileInfo}>
        <span className={styles.name} title={file.name}>{file.name}</span>
        <span className={styles.meta}>{formatSize(file.sizeBytes)}</span>
      </div>
      <div className={styles.fileActions}>
        <button className={styles.fileAction} onClick={e => { e.stopPropagation(); onRename(file); }} aria-label="Rename" title="Rename">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button className={styles.fileAction} onClick={e => { e.stopPropagation(); onDownload(file); }} aria-label="Download" title="Download">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button className={styles.fileActionDanger} onClick={e => { e.stopPropagation(); onDelete(file.id); }} aria-label="Delete" title="Delete">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  );
}
