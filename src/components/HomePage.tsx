// src/components/HomePage.tsx
import { useState, useEffect, useCallback } from 'react'
import { User } from 'firebase/auth'
import { Firestore } from 'firebase/firestore'
import {
  IconArrowRight,
  IconCircleCheck,
  IconDiamond,
  IconFlame,
  IconLogout,
  IconSparkles,
  IconBubble,
  IconStars,
  IconCards,
  IconCoin,
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
import DailyQuestionPage from './DailyQuestionPage'
import AppNav from './AppNav'
import MoodPage from './MoodPage'
import ProfileModal from './ProfileModal'

interface Props {
  user:   User
  db:     Firestore
  config: AppConfig
  onSaveProfile: (displayName: string, description: string) => Promise<void>
  onLogout: () => void
}

type View = 'home' | 'mood' | 'questions'
type QuestionTab = 'checkin' | 'history' | 'community'

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
    view: 'questions' as View,
    icon: <IconSparkles size={20} aria-hidden="true" />,
    label: '每日問答',
    color: 'text-violet-400',
  },
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
  const [questionTab, setQuestionTab] = useState<QuestionTab>('checkin')
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

  // Guide users to the standalone check-in page when today's questions are ready.
  useEffect(() => {
    if (userData && questions.length > 0 && completedQuestionCount === 0) {
      const timer = setTimeout(() => {
        setActiveQuestionIndex(0)
        setQuestionTab('checkin')
        setView('questions')
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [userData, questions, completedQuestionCount])

  const showToast = (msg: string, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handlePageSubmit = async (questionIndex: number, answer: string, gems: number, isPublic: boolean) => {
    setActiveQuestionIndex(questionIndex)
    const question = questions[questionIndex]
    if (!userData || !question || isQuestionAnswered(question)) return ''
    await saveAnswer(db, { uid: user.uid, date: today, questionId: question.id, question: question.text, category: question.category, answer, gems, isPublic })
    const { newGems, newStreak } = await rewardUser(db, user.uid, gems, today, yesterdayKey(), userData)
    let feedback = '謝謝你的真誠分享！繼續保持這份反思的習慣。'
    if (config.geminiApiKey) feedback = await fetchAIFeedback(question.text, answer, config.geminiApiKey)
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
							aria-current={view === t.view ? "page" : undefined}
							className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
								view === t.view
									? "bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-sm"
									: "app-hover app-text-secondary"
							}`}
							onClick={() => {
								if (t.view === "questions") setQuestionTab("checkin");
								setView(t.view);
								setSidebarOpen(false);
							}}
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
					title={
						view === "questions" ? "每日問答" : view === "mood" ? "情緒打卡" : undefined
					}
					titleIcon={
						view === "questions" ? (
							<IconSparkles size={18} className="app-accent" aria-hidden="true" />
						) : view === "mood" ? (
							<IconMoodSmile size={18} className="text-rose-400" aria-hidden="true" />
						) : undefined
					}
				>
					<div className="flex items-center gap-3 relative">
						{/* Game coin counter */}
						<GameCoins />
						{/* Gem counter */}
						<div className="group relative">
							<div
								className="app-surface flex h-9 items-center gap-1.5 border px-4 rounded-full text-sm font-semibold"
								tabIndex={0}
								aria-describedby="gem-tooltip"
							>
								<IconDiamond size={17} className="app-accent" aria-hidden="true" />
								<span>{userData?.gems ?? 0}</span>
							</div>
							<span
								id="gem-tooltip"
								role="tooltip"
								className="pointer-events-none absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
							>
								累積寶石
							</span>
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
				{view === "mood" ? (
					<MoodPage embedded uid={user.uid} db={db} onBack={() => setView("home")} />
				) : view === "questions" ? (
					<DailyQuestionPage
						questions={questions}
						initialQuestionIndex={activeQuestionIndex}
						publicAnswers={publicAnswers}
						initialTab={questionTab}
						db={db}
						uid={user.uid}
						gems={userData?.gems ?? 0}
						onAnswersChanged={loadData}
						answered={isQuestionAnswered}
						onSubmit={handlePageSubmit}
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

						{/* Daily question shortcut */}
						<button
							type="button"
							onClick={() => {
								setQuestionTab("checkin");
								setActiveQuestionIndex(
									questions.findIndex(
										(question) => !isQuestionAnswered(question),
									),
								);
								setView("questions");
							}}
							className="app-surface group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition hover:border-violet-400"
						>
							<div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-violet-500 via-blue-400 to-emerald-400" />
							<div className="flex items-center gap-3">
								<span
									className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400"
									aria-hidden="true"
								>
									<IconSparkles size={25} />
								</span>
								<div className="min-w-0 flex-1">
									<p className="app-text flex items-center gap-1.5 text-sm font-semibold">
										每日問答
									</p>
									<p className="app-text-muted mt-0.5 text-xs">
										{questions.length === 0
											? "AI 正在準備今日問題…"
											: `今天已完成 ${completedQuestionCount}/${questions.length} 題`}
									</p>
								</div>
								<IconArrowRight
									size={18}
									className="app-text-muted flex-shrink-0 transition group-hover:text-violet-400"
									aria-hidden="true"
								/>
							</div>
						</button>

						{/* Mood check-in shortcut */}
						<button
							type="button"
							onClick={() => setView("mood")}
							className="app-surface group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition hover:border-rose-400"
						>
							<div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-rose-400 via-pink-400 to-orange-400" />
							<div className="flex items-center gap-3">
								<span
									className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400"
									aria-hidden="true"
								>
									<IconMoodSmile size={25} />
								</span>
								<div className="min-w-0 flex-1">
									<p className="app-text flex items-center gap-1.5 text-sm font-semibold">
										情緒打卡
									</p>
									<p className="app-text-muted mt-0.5 text-xs">
										記錄今天的心情狀態
									</p>
								</div>
								<IconArrowRight
									size={18}
									className="app-text-muted flex-shrink-0 transition group-hover:text-rose-400"
									aria-hidden="true"
								/>
							</div>
						</button>
					</main>
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
    <div className="group relative">
      <div className="app-surface flex h-9 items-center gap-1.5 border px-4 rounded-full text-sm font-semibold" tabIndex={0} aria-label={`遊戲金幣 ${coins}`} aria-describedby="coin-tooltip">
        <IconCoin size={18} stroke={1.8} color="#f59e0b" aria-hidden="true" />
        <span className="text-sm font-bold" style={{ color: '#e65100' }}>{coins}</span>
      </div>
      <span id="coin-tooltip" role="tooltip" className="pointer-events-none absolute left-0 top-full z-50 mt-2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">遊戲金幣</span>
    </div>
  )
}
