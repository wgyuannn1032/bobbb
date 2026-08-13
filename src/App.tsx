// src/App.tsx — root component: config → auth → home
import { useState, useEffect } from 'react'
import { AppConfig, loadConfig, initFirebase } from './lib/firebase'
import { useAuth } from './hooks/useAuth'
import { Auth } from 'firebase/auth'
import { Firestore } from 'firebase/firestore'
import { IconDiamond } from '@tabler/icons-react'
import ConfigModal from './components/ConfigModal'
import AuthPage    from './components/AuthPage'
import HomePage    from './components/HomePage'

type AppStage = 'loading' | 'needs-config' | 'ready'

export default function App() {
  const [config,   setConfig]   = useState<AppConfig | null>(null)
  const [stage,    setStage]    = useState<AppStage>('loading')
  const [authInst, setAuthInst] = useState<Auth | null>(null)
  const [dbInst,   setDbInst]   = useState<Firestore | null>(null)

  useEffect(() => {
    const cfg = loadConfig()
    if (!cfg?.apiKey) {
      setStage('needs-config')
      return
    }
    try {
      const { auth, db } = initFirebase(cfg)
      setConfig(cfg)
      setAuthInst(auth)
      setDbInst(db)
      setStage('ready')
    } catch (_) {
      setStage('needs-config')
    }
  }, [])

  const handleConfigSaved = (cfg: AppConfig) => {
    try {
      const { auth, db } = initFirebase(cfg)
      setConfig(cfg)
      setAuthInst(auth)
      setDbInst(db)
      setStage('ready')
    } catch (_) {
      alert('Firebase 初始化失敗，請確認設定是否正確。')
    }
  }

  const { user, status, login, register, loginGoogle, logout } = useAuth(authInst, dbInst)

  // ── Splash ──────────────────────────────────────────────────
  if (stage === 'loading' || status === 'loading') {
    return (
      <div className="app-page app-splash-bg flex flex-col items-center justify-center gap-4">
        <IconDiamond size={64} stroke={1.7} className="app-accent animate-gem-pulse" aria-hidden="true" />
        <h1 className="text-3xl font-extrabold gradient-text">DailyGem</h1>
        <p className="app-text-muted text-sm">每日一問，探索自我</p>
        <div className="mt-4 w-10 h-10 border-[3px] border-violet-500/20 border-t-violet-500 rounded-full animate-spin-slow" />
      </div>
    )
  }

  // ── Config setup ─────────────────────────────────────────────
  if (stage === 'needs-config') {
    return (
      <div className="app-page">
        <ConfigModal onSaved={handleConfigSaved} />
      </div>
    )
  }

  // ── Auth ─────────────────────────────────────────────────────
  if (status === 'unauthenticated') {
    return (
      <AuthPage
        onLogin={login}
        onRegister={register}
        onGoogleLogin={loginGoogle}
      />
    )
  }

  // ── App ──────────────────────────────────────────────────────
  if (status === 'authenticated' && user && config && dbInst) {
    return (
      <HomePage
        user={user}
        db={dbInst}
        config={config}
        onLogout={logout}
      />
    )
  }

  return null
}
