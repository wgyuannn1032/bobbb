import { FormEvent, useState } from 'react'
import { IconFileDescription, IconUser, IconX } from '@tabler/icons-react'
import Dialog from './Dialog'

interface Props {
  displayName: string
  email: string
  description: string
  onSave: (displayName: string, description: string) => Promise<void>
  onClose: () => void
}

export default function ProfileModal({
  displayName,
  email,
  description,
  onSave,
  onClose,
}: Props) {
  const [name, setName] = useState(displayName)
  const [bio, setBio] = useState(description)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const normalizedName = name.trim()
    const normalizedDescription = bio.trim()

    if (!normalizedName) {
      setError('請輸入顯示名稱')
      return
    }
    if (normalizedName.length > 40) {
      setError('顯示名稱不可超過 40 個字元')
      return
    }
    if (normalizedDescription.length > 160) {
      setError('Description 不可超過 160 個字元')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave(normalizedName, normalizedDescription)
    } catch (err) {
      console.error('無法更新個人資料：', err)
      setError('儲存失敗，請稍後再試')
      setSaving(false)
    }
  }

  return (
    <Dialog onClose={onClose} labelledBy="profile-title" closeOnBackdrop={!saving} closeOnEscape={!saving} panelClassName="max-w-md" overlayClassName="z-[60]">
        <header className="flex items-center justify-between px-5 py-4 border-b border-[var(--app-border)]">
          <div>
            <h2 id="profile-title" className="app-text font-bold">編輯個人資料</h2>
            <p className="app-text-muted text-xs mt-0.5">更新你的 Name 與 Description</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="app-text-muted app-hover p-1.5 rounded-lg transition disabled:opacity-50" aria-label="關閉">
            <IconX size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label htmlFor="profile-name" className="app-text-muted block text-xs font-medium mb-1">Name</label>
            <div className="relative">
              <IconUser size={17} className="app-text-muted absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input id="profile-name" autoFocus value={name} onChange={event => { setName(event.target.value); setError('') }} maxLength={40} className="app-surface-muted app-text w-full border border-[var(--app-border)] rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition" />
            </div>
            <p className="app-text-muted text-right text-xs mt-1">{name.length}/40</p>
          </div>

          <div>
            <label htmlFor="profile-description" className="app-text-muted block text-xs font-medium mb-1">Description</label>
            <div className="relative">
              <IconFileDescription size={17} className="app-text-muted absolute left-3 top-3" aria-hidden="true" />
              <textarea id="profile-description" rows={4} maxLength={160} placeholder="簡單介紹一下自己…" value={bio} onChange={event => { setBio(event.target.value); setError('') }} className="app-surface-muted app-text w-full resize-none border border-[var(--app-border)] rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition" />
            </div>
            <p className="app-text-muted text-right text-xs mt-1">{bio.length}/160</p>
          </div>

          <div>
            <label className="app-text-muted block text-xs font-medium mb-1">電子郵件</label>
            <input value={email} disabled className="app-surface-muted app-text-muted w-full border border-[var(--app-border)] rounded-xl px-3 py-2.5 text-sm cursor-not-allowed opacity-70" />
          </div>

          {error && <p role="alert" className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="app-surface app-hover app-text-secondary flex-1 border rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-50">取消</button>
            <button type="submit" disabled={saving} className="btn-grad flex-1">{saving ? '儲存中…' : '儲存變更'}</button>
          </div>
        </form>
    </Dialog>
  )
}
