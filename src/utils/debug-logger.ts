export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

export interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

const listeners = new Set<(entry: LogEntry) => void>();
let counter = 0;

export function debugLog(level: LogLevel, message: string, data?: unknown): void {
  const entry: LogEntry = {
    id: ++counter,
    timestamp: new Date().toLocaleTimeString('es-AR', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + '.' + String(new Date().getMilliseconds()).padStart(3, '0'),
    level,
    message,
    data,
  };

  // Always log to the browser console too
  const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
  if (data !== undefined) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }

  listeners.forEach((fn) => fn(entry));
}

export function onDebugLog(fn: (entry: LogEntry) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
