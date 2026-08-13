import { useEffect, useMemo, useRef, useState } from 'react'
import {
	IconCards,
	IconCheck,
	IconCoin,
	IconPlayerPlay,
	IconRefresh,
	IconSparkles,
	IconTrophy,
} from "@tabler/icons-react";

type Difficulty = {
  id: 'easy' | 'medium' | 'hard'
  label: string
  cols: number
  rows: number
  time: number
  description: string
}

type Card = { id: number; icon: string; matched: boolean; flipped: boolean }

const FLOWERS = ['🌸', '🌼', '🌺', '🌻', '💮', '🏵️', '🌷', '🌹', '🌿', '🍀', '🌱', '🪴']
const DIFFICULTIES: Difficulty[] = [
  { id: 'easy', label: '簡單', cols: 3, rows: 2, time: 45, description: '3 對花朵，輕鬆暖身' },
  { id: 'medium', label: '中等', cols: 4, rows: 3, time: 45, description: '6 對花朵，剛剛好的挑戰' },
  { id: 'hard', label: '困難', cols: 6, rows: 4, time: 45, description: '12 對花朵，考驗記憶力' },
]

function makeBoard(difficulty: Difficulty): Card[] {
  const pairs = Array.from({ length: (difficulty.cols * difficulty.rows) / 2 }, (_, index) => FLOWERS[index % FLOWERS.length])
  const icons = [...pairs, ...pairs].sort(() => Math.random() - 0.5)
  return icons.map((icon, id) => ({ id, icon, matched: false, flipped: false }))
}

function rewardFor(score: number, completed: boolean) {
  const base = Math.max(completed ? 10 : 0, Math.floor(score * 0.1))
  return base
}

interface Props {
  onAwardCoins: (amount: number) => Promise<number>
}

