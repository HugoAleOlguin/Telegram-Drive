import { useState } from 'react';
import { authLogin, authVerifyCode } from '../../services/tauri-bridge';
import { useTranslation } from '../../locales';
import { ApiGuide } from '../../components/ApiGuide/ApiGuide';
import styles from './LoginPage.module.css';

interface Props { onAuthSuccess: () => void }

export function LoginPage({ onAuthSuccess }: Props) {
  const { t, lang, setLang } = useTranslation();
  const [step, setStep] = useState<1|2>(1);
  const [error, setError] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  async function hCred(e:React.FormEvent){
    e.preventDefault();setError(null);setLoading(true);
    try{await authLogin({apiId:parseInt(apiId,10),apiHash:apiHash.trim(),phoneNumber:phone.trim()});setStep(2)}
    catch(err){setError(err instanceof Error?err.message:String(err))}
    finally{setLoading(false)}
  }

  async function hCode(e:React.FormEvent){
    e.preventDefault();setError(null);setLoading(true);
    try{await authVerifyCode(code.trim());onAuthSuccess()}
    catch(err){setError(err instanceof Error?err.message:String(err))}
    finally{setLoading(false)}
  }

  return (
    <div className={styles.page}>
      {/* Language toggle */}
      <div className={styles.langBar}>
        <button className={`${styles.langBtn} ${lang==='en'?styles.langActive:''}`} onClick={()=>setLang('en')}>EN</button>
        <button className={`${styles.langBtn} ${lang==='es'?styles.langActive:''}`} onClick={()=>setLang('es')}>ES</button>
      </div>

      <div className={`${styles.card} fade-in-up`}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className={styles.title}>{t('login_t')}</h1>
          <p className={styles.subtitle}>{t('login_sub')}</p>
        </div>

        <div className={styles.stepIndicator}>
          <div className={`${styles.step} ${step>=1?styles.active:''}`}/>
          <div className={`${styles.step} ${step===2?styles.active:''}`}/>
        </div>

        {step===1?(
          <form className={`${styles.form} slide-in-right`} onSubmit={hCred}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="apiId">{t('api_id')}</label>
              <input id="apiId" type="number" className={styles.input} placeholder="12345678" value={apiId} onChange={e=>setApiId(e.target.value)} required disabled={loading}/>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="apiHash">{t('api_hash')}</label>
              <input id="apiHash" type="password" className={styles.input} placeholder="a1b2c3d4..." value={apiHash} onChange={e=>setApiHash(e.target.value)} required disabled={loading}/>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="phone">{t('phone')}</label>
              <input id="phone" type="tel" className={styles.input} placeholder="+1234567890" value={phone} onChange={e=>setPhone(e.target.value)} required disabled={loading}/>
            </div>
            {error&&<p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.button} disabled={loading||!apiId||!apiHash}>
              {loading?<span className={styles.spinner}/>:t('connect')}
            </button>
            <p className={styles.helpLink}>
              {t('help')}{' '}
              <button type="button" className={styles.linkBtn} onClick={()=>setShowGuide(true)}>{t('help_btn')}</button>
            </p>
          </form>
        ):(
          <form className={`${styles.form} slide-in-right`} onSubmit={hCode}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="code">{t('code_l')}</label>
              <input id="code" type="text" inputMode="numeric" pattern="[0-9]*" className={styles.input} placeholder="12345" value={code} onChange={e=>setCode(e.target.value)} required disabled={loading} autoFocus/>
              <p className={styles.hint}>{t('code_h')}</p>
            </div>
            {error&&<p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.button} disabled={loading||code.length<4}>
              {loading?<span className={styles.spinner}/>:t('verify')}
            </button>
            <button type="button" className={styles.backBtn} onClick={()=>{setStep(1);setError(null)}}>{t('back')}</button>
          </form>
        )}
      </div>
      {showGuide&&<ApiGuide onClose={()=>setShowGuide(false)}/>}
    </div>
  );
}
