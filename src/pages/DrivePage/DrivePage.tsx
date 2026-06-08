import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { open as openDialog, save } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { uploadFile, listFiles, deleteFile, syncFiles, downloadFile, renameFile, createFolder, listFolders, renameFolder, deleteFolder, scanDiskItem } from '../../services/tauri-bridge';
import { checkForUpdate, downloadUpdate, installUpdate } from '../../services/updater';
import type { UpdateState } from '../../services/updater';
import type { DriveFile, DriveFolder, DiskScanEntry } from '../../types';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useTranslation } from '../../locales';
import { ContextMenu, type ContextMenuItem } from '../../components/ContextMenu/ContextMenu';
import { RenameDialog } from '../../components/RenameDialog/RenameDialog';
import { FileCard } from '../../components/FileCard/FileCard';
import { FileIcon, fileCategory, FILE_COLORS, FILE_BG, FILE_LABEL } from '../../components/FileIcon/FileIcon';
import type { FileCategory } from '../../components/FileIcon/FileIcon';
import { formatSize } from '../../utils/format';
import { ACCENT_COLORS, applyAccentColor } from '../../utils/accent-colors';
import styles from './DrivePage.module.css';

const ALL_CATEGORIES: FileCategory[] = ['image', 'video', 'audio', 'pdf', 'archive', 'code', 'doc'];
type VM = 'grid' | 'list';
type SK = 'date' | 'name' | 'size';
type FF = 'all' | FileCategory;
type UT = { id: string; name: string; size: number; status: 'pending' | 'uploading' | 'done' | 'error'; bytesSent?: number; error?: string; diskPath?: string; targetFolderId?: string };

function formatMonthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }

function useAccent() {
  const [accent, setAccentState] = useState(() => {
    try { return localStorage.getItem('tg-accent') || '#2AABEE'; } catch { return '#2AABEE'; }
  });
  const setAccent = useCallback((color: string) => {
    setAccentState(color);
    try { localStorage.setItem('tg-accent', color); } catch { }
    applyAccentColor(color);
  }, []);
  return { accent, setAccent };
}

type SettingsSection = 'appearance' | 'language' | 'updates' | 'about';

