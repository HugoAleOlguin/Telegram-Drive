export type FileCategory = 'image' | 'video' | 'audio' | 'pdf' | 'archive' | 'code' | 'doc';

export const FILE_COLORS: Record<FileCategory, string> = {
  image: '#a78bfa',
  video: '#60a5fa',
  audio: '#34d399',
  pdf: '#f87171',
  archive: '#fbbf24',
  code: '#a78bfa',
  doc: '#fb923c',
};

export const FILE_BG: Record<FileCategory, string> = {
  image: 'rgba(167, 139, 250, 0.15)',
  video: 'rgba(96, 165, 250, 0.15)',
  audio: 'rgba(52, 211, 153, 0.15)',
  pdf: 'rgba(248, 113, 113, 0.15)',
  archive: 'rgba(251, 191, 36, 0.15)',
  code: 'rgba(167, 139, 250, 0.15)',
  doc: 'rgba(251, 146, 60, 0.15)',
};

export const FILE_LABEL: Record<FileCategory, string> = {
  image: 'IMG',
  video: 'VID',
  audio: 'MP3',
  pdf: 'PDF',
  archive: 'ZIP',
  code: 'FILE',
  doc: 'FILE',
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
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={FILE_COLORS.image} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Broken outer frame */}
      <path d="M 3 8 V 5 C 3 3.9 3.9 3 5 3 H 19 C 20.1 3 21 3.9 21 5 V 19 C 21 20.1 20.1 21 19 21 H 14" />
      <path d="M 10 21 H 5 C 3.9 21 3 20.1 3 19 V 12" />
      <line x1="2" y1="10" x2="6" y2="10" strokeWidth="1.5" />
      <line x1="18" y1="14" x2="22" y2="14" strokeWidth="1.5" />
      {/* Broken image elements */}
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M 21 15 L 16 10 L 11 15" />
      <path d="M 8 13 L 5 16" />
    </svg>
  );
}

function IconVideo({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={FILE_COLORS.video} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Glitched camera frame */}
      <path d="M 23 7 L 16 12 L 23 17" />
      <path d="M 14 5 H 3 C 1.9 5 1 5.9 1 7 V 17 C 1 18.1 1.9 19 3 19 H 14 C 15.1 19 16 18.1 16 17 V 12" />
      <path d="M 16 10 V 7 C 16 5.9 15.1 5 14 5" />
      {/* Detached/Glitch offset bar */}
      <line x1="5" y1="12" x2="11" y2="12" strokeWidth="2.5" />
      <line x1="8" y1="9" x2="8" y2="15" strokeWidth="1.5" />
    </svg>
  );
}

function IconAudio({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={FILE_COLORS.audio} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Glitched audio note */}
      <path d="M 9 14 V 5" />
      <path d="M 11 4 L 21 3" />
      <path d="M 21 7 V 5" />
      <circle cx="6" cy="14" r="3" />
      <path d="M 18 12 V 9" />
      <circle cx="15" cy="12" r="3" />
      {/* Glitched sound wave */}
      <path d="M 3 6 C 5 4 7 8 9 6" />
    </svg>
  );
}

function IconPdf({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={FILE_COLORS.pdf} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Broken document style */}
      <path d="M 14 2 H 6 C 4.9 2 4 2.9 4 4 V 20 C 4 21.1 4.9 22 6 22 H 18 C 19.1 22 20 21.1 20 20 V 8" />
      <path d="M 14 2 L 19 7 H 14 Z" />
      {/* Horizontal cut line representing PDF logo */}
      <line x1="7" y1="13" x2="15" y2="13" strokeWidth="2" />
      <line x1="7" y1="17" x2="12" y2="17" strokeWidth="1.5" />
      <line x1="15" y1="17" x2="17" y2="17" strokeWidth="2" />
    </svg>
  );
}

function IconArchive({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={FILE_COLORS.archive} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Outer hexagon */}
      <polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" />
      {/* Inner cube lines */}
      <line x1="12" y1="3" x2="12" y2="12" />
      <line x1="4" y1="16.5" x2="12" y2="12" />
      <line x1="20" y1="16.5" x2="12" y2="12" />
      {/* Center circle */}
      <circle cx="12" cy="12" r="2" fill={FILE_COLORS.archive} />
    </svg>
  );
}

function IconCode({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={FILE_COLORS.code} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Glitched tags */}
      <path d="M 7 8 L 2 12 L 7 16" />
      <path d="M 17 8 L 22 12 L 17 16" />
      {/* Sliced code divider */}
      <path d="M 11 17 L 13 7" strokeWidth="2" />
      <line x1="9" y1="12" x2="15" y2="12" strokeWidth="1.5" />
    </svg>
  );
}

function IconDoc({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={FILE_COLORS.doc} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Glitched doc */}
      <path d="M 14 2 H 6 C 4.9 2 4 2.9 4 4 V 20 C 4 21.1 4.9 22 6 22 H 18 C 19.1 22 20 21.1 20 20 V 8" />
      <path d="M 14 2 V 8 H 20" />
      {/* Disjointed text lines */}
      <line x1="8" y1="13" x2="16" y2="13" strokeDasharray="4 2 1 1" />
      <line x1="8" y1="17" x2="13" y2="17" strokeDasharray="2 2" />
      <circle cx="16" cy="17" r="1.2" />
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
