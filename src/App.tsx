import { useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './pages/LoginPage/LoginPage';
import { DrivePage } from './pages/DrivePage/DrivePage';
import { authCheckSession, authLogout, readImageBytes } from './services/tauri-bridge';
import { TranslationProvider } from './locales';
import { applyAccentColor } from './utils/accent-colors';
import { debugLog } from './utils/debug-logger';
import { DebugPanel } from './components/DebugPanel/DebugPanel';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, refetchOnWindowFocus: false },
  },
});

type Screen = 'loading' | 'login' | 'drive';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="white" stroke="none">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
        </div>
        <div className="loading-brand">Telegram Drive</div>
        <div className="loading-dots">
          <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [bgBlobUrl, setBgBlobUrl] = useState<string>('');
  const [bgBlur, setBgBlur] = useState<number>(8);
  const blobUrlRef = useRef<string>('');
  const loadedPathRef = useRef<string>(''); // tracks which path is currently loaded

  // Load background image from path using Tauri read_image_bytes → blob URL
  const loadBackground = async (path: string) => {
    // Revoke old blob URL to avoid memory leak
    if (blobUrlRef.current) {
      debugLog('debug', 'Revocando blob URL anterior', blobUrlRef.current.slice(0, 60));
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = '';
      setBgBlobUrl('');
    }

    if (!path) {
      debugLog('info', 'Sin fondo configurado, usando color de fondo por defecto');
      return;
    }

    debugLog('info', 'Cargando fondo personalizado...', { path });

    try {
      debugLog('debug', 'Invocando read_image_bytes...', { path });
      const bytes = await readImageBytes(path);
      debugLog('success', `Bytes recibidos del backend`, { byteCount: bytes.length, path });

      if (!bytes || bytes.length === 0) {
        debugLog('error', 'read_image_bytes devolvió 0 bytes', { path });
        return;
      }

      // Detect MIME type from path extension
      const ext = path.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg',
        png: 'image/png', webp: 'image/webp', gif: 'image/gif',
      };
      const mime = mimeMap[ext] ?? 'image/jpeg';
      debugLog('debug', 'Tipo MIME detectado', { ext, mime });

      // Build blob URL
      const uint8 = new Uint8Array(bytes);
      const blob = new Blob([uint8], { type: mime });
      const url = URL.createObjectURL(blob);
      debugLog('success', 'Blob URL creado exitosamente', url.slice(0, 60));

      blobUrlRef.current = url;
      loadedPathRef.current = path;
      setBgBlobUrl(url);
      debugLog('success', '✅ Fondo personalizado aplicado correctamente');
    } catch (err) {
      debugLog('error', 'Error al cargar fondo personalizado', String(err));
    }
  };

  useEffect(() => {
    debugLog('info', '=== Telegram Drive iniciando ===');
    debugLog('info', 'Aplicando color de acento...');
    const accent = localStorage.getItem('tg-accent') || '#2AABEE';
    applyAccentColor(accent);
    debugLog('debug', 'Acento aplicado', { accent });

    const savedPath = localStorage.getItem('tg-bg-image') || '';
    const savedBlur = parseInt(localStorage.getItem('tg-bg-blur') || '8', 10);
    debugLog('info', 'Fondo guardado en localStorage', { savedPath, savedBlur });

    setBgBlur(savedBlur);

    // Load background immediately if path exists
    if (savedPath) {
      loadBackground(savedPath);
    }

    debugLog('info', 'Verificando sesión de Telegram...');
    authCheckSession()
      .then((hasSession) => {
        debugLog('info', 'Estado de sesión obtenido', { hasSession });
        setScreen(hasSession ? 'drive' : 'login');
      })
      .catch((err) => {
        debugLog('error', 'Error al verificar sesión', String(err));
        setScreen('login');
      });
  }, []);

  // React to background change events (dispatched by DrivePage settings)
  useEffect(() => {
    const handleBgChange = () => {
      const newPath = localStorage.getItem('tg-bg-image') || '';
      const newBlur = parseInt(localStorage.getItem('tg-bg-blur') || '8', 10);
      debugLog('info', '🔄 Evento tg-bg-changed recibido', { newPath, newBlur });
      setBgBlur(newBlur);
      // Only reload image from disk if the path actually changed
      if (newPath !== loadedPathRef.current) {
        debugLog('debug', 'Path cambió, recargando imagen del disco...');
        loadBackground(newPath);
      } else {
        debugLog('debug', 'Solo blur cambió, aplicando sin recargar imagen', { newBlur });
      }
    };
    window.addEventListener('tg-bg-changed', handleBgChange);
    return () => window.removeEventListener('tg-bg-changed', handleBgChange);
  }, []);

  async function handleLogout() {
    debugLog('info', 'Cerrando sesión...');
    try { await authLogout(); } finally {
      queryClient.clear();
      // Clean up blob URL on logout
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = '';
      }
      try { localStorage.clear(); } catch { }
      setBgBlobUrl('');
      window.dispatchEvent(new Event('tg-bg-changed'));
      setScreen('login');
      debugLog('info', 'Sesión cerrada.');
    }
  }

  if (screen === 'loading') return <LoadingScreen />;

  const bgStyle = bgBlobUrl
    ? { backgroundImage: `url(${bgBlobUrl})` }
    : {};

  return (
    <>
      <div className="global-app-bg">
        {bgBlobUrl && (
          <>
            <div
              className="global-bg-img"
              style={bgStyle}
            />
            <div
              className="global-bg-blur"
              style={{ ...bgStyle, filter: `blur(${bgBlur}px)` }}
            />
          </>
        )}
      </div>
      <div className="fade-in" key={screen} style={{ height: '100%' }}>
        {screen === 'login'
          ? <LoginPage onAuthSuccess={() => { debugLog('success', 'Auth exitoso, cargando Drive...'); setScreen('drive'); }} />
          : <DrivePage onLogout={handleLogout} />
        }
      </div>
      <DebugPanel />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TranslationProvider>
        <AppContent />
      </TranslationProvider>
    </QueryClientProvider>
  );
}
