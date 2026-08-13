// src/components/HistoryPage.tsx
import { useState, useEffect, useCallback } from 'react'
import { Firestore } from 'firebase/firestore'
import {
  IconAlertTriangle,
  IconCheck,
  IconDiamond,
  IconEdit,
  IconHistory,
  IconLock,
  IconTrash,
  IconWorld,
  IconX,
} from '@tabler/icons-react'
import { fetchAnswers, AnswerRecord, updateAnswer, deleteAnswer } from '../lib/firestore'
import AppNav from './AppNav'

interface Props {
  db:     Firestore
  uid:    string
  gems:   number
  onBack: () => void
  onAnswersChanged: () => Promise<void>
  embedded?: boolean
}

export default function HistoryPage({ db, uid, gems, onBack, onAnswersChanged, embedded = false }: Props) {
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AnswerRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AnswerRecord | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const reloadAnswers = useCallback(async () => {
    const records = await fetchAnswers(db, uid, 100)
    setAnswers(records)
  }, [db, uid])

  useEffect(() => {
    void reloadAnswers()
      .catch(() => setError('無法載入回答，請稍後再試'))
      .finally(() => setLoading(false))
  }, [reloadAnswers])

  const handleSave = async (answer: string, isPublic: boolean) => {
    if (!editing?.id) return
    setError('')
    await updateAnswer(db, editing.id, answer, isPublic)
    await Promise.all([reloadAnswers(), onAnswersChanged()])
    setEditing(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget?.id) return

    setError('')
    setDeletingId(deleteTarget.id)
    try {
      await deleteAnswer(db, deleteTarget.id)
      await Promise.all([reloadAnswers(), onAnswersChanged()])
      setDeleteTarget(null)
    } catch (deleteError) {
      console.error('無法刪除回答：', deleteError)
      throw deleteError
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={embedded ? 'w-full' : 'app-page'}>
      {!embedded && <AppNav
        onBack={onBack}
        backLabel="返回"
        title="歷史記錄"
        titleIcon={<IconHistory size={18} className="app-accent" aria-hidden="true" />}
      >
        <div className="app-surface flex items-center gap-1.5 border px-3 py-1.5 rounded-full text-sm font-semibold">
          <IconDiamond size={17} className="app-accent" aria-hidden="true" />
          {gems}
        </div>
      </AppNav>}

      <main className="max-w-xl mx-auto px-4 py-6">
        {error && (
          <p className="mb-4 text-red-500 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin-slow" />
          </div>
        ) : answers.length === 0 ? (
          <p className="app-text-muted text-center py-16 text-sm">還沒有任何回答記錄</p>
        ) : (
          <div className="space-y-4">
            {answers.map(a => (
              <div key={a.id ?? a.date} className="app-surface border rounded-xl p-5 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-2">
                  <span className="app-accent text-xs font-semibold">{a.category}</span>
                  <span className="app-text-muted flex items-center gap-1 text-xs">
                    {a.isPublic ? <IconWorld size={13} aria-hidden="true" /> : <IconLock size={13} aria-hidden="true" />}
                    {a.isPublic ? '匿名公開' : '私人'}
                  </span>
                  <span className="app-text-muted text-xs ml-auto">{a.date}</span>
                </div>
                <p className="app-text-muted text-sm leading-relaxed mb-3">{a.question}</p>
                <p className="app-text-secondary text-sm leading-relaxed">{a.answer}</p>
                <div className="flex items-center mt-3">
                  <p className="app-accent flex items-center gap-1 text-xs font-semibold">
                    +{a.gems} <IconDiamond size={14} aria-hidden="true" />
                  </p>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { setError(''); setEditing(a) }}
                      className="app-hover app-text-muted flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition hover:text-violet-500"
                    >
                      <IconEdit size={15} aria-hidden="true" />
                      編輯
                    </button>
                    <button
                      type="button"
                      onClick={() => { setError(''); setDeleteTarget(a) }}
                      disabled={deletingId === a.id}
                      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <IconTrash size={15} aria-hidden="true" />
                      {deletingId === a.id ? '刪除中…' : '刪除'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {editing && (
        <EditAnswerModal
          record={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
      {deleteTarget && (
        <DeleteAnswerModal
          record={deleteTarget}
          deleting={deletingId === deleteTarget.id}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

interface DeleteAnswerModalProps {
  record: AnswerRecord
  deleting: boolean
  onConfirm: () => Promise<void>
  onClose: () => void
}

function DeleteAnswerModal({ record, deleting, onConfirm, onClose }: DeleteAnswerModalProps) {
  const [error, setError] = useState('')

  const confirmDelete = async () => {
    if (deleting) return
    setError('')
    try {
      await onConfirm()
    } catch (_) {
      setError('刪除失敗，請稍後再試')
    }
  }

  return (
    <div
      className="app-overlay fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4"
      onClick={event => { if (event.target === event.currentTarget && !deleting) onClose() }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-answer-title"
        aria-describedby="delete-answer-description"
        className="app-surface app-text border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <IconAlertTriangle size={24} aria-hidden="true" />
          </span>
          <div>
            <h2 id="delete-answer-title" className="text-lg font-bold">刪除這則回答？</h2>
            <p id="delete-answer-description" className="app-text-muted mt-1 text-sm leading-relaxed">
              回答刪除後無法復原，但已獲得的寶石與連續天數會保留。
            </p>
          </div>
        </div>

        <div className="app-surface-muted border border-[var(--app-border)] rounded-xl px-4 py-3 my-5">
          <p className="app-text-muted text-xs mb-1 line-clamp-1">{record.question}</p>
          <p className="app-text-secondary text-sm leading-relaxed line-clamp-3">{record.answer}</p>
        </div>

        {error && (
          <p className="mb-3 text-red-500 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="app-surface-muted app-text-secondary app-hover flex-1 rounded-xl border border-[var(--app-border)] py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void confirmDelete()}
            disabled={deleting}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? '刪除中…' : '確認刪除'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface EditAnswerModalProps {
  record: AnswerRecord
  onSave: (answer: string, isPublic: boolean) => Promise<void>
  onClose: () => void
}

function EditAnswerModal({ record, onSave, onClose }: EditAnswerModalProps) {
  const [answer, setAnswer] = useState(record.answer)
  const [isPublic, setIsPublic] = useState(record.isPublic === true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const remaining = Math.max(0, 20 - answer.trim().length)

  const save = async () => {
    if (remaining > 0 || saving) return
    setSaving(true)
    setError('')
    try {
      await onSave(answer, isPublic)
    } catch (saveError) {
      console.error('無法更新回答：', saveError)
      setError('更新失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="app-overlay fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4"
      onClick={event => { if (event.target === event.currentTarget && !saving) onClose() }}
    >
      <div className="app-surface app-text border rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <IconEdit size={20} className="app-accent" aria-hidden="true" />
            編輯回答
          </h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label="關閉" className="app-text-muted app-hover rounded-lg p-1 disabled:opacity-50">
            <IconX size={20} aria-hidden="true" />
          </button>
        </div>

        <p className="app-text-muted text-xs mb-2">{record.question}</p>
        <textarea
          value={answer}
          onChange={event => setAnswer(event.target.value)}
          rows={7}
          className="app-surface-muted app-text w-full border border-[var(--app-border)] focus:border-violet-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none transition leading-relaxed"
        />
        <p className={`text-right text-xs mt-1 ${remaining === 0 ? 'app-success' : 'app-text-muted'}`}>
          {remaining === 0 ? (
            <span className="inline-flex items-center gap-1"><IconCheck size={14} aria-hidden="true" />可以儲存</span>
          ) : `尚需 ${remaining} 字`}
        </p>

        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          onClick={() => setIsPublic(value => !value)}
          className="app-surface-muted app-text-secondary app-hover w-full flex items-center gap-3 border border-[var(--app-border)] rounded-xl px-3.5 py-3 my-4 text-left transition"
        >
          {isPublic ? <IconWorld size={20} className="app-accent" aria-hidden="true" /> : <IconLock size={20} className="app-text-muted" aria-hidden="true" />}
          <span className="flex-1 text-sm font-semibold">{isPublic ? '匿名公開回答' : '私人回答'}</span>
          <span className={`relative h-6 w-11 rounded-full transition-colors ${isPublic ? 'bg-violet-600' : 'bg-slate-400/40'}`} aria-hidden="true">
            <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
          </span>
        </button>

        {error && <p className="mb-3 text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={saving} className="app-surface-muted app-text-secondary app-hover flex-1 rounded-xl border border-[var(--app-border)] py-2.5 text-sm font-semibold disabled:opacity-50">
            取消
          </button>
          <button type="button" onClick={() => void save()} disabled={remaining > 0 || saving} className="btn-grad flex-1">
            {saving ? '儲存中…' : '儲存變更'}
          </button>
        </div>
      </div>
    </div>
  )
}
