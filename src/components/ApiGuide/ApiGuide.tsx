import { useState } from 'react';
import styles from './ApiGuide.module.css';

const STEPS = [
  { img: '/guia/1 - guide.png', title: 'Go to my.telegram.org',
    desc: 'Open your browser and navigate to my.telegram.org. Enter your phone number in international format (e.g. +14155550100) and click Next.' },
  { img: '/guia/2 - guide.png', title: 'Open API development tools',
    desc: 'After logging in, click on "API development tools" to proceed to the app creation page.' },
  { img: '/guia/3 - guide.png', title: 'Create a new application',
    desc: 'Fill in the form with any values. For App title, use something like "My Drive". Click "Create application".' },
  { img: '/guia/4 - guide - Editado.png', title: 'Copy your credentials',
    desc: 'Your App api_id and App api_hash will appear at the top of the page. Copy both values.' },
];

interface Props {
  onClose: () => void;
}

export function ApiGuide({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className={styles.backdrop} onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="dialog" aria-modal="true" tabIndex={0}>
      <div className={`${styles.panel} scale-in`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.badge}>Guide</span>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <div className={styles.dots}>
          {STEPS.map((_, i) => (
            <button key={i}
              className={`${styles.dot} ${i === step ? styles.active : ''} ${i < step ? styles.done : ''}`}
              onClick={() => setStep(i)} aria-label={`Step ${i + 1}`} />
          ))}
        </div>

        <div className={styles.slide} key={step}>
          <div className={styles.imageWrap}>
            <img src={s.img} alt={`Step ${step + 1}: ${s.title}`} className={styles.img} />
          </div>
          <div className={styles.text}>
            <p className={styles.count}>Step {step + 1} of {STEPS.length}</p>
            <h2 className={styles.title}>{s.title}</h2>
            <p className={styles.desc}>{s.desc}</p>
          </div>
        </div>

        <div className={styles.nav}>
          <button className={styles.navSecondary} onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}>Back</button>
          <button className={styles.navPrimary} onClick={() => isLast ? onClose() : setStep(step + 1)}>
            {isLast ? 'Got it, close' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
