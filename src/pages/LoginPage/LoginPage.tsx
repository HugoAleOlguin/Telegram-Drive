// === LOGIN PAGE ===
// Wizard de 2 pasos: (1) API credentials, (2) Código OTP de Telegram

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authLogin, authVerifyCode } from '../../services/tauri-bridge';
import { ApiGuide } from '../../components/ApiGuide/ApiGuide';
import type { AuthStatus } from '../../types';
import styles from './LoginPage.module.css';

// Variantes de animación para transiciones entre pasos
const stepVariants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

interface LoginPageProps {
  onAuthSuccess: () => void;
}

export function LoginPage({ onAuthSuccess }: LoginPageProps) {
  // --- Estado del wizard ---
  const [step, setStep] = useState<1 | 2>(1);
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // --- Campos del formulario ---
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const isLoading = status === 'entering_phone' || status === 'waiting_code';

  // Paso 1: envía las credenciales API al backend Rust
  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setStatus('entering_phone');

    try {
      await authLogin({
        apiId: parseInt(apiId, 10),
        apiHash: apiHash.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      setStatus('waiting_code');
      setStep(2);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : (typeof err === 'string' ? err : 'Could not connect to Telegram. Check your credentials.'));
    }
  }

  // Paso 2: verifica el código OTP recibido por Telegram
  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setStatus('waiting_code');

    try {
      await authVerifyCode(otpCode.trim());
      setStatus('authenticated');
      onAuthSuccess();
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : (typeof err === 'string' ? err : 'Incorrect code, please try again.'));
    }
  }

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logo}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className={styles.title}>Telegram Drive</h1>
          <p className={styles.subtitle}>Your Telegram account as unlimited cloud storage</p>
        </div>

        {/* Step indicators */}
        <div className={styles.stepIndicator}>
          <div className={`${styles.step} ${step >= 1 ? styles.active : ''} ${step > 1 ? styles.done : ''}`} />
          <div className={`${styles.step} ${step === 2 ? styles.active : ''}`} />
        </div>

        {/* Wizard content con animación entre pasos */}
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.form
              key="step1"
              className={styles.form}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              onSubmit={handleCredentialsSubmit}
            >
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="apiId">API ID</label>
                <input
                  id="apiId"
                  type="number"
                  className={styles.input}
                  placeholder="12345678"
                  value={apiId}
                  onChange={(e) => setApiId(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="apiHash">API Hash</label>
                <input
                  id="apiHash"
                  type="password"
                  className={styles.input}
                  placeholder="a1b2c3d4e5f6..."
                  value={apiHash}
                  onChange={(e) => setApiHash(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="phoneNumber">Phone Number</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  className={styles.input}
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {errorMsg && (
                <p className={styles.errorMessage}>
                  <span>⚠</span> {errorMsg}
                </p>
              )}

              <button
                type="submit"
                className={styles.button}
                disabled={isLoading || !apiId || !apiHash}
              >
                {isLoading ? <span className={styles.spinner} /> : 'Connect to Telegram'}
              </button>

              <p className={styles.helpLink}>
                Need help?{' '}
                <button
                  type="button"
                  className={styles.helpLinkButton}
                  onClick={() => setShowGuide(true)}
                >
                  How do I get these?
                </button>
              </p>
            </motion.form>
          ) : (
            <motion.form
              key="step2"
              className={styles.form}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              onSubmit={handleOtpSubmit}
            >
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="otpCode">
                  Verification code
                </label>
                <input
                  id="otpCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={`${styles.input} ${errorMsg ? styles.error : ''}`}
                  placeholder="12345"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  disabled={isLoading}
                  autoFocus
                />
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  Check your Telegram app for the verification code.
                </p>
              </div>

              {errorMsg && (
                <p className={styles.errorMessage}>
                  <span>⚠</span> {errorMsg}
                </p>
              )}

              <button
                type="submit"
                className={styles.button}
                disabled={isLoading || otpCode.length < 4}
              >
                {isLoading ? <span className={styles.spinner} /> : 'Verify code'}
              </button>

              <button
                type="button"
                className={styles.buttonBack}
                onClick={() => { setStep(1); setErrorMsg(null); setStatus('idle'); }}
              >
                Back
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* In-app guide modal — only mounted when showGuide is true */}
      <AnimatePresence>
        {showGuide && <ApiGuide onClose={() => setShowGuide(false)} />}
      </AnimatePresence>
    </div>
  );
}