export default function FlipGamePage({ onAwardCoins }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTIES[0])
  const [phase, setPhase] = useState<'choose' | 'playing' | 'result'>('choose')
  const [cards, setCards] = useState<Card[]>([])
  const [firstCard, setFirstCard] = useState<number | null>(null)
  const [locked, setLocked] = useState(false)
  const [score, setScore] = useState(0)
  const [flips, setFlips] = useState(0)
  const [seconds, setSeconds] = useState(45)
  const [won, setWon] = useState(false)
  const [reward, setReward] = useState(0)
  const rewardedRef = useRef(false)
  const timeoutRef = useRef<number | null>(null)

  const matchedPairs = useMemo(() => cards.filter(card => card.matched).length / 2, [cards])
  const totalPairs = (difficulty.cols * difficulty.rows) / 2

  const clearPendingFlip = () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = null
  }

  const finishGame = (completed: boolean, finalScore: number) => {
    clearPendingFlip()
    setWon(completed)
    const earned = rewardFor(finalScore, completed)
    setReward(earned)
    if (!rewardedRef.current && earned > 0) {
      rewardedRef.current = true
      void onAwardCoins(earned).catch(() => {
        rewardedRef.current = false
      })
    }
    setPhase('result')
  }

  useEffect(() => () => clearPendingFlip(), [])

  useEffect(() => {
    if (phase !== 'playing') return
    if (seconds === 0) {
      finishGame(false, score)
      return
    }
    const timer = window.setTimeout(() => setSeconds(value => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [phase, seconds])

  const startGame = (nextDifficulty = difficulty) => {
    clearPendingFlip()
    setDifficulty(nextDifficulty)
    setCards(makeBoard(nextDifficulty))
    setFirstCard(null)
    setLocked(false)
    setScore(0)
    setFlips(0)
    setSeconds(nextDifficulty.time)
    setWon(false)
    setReward(0)
    rewardedRef.current = false
    setPhase('playing')
  }

  const flipCard = (id: number) => {
    if (locked || phase !== 'playing') return
    const selected = cards.find(card => card.id === id)
    if (!selected || selected.flipped || selected.matched) return

    const nextCards = cards.map(card => card.id === id ? { ...card, flipped: true } : card)
    setCards(nextCards)
    if (firstCard === null) {
      setFirstCard(id)
      return
    }

    setFlips(value => value + 1)
    const previous = nextCards.find(card => card.id === firstCard)
    if (!previous) return
    if (previous.icon === selected.icon) {
      const matched = nextCards.map(card => card.id === id || card.id === firstCard ? { ...card, matched: true } : card)
      const nextScore = score + 30
      setCards(matched)
      setScore(nextScore)
      setFirstCard(null)
      if (matched.every(card => card.matched)) {
        window.setTimeout(() => finishGame(true, nextScore + 100), 350)
        setScore(nextScore + 100)
      }
      return
    }

    setLocked(true)
    timeoutRef.current = window.setTimeout(() => {
      setCards(current => current.map(card => card.id === id || card.id === firstCard ? { ...card, flipped: false } : card))
      setFirstCard(null)
      setLocked(false)
      timeoutRef.current = null
    }, 650)
  }

  return (
		<main className="max-w-xl mx-auto px-4 py-6 space-y-5 w-full animate-fade-in-up">
			<section className="overflow-hidden rounded-2xl border border-violet-400/25 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-5 text-white shadow-xl">
				<div className="flex items-start justify-between gap-4">
					<div>
						<span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-violet-200">
							<IconSparkles size={14} aria-hidden="true" />
							每日紓壓挑戰
						</span>
						<h2 className="mt-3 text-xl font-bold">星際花園翻翻看</h2>
						<p className="mt-1 text-sm text-violet-200">
							翻開卡牌，配對花朵，為自己贏得金幣。
						</p>
					</div>
				</div>
			</section>

			{phase === "choose" && (
				<section className="app-surface border rounded-2xl p-5 space-y-4">
					<div>
						<p className="app-text text-base font-semibold">選擇今天的難度</p>
						<p className="app-text-muted text-sm mt-1">
							完成配對可獲得金幣；越快完成，得分越高。
						</p>
					</div>
					<div className="grid gap-3 sm:grid-cols-3">
						{DIFFICULTIES.map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() => setDifficulty(item)}
								aria-pressed={difficulty.id === item.id}
								className={`flex flex-col rounded-xl border p-4 text-left transition ${difficulty.id === item.id ? "border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/20" : "border-[var(--app-border)] app-hover"}`}
							>
								<span className="app-text block font-semibold">{item.label}</span>
								<span className="app-accent mt-1 block text-xs font-medium">
									{item.cols} × {item.rows}
								</span>
								<span className="app-text-muted mt-2 block text-xs leading-relaxed">
									{item.description}
								</span>
							</button>
						))}
					</div>
					<button
						type="button"
						onClick={() => startGame()}
						className="btn-grad inline-flex items-center justify-center gap-2"
					>
						<IconPlayerPlay size={18} aria-hidden="true" />
						開始遊戲
					</button>
				</section>
			)}

			{phase === "playing" && (
				<section className="app-surface border rounded-2xl p-4 sm:p-5 space-y-4">
					<div className="app-surface-muted grid grid-cols-3 divide-x divide-[var(--app-border)] rounded-xl border border-[var(--app-border)] text-center">
						<div className="py-2">
							<p className="app-text text-base font-bold">{score}</p>
							<p className="app-text-muted text-xs">得分</p>
						</div>
						<div className="py-2">
							<p
								className={`text-base font-bold ${seconds <= 10 ? "text-rose-500" : "app-accent"}`}
							>
								{seconds}s
							</p>
							<p className="app-text-muted text-xs">剩餘時間</p>
						</div>
						<div className="py-2">
							<p className="app-text text-base font-bold">
								{matchedPairs}/{totalPairs}
							</p>
							<p className="app-text-muted text-xs">已配對</p>
						</div>
					</div>
					<div
						className="mx-auto grid max-w-md gap-2"
						style={{
							gridTemplateColumns: `repeat(${difficulty.cols}, minmax(0, 1fr))`,
						}}
						aria-label="翻牌遊戲盤"
					>
						{cards.map((card) => (
							<button
								key={card.id}
								type="button"
								onClick={() => flipCard(card.id)}
								aria-label={
									card.flipped || card.matched ? card.icon : "未翻開的卡牌"
								}
								className={`flip-game-card aspect-square rounded-xl ${card.flipped || card.matched ? "is-flipped" : ""} ${card.matched ? "is-matched" : ""}`}
							>
								<span className="flip-game-card__inner">
									<span
										className="flip-game-card__face flip-game-card__back"
										aria-hidden="true"
									>
										✦
									</span>
									<span
										className="flip-game-card__face flip-game-card__front"
										aria-hidden="true"
									>
										{card.icon}
									</span>
								</span>
							</button>
						))}
					</div>
					<p className="app-text-muted text-center text-xs">翻牌 {flips} 次</p>
				</section>
			)}

			{phase === "result" && (
				<section className="app-surface border rounded-2xl p-6 text-center animate-fade-in-up">
					<div className="app-warning flex justify-center mb-3">
						<IconTrophy size={46} aria-hidden="true" />
					</div>
					<h3 className="app-text text-xl font-bold">
						{won ? "花園已全部盛開！" : "這回合結束了"}
					</h3>
					<p className="app-text-muted text-sm mt-2">
						{won
							? "你的記憶力為花園帶來了光彩。"
							: "再試一次，看看能不能完成所有配對。"}
					</p>
					<div className="app-surface-muted mt-5 rounded-xl border border-[var(--app-border)] py-4">
						<p className="app-text text-2xl font-extrabold">{score} 分</p>
						<p className="app-warning mt-1 inline-flex items-center gap-1 text-sm font-semibold">
							<IconCoin size={17} />
							獲得 {reward} 金幣
						</p>
					</div>
					<div className="mt-5 flex gap-3">
						<button
							type="button"
							onClick={() => startGame()}
							className="btn-grad flex-1 inline-flex items-center justify-center gap-1"
						>
							<IconRefresh size={17} />
							再玩一次
						</button>
						<button
							type="button"
							onClick={() => setPhase("choose")}
							className="app-surface-muted app-text-secondary flex-1 rounded-xl border border-[var(--app-border)] py-2.5 font-semibold text-sm app-hover"
						>
							選擇難度
						</button>
					</div>
				</section>
			)}

			<p className="app-text-muted text-center text-xs">
				配對成功 +30 分；完成全部配對額外 +100 分。
			</p>
		</main>
  );
}
