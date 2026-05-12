import { useEffect, useRef } from 'react';
import styles from './ContextMenu.module.css';

export interface ContextMenuItem {
  icon: React.ReactNode;
  label: string;
  action: () => void;
  danger?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    // Delay to avoid the same right-click that opened it
    setTimeout(() => window.addEventListener('mousedown', h), 0);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('mousedown', h); window.removeEventListener('keydown', esc); };
  }, []);

  const adjX = Math.min(x, window.innerWidth - 180);
  const adjY = Math.min(y, window.innerHeight - items.length * 36 - 12);

  return (
    <div className={styles.menu} style={{ left: adjX, top: adjY }} ref={ref}>
      {items.map((item, i) => (
        <button key={i} className={`${styles.item} ${item.danger ? styles.danger : ''}`}
          onClick={() => { item.action(); onClose(); }}>
          <span className={styles.itemIcon}>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
