import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { open } from '@tauri-apps/plugin-dialog';
import { uploadFile } from '../../services/tauri-bridge';
import { FolderTree } from '../../components/FolderTree/FolderTree';
import { FileExplorer } from '../../components/FileExplorer/FileExplorer';
import { SearchBar } from '../../components/SearchBar/SearchBar';
import type { DriveFolder } from '../../types';
import styles from './DrivePage.module.css';

interface Props {
  onLogout: () => void;
}

export function DrivePage({ onLogout }: Props) {
  const [activeFolder, setActiveFolder] = useState<DriveFolder | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const handleUpload = async () => {
    try {
      const selected = await open({ multiple: false, title: 'Select a file to upload' });
      if (selected) {
        setIsUploading(true);
        await uploadFile(selected as string, activeFolder?.id ?? 'saved_messages');
        queryClient.invalidateQueries({ queryKey: ['files', activeFolder?.id ?? 'saved_messages'] });
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          Telegram Drive
        </div>

        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        <div className={styles.topbarActions}>
          <button className={styles.iconBtn} onClick={onLogout} title="Sign out" aria-label="Sign out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

      <aside className={styles.sidebar}>
        <p className={styles.sidebarLabel}>Folders</p>
        <FolderTree activeFolder={activeFolder} onFolderSelect={setActiveFolder} />
      </aside>

      <main className={styles.main}>
        <div className={styles.mainHeader}>
          <div className={styles.breadcrumb}>
            <span>Drive</span>
            {activeFolder && <><span>/</span><span className={styles.current}>{activeFolder.name}</span></>}
          </div>

          <div className={styles.toolbar}>
            <div className={styles.viewToggle}>
              <button className={`${styles.viewBtn} ${view === 'grid' ? styles.active : ''}`}
                onClick={() => setView('grid')} aria-label="Grid view">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </button>
              <button className={`${styles.viewBtn} ${view === 'list' ? styles.active : ''}`}
                onClick={() => setView('list')} aria-label="List view">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </button>
            </div>

            <button className={styles.uploadBtn} onClick={handleUpload} disabled={isUploading}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {isUploading ? 'Subiendo...' : 'Subir'}
            </button>
          </div>
        </div>

        <div className={styles.content}>
          <FileExplorer
            folderId={activeFolder?.id ?? 'saved_messages'}
            view={view}
            searchQuery={searchQuery}
          />
        </div>
      </main>
    </div>
  );
}
