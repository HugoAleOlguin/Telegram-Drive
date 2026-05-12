import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listFolders, createFolder } from '../../services/tauri-bridge';
import type { DriveFolder } from '../../types';
import styles from './FolderTree.module.css';

interface Props {
  activeFolder: DriveFolder | null;
  onFolderSelect: (folder: DriveFolder | null) => void;
}

export function FolderTree({ activeFolder, onFolderSelect }: Props) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: listFolders,
    staleTime: 60_000,
  });

  return (
    <div className={styles.tree}>
      <button className={`${styles.item} ${activeFolder === null ? styles.active : ''}`}
        onClick={() => onFolderSelect(null)}>
        <span>💬</span>
        <span>Saved Messages</span>
      </button>

      {folders.map((f) => (
        <button key={f.id}
          className={`${styles.item} ${activeFolder?.id === f.id ? styles.active : ''}`}
          onClick={() => onFolderSelect(f)}>
          <span>📁</span>
          <span>{f.name}</span>
        </button>
      ))}

      {creating ? (
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          await createFolder(name, activeFolder?.id ?? null);
          queryClient.invalidateQueries({ queryKey: ['folders'] });
          setCreating(false);
          setName('');
        }}>
          <input type="text" className={styles.input} value={name}
            onChange={(e) => setName(e.target.value)} placeholder="Nombre"
            autoFocus onKeyDown={(e) => e.key === 'Escape' && setCreating(false)} />
        </form>
      ) : (
        <button className={styles.add} onClick={() => setCreating(true)}>
          <span>+</span> Nueva Carpeta
        </button>
      )}
    </div>
  );
}
