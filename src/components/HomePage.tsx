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
  IconBubble,
  IconStars,
  IconCards,
  IconHeart,
  IconDeviceGamepad2,
  IconUserEdit,
  IconX,
  IconMoodSmile,
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
import { fetchDailyQuestions, DailyQuestion, todayKey, yesterdayKey, fetchAIFeedback } from '../lib/gemini'
import { AppConfig } from '../lib/firebase'
import DailyModal from './DailyModal'
import AppNav from './AppNav'
import HistoryPage from './HistoryPage'
import MoodPage from './MoodPage'
import ProfileModal from './ProfileModal'

interface Props {
  user:   User
  db:     Firestore
  config: AppConfig
  onSaveProfile: (displayName: string, description: string) => Promise<void>
  onLogout: () => void
}

type View = 'home' | 'history' | 'mood'

const GAMES = [
  {
    href: '/games/bubble.html',
    icon: <IconBubble size={20} aria-hidden="true" />,
    label: '泡泡啵啵樂',
    color: 'text-pink-400',
  },
  {
    href: '/games/wish.html',
    icon: <IconStars size={20} aria-hidden="true" />,
    label: '流星許願樹',
    color: 'text-yellow-400',
  },
  {
    href: '/games/flip.html',
    icon: <IconCards size={20} aria-hidden="true" />,
    label: '星際花園翻翻看',
    color: 'text-violet-400',
  },
]

const TOOLS = [
  {
    view: 'mood' as View,
    icon: <IconMoodSmile size={20} aria-hidden="true" />,
    label: '情緒打卡',
    color: 'text-rose-400',
  },
]

