// === DRIVE PAGE ===
// Vista principal del explorador de archivos tipo Google Drive / Finder

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FolderTree } from '../../components/FolderTree/FolderTree';
import { FileExplorer } from '../../components/FileExplorer/FileExplorer';
import { SearchBar } from '../../components/SearchBar/SearchBar';
import { UploadProgress } from '../../components/UploadProgress/UploadProgress';
import type { DriveFolder, ExplorerView, SortBy, SortOrder } from '../../types';
import styles from './DrivePage.module.css';

interface DrivePageProps {
  onLogout: () => void;
}

export function DrivePage({ onLogout }: DrivePageProps) {
  // Carpeta actualmente seleccionada (null = raíz / Saved Messages)
  const [activeFolder, setActiveFolder] = useState<DriveFolder | null>(null);
  const [view, setView] = useState<ExplorerView>('grid');
  const [sortBy] = useState<SortBy>('name');
  const [sortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Genera el breadcrumb path desde la raíz hasta la carpeta activa
  const folderName = activeFolder?.name ?? 'My Files';

  return (
    <div className={styles.container}>
      {/* Topbar — arrastreable como barra de ventana nativa */}
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          Telegram Drive
        </div>

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
        />

        <div className={styles.topbarActions}>
          {/* Botón de sincronizar */}
          <button className={styles.iconButton} title="Sync" aria-label="Sync files">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Botón de logout */}
          <button
            className={styles.iconButton}
            title="Sign out"
            aria-label="Sign out"
            onClick={onLogout}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Sidebar — árbol de carpetas */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarSection}>
          <p className={styles.sidebarLabel}>Folders</p>
          <FolderTree
            activeFolder={activeFolder}
            onFolderSelect={setActiveFolder}
          />
        </div>
      </aside>

      {/* Main — explorador de archivos */}
      <main className={styles.main}>
        <div className={styles.mainHeader}>
          <div className={styles.breadcrumb}>
            <span>Drive</span>
            {activeFolder && (
              <>
                <span>/</span>
                <span className={styles.breadcrumbCurrent}>{folderName}</span>
              </>
            )}
          </div>

          <div className={styles.mainToolbar}>
            {/* Toggle de vista: grid vs lista */}
            <div className={styles.viewToggle}>
              <button
                className={`${styles.viewToggleBtn} ${view === 'grid' ? styles.active : ''}`}
                onClick={() => setView('grid')}
                aria-label="Grid view"
                title="Grid view"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </button>
              <button
                className={`${styles.viewToggleBtn} ${view === 'list' ? styles.active : ''}`}
                onClick={() => setView('list')}
                aria-label="List view"
                title="List view"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Botón de subir archivo */}
            <motion.button
              className={styles.uploadButton}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Upload
            </motion.button>
          </div>
        </div>

        <div className={styles.mainContent}>
          <FileExplorer
            folderId={activeFolder?.id ?? 'saved_messages'}
            view={view}
            sortBy={sortBy}
            sortOrder={sortOrder}
            searchQuery={searchQuery}
          />
        </div>
      </main>

      {/* Panel de progreso de uploads (flotante, se oculta si no hay uploads activos) */}
      <UploadProgress />
    </div>
  );
}
