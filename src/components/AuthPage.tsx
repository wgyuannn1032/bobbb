// src/components/AuthPage.tsx
import { useState } from 'react'

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

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" className="flex-shrink-0">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)

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
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top_left,#1e1b4b_0%,#0f0f1a_60%)] p-4">
      <div className="bg-[#1e1e2e] border border-[#2d2d44] rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-fade-in-up">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-3xl animate-gem-pulse">💎</span>
          <span className="text-2xl font-extrabold gradient-text-2">DailyGem</span>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#0f0f1a] rounded-xl p-1 gap-1 mb-6">
          {(['login', 'register'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition
                ${tab === t
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'}`}
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
          <div className="flex-1 border-t border-[#2d2d44]" />
          <span className="text-xs text-slate-600">或</span>
          <div className="flex-1 border-t border-[#2d2d44]" />
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-[#2d2d44] rounded-xl bg-[#1e1e2e] hover:bg-[#2a2a3e] text-sm text-slate-200 transition"
        >
          <GoogleIcon /> 使用 Google 帳號繼續
        </button>
      </div>
    </div>
  )
}

// ── tiny shared sub-components ──────────────────────────────
function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <input
        {...rest}
        required
        className="w-full bg-[#0f0f1a] border border-[#2d2d44] rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500 transition"
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
