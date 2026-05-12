import { useState, useEffect, useRef } from 'react';
import styles from './RenameDialog.module.css';

interface Props {
  currentName: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}

export function RenameDialog({ currentName, onConfirm, onCancel }: Props) {
  const [value, setValue] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed && trimmed !== currentName) onConfirm(trimmed);
    else onCancel();
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.title}>Renombrar</div>
        <form onSubmit={handleSubmit}>
          <input ref={inputRef} className={styles.input} type="text" value={value}
            onChange={e => setValue(e.target.value)} autoFocus />
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onCancel}>Cancelar</button>
            <button type="submit" className={styles.confirmBtn}>Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
