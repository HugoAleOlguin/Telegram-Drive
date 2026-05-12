import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileCard } from '../FileCard/FileCard';
import { listFiles } from '../../services/tauri-bridge';
import styles from './FileExplorer.module.css';

interface Props {
  view: 'grid' | 'list';
  searchQuery: string;
}

export function FileExplorer({ view, searchQuery }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['files'],
    queryFn: listFiles,
    staleTime: 30_000,
  });

  const displayFiles = files
    .filter((f) =>
      searchQuery ? f.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragOver(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); }, []);

  if (isLoading) {
    return <div className={styles.center}><span>Cargando...</span></div>;
  }

  return (
    <div className={styles.wrapper}
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      aria-label="File explorer">
      {isDragOver && <div className={styles.dropOverlay}><span>Suelta archivos aquí</span></div>}

      {displayFiles.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📂</span>
          <p className={styles.emptyTitle}>Sin archivos</p>
          <p className={styles.emptyDesc}>Sube archivos usando el botón "Subir"</p>
        </div>
      ) : (
        <div className={view === 'grid' ? styles.grid : styles.list} role="grid" aria-label="Files">
          {displayFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              view={view}
              isSelected={selectedId === file.id}
              onSelect={setSelectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
