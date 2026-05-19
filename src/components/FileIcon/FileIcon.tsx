export type FileCategory = 'image' | 'video' | 'audio' | 'pdf' | 'archive' | 'code' | 'doc';

export const FILE_COLORS: Record<FileCategory, string> = {
  image: '#34d399',
  video: '#60a5fa',
  audio: '#f472b6',
  pdf: '#f87171',
  archive: '#fbbf24',
  code: '#a78bfa',
  doc: '#fb923c',
};

export const FILE_BG: Record<FileCategory, string> = {
  image: '#064e3b',
  video: '#1e3a5f',
  audio: '#4a1942',
  pdf: '#3b1111',
  archive: '#3b2f0a',
  code: '#2e1a47',
  doc: '#3b1f0a',
};

export const FILE_LABEL: Record<FileCategory, string> = {
  image: 'IMG',
  video: 'VID',
  audio: 'AUD',
  pdf: 'PDF',
  archive: 'ZIP',
  code: 'COD',
  doc: 'DOC',
};

const CATEGORY_MAP: Record<string, FileCategory> = {
  'image/': 'image',
  'video/': 'video',
  'audio/': 'audio',
  'application/pdf': 'pdf',
  'application/zip': 'archive',
  'application/x-rar-compressed': 'archive',
  'application/x-7z-compressed': 'archive',
  'application/gzip': 'archive',
  'application/x-tar': 'archive',
  'text/': 'code',
  'application/json': 'code',
  'application/javascript': 'code',
  'application/xml': 'code',
};

export function fileCategory(mimeType: string): FileCategory {
  for (const [prefix, cat] of Object.entries(CATEGORY_MAP)) {
    if (mimeType.startsWith(prefix)) return cat;
  }
  if (mimeType.startsWith('application/msword') || mimeType.startsWith('application/vnd') || mimeType.includes('spreadsheet') || mimeType.includes('document')) return 'doc';
  return 'doc';
}

function IconImage({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconVideo({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="5" width="15" height="14" rx="2" />
      <polyline points="16 10 23 7 23 17 16 14" />
    </svg>
  );
}

function IconAudio({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function IconPdf({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </svg>
  );
}

function IconArchive({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" rx="1" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function IconCode({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconDoc({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

const ICONS: Record<FileCategory, typeof IconImage> = {
  image: IconImage,
  video: IconVideo,
  audio: IconAudio,
  pdf: IconPdf,
  archive: IconArchive,
  code: IconCode,
  doc: IconDoc,
};

export function FileIcon({ category, size }: { category: FileCategory; size: number }) {
  const Icon = ICONS[category];
  return <Icon size={size} />;
}
