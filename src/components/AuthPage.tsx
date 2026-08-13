// src/components/AuthPage.tsx
import { useState } from 'react'
import { IconBrandGoogle, IconDiamond } from '@tabler/icons-react'

type Tab = 'login' | 'register'

interface Props {
  onLogin:       (email: string, password: string) => Promise<void>
  onRegister:    (name: string, email: string, password: string) => Promise<void>
  onGoogleLogin: () => Promise<void>
}

function translateError(code: string): string {
  const map: Record<string, string> = {
    'auth/user-not-found':       '找不到此帳號',
    'auth/wrong-password':       '密碼錯誤',
    'auth/email-already-in-use': '此電子郵件已被使用',
    'auth/invalid-email':        '電子郵件格式不正確',
    'auth/weak-password':        '密碼至少需要 6 個字元',
    'auth/popup-closed-by-user': '視窗已關閉，請重試',
    'auth/invalid-credential':   '帳號或密碼錯誤',
    'auth/too-many-requests':    '嘗試次數過多，請稍後再試',
  }
  return map[code] ?? `發生錯誤（${code}）`
}

export default function AuthPage({ onLogin, onRegister, onGoogleLogin }: Props) {
  const [tab,      setTab]      = useState<Tab>('login')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // login form
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  // register form
  const [name,     setName]     = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPass,  setRegPass]  = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try { await onLogin(email, password) }
    catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      setError(translateError(code))
    } finally { setLoading(false) }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try { await onRegister(name, regEmail, regPass) }
    catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      setError(translateError(code))
    } finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    setError(''); setLoading(true)
    try { await onGoogleLogin() }
    catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      setError(translateError(code))
    } finally { setLoading(false) }
  }

  return (
    <div className="app-page app-auth-bg flex items-center justify-center p-4">
      <div className="app-surface border rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-fade-in-up">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <IconDiamond size={34} stroke={1.8} className="app-accent animate-gem-pulse" aria-hidden="true" />
          <span className="text-2xl font-extrabold gradient-text-2">DailyGem</span>
        </div>

        {/* Tabs */}
        <div className="app-surface-muted flex rounded-xl p-1 gap-1 mb-6">
          {(['login', 'register'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition
                ${tab === t
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                  : 'app-text-muted hover:text-violet-500'}`}
            >
              {t === 'login' ? '登入' : '註冊'}
            </button>
          ))}
        </div>

        {/* Login form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="電子郵件" type="email" placeholder="you@example.com"
                   value={email} onChange={e => setEmail(e.target.value)} />
            <Field label="密碼" type="password" placeholder="至少 6 位字元"
                   value={password} onChange={e => setPassword(e.target.value)} />
            {error && <ErrorMsg msg={error} />}
            <button type="submit" disabled={loading} className="w-full btn-grad">
              {loading ? '登入中…' : '登入'}
            </button>
          </form>
        )}

        {/* Register form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <Field label="暱稱" type="text" placeholder="你的名字"
                   value={name} onChange={e => setName(e.target.value)} />
            <Field label="電子郵件" type="email" placeholder="you@example.com"
                   value={regEmail} onChange={e => setRegEmail(e.target.value)} />
            <Field label="密碼" type="password" placeholder="至少 6 位字元"
                   value={regPass} onChange={e => setRegPass(e.target.value)} />
            {error && <ErrorMsg msg={error} />}
            <button type="submit" disabled={loading} className="w-full btn-grad">
              {loading ? '建立中…' : '建立帳號'}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 border-t border-[var(--app-border)]" />
          <span className="app-text-muted text-xs">或</span>
          <div className="flex-1 border-t border-[var(--app-border)]" />
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="app-surface app-hover app-text-secondary w-full flex items-center justify-center gap-2 py-2.5 border rounded-xl text-sm transition"
        >
          <IconBrandGoogle size={19} stroke={1.8} aria-hidden="true" />
          使用 Google 帳號繼續
        </button>
      </div>
    </div>
  )
}

// ── tiny shared sub-components ──────────────────────────────
function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="app-text-muted block text-xs font-medium mb-1">{label}</label>
      <input
        {...rest}
        required
        className="app-surface-muted app-text w-full border border-[var(--app-border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
      />
    </div>
  )
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
      {msg}
    </p>
  )
}
