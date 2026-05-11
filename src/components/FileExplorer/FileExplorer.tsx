// === FILE EXPLORER COMPONENT ===
// Muestra el contenido de una carpeta con soporte de drag-and-drop para upload

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { FileCard } from '../FileCard/FileCard';
import { listFiles } from '../../services/tauri-bridge';
import type { DriveFile, ExplorerView, SortBy, SortOrder } from '../../types';
import styles from './FileExplorer.module.css';

interface FileExplorerProps {
  folderId: string;
  view: ExplorerView;
  sortBy: SortBy;
  sortOrder: SortOrder;
  searchQuery: string;
}

export function FileExplorer({
  folderId,
  view,
  sortBy,
  sortOrder,
  searchQuery,
}: FileExplorerProps) {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Carga los archivos de la carpeta desde el índice SQLite local
  const { data: files = [], isLoading } = useQuery({
    queryKey: ['files', folderId],
    queryFn: () => listFiles(folderId),
    // Re-valida cada 30 segundos en background para mantener el índice fresco
    staleTime: 30_000,
  });

  // Filtra y ordena los archivos según la búsqueda y el orden actual
  const displayFiles = files
    .filter((f) =>
      searchQuery
        ? f.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    )
    .sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * multiplier;
      if (sortBy === 'size') return (a.sizeBytes - b.sizeBytes) * multiplier;
      if (sortBy === 'date') return (a.createdAt - b.createdAt) * multiplier;
      return 0;
    });

  // Maneja el drag-and-drop para upload
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    // Los archivos se procesarán en el hook useUpload (próxima fase)
    const droppedFiles = Array.from(e.dataTransfer.files);
    console.log('Files dropped:', droppedFiles.map((f) => f.name));
  }, []);

  const handleFileOpen = useCallback((file: DriveFile) => {
    // TODO: Fase 4 — abrir/stream del archivo
    console.log('Open file:', file.id);
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)' }}>
        <span>Cargando archivos...</span>
      </div>
    );
  }

  return (
    <div
      className={styles.wrapper}
      style={{ position: 'relative' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Overlay de drag & drop */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            className={styles.dropOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className={styles.dropMessage}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>Soltá para subir</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cabecera de la lista */}
      {view === 'list' && displayFiles.length > 0 && (
        <div className={styles.listHeader}>
          <span>Nombre</span>
          <span>Tamaño</span>
          <span>Tipo</span>
          <span>Fecha</span>
        </div>
      )}

      {/* Archivos */}
      {displayFiles.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 'var(--space-4)', padding: 'var(--space-16)',
          color: 'var(--text-muted)', textAlign: 'center',
        }}>
          <span style={{ fontSize: '3rem', opacity: 0.4 }}>📂</span>
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 500, color: 'var(--text-secondary)' }}>
            {searchQuery ? 'No hay resultados' : 'Esta carpeta está vacía'}
          </p>
          <p style={{ fontSize: 'var(--text-sm)' }}>
            {searchQuery ? `No se encontraron archivos para "${searchQuery}"` : 'Arrastrá archivos aquí o usá el botón Subir'}
          </p>
        </div>
      ) : (
        <motion.div
          className={view === 'grid' ? styles.grid : styles.list}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {displayFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              view={view}
              isSelected={selectedFileId === file.id}
              onSelect={setSelectedFileId}
              onOpen={handleFileOpen}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
