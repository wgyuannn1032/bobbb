// src/components/HomePage.tsx
import { useState, useEffect, useCallback } from 'react'
import { User } from 'firebase/auth'
import { Firestore } from 'firebase/firestore'
import {
  IconArrowRight,
  IconCircleCheck,
  IconDiamond,
  IconEdit,
  IconFlame,
  IconHistory,
  IconLogout,
  IconSparkles,
  IconWorld,
} from '@tabler/icons-react'
import {
  getUserData,
  UserData,
  fetchAnswers,
  fetchPublicAnswers,
  AnswerRecord,
  saveAnswer,
  rewardUser,
} from '../lib/firestore'
import { fetchDailyQuestion, DailyQuestion, todayKey, yesterdayKey, calcGems, fetchAIFeedback } from '../lib/gemini'
import { AppConfig } from '../lib/firebase'
import DailyModal from './DailyModal'
import HistoryPage from './HistoryPage'

interface Props {
  user:   User
  db:     Firestore
  config: AppConfig
  onLogout: () => void
}

type View = 'home' | 'history'

export default function HomePage({ user, db, config, onLogout }: Props) {
  const [view,        setView]        = useState<View>('home')
  const [userData,    setUserData]    = useState<UserData | null>(null)
  const [answers,     setAnswers]     = useState<AnswerRecord[]>([])
  const [publicAnswers, setPublicAnswers] = useState<AnswerRecord[]>([])
  const [question,    setQuestion]    = useState<DailyQuestion | null>(null)
  const [modalOpen,   setModalOpen]   = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [toast,       setToast]       = useState<{ msg: string; type: string } | null>(null)

  const today = todayKey()

  const loadData = useCallback(async () => {
    const [ud, ans, shared] = await Promise.all([
      getUserData(db, user.uid),
      fetchAnswers(db, user.uid, 10),
      fetchPublicAnswers(db, user.uid, 12).catch(error => {
        console.error('無法載入公開回答：', error)
        return []
      }),
    ])
    setUserData(ud)
    setAnswers(ans)
    setPublicAnswers(shared)
  }, [db, user.uid])

  useEffect(() => {
    let active = true

    void loadData().catch(error => {
      console.error('無法載入 Firestore 資料：', error)
      if (active) {
        setToast({ msg: '資料載入失敗，請稍後再試', type: 'error' })
      }
    })

    return () => { active = false }
  }, [loadData])

  // Fetch today's question
  useEffect(() => {
    fetchDailyQuestion(config.geminiApiKey).then(setQuestion)
  }, [config.geminiApiKey])

  // Auto-open modal if not answered today
  useEffect(() => {
    if (userData && question && userData.lastAnsweredDate !== today) {
      const timer = setTimeout(() => setModalOpen(true), 800)
      return () => clearTimeout(timer)
    }
  }, [userData, question, today])

  const answeredToday = userData?.lastAnsweredDate === today

  const showToast = (msg: string, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSubmit = async (answer: string, gems: number, isPublic: boolean): Promise<string> => {
    if (!userData) return ''
    await saveAnswer(db, {
      uid:      user.uid,
      date:     today,
      question: question!.text,
      category: question!.category,
      answer,
      gems,
      isPublic,
      authorName: displayName,
      authorPhotoURL: user.photoURL,
    })
    const { newGems, newStreak } = await rewardUser(
      db, user.uid, gems, today, yesterdayKey(), userData
    )
    let feedback = '謝謝你的真誠分享！繼續保持這份反思的習慣。'
    if (config.geminiApiKey) {
      feedback = await fetchAIFeedback(question!.text, answer, config.geminiApiKey)
    }
    setUserData(ud => ud ? { ...ud, gems: newGems, streak: newStreak, lastAnsweredDate: today } : ud)
    await loadData()
    showToast(`獲得 ${gems} 顆寶石！`, 'success')
    return feedback
  }

  const avatarUrl =
    user.photoURL ??
    `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(user.uid)}`

  const displayName = userData?.displayName ?? user.displayName ?? '朋友'

  if (view === 'history') {
    return (
      <HistoryPage
        db={db}
        uid={user.uid}
        gems={userData?.gems ?? 0}
        onBack={() => setView('home')}
        onAnswersChanged={loadData}
      />
    )
  }

  return (
    <div className="app-page">

      {/* ── NAV ─────────────────────────────────────── */}
      <nav className="app-nav sticky top-0 z-40 flex items-center justify-between px-4 py-3 backdrop-blur border-b">
        <span className="flex items-center gap-1.5 font-bold text-base gradient-text-2">
          <IconDiamond size={20} className="app-accent" aria-hidden="true" />
          DailyGem
        </span>
        <div className="flex items-center gap-3 relative">
          {/* Gem counter */}
          <div className="app-surface flex items-center gap-1.5 border px-3 py-1.5 rounded-full text-sm font-semibold">
            <IconDiamond size={17} className="app-accent" aria-hidden="true" />
            <span>{userData?.gems ?? 0}</span>
          </div>
          {/* Avatar */}
          <button
            onClick={() => setProfileOpen(o => !o)}
            className="w-9 h-9 rounded-full overflow-hidden border-2 border-violet-500 flex-shrink-0"
          >
            <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          </button>
          {/* Profile dropdown */}
          {profileOpen && (
            <div className="app-surface absolute top-12 right-0 border rounded-xl shadow-xl w-44 z-50 animate-fade-in-up overflow-hidden">
              <div className="px-3 py-2 border-b border-[var(--app-border)]">
                <p className="app-text text-sm font-semibold truncate">{displayName}</p>
                <p className="app-text-muted text-xs truncate">{user.email}</p>
              </div>
              <button
                onClick={() => { setView('history'); setProfileOpen(false) }}
                className="app-hover app-text-secondary w-full flex items-center gap-2 text-left px-3 py-2 text-sm transition"
              >
                <IconHistory size={17} aria-hidden="true" />
                歷史記錄
              </button>
              <button
                onClick={() => { onLogout(); setProfileOpen(false) }}
                className="app-hover app-text-secondary w-full flex items-center gap-2 text-left px-3 py-2 text-sm transition"
              >
                <IconLogout size={17} aria-hidden="true" />
                登出
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ── BODY ────────────────────────────────────── */}
      <main className="max-w-xl mx-auto px-4 py-6 space-y-5">

        {/* Greeting */}
        <div>
          <h2 className="text-xl font-bold">嗨，{displayName.split(' ')[0]}</h2>
          <p className="app-text-muted text-sm mt-0.5">每天回答一個問題，累積更多寶石</p>
        </div>

        {/* Gem card */}
        <div className="app-gem-card rounded-2xl p-5 border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <IconDiamond size={44} stroke={1.6} className="app-accent animate-gem-pulse" aria-hidden="true" />
            <div>
              <div className="app-accent text-3xl font-extrabold">{userData?.gems ?? 0}</div>
              <div className="app-text-muted text-xs">累積寶石</div>
            </div>
          </div>
          <div className="text-center">
            <div className="app-warning text-3xl font-extrabold">{userData?.streak ?? 0}</div>
            <div className="app-text-muted flex items-center justify-center gap-1 text-xs">
              連續天數 <IconFlame size={14} className="app-warning" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Today's question teaser / done banner */}
        {answeredToday ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex items-center gap-4">
            <IconCircleCheck size={34} className="app-success" aria-hidden="true" />
            <div>
              <p className="app-success font-semibold">今日已完成！</p>
              <p className="app-text-muted text-sm mt-0.5">明天再來回答新問題</p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setModalOpen(true)}
            className="app-surface w-full text-left border hover:border-violet-500 rounded-2xl p-5 transition group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 via-blue-400 to-emerald-400" />
            <div className="flex items-center justify-between mb-2">
              <span className="app-accent flex items-center gap-1 text-xs font-semibold bg-violet-500/15 px-2.5 py-1 rounded-full">
                <IconSparkles size={14} aria-hidden="true" />
                今日一問
              </span>
              <span className="app-accent flex items-center gap-1 text-xs bg-violet-500/10 font-semibold px-2.5 py-1 rounded-full">
                +3 <IconDiamond size={14} aria-hidden="true" />
              </span>
            </div>
            <p className="app-text-secondary text-sm leading-relaxed line-clamp-2">
              {question ? question.text : 'AI 問題載入中…'}
            </p>
            <div className="flex justify-end mt-3">
              <span className="app-text-muted flex items-center gap-1 group-hover:text-violet-500 transition text-sm">
                點擊作答 <IconArrowRight size={16} aria-hidden="true" />
              </span>
            </div>
          </button>
        )}

        {/* Recent answers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="app-text-muted text-sm font-semibold">最近的回答</h3>
            {answers.length > 0 && (
              <button type="button" onClick={() => setView('history')} className="app-accent flex items-center gap-1 text-xs font-medium hover:underline">
                <IconEdit size={14} aria-hidden="true" />
                管理回答
              </button>
            )}
          </div>
          {answers.length === 0 ? (
            <p className="app-text-muted text-center py-6 text-sm">還沒有回答記錄，快去回答今日一問！</p>
          ) : (
            <div className="space-y-3">
              {answers.slice(0, 3).map(a => (
                <AnswerCard key={a.id ?? a.date} record={a} />
              ))}
            </div>
          )}
        </div>

        {/* Community answers */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <IconWorld size={18} className="app-accent" aria-hidden="true" />
            <h3 className="app-text text-sm font-semibold">社群回答</h3>
          </div>
          {publicAnswers.length === 0 ? (
            <div className="app-surface border rounded-xl px-4 py-6 text-center">
              <IconWorld size={28} className="app-text-muted mx-auto mb-2" aria-hidden="true" />
              <p className="app-text-muted text-sm">目前還沒有其他人的公開回答</p>
            </div>
          ) : (
            <div className="space-y-3">
              {publicAnswers.map(record => (
                <PublicAnswerCard key={record.id} record={record} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── MODAL ───────────────────────────────────── */}
      {modalOpen && (
        <DailyModal
          question={question}
          geminiApiKey={config.geminiApiKey}
          onSubmit={handleSubmit}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* ── TOAST ───────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-medium shadow-xl
          ${toast.type === 'success'
            ? 'bg-emerald-500/15 border border-emerald-500/40 app-success'
            : 'app-surface app-text-secondary border'
          } animate-fade-in-up flex items-center gap-2`}>
          {toast.type === 'success' && <IconCircleCheck size={18} aria-hidden="true" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Close profile menu on outside click */}
      {profileOpen && (
        <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
      )}
    </div>
  )
}

function AnswerCard({ record }: { record: AnswerRecord }) {
  return (
    <div className="app-surface border rounded-xl p-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="app-accent text-xs font-semibold">{record.category}</span>
        <span className="app-text-muted text-xs">{record.date}</span>
      </div>
      <p className="app-text-muted text-xs mb-1.5">{record.question}</p>
      <p className="app-text-secondary text-sm leading-relaxed line-clamp-3">{record.answer}</p>
      <p className="app-accent flex items-center gap-1 text-xs font-semibold mt-2">
        +{record.gems} <IconDiamond size={14} aria-hidden="true" />
      </p>
    </div>
  )
}

function PublicAnswerCard({ record }: { record: AnswerRecord }) {
  const authorName = record.authorName?.trim() || 'DailyGem 使用者'
  const authorPhoto = record.authorPhotoURL ||
    `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(record.uid)}`

  return (
    <article className="app-surface border rounded-xl p-4">
      <header className="flex items-center gap-2.5 mb-3">
        <img
          src={authorPhoto}
          alt=""
          className="h-8 w-8 rounded-full object-cover border border-[var(--app-border)]"
        />
        <div className="min-w-0">
          <p className="app-text text-sm font-semibold truncate">{authorName}</p>
          <p className="app-text-muted text-xs">{record.date}</p>
        </div>
        <span className="app-accent ml-auto flex items-center gap-1 text-xs font-medium">
          <IconWorld size={14} aria-hidden="true" />
          公開
        </span>
      </header>
      <p className="app-accent text-xs font-semibold mb-1.5">{record.category}</p>
      <p className="app-text-muted text-xs mb-2">{record.question}</p>
      <p className="app-text-secondary text-sm leading-relaxed whitespace-pre-wrap">{record.answer}</p>
    </article>
  )
}
