// src/components/ConfigModal.tsx
// First-time setup: user enters Firebase + Gemini config
import { useState } from 'react'
import { IconSettings } from '@tabler/icons-react'
import { AppConfig, persistConfig } from '../lib/firebase'

interface Props {
  onSaved: (cfg: AppConfig) => void
}

export default function ConfigModal({ onSaved }: Props) {
  const [form, setForm] = useState({
    apiKey: '', authDomain: '', projectId: '',
    storageBucket: '', messagingSenderId: '', appId: '', geminiApiKey: '',
  })
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value.trim() }))

  const save = () => {
    if (!form.apiKey || !form.projectId) {
      setError('API Key 與 Project ID 為必填欄位')
      return
    }
    persistConfig(form)
    onSaved(form)
  }

  return (
    <div className="app-overlay fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="app-surface app-text border rounded-2xl p-8 w-full max-w-md animate-fade-in-up shadow-2xl overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <IconSettings size={22} className="app-accent" aria-hidden="true" />
          設定 Firebase
        </h2>
        <p className="app-text-muted text-sm mb-6">
          前往{' '}
          <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer"
             className="app-accent underline">Firebase Console</a>{' '}
          取得設定值，並至{' '}
          <a href="https://aistudio.google.com" target="_blank" rel="noreferrer"
             className="app-accent underline">Google AI Studio</a>{' '}
          取得 Gemini API Key（可選）。
        </p>

        {[
          { k: 'apiKey',            label: 'API Key *',              ph: 'AIza...' },
          { k: 'authDomain',        label: 'Auth Domain *',          ph: 'xxx.firebaseapp.com' },
          { k: 'projectId',         label: 'Project ID *',           ph: 'my-project' },
          { k: 'storageBucket',     label: 'Storage Bucket',         ph: 'xxx.appspot.com' },
          { k: 'messagingSenderId', label: 'Messaging Sender ID',    ph: '1234567890' },
          { k: 'appId',             label: 'App ID',                 ph: '1:xxx:web:xxx' },
          { k: 'geminiApiKey',      label: 'Gemini API Key（可選）', ph: 'AIza...' },
        ].map(({ k, label, ph }) => (
          <div key={k} className="mb-3">
            <label className="app-text-muted block text-xs font-medium mb-1">{label}</label>
            <input
              type="text"
              placeholder={ph}
              value={form[k as keyof typeof form]}
              onChange={set(k as keyof typeof form)}
              className="app-surface-muted app-text w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
            />
          </div>
        ))}

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-3">
            {error}
          </p>
        )}

        <button
          onClick={save}
          className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:opacity-90 transition"
        >
          儲存並開始
        </button>
      </div>
    </div>
  )
}
