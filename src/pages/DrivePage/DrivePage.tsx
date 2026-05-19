import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { open as openDialog, save } from '@tauri-apps/plugin-dialog';
import { uploadFile, listFiles, deleteFile, syncFiles, downloadFile, renameFile } from '../../services/tauri-bridge';
import { checkForUpdate, downloadUpdate, installUpdate } from '../../services/updater';
import type { UpdateState } from '../../services/updater';
import type { DriveFile } from '../../types';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useTranslation } from '../../locales';
import { ContextMenu, type ContextMenuItem } from '../../components/ContextMenu/ContextMenu';
import { RenameDialog } from '../../components/RenameDialog/RenameDialog';
import { FileCard } from '../../components/FileCard/FileCard';
import { FileIcon, fileCategory, FILE_COLORS, FILE_BG, FILE_LABEL } from '../../components/FileIcon/FileIcon';
import type { FileCategory } from '../../components/FileIcon/FileIcon';
import styles from './DrivePage.module.css';

const ALL_CATEGORIES: FileCategory[] = ['image', 'video', 'audio', 'pdf', 'archive', 'code', 'doc'];
type VM = 'grid' | 'list';
type SK = 'date' | 'name' | 'size';
type FF = 'all' | FileCategory;
type UT = { id: string; name: string; size: number; status: 'pending' | 'uploading' | 'done' | 'error'; error?: string };

