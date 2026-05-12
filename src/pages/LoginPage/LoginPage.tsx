import { useState } from 'react';
import { authLogin, authVerifyCode } from '../../services/tauri-bridge';
import { ApiGuide } from '../../components/ApiGuide/ApiGuide';
import styles from './LoginPage.module.css';

interface Props {
  onAuthSuccess: () => void;
}

export function LoginPage({ onAuthSuccess }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authLogin({ apiId: parseInt(apiId, 10), apiHash: apiHash.trim(), phoneNumber: phone.trim() });
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authVerifyCode(code.trim());
      onAuthSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.card} fade-in-up`}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className={styles.title}>Telegram Drive</h1>
          <p className={styles.subtitle}>Cloud Storage Ilimitado</p>
        </div>

        <div className={styles.stepIndicator}>
          <div className={`${styles.step} ${step >= 1 ? styles.active : ''}`} />
          <div className={`${styles.step} ${step === 2 ? styles.active : ''}`} />
        </div>

        {step === 1 ? (
          <form key="step1" className={`${styles.form} slide-in-right`} onSubmit={handleCredentials}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="apiId">API ID</label>
              <input id="apiId" type="number" className={styles.input} placeholder="12345678"
                value={apiId} onChange={(e) => setApiId(e.target.value)} required disabled={loading} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="apiHash">API Hash</label>
              <input id="apiHash" type="password" className={styles.input} placeholder="a1b2c3d4..."
                value={apiHash} onChange={(e) => setApiHash(e.target.value)} required disabled={loading} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="phone">Phone Number</label>
              <input id="phone" type="tel" className={styles.input} placeholder="+1234567890"
                value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={loading} />
            </div>

            {error && <p className={styles.error}>⚠ {error}</p>}

            <button type="submit" className={styles.button} disabled={loading || !apiId || !apiHash}>
              {loading ? <span className={styles.spinner} /> : 'Connect to Telegram'}
            </button>

            <p className={styles.helpLink}>
              Need help?{' '}
              <button type="button" className={styles.linkBtn} onClick={() => setShowGuide(true)}>
                How do I get these?
              </button>
            </p>
          </form>
        ) : (
          <form key="step2" className={`${styles.form} slide-in-right`} onSubmit={handleCode}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="code">Verification code</label>
              <input id="code" type="text" inputMode="numeric" pattern="[0-9]*"
                className={styles.input} placeholder="12345"
                value={code} onChange={(e) => setCode(e.target.value)} required disabled={loading} autoFocus />
              <p className={styles.hint}>Check your Telegram app for the verification code.</p>
            </div>

            {error && <p className={styles.error}>⚠ {error}</p>}

            <button type="submit" className={styles.button} disabled={loading || code.length < 4}>
              {loading ? <span className={styles.spinner} /> : 'Verify code'}
            </button>

            <button type="button" className={styles.backBtn}
              onClick={() => { setStep(1); setError(null); }}>
              Back
            </button>
          </form>
        )}
      </div>

      {showGuide && <ApiGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
}
