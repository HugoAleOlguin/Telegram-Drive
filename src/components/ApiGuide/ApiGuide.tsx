import { useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useTranslation } from '../../locales';
import styles from './ApiGuide.module.css';

const IMGS = ['/guia/1 - guide.png', '/guia/2 - guide.png', '/guia/3 - guide.png', '/guia/4 - guide - Editado.png'];

export function ApiGuide({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const isLast = step === 3;

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-label={t('g_title')}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.badge}>Guide</span>
          <button className={styles.close} onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className={styles.dots}>
          {[0, 1, 2, 3].map(i => (
            <button key={i} className={`${styles.dot} ${i === step ? styles.active : ''} ${i < step ? styles.done : ''}`} onClick={() => setStep(i)} aria-label={`Step ${i + 1}`} />
          ))}
        </div>
        <div className={styles.slide}>
          <div className={styles.imageWrap}>
            <img src={IMGS[step]} alt="" className={styles.img} />
          </div>
          <div className={styles.text}>
            <p className={styles.count}>Step {step + 1} of 4</p>
            <h2 className={styles.title}>{t(`g${step + 1}_t`)}</h2>
            {step === 0 && (
              <p className={styles.desc}>
                {t('g1_d').replace('my.telegram.org', '')}
                <span className={styles.guideLink} onClick={() => openUrl('https://my.telegram.org')} role="link" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') openUrl('https://my.telegram.org') }}>my.telegram.org</span>
              </p>
            )}
            {step === 1 && (
              <p className={styles.desc}>
                {t('g2_d').replace('my.telegram.org/apps', '')}
                <span className={styles.guideLink} onClick={() => openUrl('https://my.telegram.org/apps')} role="link" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') openUrl('https://my.telegram.org/apps') }}>my.telegram.org/apps</span>
              </p>
            )}
            {step === 2 && <p className={styles.desc}>{t('g3_d')}</p>}
            {step === 3 && <p className={styles.desc}>{t('g4_d')}</p>}
          </div>
        </div>
        <div className={styles.nav}>
          <button className={styles.navSecondary} onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>{t('g_back')}</button>
          <button className={styles.navPrimary} onClick={() => isLast ? onClose() : setStep(step + 1)}>{isLast ? t('g_close') : t('g_next')}</button>
        </div>
      </div>
    </div>
  );
}
