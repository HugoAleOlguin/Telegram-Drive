import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './pages/LoginPage/LoginPage';
import { DrivePage } from './pages/DrivePage/DrivePage';
import { authCheckSession, authLogout } from './services/tauri-bridge';
import { TranslationProvider } from './locales';
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

  useEffect(() => {
    authCheckSession()
      .then((hasSession) => setScreen(hasSession ? 'drive' : 'login'))
      .catch(() => setScreen('login'));
  }, []);

  async function handleLogout() {
    try { await authLogout(); } finally {
      queryClient.clear();
      try { localStorage.clear(); } catch { }
      setScreen('login');
    }
  }

  if (screen === 'loading') {
    return <LoadingScreen />;
  }

  return (
    <div className="fade-in" key={screen}>
      {screen === 'login'
        ? <LoginPage onAuthSuccess={() => setScreen('drive')} />
        : <DrivePage onLogout={handleLogout} />
      }
    </div>
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
