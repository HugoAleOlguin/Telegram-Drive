// === API GUIDE COMPONENT ===
// Slideshow modal that walks the user through getting their Telegram API credentials.
// Shows the 4 screenshots from the /guia directory as contextual visual reference.

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ApiGuide.module.css';

// Each step maps to one screenshot in /guia
const GUIDE_STEPS = [
  {
    image: '/guia/1 - guide.png',
    title: 'Go to my.telegram.org',
    description:
      'Open your browser and navigate to my.telegram.org. Enter your phone number in international format (e.g. +14155550100) and click Next. You will receive a confirmation code in your Telegram app — not by SMS.',
  },
  {
    image: '/guia/2 - guide.png',
    title: 'Open API development tools',
    description:
      'After logging in, you will see your Telegram Core menu. Click on "API development tools" to proceed to the app creation page.',
  },
  {
    image: '/guia/3 - guide.png',
    title: 'Create a new application',
    description:
      'Fill in the form with any values you like. For App title, use something like "My Drive". For Short name, use a single word like "drive". Select "Web" as the platform. Click "Create application" when done.',
  },
  {
    image: '/guia/4 - guide - Editado.png',
    title: 'Copy your credentials',
    description:
      'Your App api_id (a short number) and App api_hash (a long string) will appear at the top of the page. Copy both values and paste them into the fields on the previous screen.',
  },
];

interface ApiGuideProps {
  onClose: () => void;
}

export function ApiGuide({ onClose }: ApiGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = GUIDE_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === GUIDE_STEPS.length - 1;

  function goNext() {
    if (!isLast) setCurrentStep((s) => s + 1);
    else onClose();
  }

  function goPrev() {
    if (!isFirst) setCurrentStep((s) => s - 1);
  }

  return (
    // Backdrop — click outside to close
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-label="API credentials guide">
      <motion.div
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.badge}>How to get your API credentials</span>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close guide"
          >
            ✕
          </button>
        </div>

        {/* Step progress dots */}
        <div className={styles.dots} aria-label="Step progress">
          {GUIDE_STEPS.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === currentStep ? styles.dotActive : ''} ${i < currentStep ? styles.dotDone : ''}`}
              onClick={() => setCurrentStep(i)}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Slide content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            className={styles.slide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
          >
            {/* Screenshot */}
            <div className={styles.imageWrapper}>
              <img
                src={step.image}
                alt={`Step ${currentStep + 1}: ${step.title}`}
                className={styles.screenshot}
              />
            </div>

            {/* Text */}
            <div className={styles.textBlock}>
              <p className={styles.stepLabel}>Step {currentStep + 1} of {GUIDE_STEPS.length}</p>
              <h2 className={styles.stepTitle}>{step.title}</h2>
              <p className={styles.stepDescription}>{step.description}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className={styles.nav}>
          <button
            className={styles.navBtnSecondary}
            onClick={goPrev}
            disabled={isFirst}
          >
            Back
          </button>

          <button className={styles.navBtnPrimary} onClick={goNext}>
            {isLast ? 'Got it, close' : 'Next'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
