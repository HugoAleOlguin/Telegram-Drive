import styles from './SearchBar.module.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <div className={styles.wrapper}>
      <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
      </svg>
      <input type="search" className={styles.input} placeholder="Buscar..."
        value={value} onChange={(e) => onChange(e.target.value)} aria-label="Buscar" />
      {value && (
        <button className={styles.clear} onClick={() => onChange('')} aria-label="Limpiar">✕</button>
      )}
    </div>
  );
}
