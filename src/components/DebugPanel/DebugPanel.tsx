import { useState, useEffect, useRef } from 'react';
import { onDebugLog, type LogEntry } from '../../utils/debug-logger';
import styles from './DebugPanel.module.css';

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Toggle with Ctrl+Shift+D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Subscribe to log events
  useEffect(() => {
    return onDebugLog((entry) => {
      setLogs((prev) => [...prev.slice(-500), entry]); // keep last 500 entries
    });
  }, []);

  // Auto-scroll to bottom when new log arrives
  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, open]);

  if (!open) return null;

  const levelClass = (level: string) => {
    switch (level) {
      case 'info':    return styles.lvl_info;
      case 'debug':   return styles.lvl_debug;
      case 'warn':    return styles.lvl_warn;
      case 'error':   return styles.lvl_error;
      case 'success': return styles.lvl_success;
      default:        return styles.lvl_info;
    }
  };

  const copyAll = () => {
    const text = logs.map((e) =>
      `[${e.timestamp}] [${e.level.toUpperCase()}] ${e.message}${e.data !== undefined ? ' | ' + JSON.stringify(e.data) : ''}`
    ).join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className={styles.panel} role="log" aria-label="Debug Console">
      <div className={styles.header}>
        <span className={styles.title}>🛠 Debug Console</span>
        <span className={styles.badge}>{logs.length} logs</span>
        <span className={styles.spacer} />
        <button className={styles.headerBtn} onClick={copyAll}>
          📋 Copiar
        </button>
        <button className={styles.headerBtn} onClick={() => setLogs([])}>
          🗑 Limpiar
        </button>
        <button className={styles.headerBtn} onClick={() => setOpen(false)}>
          ✕ Cerrar
        </button>
      </div>

      <div className={styles.logs}>
        {logs.length === 0 ? (
          <div className={styles.empty}>Sin logs aún…</div>
        ) : (
          logs.map((entry) => (
            <div key={entry.id} className={styles.entry}>
              <span className={styles.ts}>{entry.timestamp}</span>
              <span className={`${styles.lvl} ${levelClass(entry.level)}`}>
                [{entry.level.toUpperCase()}]
              </span>
              <span className={styles.msg}>{entry.message}</span>
              {entry.data !== undefined && (
                <span className={styles.data}>
                  → {typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data)}
                </span>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className={styles.hint}>
        Ctrl+Shift+D para abrir/cerrar · Mostrando últimos 500 eventos
      </div>
    </div>
  );
}
