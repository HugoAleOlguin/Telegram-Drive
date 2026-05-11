// === FOLDER TREE COMPONENT ===
// Muestra el árbol de carpetas en el sidebar

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { listFolders } from '../../services/tauri-bridge';
import type { DriveFolder } from '../../types';
import styles from './FolderTree.module.css';

interface FolderTreeProps {
  activeFolder: DriveFolder | null;
  onFolderSelect: (folder: DriveFolder | null) => void;
}

interface FolderItemProps {
  folder: DriveFolder;
  isActive: boolean;
  onSelect: () => void;
}

function FolderItem({ folder, isActive, onSelect }: FolderItemProps) {
  return (
    <motion.button
      className={`${styles.item} ${isActive ? styles.active : ''}`}
      onClick={onSelect}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.1 }}
    >
      <span className={styles.icon}>📁</span>
      <span className={styles.name}>{folder.name}</span>
    </motion.button>
  );
}

export function FolderTree({ activeFolder, onFolderSelect }: FolderTreeProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: listFolders,
    staleTime: 60_000,
  });

  return (
    <div className={styles.tree}>
      {/* Raíz: Saved Messages */}
      <motion.button
        className={`${styles.item} ${styles.root} ${activeFolder === null ? styles.active : ''}`}
        onClick={() => onFolderSelect(null)}
        whileHover={{ x: 2 }}
        transition={{ duration: 0.1 }}
      >
        <span className={styles.icon}>💬</span>
        <span className={styles.name}>Mis Archivos</span>
      </motion.button>

      {/* Carpetas del usuario */}
      {folders.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          isActive={activeFolder?.id === folder.id}
          onSelect={() => onFolderSelect(folder)}
        />
      ))}

      {/* Crear nueva carpeta */}
      {isCreating ? (
        <form
          className={styles.createForm}
          onSubmit={(e) => {
            e.preventDefault();
            // TODO: llamar createFolder en la Fase 3
            setIsCreating(false);
            setNewFolderName('');
          }}
        >
          <input
            type="text"
            className={styles.createInput}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Nombre de la carpeta"
            autoFocus
            onKeyDown={(e) => e.key === 'Escape' && setIsCreating(false)}
          />
        </form>
      ) : (
        <button
          className={styles.newFolder}
          onClick={() => setIsCreating(true)}
          aria-label="Crear nueva carpeta"
        >
          <span>+</span>
          <span>Nueva carpeta</span>
        </button>
      )}
    </div>
  );
}