function fs(b: number): string {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)}KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)}MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)}GB`;
}

function mk(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }

// ─── Theme ─────────────────────────────────────────────────────────
function useTheme() {
  const [t, set] = useState<'dark' | 'light'>(() => {
    try { return (localStorage.getItem('tg-theme') as 'dark' | 'light') || 'dark'; } catch { return 'dark'; }
  });
  const st = useCallback((v: 'dark' | 'light') => {
    set(v);
    try { localStorage.setItem('tg-theme', v); } catch { }
    document.documentElement.setAttribute('data-theme', v === 'light' ? 'light' : 'dark');
  }, []);
  useEffect(() => { document.documentElement.setAttribute('data-theme', t); }, [t]);
  return { theme: t, setTheme: st };
}

// ─── Settings Modal ─────────────────────────────────────────────────
function SettingsModal({ theme, setTheme, lang, setLang, onClose, updateState, onCheckUpdate, onDownload, onInstall }: {
  theme: string; setTheme: (v: 'dark' | 'light') => void; lang: string; setLang: (v: 'en' | 'es') => void; onClose: () => void;
  updateState: UpdateState; onCheckUpdate: () => void; onDownload: () => void; onInstall: (path: string) => void;
}) {
  const { t } = useTranslation();
  return (<div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true" aria-label={t('settings')}><div className={styles.settingsModal} onClick={e => e.stopPropagation()}>
    <div className={styles.settingsHeader}><span className={styles.settingsTitle}>{t('settings')}</span><button className={styles.settingsClose} onClick={onClose} aria-label="Close"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button></div>
    <div className={styles.settingsBody}>
      <div className={styles.setLabel}>{t('theme')}</div>
      <div className={styles.themePicker}>
        <button className={`${styles.themeOption} ${theme === 'dark' ? styles.themeActive : ''}`} onClick={() => setTheme('dark')} aria-pressed={theme === 'dark'}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
          <span>{t('dark')}</span>
        </button>
        <button className={`${styles.themeOption} ${theme === 'light' ? styles.themeActive : ''}`} onClick={() => setTheme('light')} aria-pressed={theme === 'light'}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
          <span>{t('light')}</span>
        </button>
      </div>
      <div className={styles.setLabel}>{t('lang')}</div>
      <div className={styles.themePicker}>
        <button className={`${styles.themeOption} ${lang === 'en' ? styles.themeActive : ''}`} onClick={() => setLang('en')} aria-pressed={lang === 'en'}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>EN</span><span>English</span>
        </button>
        <button className={`${styles.themeOption} ${lang === 'es' ? styles.themeActive : ''}`} onClick={() => setLang('es')} aria-pressed={lang === 'es'}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>ES</span><span>Español</span>
        </button>
      </div>
      <div className={styles.settingsDivider} />
      <div className={styles.setLabel}>{t('check_update')}</div>
      <div className={styles.updateSection}>
        {updateState.type === 'idle' && (
          <button className={styles.updateBtn} onClick={onCheckUpdate}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg><span>{t('check_update')}</span></button>
        )}
        {updateState.type === 'checking' && (
          <div className={styles.updateStatus}><span className={styles.spinner} /><span>{t('update_checking')}</span></div>
        )}
        {updateState.type === 'available' && (
          <div className={styles.updateAvailable}>
            <div className={styles.updateInfo}><span className={styles.updateBadge}>{t('update_available', { version: updateState.info.latestVersion })}</span></div>
            {updateState.info.releaseNotes && (
              <details className={styles.updateNotes}><summary>{t('update_notes')}</summary><pre>{updateState.info.releaseNotes}</pre></details>
            )}
            <button className={styles.updateBtnPrimary} onClick={onDownload}><span>{t('update_download')}</span></button>
          </div>
        )}
        {updateState.type === 'uptodate' && (
          <div className={styles.updateStatus}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tg-green)" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
            <span>{t('update_uptodate', { version: updateState.latestVersion })}</span>
          </div>
        )}
        {updateState.type === 'downloading' && (
          <div className={styles.updateStatus}><span className={styles.spinner} /><span>{t('update_downloading')}</span></div>
        )}
        {updateState.type === 'downloaded' && (
          <div className={styles.updateAvailable}>
            <div className={styles.updateInfo}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tg-green)" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              <span>{t('update_downloaded')}</span>
            </div>
            <button className={styles.updateBtnPrimary} onClick={() => onInstall(updateState.tempPath)}><span>{t('update_install')}</span></button>
          </div>
        )}
        {updateState.type === 'error' && (
          <div className={styles.updateError}><span>{updateState.message}</span><button className={styles.updateRetry} onClick={onCheckUpdate}>{t('retry')}</button></div>
        )}
      </div>
      <div className={styles.settingsDivider} />
      <div className={styles.settingsFooter}>
        <div className={styles.setLink} onClick={() => openUrl('https://github.com/HugoAleOlguin/Telegram-Drive')} role="link" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') openUrl('https://github.com/HugoAleOlguin/Telegram-Drive') }}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></svg>{t('repo')}
        </div>
        <div className={styles.setLink} onClick={() => openUrl('https://hugoaleolguin.github.io/')} role="link" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') openUrl('https://hugoaleolguin.github.io/') }}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>{t('port')}
        </div>
        <span className={styles.setVer}>{t('version')}</span>
      </div>
    </div>
  </div></div>);
}

// ─── Upload Queue ───────────────────────────────────────────────────
function UploadQueue({ tasks, onClose }: { tasks: UT[]; onClose: () => void }) {
  const { t } = useTranslation(); if (tasks.length === 0) return null; const d = tasks.filter(x => x.status === 'done' || x.status === 'error').length;
  return (<div className={styles.queueOverlay} role="status" aria-label={`${d} of ${tasks.length} files processed`}><div className={styles.queuePanel}>
    <div className={styles.queueHeader}><span>{d === tasks.length ? t('q_done', { c: tasks.length }) : t('q_up', { c: tasks.length - d })}</span>{d === tasks.length && <button className={styles.queueClose} onClick={onClose} aria-label="Close"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>}</div>
    <div className={styles.queueBody}>{tasks.map((x, i) => (<div key={x.id} className={styles.queueItem} style={{ animationDelay: `${i * 0.04}s` }}>
      <div className={styles.queueItemInfo}><span className={styles.queueItemName}>{x.name}</span><span className={styles.queueItemSize}>{fs(x.size)}</span></div>
      <div className={styles.queueItemRight}>
        {x.status === 'uploading' && <div className={styles.queueProgress}><div className={styles.queueProgressBar} /></div>}
        <span className={styles.queueItemStatus}>{x.status === 'pending' && <span className={styles.statusDot} />}{x.status === 'uploading' && <span className={styles.spinner} />}{x.status === 'done' && <span className={styles.statusOk}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg></span>}{x.status === 'error' && <span className={styles.statusFail} title={x.error}>!</span>}</span>
      </div>
    </div>))}</div>
  </div></div>);
}

// ─── Preview Modal ─────────────────────────────────────────────────
function PreviewModal({ file, files, onClose, onPrev, onNext, onDownload, onDelete }: {
  file: DriveFile; files: DriveFile[]; onClose: () => void; onPrev: () => void; onNext: () => void; onDownload: () => void; onDelete: () => void;
}) {
  const idx = files.findIndex(f => f.id === file.id);
  const cat = fileCategory(file.mimeType);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowLeft' && idx > 0) onPrev(); if (e.key === 'ArrowRight' && idx < files.length - 1) onNext(); if (e.key === 'Delete') onDelete() };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [idx, files.length]);
  const dt = new Date(file.createdAt * 1000).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  return (<div className={styles.modalOverlay} onClick={onClose} style={{ zIndex: 200 }} role="dialog" aria-modal="true" aria-label={file.name}><div className={styles.previewPanel} onClick={e => e.stopPropagation()}>
    <div className={styles.previewHeader}>
      <button className={styles.previewClose} onClick={onClose} aria-label="Close"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
      <span className={styles.previewName}>{file.name}</span>
      <div className={styles.previewActions}>
        <button className={styles.previewAction} onClick={onDownload} aria-label="Download" title="Download">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        </button>
        <button className={styles.previewActionDanger} onClick={onDelete} aria-label="Delete" title="Delete">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
        </button>
      </div>
    </div>
    <div className={styles.previewBody}>
      <FileIcon category={cat} size={56} />
      <span className={styles.previewBadge} style={{ color: FILE_COLORS[cat], background: FILE_BG[cat] }}>{FILE_LABEL[cat]}</span>
      <span className={styles.previewSize}>{fs(file.sizeBytes)}</span>
      <div className={styles.previewMeta}>
        <span>{file.mimeType}</span>
        <span>{dt}</span>
      </div>
    </div>
    {idx > 0 && <button className={styles.previewArrowL} onClick={onPrev} aria-label="Previous"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg></button>}
    {idx < files.length - 1 && <button className={styles.previewArrowR} onClick={onNext} aria-label="Next"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg></button>}
  </div></div>);
}

// ─── Icons for topbar ──────────────────────────────────────────────
function IconLogoutSmall() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
}

// ─── Main ───────────────────────────────────────────────────────────
export function DrivePage({ onLogout }: { onLogout: () => void }) {
  const { t, ml, lang, setLang } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [viewMode, setViewMode] = useState<VM>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FF>('all');
  const [sortKey, setSortKey] = useState<SK>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [uploadQueue, setUploadQueue] = useState<UT[]>([]);
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; file: DriveFile | null } | null>(null);
  const [renameTarget, setRenameTarget] = useState<DriveFile | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const qc = useQueryClient();
  const [updateState, setUpdateState] = useState<UpdateState>({ type: 'idle' });

  const handleCheckUpdate = useCallback(async () => {
    setUpdateState({ type: 'checking' });
    try { const info = await checkForUpdate(); if (info.available) { setUpdateState({ type: 'available', info }) } else { setUpdateState({ type: 'uptodate', latestVersion: info.latestVersion }) } }
    catch (err) { setUpdateState({ type: 'error', message: String(err) }) }
  }, []);

  const handleDownload = useCallback(async () => {
    if (updateState.type !== 'available' || !updateState.info.downloadUrl) return;
    setUpdateState({ type: 'downloading', progress: 0 });
    try { const tempPath = await downloadUpdate(updateState.info.downloadUrl); setUpdateState({ type: 'downloaded', tempPath }) }
    catch (err) { setUpdateState({ type: 'error', message: String(err) }) }
  }, [updateState]);

  const handleInstall = useCallback(async (tempPath: string) => {
    try { await installUpdate(tempPath) } catch (err) { setUpdateState({ type: 'error', message: String(err) }) }
  }, []);

  const { data: files = [], isLoading } = useQuery({ queryKey: ['files'], queryFn: listFiles, staleTime: 10_000 });
  useEffect(() => { (async () => { try { await syncFiles(); qc.invalidateQueries({ queryKey: ['files'] }) } catch { } })() }, []);

  const pf = useMemo(() => {
    let f = files;
    if (filter !== 'all') f = f.filter(x => fileCategory(x.mimeType) === filter);
    if (searchQuery) { const q = searchQuery.toLowerCase(); f = f.filter(x => x.name.toLowerCase().includes(q)) }
    return [...f].sort((a, b) => { let c = 0; if (sortKey === 'date') c = a.createdAt - b.createdAt; else if (sortKey === 'name') c = a.name.localeCompare(b.name); else c = a.sizeBytes - b.sizeBytes; return sortDir === 'desc' ? -c : c });
  }, [files, filter, searchQuery, sortKey, sortDir]);

  const grps = useMemo(() => {
    const m = new Map<string, DriveFile[]>();
    for (const f of pf) { const k = mk(new Date(f.createdAt * 1000)); if (!m.has(k)) m.set(k, []); m.get(k)!.push(f) }
    return Array.from(m.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [pf]);

  const stats = useMemo(() => {
    const ts = files.reduce((s, f) => s + f.sizeBytes, 0);
    const cc: Record<string, number> = {};
    for (const f of files) { const c = fileCategory(f.mimeType); cc[c] = (cc[c] || 0) + 1 }
    return { totalSize: ts, count: files.length, catCounts: cc };
  }, [files]);

  const pi = useMemo(() => previewFile ? pf.findIndex(f => f.id === previewFile.id) : -1, [previewFile, pf]);

  const hUp = useCallback(async () => {
    setError(null);
    const sel = await openDialog({ multiple: true, title: t('upload') });
    if (!sel || !Array.isArray(sel) || sel.length === 0) return;
    const paths = sel as string[];
    const tasks: UT[] = paths.map(p => ({ id: Math.random().toString(36).slice(2), name: p.split(/[\\/]/).pop() || 'file', size: 0, status: 'pending' }));
    for (let i = 0; i < tasks.length; i++) { try { tasks[i].size = await fetch('file://' + paths[i]).then(r => r.blob()).then(b => b.size) } catch { } }
    setUploadQueue([...tasks]);
    for (let i = 0; i < tasks.length; i++) {
      tasks[i].status = 'uploading'; setUploadQueue([...tasks]);
      try { await uploadFile(paths[i]); tasks[i].status = 'done' } catch (err) { tasks[i].status = 'error'; tasks[i].error = String(err) }
      setUploadQueue([...tasks]);
    }
    qc.invalidateQueries({ queryKey: ['files'] });
  }, []);

  const hSync = useCallback(async () => { try { await syncFiles(); qc.invalidateQueries({ queryKey: ['files'] }) } catch (err) { setError(String(err)) } }, []);
  const hDl = useCallback(async (f: DriveFile) => { try { const d = await save({ defaultPath: f.name, title: 'Save' }); if (d) await downloadFile(f.id, d as string) } catch (err) { setError(String(err)) } }, []);
  const hDel = useCallback(async (fid: string) => { try { await deleteFile(fid); if (previewFile?.id === fid) setPreviewFile(null); qc.invalidateQueries({ queryKey: ['files'] }) } catch (err) { setError(String(err)) } }, [previewFile]);
  const hRen = useCallback(async (fid: string, nn: string) => { try { await renameFile(fid, nn); qc.invalidateQueries({ queryKey: ['files'] }) } catch (err) { setError(String(err)) } }, []);
  const hCtx = (e: React.MouseEvent, f: DriveFile) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, file: f }) };

  const ctx: ContextMenuItem[] | null = ctxMenu ? ctxMenu.file ? [
    { icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>, label: t('dl'), action: () => hDl(ctxMenu.file!) },
    { icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>, label: t('ren'), action: () => setRenameTarget(ctxMenu.file!) },
    { icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>, label: t('del'), action: () => hDel(ctxMenu.file!.id), danger: true },
  ] : [
    { icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>, label: t('ctx_up'), action: hUp },
    { icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>, label: t('sync'), action: hSync },
  ] : null;

  return (
    <div className={styles.container} onDragOver={e => { e.preventDefault(); setIsDragOver(true) }} onDragLeave={() => setIsDragOver(false)}
      onDrop={e => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length > 0) hUp() }}
      onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, file: null }) }}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg></div>
          <div><div className={styles.brandTitle}>{t('brand')}</div><div className={styles.brandStats}>{t('stats', { c: stats.count, s: fs(stats.totalSize) })}</div></div>
        </div>
        <div className={styles.topbarCenter}>
          <div className={styles.searchWrap}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input className={styles.searchInput} type="search" placeholder={t('search')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} aria-label={t('search')} />
            {searchQuery && <button className={styles.searchClear} onClick={() => setSearchQuery('')} aria-label="Clear search"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>}
          </div>
        </div>
        <div className={styles.topbarEnd}>
          <button className={styles.toolBtn} onClick={() => setShowSettings(true)} aria-label="Settings" title="Settings">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </button>
          <button className={styles.toolBtn} onClick={() => setShowFilters(s => !s)} aria-label="Filters" title="Filters">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
          </button>
          <div className={styles.viewToggle} role="radiogroup" aria-label="View mode">
            <button className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`} onClick={() => setViewMode('grid')} role="radio" aria-checked={viewMode === 'grid'} aria-label="Grid view">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
            </button>
            <button className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`} onClick={() => setViewMode('list')} role="radio" aria-checked={viewMode === 'list'} aria-label="List view">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
            </button>
          </div>
          <button className={styles.iconBtn} onClick={() => setShowLogoutConfirm(true)} aria-label="Sign out" title="Sign out"><IconLogoutSmall /></button>
        </div>
      </header>

      {showFilters && <div className={styles.filterBar}>
        <button className={`${styles.filterChip} ${filter === 'all' ? styles.filterChipActive : ''}`} onClick={() => setFilter('all')} aria-pressed={filter === 'all'}>{t('all')}</button>
        {ALL_CATEGORIES.map(c => (
          <button key={c} className={`${styles.filterChip} ${filter === c ? styles.filterChipActive : ''}`} onClick={() => setFilter(c)}
            aria-pressed={filter === c}
            style={filter === c ? { backgroundColor: FILE_COLORS[c], borderColor: FILE_COLORS[c] } : {}}>
            {c === 'image' ? t('images') : c === 'video' ? t('videos') : c === 'audio' ? t('audio') : c === 'pdf' ? t('pdf') : c === 'archive' ? t('zips') : c === 'code' ? t('code') : t('docs')}
            <span className={styles.filterCount}>{stats.catCounts[c] || 0}</span>
          </button>
        ))}
        <select className={styles.sortSelect} value={`${sortKey}-${sortDir}`} onChange={e => { const [k, d] = e.target.value.split('-'); setSortKey(k as SK); setSortDir(d as 'asc' | 'desc') }} aria-label="Sort by">
          <option value="date-desc">{t('sort_r')}</option><option value="date-asc">{t('sort_o')}</option>
          <option value="name-asc">{t('sort_az')}</option><option value="name-desc">{t('sort_za')}</option>
          <option value="size-desc">{t('sort_l')}</option><option value="size-asc">{t('sort_s')}</option>
        </select>
      </div>}

      <div className={styles.actionBar}>
        <button className={styles.uploadBtn} onClick={hUp} disabled={uploadQueue.some(t => t.status === 'uploading')}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
          {uploadQueue.some(t => t.status === 'uploading') ? t('uploading') : t('upload')}
        </button>
      </div>

      <UploadQueue tasks={uploadQueue} onClose={() => setUploadQueue([])} />
      {isDragOver && <div className={styles.dropOverlay}><div className={styles.dropInner}><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg><span>{t('drop')}</span></div></div>}

      <main className={styles.main} onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, file: null }) }}>
        {error && <div className={styles.errorBanner} role="alert"><span>{error}</span><button onClick={() => setError(null)} aria-label="Dismiss"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button></div>}

        {isLoading ? <div className={styles.skeletonGrid}>{Array.from({ length: 12 }).map((_, i) => <div key={i} className={styles.skelCard}><div className={styles.skelThumb} /><div className={styles.skelLine} /><div className={styles.skelLineShort} /></div>)}</div>
          : pf.length === 0 ? <div className={styles.empty}><p className={styles.emptyTitle}>{t('empty_t')}</p><p className={styles.emptyDesc}>{t('empty_d')}</p></div>
            : viewMode === 'grid' ? grps.map(([month, gf]) => (
              <section key={month} className={styles.monthGroup}>
                <h2 className={styles.monthHeader}>{ml(parseInt(month.split('-')[1]) - 1)} {month.split('-')[0]}<span className={styles.monthCount}>{gf.length}</span></h2>
                <div className={styles.fileGrid}>
                  {gf.map(file => (
                    <FileCard key={file.id} file={file} view="grid"
                      onPreview={setPreviewFile} onDownload={hDl} onDelete={hDel} onRename={setRenameTarget} onContextMenu={hCtx} />
                  ))}
                </div>
              </section>
            )) : <div className={styles.listTable}>
                <div role="row" className={styles.listHeader}><span>{t('nf')}</span><span>{t('all')}</span><span>Size</span><span>Date</span><span>Actions</span></div>
                {pf.map(file => (
                  <FileCard key={file.id} file={file} view="list"
                    onPreview={setPreviewFile} onDownload={hDl} onDelete={hDel} onRename={setRenameTarget} onContextMenu={hCtx} />
                ))}
              </div>}
      </main>

      {ctxMenu && ctx && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctx} onClose={() => setCtxMenu(null)} />}
      {renameTarget && <RenameDialog currentName={renameTarget.name} onConfirm={nn => { hRen(renameTarget.id, nn); setRenameTarget(null) }} onCancel={() => setRenameTarget(null)} />}
      {showSettings && <SettingsModal theme={theme} setTheme={setTheme} lang={lang} setLang={setLang}
        updateState={updateState} onCheckUpdate={handleCheckUpdate} onDownload={handleDownload} onInstall={handleInstall}
        onClose={() => { setShowSettings(false); setUpdateState({ type: 'idle' }) }} />}
      {previewFile && pi >= 0 && <PreviewModal file={previewFile} files={pf} onClose={() => setPreviewFile(null)}
        onPrev={() => pi > 0 && setPreviewFile(pf[pi - 1])} onNext={() => pi < pf.length - 1 && setPreviewFile(pf[pi + 1])}
        onDownload={() => hDl(previewFile)} onDelete={() => hDel(previewFile.id)} />}
      {showLogoutConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowLogoutConfirm(false)} role="dialog" aria-modal="true" aria-label={t('sign_out')}>
          <div className={styles.confirmPanel} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmIcon}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <div className={styles.confirmTitle}>{t('sign_out')}</div>
            <div className={styles.confirmDesc}>{t('sign_out_desc')}</div>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancel} onClick={() => setShowLogoutConfirm(false)}>{t('cancel')}</button>
              <button className={styles.confirmLogout} onClick={onLogout}>{t('sign_out_confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
