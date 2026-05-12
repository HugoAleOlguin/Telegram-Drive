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
      setScreen('login');
    }
  }

  if (screen === 'loading') {
    return (
      <div className="loading-screen">
        <div className="spinner-ring" />
      </div>
    );
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
