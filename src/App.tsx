// === APP ROOT ===
// Maneja la transición entre la pantalla de login y la pantalla principal del Drive

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './pages/LoginPage/LoginPage';
import { DrivePage } from './pages/DrivePage/DrivePage';
import { authCheckSession, authLogout } from './services/tauri-bridge';
import './styles/global.css';

// Instancia global de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

type AppScreen = 'loading' | 'login' | 'drive';

function AppContent() {
  const [screen, setScreen] = useState<AppScreen>('loading');

  // Al iniciar, verifica si hay una sesión guardada válida
  useEffect(() => {
    authCheckSession()
      .then((hasSession) => {
        setScreen(hasSession ? 'drive' : 'login');
      })
      .catch(() => {
        // Si el backend aún no está listo (dev mode), va al login
        setScreen('login');
      });
  }, []);

  async function handleLogout() {
    try {
      await authLogout();
    } finally {
      queryClient.clear();
      setScreen('login');
    }
  }

  if (screen === 'loading') {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface-bg)',
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 28, height: 28,
            border: '2px solid var(--surface-divider)',
            borderTopColor: 'var(--tg-blue)',
            borderRadius: '50%',
          }}
        />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {screen === 'login' ? (
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LoginPage onAuthSuccess={() => setScreen('drive')} />
        </motion.div>
      ) : (
        <motion.div
          key="drive"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DrivePage onLogout={handleLogout} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