function SettingsModal({ lang, setLang, accent, setAccent, updateState, onCheckUpdate, onDownload, onInstall, onClose }: {
  lang: 'en' | 'es'; setLang: (v: 'en' | 'es') => void;
  accent: string; setAccent: (v: string) => void;
  updateState: UpdateState; onCheckUpdate: () => void; onDownload: () => void; onInstall: (p: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [openSection, setOpenSection] = useState<SettingsSection>('appearance');
  const toggleSection = (s: SettingsSection) => setOpenSection(prev => prev === s ? 'appearance' : s);

  const [bgImage, setBgImageState] = useState(() => {
    try { return localStorage.getItem('tg-bg-image') || ''; } catch { return ''; }
  });
  const [bgBlur, setBgBlurState] = useState(() => {
    try { return parseInt(localStorage.getItem('tg-bg-blur') || '8', 10); } catch { return 8; }
  });


  const handlePickBg = async () => {
    const selected = await openDialog({
      multiple: false,
      title: t('bg_select'),
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    });
    let filePath: string | null = null;
    if (selected) {
      if (typeof selected === 'string') {
        filePath = selected;
      } else if (Array.isArray(selected)) {
        filePath = (selected as string[])[0];
      }
    }
    if (filePath) {
      try {
        localStorage.setItem('tg-bg-image', filePath);
        setBgImageState(filePath);
        window.dispatchEvent(new Event('tg-bg-changed'));
      } catch {}
    }
  };

  const handleClearBg = () => {
    try {
      localStorage.removeItem('tg-bg-image');
      setBgImageState('');
      window.dispatchEvent(new Event('tg-bg-changed'));
    } catch {}
  };

  const handleBlurChange = (val: number) => {
    try {
      localStorage.setItem('tg-bg-blur', String(val));
      setBgBlurState(val);
      window.dispatchEvent(new Event('tg-bg-changed'));
    } catch {}
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true" aria-label={t('settings')}>
      <div className={styles.settingsModal} onClick={e => e.stopPropagation()}>
        <div className={styles.settingsHeader}>
          <span className={styles.settingsTitle}>{t('settings')}</span>
          <button className={styles.settingsClose} onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className={styles.settingsBody}>
          <div className={styles.settingsSection}>
            <button className={styles.sectionHeader} onClick={() => toggleSection('appearance')}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
              <span>{t('appearance')}</span>
              <svg className={`${styles.chevron} ${openSection === 'appearance' ? styles.chevronOpen : ''}`} viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {openSection === 'appearance' && (
              <div className={styles.sectionContent}>
                <div className={styles.subLabel}>{t('accent')}</div>
                <div className={styles.accentGrid}>
                  {ACCENT_COLORS.map(c => (
                    <button
                      key={c.value}
                      className={`${styles.accentDot} ${accent === c.value ? styles.accentDotActive : ''}`}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setAccent(c.value)}
                      title={c.name}
                      aria-label={`Set accent to ${c.name}`}
                    >
                      {accent === c.value && (
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>

                <div className={styles.subLabel} style={{ marginTop: '16px' }}>{t('bg_title')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className={styles.updateBtn} style={{ flex: 1, height: '36px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={handlePickBg}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <span>{t('bg_select')}</span>
                    </button>
                    {bgImage && (
                      <button className={styles.updateBtn} style={{ width: '36px', height: '36px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff5c5c', border: '1px solid rgba(255,92,92,0.2)' }} onClick={handleClearBg} aria-label="Clear wallpaper">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span>{t('bg_blur')}</span>
                      <span>{bgBlur}px</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="40" 
                      value={bgBlur} 
                      onChange={e => handleBlurChange(parseInt(e.target.value, 10))}
                      style={{
                        width: '100%',
                        accentColor: accent,
                        cursor: 'pointer',
                        background: 'var(--surface-input)',
                        height: '6px',
                        borderRadius: '3px',
                        appearance: 'none',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

              </div>
            )}
          </div>

          <div className={styles.settingsSection}>
            <button className={styles.sectionHeader} onClick={() => toggleSection('language')}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>{t('sec_language')}</span>
              <svg className={`${styles.chevron} ${openSection === 'language' ? styles.chevronOpen : ''}`} viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {openSection === 'language' && (
              <div className={styles.sectionContent}>
                <div className={styles.langOptions}>
                  <button className={`${styles.langOption} ${lang === 'en' ? styles.langOptionActive : ''}`} onClick={() => setLang('en')}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>EN</span>
                    <span>English</span>
                  </button>
                  <button className={`${styles.langOption} ${lang === 'es' ? styles.langOptionActive : ''}`} onClick={() => setLang('es')}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>ES</span>
                    <span>Espanol</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={styles.settingsSection}>
            <button className={styles.sectionHeader} onClick={() => toggleSection('updates')}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>{t('sec_updates')}</span>
              <svg className={`${styles.chevron} ${openSection === 'updates' ? styles.chevronOpen : ''}`} viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {openSection === 'updates' && (
              <div className={styles.sectionContent}>
                <div className={styles.updateSection}>
                  {updateState.type === 'idle' && (
                    <button className={styles.updateBtn} onClick={onCheckUpdate}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                      </svg>
                      <span>{t('check_update')}</span>
                    </button>
                  )}
                  {updateState.type === 'checking' && (
                    <div className={styles.updateStatus}><span className={styles.spinner} /><span>{t('update_checking')}</span></div>
                  )}
                  {updateState.type === 'available' && (
                    <div className={styles.updateAvailable}>
                      <div className={styles.updateInfo}>
                        <span className={styles.updateBadge}>{t('update_available', { version: updateState.info.latestVersion })}</span>
                      </div>
                      <a className={styles.updateReleaseLink} href="#" onClick={e => { e.preventDefault(); openUrl('https://github.com/HugoAleOlguin/Telegram-Drive/releases/latest') }}>{t('release_notes')} &#x2197;</a>
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
              </div>
            )}
          </div>

          <div className={styles.settingsSection}>
            <button className={styles.sectionHeader} onClick={() => toggleSection('about')}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>{t('sec_about')}</span>
              <svg className={`${styles.chevron} ${openSection === 'about' ? styles.chevronOpen : ''}`} viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {openSection === 'about' && (
              <div className={styles.sectionContent}>
                <div className={styles.aboutLinks}>
                  <div className={styles.aboutLink} onClick={() => openUrl('https://github.com/HugoAleOlguin/Telegram-Drive')} role="link" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') openUrl('https://github.com/HugoAleOlguin/Telegram-Drive') }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                    </svg>
                    {t('repo')}
                  </div>
                  <div className={styles.aboutLink} onClick={() => openUrl('https://hugoaleolguin.github.io/')} role="link" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') openUrl('https://hugoaleolguin.github.io/') }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    {t('port')}
                  </div>
                </div>
                <span className={styles.setVer}>{t('version')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadQueue({ tasks, onClose }: { tasks: UT[]; onClose: () => void }) {
  const { t } = useTranslation();
  if (tasks.length === 0) return null;
  const d = tasks.filter(x => x.status === 'done' || x.status === 'error').length;
  return (
    <div className={styles.queueOverlay} role="status" aria-label={`${d} of ${tasks.length} files processed`}>
      <div className={styles.queuePanel}>
        <div className={styles.queueHeader}>
          <span>{d === tasks.length ? t('q_done', { c: tasks.length }) : t('q_up', { c: tasks.length - d })}</span>
          {d === tasks.length && (
            <button className={styles.queueClose} onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <div className={styles.queueBody}>
          {tasks.map((x, i) => {
            const hasProgress = x.status === 'uploading' && typeof x.bytesSent === 'number' && x.size > 0;
            const pct = hasProgress ? Math.min(100, Math.max(0, Math.round((x.bytesSent! / x.size) * 100))) : 0;
            return (
              <div key={x.id} className={styles.queueItem} style={{ animationDelay: `${i * 0.04}s` }}>
                <div className={styles.queueItemInfo}>
                  <span className={styles.queueItemName}>{x.name}</span>
                  <span className={styles.queueItemSize}>
                    {x.status === 'uploading' && typeof x.bytesSent === 'number'
                      ? `${formatSize(x.bytesSent)} / ${formatSize(x.size)}`
                      : formatSize(x.size)
                    }
                  </span>
                </div>
                <div className={styles.queueItemRight}>
                  {x.status === 'uploading' && (
                    <div className={styles.queueProgress}>
                      <div 
                        className={styles.queueProgressBar} 
                        style={{ 
                          animation: hasProgress ? 'none' : undefined, 
                          width: `${pct}%` 
                        }} 
                      />
                    </div>
                  )}
                  <span className={styles.queueItemStatus}>
                    {x.status === 'pending' && <span className={styles.statusDot} />}
                    {x.status === 'uploading' && (
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--tg-blue)', minWidth: '32px', textAlign: 'right' }}>
                        {pct}%
                      </span>
                    )}
                    {x.status === 'done' && (
                      <span className={styles.statusOk}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                    {x.status === 'error' && <span className={styles.statusFail} title={x.error}>!</span>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ file, files, onClose, onPrev, onNext, onDownload, onDelete }: {
  file: DriveFile; files: DriveFile[]; onClose: () => void; onPrev: () => void; onNext: () => void; onDownload: () => void; onDelete: () => void;
}) {
  const { t } = useTranslation();
  const idx = files.findIndex(f => f.id === file.id);
  const cat = fileCategory(file.mimeType);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowLeft' && idx > 0) onPrev(); if (e.key === 'ArrowRight' && idx < files.length - 1) onNext(); if (e.key === 'Delete') onDelete() };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [idx, files.length, onClose, onPrev, onNext, onDelete]);
  const dt = new Date(file.createdAt * 1000).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  return (<div className={styles.modalOverlay} onClick={onClose} style={{ zIndex: 200 }} role="dialog" aria-modal="true" aria-label={file.name}><div className={styles.previewPanel} onClick={e => e.stopPropagation()}>
    <div className={styles.previewHeader}>
      <button className={styles.previewClose} onClick={onClose} aria-label="Close"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
      <span className={styles.previewName}>{file.name}</span>
      <div className={styles.previewActions}>
        <button className={styles.previewAction} onClick={onDownload} aria-label={t('dl')} title={t('dl')}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        </button>
        <button className={styles.previewActionDanger} onClick={onDelete} aria-label={t('del')} title={t('del')}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
        </button>
      </div>
    </div>
    <div className={styles.previewBody}>
      <FileIcon category={cat} size={56} />
      <span className={styles.previewBadge} style={{ color: FILE_COLORS[cat], background: FILE_BG[cat] }}>{FILE_LABEL[cat]}</span>
      <span className={styles.previewSize}>{formatSize(file.sizeBytes)}</span>
      <div className={styles.previewMeta}>
        <span>{file.mimeType}</span>
        <span>{dt}</span>
      </div>
    </div>
    {idx > 0 && <button className={styles.previewArrowL} onClick={onPrev} aria-label="Previous"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg></button>}
    {idx < files.length - 1 && <button className={styles.previewArrowR} onClick={onNext} aria-label="Next"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg></button>}
  </div></div>);
}

export function DrivePage({ onLogout }: { onLogout: () => void }) {
  const { t, ml, lang, setLang } = useTranslation();
  const { accent, setAccent } = useAccent();
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
  const [currentFolderId, setCurrentFolderId] = useState<string>('self');
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<DriveFolder | null>(null);
  const [renameFolderTarget, setRenameFolderTarget] = useState<DriveFolder | null>(null);
  const [folderCtxMenu, setFolderCtxMenu] = useState<{ x: number; y: number; folder: DriveFolder } | null>(null);

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



  const { data: files = [], isLoading } = useQuery({ queryKey: ['files', currentFolderId], queryFn: () => listFiles(currentFolderId), staleTime: 10_000 });
  const { data: folders = [] } = useQuery({ queryKey: ['folders', currentFolderId], queryFn: () => listFolders(currentFolderId === 'self' ? undefined : currentFolderId), staleTime: 10_000 });
  useEffect(() => { (async () => { try { await syncFiles(currentFolderId); qc.invalidateQueries({ queryKey: ['files', currentFolderId] }) } catch { } })() }, [currentFolderId]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setup = async () => {
      unlisten = await listen<{ taskId: string; bytesSent: number; totalBytes: number }>('upload-progress', (event) => {
        const { taskId, bytesSent, totalBytes } = event.payload;
        setUploadQueue((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, bytesSent, size: totalBytes > 0 ? totalBytes : t.size } : t))
        );
      });
    };
    setup();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const hUploadPaths = useCallback(async (paths: string[]) => {
    if (!paths || paths.length === 0) return;
    setError(null);
    try {
      // 1. Scan all disk items recursively
      const allScannedEntries: DiskScanEntry[] = [];
      for (const p of paths) {
        try {
          const entries = await scanDiskItem(p);
          allScannedEntries.push(...entries);
        } catch (err) {
          console.error("Error scanning path:", p, err);
        }
      }

      if (allScannedEntries.length === 0) return;

      const getParentPath = (p: string) => {
        const normalized = p.replace(/\\/g, '/');
        const idx = normalized.lastIndexOf('/');
        return idx === -1 ? '' : p.substring(0, idx);
      };

      // 2. Separate files and directories
      const directories = allScannedEntries.filter(x => x.isDir);
      const filesToUpload = allScannedEntries.filter(x => !x.isDir);

      // Sort directories by depth/length to ensure parent directories are created first
      directories.sort((a, b) => a.path.length - b.path.length);

      // Map to keep track of absolute path -> created folder ID in SQLite/Telegram
      const pathToFolderIdMap = new Map<string, string>();

      // 3. Create all directories sequentially
      for (const dir of directories) {
        const parentPath = getParentPath(dir.path);
        const parentFolderId = pathToFolderIdMap.get(parentPath) || currentFolderId;

        const createdFolder = await createFolder(
          dir.name, 
          parentFolderId === 'self' ? undefined : parentFolderId
        );
        pathToFolderIdMap.set(dir.path, createdFolder.id);
      }

      // Invalidate folders query immediately to show newly created folders in the list
      qc.invalidateQueries({ queryKey: ['folders', currentFolderId] });

      if (filesToUpload.length === 0) return;

      // 4. Initialize upload queue tasks for files
      const tasks: UT[] = filesToUpload.map(f => ({
        id: Math.random().toString(36).slice(2),
        name: f.name,
        size: 0,
        status: 'pending',
        diskPath: f.path,
        targetFolderId: pathToFolderIdMap.get(getParentPath(f.path)) || currentFolderId
      }));

      setUploadQueue(prev => [...prev, ...tasks]);

      // 5. Upload each file sequentially
      for (let i = 0; i < tasks.length; i++) {
        const currentTaskId = tasks[i].id;
        const diskPath = tasks[i].diskPath!;
        const targetFolderId = tasks[i].targetFolderId!;

        setUploadQueue(prev =>
          prev.map(t => t.id === currentTaskId ? { ...t, status: 'uploading' } : t)
        );

        try {
          await uploadFile(currentTaskId, diskPath, targetFolderId);
          setUploadQueue(prev =>
            prev.map(t => t.id === currentTaskId ? { ...t, status: 'done', bytesSent: t.size } : t)
          );
          // Invalidate files query for the target folder so it appears immediately!
          qc.invalidateQueries({ queryKey: ['files', targetFolderId] });
        } catch (err) {
          setUploadQueue(prev =>
            prev.map(t => t.id === currentTaskId ? { ...t, status: 'error', error: String(err) } : t)
          );
        }
      }
    } catch (err) {
      setError(String(err));
    }
  }, [qc, currentFolderId]);

  useEffect(() => {
    let unlistenHover: (() => void) | undefined;
    let unlistenDrop: (() => void) | undefined;
    let unlistenCancel: (() => void) | undefined;

    const setup = async () => {
      unlistenHover = await listen<{ paths: string[] }>('tauri://drag-enter', () => {
        setIsDragOver(true);
      });
      unlistenDrop = await listen<{ paths: string[] }>('tauri://drag-drop', (event) => {
        setIsDragOver(false);
        if (event.payload.paths && event.payload.paths.length > 0) {
          hUploadPaths(event.payload.paths);
        }
      });
      unlistenCancel = await listen('tauri://drag-cancelled', () => {
        setIsDragOver(false);
      });
    };
    setup();

    return () => {
      if (unlistenHover) unlistenHover();
      if (unlistenDrop) unlistenDrop();
      if (unlistenCancel) unlistenCancel();
    };
  }, [hUploadPaths]);

  const pf = useMemo(() => {
    let f = files;
    if (filter !== 'all') f = f.filter(x => fileCategory(x.mimeType) === filter);
    if (searchQuery) { const q = searchQuery.toLowerCase(); f = f.filter(x => x.name.toLowerCase().includes(q)) }
    return [...f].sort((a, b) => { let c = 0; if (sortKey === 'date') c = a.createdAt - b.createdAt; else if (sortKey === 'name') c = a.name.localeCompare(b.name); else c = a.sizeBytes - b.sizeBytes; return sortDir === 'desc' ? -c : c });
  }, [files, filter, searchQuery, sortKey, sortDir]);

  const grps = useMemo(() => {
    const m = new Map<string, DriveFile[]>();
    for (const f of pf) { const k = formatMonthKey(new Date(f.createdAt * 1000)); if (!m.has(k)) m.set(k, []); m.get(k)!.push(f) }
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
    await hUploadPaths(sel as string[]);
  }, [hUploadPaths, t]);

  const hSync = useCallback(async () => { try { await syncFiles(currentFolderId); qc.invalidateQueries({ queryKey: ['files', currentFolderId] }); qc.invalidateQueries({ queryKey: ['folders', currentFolderId] }) } catch (err) { setError(String(err)) } }, [currentFolderId]);
  const hDl = useCallback(async (f: DriveFile) => { try { const d = await save({ defaultPath: f.name, title: 'Save' }); if (d) await downloadFile(f.id, d as string) } catch (err) { setError(String(err)) } }, []);
  const hDel = useCallback(async (fid: string) => { try { await deleteFile(fid); if (previewFile?.id === fid) setPreviewFile(null); qc.invalidateQueries({ queryKey: ['files', currentFolderId] }) } catch (err) { setError(String(err)) } }, [previewFile, currentFolderId]);
  const hRen = useCallback(async (fid: string, nn: string) => { try { await renameFile(fid, nn); qc.invalidateQueries({ queryKey: ['files', currentFolderId] }) } catch (err) { setError(String(err)) } }, [currentFolderId]);
  const hCtx = (e: React.MouseEvent, f: DriveFile) => { e.preventDefault(); e.stopPropagation(); setFolderCtxMenu(null); setCtxMenu({ x: e.clientX, y: e.clientY, file: f }) };

  const navigateToFolder = useCallback((folder: DriveFolder) => {
    setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
    setFilter('all');
    setSearchQuery('');
  }, []);

  const navigateToBreadcrumb = useCallback((index: number) => {
    if (index === -1) {
      setCurrentFolderId('self');
      setFolderPath([]);
    } else {
      const target = folderPath[index];
      setCurrentFolderId(target.id);
      setFolderPath(prev => prev.slice(0, index + 1));
    }
    setFilter('all');
    setSearchQuery('');
  }, [folderPath]);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim() || creatingFolder) return;
    setCreatingFolder(true);
    try {
      await createFolder(newFolderName.trim(), currentFolderId === 'self' ? undefined : currentFolderId);
      qc.invalidateQueries({ queryKey: ['folders', currentFolderId] });
      setShowNewFolder(false);
      setNewFolderName('');
    } catch (err) {
      setError(String(err));
    } finally {
      setCreatingFolder(false);
    }
  }, [newFolderName, creatingFolder, currentFolderId, qc]);

  const handleDeleteFolder = useCallback(async (folder: DriveFolder) => {
    try {
      await deleteFolder(folder.id);
      qc.invalidateQueries({ queryKey: ['folders', currentFolderId] });
      qc.invalidateQueries({ queryKey: ['files', currentFolderId] });
      setDeleteFolderTarget(null);
    } catch (err) {
      setError(String(err));
    }
  }, [currentFolderId, qc]);

  const handleRenameFolder = useCallback(async (folderId: string, newName: string) => {
    try {
      await renameFolder(folderId, newName);
      qc.invalidateQueries({ queryKey: ['folders', currentFolderId] });
      setRenameFolderTarget(null);
    } catch (err) {
      setError(String(err));
    }
  }, [currentFolderId, qc]);

  const hFolderCtx = (e: React.MouseEvent, folder: DriveFolder) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu(null);
    setFolderCtxMenu({ x: e.clientX, y: e.clientY, folder });
  };

  const ctx: ContextMenuItem[] | null = ctxMenu ? ctxMenu.file ? [
    { icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>, label: t('dl'), action: () => hDl(ctxMenu.file!) },
    { icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>, label: t('ren'), action: () => setRenameTarget(ctxMenu.file!) },
    { icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>, label: t('del'), action: () => hDel(ctxMenu.file!.id), danger: true },
  ] : [
    { icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></svg>, label: t('new_folder'), action: () => setShowNewFolder(true) },
    { icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>, label: t('ctx_up'), action: hUp },
    { icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>, label: t('sync'), action: hSync },
  ] : null;

  return (
    <div className={styles.container}
      onDragOver={e => e.preventDefault()}
      onDrop={e => e.preventDefault()}
      onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, file: null }) }}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg></div>
          <div><div className={styles.brandTitle}>{t('brand')}</div><div className={styles.brandStats}>{t('stats', { c: stats.count, s: formatSize(stats.totalSize) })}</div></div>
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
          <button className={styles.iconBtn} onClick={() => setShowLogoutConfirm(true)} aria-label="Sign out" title="Sign out">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </button>
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

        <div className={styles.breadcrumbs}>
          <button className={`${styles.breadcrumbItem} ${currentFolderId === 'self' ? styles.breadcrumbItemActive : ''}`} onClick={() => navigateToBreadcrumb(-1)}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            {t('root')}
          </button>
          {folderPath.map((fp, i) => (
            <span key={fp.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className={styles.breadcrumbSep}>›</span>
              <button className={`${styles.breadcrumbItem} ${i === folderPath.length - 1 ? styles.breadcrumbItemActive : ''}`} onClick={() => navigateToBreadcrumb(i)}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" stroke="none"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" /></svg>
                {fp.name}
              </button>
            </span>
          ))}
        </div>

      <div className={styles.actionBar}>
        <button className={styles.uploadBtn} onClick={hUp} disabled={uploadQueue.some(t => t.status === 'uploading')}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
          {uploadQueue.some(t => t.status === 'uploading') ? t('uploading') : t('upload')}
        </button>
        <button className={styles.newFolderBtn} onClick={() => setShowNewFolder(true)} disabled={creatingFolder}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></svg>
          {creatingFolder ? t('creating_folder') : t('new_folder')}
        </button>
      </div>

      <UploadQueue tasks={uploadQueue} onClose={() => setUploadQueue([])} />
      {isDragOver && <div className={styles.dropOverlay}><div className={styles.dropInner}><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg><span>{t('drop')}</span></div></div>}

      <main className={styles.main} onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, file: null }) }}>
        {error && <div className={styles.errorBanner} role="alert"><span>{error}</span><button onClick={() => setError(null)} aria-label="Dismiss"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button></div>}

        {isLoading ? <div className={styles.skeletonGrid}>{Array.from({ length: 12 }).map((_, i) => <div key={i} className={styles.skelCard}><div className={styles.skelThumb} /><div className={styles.skelLine} /><div className={styles.skelLineShort} /></div>)}</div>
          : pf.length === 0 && folders.length === 0 ? <div className={styles.empty}><p className={styles.emptyTitle}>{t('empty_t')}</p><p className={styles.emptyDesc}>{t('empty_d')}</p></div>
            : viewMode === 'grid' ? <>
              {folders.length > 0 && (
                <div className={styles.fileGrid} style={{ marginBottom: '16px' }}>
                  {folders.map(folder => (
                    <div key={folder.id} className={styles.folderCard}
                      onDoubleClick={() => navigateToFolder(folder)}
                      onContextMenu={e => hFolderCtx(e, folder)}>
                      <svg className={styles.folderCardIcon} viewBox="0 0 24 24" width="36" height="36" fill="currentColor" stroke="none">
                        <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                      </svg>
                      <span className={styles.folderCardName}>{folder.name}</span>
                      <span className={styles.folderCardCount}>{folder.fileCount} {folder.fileCount === 1 ? 'file' : 'files'}</span>
                    </div>
                  ))}
                </div>
              )}
              {grps.map(([month, gf]) => (
                <section key={month} className={styles.monthGroup}>
                  <h2 className={styles.monthHeader}>{ml(parseInt(month.split('-')[1]) - 1)} {month.split('-')[0]}<span className={styles.monthCount}>{gf.length}</span></h2>
                  <div className={styles.fileGrid}>
                    {gf.map(file => (
                      <FileCard key={file.id} file={file} view="grid"
                        onPreview={setPreviewFile} onDownload={hDl} onDelete={hDel} onRename={setRenameTarget} onContextMenu={hCtx} />
                    ))}
                  </div>
                </section>
              ))}
            </> : <div className={styles.listTable}>
                <div role="row" className={styles.listHeader}><span>{t('nf')}</span><span>{t('all')}</span><span>Size</span><span>Date</span><span>Actions</span></div>
                {folders.map(folder => (
                  <div key={folder.id} role="row" className={styles.folderListRow}
                    onDoubleClick={() => navigateToFolder(folder)}
                    onContextMenu={e => hFolderCtx(e, folder)}>
                    <div className={styles.folderListInfo}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--tg-blue)" stroke="none">
                        <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                      </svg>
                      <span className={styles.folderListName}>{folder.name}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{folder.fileCount} files</span>
                    <span></span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(folder.createdAt * 1000).toLocaleDateString()}</span>
                    <span></span>
                  </div>
                ))}
                {pf.map(file => (
                  <FileCard key={file.id} file={file} view="list"
                    onPreview={setPreviewFile} onDownload={hDl} onDelete={hDel} onRename={setRenameTarget} onContextMenu={hCtx} />
                ))}
              </div>}
      </main>

      {ctxMenu && ctx && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctx} onClose={() => setCtxMenu(null)} />}
      {folderCtxMenu && <ContextMenu x={folderCtxMenu.x} y={folderCtxMenu.y} items={[
        { icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>, label: t('open_folder'), action: () => navigateToFolder(folderCtxMenu.folder) },
        { icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>, label: t('ren_folder'), action: () => setRenameFolderTarget(folderCtxMenu.folder) },
        { icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>, label: t('del_folder'), action: () => setDeleteFolderTarget(folderCtxMenu.folder), danger: true },
      ]} onClose={() => setFolderCtxMenu(null)} />}
      {renameTarget && <RenameDialog currentName={renameTarget.name} onConfirm={nn => { hRen(renameTarget.id, nn); setRenameTarget(null) }} onCancel={() => setRenameTarget(null)} />}
      {renameFolderTarget && <RenameDialog currentName={renameFolderTarget.name} onConfirm={nn => handleRenameFolder(renameFolderTarget.id, nn)} onCancel={() => setRenameFolderTarget(null)} />}
      {showSettings && <SettingsModal lang={lang} setLang={setLang}
        updateState={updateState} onCheckUpdate={handleCheckUpdate} onDownload={handleDownload} onInstall={handleInstall}
        accent={accent} setAccent={setAccent}
        onClose={() => { setShowSettings(false); setUpdateState({ type: 'idle' }) }} />}
      {previewFile && pi >= 0 && <PreviewModal file={previewFile} files={pf} onClose={() => setPreviewFile(null)}
        onPrev={() => pi > 0 && setPreviewFile(pf[pi - 1])} onNext={() => pi < pf.length - 1 && setPreviewFile(pf[pi + 1])}
        onDownload={() => hDl(previewFile)} onDelete={() => hDel(previewFile.id)} />}
      {showNewFolder && (
        <div className={styles.modalOverlay} onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} role="dialog" aria-modal="true" aria-label={t('new_folder')}>
          <div className={styles.newFolderPanel} onClick={e => e.stopPropagation()}>
            <div className={styles.newFolderTitle}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--tg-blue)" stroke="none"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" /></svg>
              {t('new_folder')}
            </div>
            <input className={styles.newFolderInput} type="text" placeholder={t('folder_name')} value={newFolderName} onChange={e => setNewFolderName(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); } }} />
            <div className={styles.newFolderActions}>
              <button className={styles.newFolderCancel} onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}>{t('cancel')}</button>
              <button className={styles.newFolderCreate} onClick={handleCreateFolder} disabled={!newFolderName.trim() || creatingFolder}>{creatingFolder ? t('creating_folder') : t('create')}</button>
            </div>
          </div>
        </div>
      )}
      {deleteFolderTarget && (
        <div className={styles.modalOverlay} onClick={() => setDeleteFolderTarget(null)} role="dialog" aria-modal="true" aria-label={t('del_folder')}>
          <div className={styles.confirmPanel} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmIcon} style={{ background: 'rgba(224, 92, 92, 0.1)' }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </div>
            <div className={styles.confirmTitle}>{t('del_folder')}: {deleteFolderTarget.name}</div>
            <div className={styles.confirmDesc}>{t('del_folder_desc')}</div>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancel} onClick={() => setDeleteFolderTarget(null)}>{t('cancel')}</button>
              <button className={styles.confirmLogout} onClick={() => handleDeleteFolder(deleteFolderTarget)}>{t('del_folder')}</button>
            </div>
          </div>
        </div>
      )}
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