export default function HomePage({ user, db, config, onSaveProfile, onLogout }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [view,        setView]        = useState<View>('home')
  const [userData,    setUserData]    = useState<UserData | null>(null)
  const [answers,     setAnswers]     = useState<AnswerRecord[]>([])
  const [publicAnswers, setPublicAnswers] = useState<AnswerRecord[]>([])
  const [questions,   setQuestions]   = useState<DailyQuestion[]>([])
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)
  const [modalOpen,   setModalOpen]   = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
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

  // Fetch today's questions
  useEffect(() => {
    fetchDailyQuestions(config.geminiApiKey).then(setQuestions)
  }, [config.geminiApiKey])

  const isQuestionAnswered = useCallback((question: DailyQuestion) =>
    answers.some(answer =>
      answer.date === today &&
      (answer.questionId === question.id || (!answer.questionId && answer.question === question.text))
    ), [answers, today])

  const completedQuestionCount = questions.filter(isQuestionAnswered).length
  const allQuestionsAnswered = questions.length > 0 && completedQuestionCount === questions.length

  // Auto-open the first unanswered question each day.
  useEffect(() => {
    if (userData && questions.length > 0 && completedQuestionCount === 0) {
      const timer = setTimeout(() => {
        setActiveQuestionIndex(0)
        setModalOpen(true)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [userData, questions, completedQuestionCount])

  const showToast = (msg: string, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSubmit = async (answer: string, gems: number, isPublic: boolean): Promise<string> => {
    const question = questions[activeQuestionIndex]
    if (!userData || !question || isQuestionAnswered(question)) return ''
    await saveAnswer(db, {
      uid:      user.uid,
      date:     today,
      questionId: question.id,
      question: question.text,
      category: question.category,
      answer,
      gems,
      isPublic,
    })
    const { newGems, newStreak } = await rewardUser(
      db, user.uid, gems, today, yesterdayKey(), userData
    )
    let feedback = '謝謝你的真誠分享！繼續保持這份反思的習慣。'
    if (config.geminiApiKey) {
      feedback = await fetchAIFeedback(question.text, answer, config.geminiApiKey)
    }
    setUserData(ud => ud ? { ...ud, gems: newGems, streak: newStreak, lastAnsweredDate: today } : ud)
    await loadData()
    showToast(`獲得 ${gems} 顆寶石！`, 'success')
    return feedback
  }

  const avatarUrl =
    userData?.photoURL ?? user.photoURL ??
    `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(user.uid)}`

  const displayName = userData?.displayName ?? user.displayName ?? '朋友'

  const handleSaveProfile = async (name: string, description: string) => {
    await onSaveProfile(name, description)
    setUserData(current => current ? { ...current, displayName: name, description } : current)
    setProfileModalOpen(false)
    showToast('個人資料已更新', 'success')
  }

  return (
		<div className="app-page flex">
			{/* ── SIDEBAR ─────────────────────────────────── */}
			{/* Overlay (mobile) */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 z-30 bg-black/40 lg:hidden"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			<aside
				className={`
          fixed top-0 left-0 h-full z-40 flex flex-col
          app-surface border-r w-60
          transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
			>
				{/* Sidebar header */}
				<div className="flex items-center justify-between px-4 py-4 border-b border-[var(--app-border)]">
					<span className="flex items-center gap-2 font-bold text-lg gradient-text-2">
						<IconDiamond size={20} className="app-accent" aria-hidden="true" />
						DailyGem
					</span>
					<button
						onClick={() => setSidebarOpen(false)}
						className="lg:hidden app-text-muted hover:app-text transition"
						aria-label="關閉選單"
					>
						<IconX size={18} />
					</button>
				</div>

				{/* Games & Tools section */}
				<nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
					<p className="app-text-muted text-xs font-semibold uppercase px-2 mb-2 tracking-wider flex items-center gap-1.5">
						<IconHeart size={14} aria-hidden="true" />
						心情工具
					</p>
					{TOOLS.map((t) => (
						<button
							key={t.view}
							type="button"
							className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium app-hover app-text-secondary transition"
							onClick={() => { setView(t.view); setSidebarOpen(false) }}
						>
							<span className={`${t.color} transition`}>{t.icon}</span>
							<span>{t.label}</span>
						</button>
					))}
					<p className="app-text-muted text-xs font-semibold uppercase px-2 mb-2 mt-3 tracking-wider flex items-center gap-1.5">
						<IconDeviceGamepad2 size={14} aria-hidden="true" />
						紓壓小遊戲
					</p>
					{GAMES.map((g) => (
						<a
							key={g.href}
							href={g.href}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-3 px-3 py-2.5 rounded-xl app-hover app-text-secondary text-sm font-medium transition group"
							onClick={() => setSidebarOpen(false)}
						>
							<span className={`${g.color} transition`}>{g.icon}</span>
							<span>{g.label}</span>
						</a>
					))}
				</nav>

				{/* Sidebar footer */}
				<div className="px-3 py-3 border-t border-[var(--app-border)]">
					<button
						onClick={() => {
							onLogout();
							setSidebarOpen(false);
						}}
						className="flex items-center gap-2 w-full px-3 py-2 rounded-xl app-hover app-text-muted text-sm transition"
					>
						<IconLogout size={16} aria-hidden="true" />
						登出
					</button>
				</div>
			</aside>

			{/* ── MAIN CONTENT ────────────────────────────── */}
			<div className="flex-1 min-w-0 flex flex-col lg:ml-60">
				<AppNav
					onOpenSidebar={() => setSidebarOpen(true)}
					onBack={view !== "home" ? () => setView("home") : undefined}
					title={view === "history" ? "歷史記錄" : view === "mood" ? "情緒打卡" : undefined}
					titleIcon={view === "history"
						? <IconHistory size={18} className="app-accent" aria-hidden="true" />
						: view === "mood"
							? <IconMoodSmile size={18} className="text-rose-400" aria-hidden="true" />
							: undefined}
				>
					<div className="flex items-center gap-3 relative">
						{/* Game coin counter */}
						<GameCoins />
						{/* Gem counter */}
						<div className="app-surface flex h-9 items-center gap-1.5 border px-4 rounded-full text-sm font-semibold">
							<IconDiamond size={17} className="app-accent" aria-hidden="true" />
							<span>{userData?.gems ?? 0}</span>
						</div>
						{/* Avatar */}
						<button
							onClick={() => setProfileOpen((o) => !o)}
							className="w-9 h-9 rounded-full overflow-hidden border-2 border-violet-500 flex-shrink-0"
						>
							<img
								src={avatarUrl}
								alt="avatar"
								className="w-full h-full object-cover"
							/>
						</button>
						{/* Profile dropdown */}
						{profileOpen && (
							<div className="app-surface absolute top-12 right-0 border rounded-xl shadow-xl w-44 z-50 animate-fade-in-up overflow-hidden">
								<div className="px-3 py-2 border-b border-[var(--app-border)]">
									<p className="app-text text-sm font-semibold truncate">
										{displayName}
									</p>
									<p className="app-text-muted text-xs truncate">{user.email}</p>
									{userData?.description && (
										<p className="app-text-muted text-xs mt-1 line-clamp-2">
											{userData.description}
										</p>
									)}
								</div>
								<button
									onClick={() => {
										setProfileModalOpen(true);
										setProfileOpen(false);
									}}
									className="app-hover app-text-secondary w-full flex items-center gap-2 text-left px-3 py-2 text-sm transition"
								>
									<IconUserEdit size={17} aria-hidden="true" />
									編輯個人資料
								</button>
								<button
									onClick={() => {
										setView("history");
										setProfileOpen(false);
									}}
									className="app-hover app-text-secondary w-full flex items-center gap-2 text-left px-3 py-2 text-sm transition"
								>
									<IconHistory size={17} aria-hidden="true" />
									歷史記錄
								</button>
								<button
									onClick={() => {
										onLogout();
										setProfileOpen(false);
									}}
									className="app-hover app-text-secondary w-full flex items-center gap-2 text-left px-3 py-2 text-sm transition"
								>
									<IconLogout size={17} aria-hidden="true" />
									登出
								</button>
							</div>
						)}
					</div>
				</AppNav>

				{/* ── BODY ────────────────────────────────────── */}
				{view === "history" ? (
					<HistoryPage
						embedded
						db={db}
						uid={user.uid}
						gems={userData?.gems ?? 0}
						onBack={() => setView("home")}
						onAnswersChanged={loadData}
					/>
				) : view === "mood" ? (
					<MoodPage
						embedded
						uid={user.uid}
						db={db}
						onBack={() => setView("home")}
					/>
				) : (
					<main className="max-w-xl mx-auto px-4 py-6 space-y-5 w-full">
						{/* Greeting */}
						<div>
							<h2 className="text-xl font-bold">嗨，{displayName.split(" ")[0]}</h2>
							<p className="app-text-muted text-sm mt-0.5">
								每天回答一個問題，累積更多寶石
							</p>
						</div>

						{/* Gem card */}
						<div className="app-gem-card rounded-2xl p-5 border flex items-center justify-between">
							<div className="flex items-center gap-4">
								<IconDiamond
									size={44}
									stroke={1.6}
									className="app-accent animate-gem-pulse"
									aria-hidden="true"
								/>
								<div>
									<div className="app-accent text-3xl font-extrabold">
										{userData?.gems ?? 0}
									</div>
									<div className="app-text-muted text-xs">累積寶石</div>
								</div>
							</div>
							<div className="text-center">
								<div className="app-warning text-3xl font-extrabold">
									{userData?.streak ?? 0}
								</div>
								<div className="app-text-muted flex items-center justify-center gap-1 text-xs">
									連續天數{" "}
									<IconFlame
										size={14}
										className="app-warning"
										aria-hidden="true"
									/>
								</div>
							</div>
						</div>

						{/* Today's questions */}
						{allQuestionsAnswered ? (
							<div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex items-center gap-4">
								<IconCircleCheck
									size={34}
									className="app-success"
									aria-hidden="true"
								/>
								<div>
									<p className="app-success font-semibold">今日 {questions.length} 題已完成！</p>
									<p className="app-text-muted text-sm mt-0.5">
										明天再來探索新的問題
									</p>
								</div>
							</div>
						) : (
							<section className="space-y-3">
								<div className="flex items-center justify-between">
									<h3 className="app-text text-sm font-semibold">今日問題</h3>
									<span className="app-text-muted text-xs">已完成 {completedQuestionCount}/{questions.length || 3}</span>
								</div>
								{questions.length === 0 ? (
									<div className="app-surface border rounded-2xl p-5 app-text-muted text-sm">AI 問題載入中…</div>
								) : questions.map((dailyQuestion, index) => {
									const completed = isQuestionAnswered(dailyQuestion)
									return (
										<button
											key={dailyQuestion.id}
											type="button"
											disabled={completed}
											onClick={() => { setActiveQuestionIndex(index); setModalOpen(true) }}
											className={`app-surface w-full text-left border rounded-2xl p-5 transition group relative overflow-hidden ${completed ? 'opacity-70' : 'hover:border-violet-500'}`}
										>
											<div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 via-blue-400 to-emerald-400" />
											<div className="flex items-center justify-between mb-2">
												<span className="app-accent flex items-center gap-1 text-xs font-semibold bg-violet-500/15 px-2.5 py-1 rounded-full">
													{completed ? <IconCircleCheck size={14} aria-hidden="true" /> : <IconSparkles size={14} aria-hidden="true" />}
													問題 {index + 1} · {dailyQuestion.category}
												</span>
												<span className="app-accent text-xs font-semibold">{completed ? '已完成' : '+3 💎'}</span>
											</div>
											<p className="app-text-secondary text-sm leading-relaxed">{dailyQuestion.text}</p>
											{!completed && <div className="app-text-muted flex justify-end items-center gap-1 mt-3 group-hover:text-violet-500 transition text-sm">點擊作答 <IconArrowRight size={16} aria-hidden="true" /></div>}
										</button>
									)
								})}
							</section>
						)}

						{/* Mood check-in shortcut */}
						<button
							type="button"
							onClick={() => setView("mood")}
							className="app-surface group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition hover:border-rose-400"
						>
							<div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-rose-400 via-pink-400 to-orange-400" />
							<div className="flex items-center gap-3">
								<span className="text-3xl" aria-hidden="true">😊</span>
								<div className="min-w-0 flex-1">
									<p className="app-text flex items-center gap-1.5 text-sm font-semibold">
										<IconMoodSmile size={16} className="text-rose-400" aria-hidden="true" />
										情緒打卡
									</p>
									<p className="app-text-muted mt-0.5 text-xs">記錄今天的心情狀態</p>
								</div>
								<IconArrowRight size={18} className="app-text-muted flex-shrink-0 transition group-hover:text-rose-400" aria-hidden="true" />
							</div>
						</button>

						{/* Recent answers */}
						<div>
							<div className="flex items-center justify-between mb-3">
								<h3 className="app-text-muted text-sm font-semibold">最近的回答</h3>
								{answers.length > 0 && (
									<button
										type="button"
										onClick={() => setView("history")}
										className="app-accent flex items-center gap-1 text-xs font-medium hover:underline"
									>
										<IconEdit size={14} aria-hidden="true" />
										管理回答
									</button>
								)}
							</div>
							{answers.length === 0 ? (
								<p className="app-text-muted text-center py-6 text-sm">
									還沒有回答記錄，快去回答今日一問！
								</p>
							) : (
								<div className="space-y-3">
									{answers.slice(0, 3).map((a) => (
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
									<IconWorld
										size={28}
										className="app-text-muted mx-auto mb-2"
										aria-hidden="true"
									/>
									<p className="app-text-muted text-sm">
										目前還沒有其他人的公開回答
									</p>
								</div>
							) : (
								<div className="space-y-3">
									{publicAnswers.map((record) => (
										<PublicAnswerCard key={record.id} record={record} />
									))}
								</div>
							)}
						</section>
					</main>
				)}

				{/* ── MODAL ───────────────────────────────────── */}
				{modalOpen && (
					<DailyModal
						key={questions[activeQuestionIndex]?.id ?? 'loading'}
						question={questions[activeQuestionIndex] ?? null}
						questionIndex={activeQuestionIndex}
						totalQuestions={questions.length}
						geminiApiKey={config.geminiApiKey}
						onSubmit={handleSubmit}
						onClose={() => setModalOpen(false)}
					/>
				)}

				{profileModalOpen && (
					<ProfileModal
						displayName={displayName}
						email={user.email ?? ""}
						description={userData?.description ?? ""}
						onSave={handleSaveProfile}
						onClose={() => setProfileModalOpen(false)}
					/>
				)}

				{/* ── TOAST ───────────────────────────────────── */}
				{toast && (
					<div
						className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-medium shadow-xl
          ${
				toast.type === "success"
					? "bg-emerald-500/15 border border-emerald-500/40 app-success"
					: "app-surface app-text-secondary border"
			} animate-fade-in-up flex items-center gap-2`}
					>
						{toast.type === "success" && (
							<IconCircleCheck size={18} aria-hidden="true" />
						)}
						<span>{toast.msg}</span>
					</div>
				)}

				{/* Close profile menu on outside click */}
				{profileOpen && (
					<div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
				)}
			</div>
			{/* end main content */}
		</div>
  );
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
  const authorName = record.author?.displayName?.trim() || 'DailyGem 使用者'
  const authorPhoto = record.author?.photoURL ||
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

function GameCoins() {
  const [coins, setCoins] = useState<number>(() =>
    parseInt(localStorage.getItem('game_coins') ?? '0', 10)
  )

  // 每次分頁切回來時重新讀取（遊戲分頁關閉後同步最新值）
  useEffect(() => {
    const sync = () => setCoins(parseInt(localStorage.getItem('game_coins') ?? '0', 10))
    window.addEventListener('focus', sync)
    return () => window.removeEventListener('focus', sync)
  }, [])

  return (
    <div
      className="app-surface flex h-9 items-center gap-1.5 border px-4 rounded-full text-sm font-semibold"
      aria-label={`遊戲金幣 ${coins}`}
    >
      <span aria-hidden="true">🪙</span>
      <span className="text-sm font-bold" style={{ color: '#e65100' }}>{coins}</span>
    </div>
  )
}
