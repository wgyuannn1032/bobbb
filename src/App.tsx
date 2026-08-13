// src/App.tsx — root component: config → auth → home
import { useState, useEffect } from 'react'
import { AppConfig, loadConfig, initFirebase } from './lib/firebase'
import { useAuth } from './hooks/useAuth'
import { Auth } from 'firebase/auth'
import { Firestore } from 'firebase/firestore'
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] gap-4">
        <span className="text-6xl animate-gem-pulse">💎</span>
        <h1 className="text-3xl font-extrabold gradient-text">DailyGem</h1>
        <p className="text-slate-400 text-sm">每日一問，探索自我</p>
        <div className="mt-4 w-10 h-10 border-[3px] border-violet-500/20 border-t-violet-500 rounded-full animate-spin-slow" />
      </div>
    )
  }

  // ── Config setup ─────────────────────────────────────────────
  if (stage === 'needs-config') {
    return (
      <div className="min-h-screen bg-[#0f0f1a]">
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
