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
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
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
