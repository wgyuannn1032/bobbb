// src/components/HomePage.tsx
import { useState, useEffect, useCallback } from 'react'
import { User } from 'firebase/auth'
import { Firestore } from 'firebase/firestore'
import { getUserData, UserData, fetchAnswers, AnswerRecord, saveAnswer, rewardUser } from '../lib/firestore'
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
  const [question,    setQuestion]    = useState<DailyQuestion | null>(null)
  const [modalOpen,   setModalOpen]   = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [toast,       setToast]       = useState<{ msg: string; type: string } | null>(null)

  const today = todayKey()

  const loadData = useCallback(async () => {
    const [ud, ans] = await Promise.all([
      getUserData(db, user.uid),
      fetchAnswers(db, user.uid, 10),
    ])
    setUserData(ud)
    setAnswers(ans)
  }, [db, user.uid])

  useEffect(() => { loadData() }, [loadData])

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

  const handleSubmit = async (answer: string, gems: number): Promise<string> => {
    if (!userData) return ''
    await saveAnswer(db, {
      uid:      user.uid,
      date:     today,
      question: question!.text,
      category: question!.category,
      answer,
      gems,
    })
    const { newGems, newStreak } = await rewardUser(
      db, user.uid, gems, today, yesterdayKey(), userData
    )
    let feedback = '謝謝你的真誠分享！繼續保持這份反思的習慣 💎'
    if (config.geminiApiKey) {
      feedback = await fetchAIFeedback(question!.text, answer, config.geminiApiKey)
    }
    setUserData(ud => ud ? { ...ud, gems: newGems, streak: newStreak, lastAnsweredDate: today } : ud)
    await loadData()
    showToast(`🎉 獲得 ${gems} 顆寶石！`, 'success')
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
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a]">

      {/* ── NAV ─────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#0f0f1a]/85 backdrop-blur border-b border-[#1e1e2e]">
        <span className="font-bold text-base gradient-text-2">💎 DailyGem</span>
        <div className="flex items-center gap-3 relative">
          {/* Gem counter */}
          <div className="flex items-center gap-1.5 bg-[#1e1e2e] border border-[#2d2d44] px-3 py-1.5 rounded-full text-sm font-semibold">
            💎 <span>{userData?.gems ?? 0}</span>
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
            <div className="absolute top-12 right-0 bg-[#1e1e2e] border border-[#2d2d44] rounded-xl shadow-xl w-44 z-50 animate-fade-in-up overflow-hidden">
              <div className="px-3 py-2 border-b border-[#2d2d44]">
                <p className="text-sm font-semibold text-slate-100 truncate">{displayName}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
              <button
                onClick={() => { setView('history'); setProfileOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-[#2a2a3e] transition"
              >
                📜 歷史記錄
              </button>
              <button
                onClick={() => { onLogout(); setProfileOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-[#2a2a3e] transition"
              >
                🚪 登出
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ── BODY ────────────────────────────────────── */}
      <main className="max-w-xl mx-auto px-4 py-6 space-y-5">

        {/* Greeting */}
        <div>
          <h2 className="text-xl font-bold">嗨，{displayName.split(' ')[0]} 👋</h2>
          <p className="text-slate-500 text-sm mt-0.5">每天回答一個問題，累積更多寶石</p>
        </div>

        {/* Gem card */}
        <div className="rounded-2xl p-5 bg-gradient-to-br from-[#1e1b4b] to-[#312e81] border border-indigo-700/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl animate-gem-pulse">💎</span>
            <div>
              <div className="text-3xl font-extrabold text-violet-300">{userData?.gems ?? 0}</div>
              <div className="text-xs text-slate-400">累積寶石</div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-extrabold text-amber-400">{userData?.streak ?? 0}</div>
            <div className="text-xs text-slate-400">連續天數 🔥</div>
          </div>
        </div>

        {/* Today's question teaser / done banner */}
        {answeredToday ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex items-center gap-4">
            <span className="text-3xl">✅</span>
            <div>
              <p className="font-semibold text-emerald-400">今日已完成！</p>
              <p className="text-sm text-slate-500 mt-0.5">明天再來回答新問題 💎</p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setModalOpen(true)}
            className="w-full text-left bg-[#1e1e2e] border border-[#2d2d44] hover:border-violet-500 rounded-2xl p-5 transition group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 via-blue-400 to-emerald-400" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold bg-violet-500/20 text-violet-300 px-2.5 py-1 rounded-full">
                ✨ 今日一問
              </span>
              <span className="text-xs bg-violet-500/15 text-violet-300 font-semibold px-2.5 py-1 rounded-full">
                +3 💎
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">
              {question ? question.text : 'AI 問題載入中…'}
            </p>
            <div className="flex justify-end mt-3">
              <span className="text-slate-500 group-hover:text-violet-400 transition text-sm">點擊作答 →</span>
            </div>
          </button>
        )}

        {/* Recent answers */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-3">最近的回答</h3>
          {answers.length === 0 ? (
            <p className="text-center text-slate-600 py-6 text-sm">還沒有回答記錄，快去回答今日一問！</p>
          ) : (
            <div className="space-y-3">
              {answers.slice(0, 3).map(a => (
                <AnswerCard key={a.id ?? a.date} record={a} />
              ))}
            </div>
          )}
        </div>
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
            ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
            : 'bg-[#1e1e2e] border border-[#2d2d44] text-slate-200'
          } animate-fade-in-up`}>
          {toast.msg}
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
    <div className="bg-[#1e1e2e] border border-[#2d2d44] rounded-xl p-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-violet-400">{record.category}</span>
        <span className="text-xs text-slate-600">{record.date}</span>
      </div>
      <p className="text-xs text-slate-500 mb-1.5">{record.question}</p>
      <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">{record.answer}</p>
      <p className="text-xs text-violet-400 font-semibold mt-2">+{record.gems} 💎</p>
    </div>
  )
}
