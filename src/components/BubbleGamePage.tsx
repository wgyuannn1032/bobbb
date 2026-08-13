import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IconBubble,
  IconClock,
  IconCloud,
  IconCoin,
  IconPlayerPlay,
  IconRefresh,
  IconSparkles,
  IconTrophy,
} from '@tabler/icons-react'

const CANVAS_W = 480
const CANVAS_H = 560
const GAME_DURATION = 45
const BUBBLE_PHASE_MS = 1200
const COLORS = ['#ffb7c5', '#b5ead7', '#c7ceea', '#ffd6a5', '#e2f0cb', '#f8e1f4']

type DifficultyId = 'easy' | 'hard'
type Difficulty = { id: DifficultyId; label: string; description: string; maxBubbles: number; spawnMin: number; spawnRange: number; cloudChance: number }
type Bubble = {
  id: number
  x: number
  y: number
  baseRadius: number
  radius: number
  color: string
  type: 'bubble' | 'cloud'
  phase: 'growing' | 'shrinking'
  phaseStartedAt: number
  lastTick: number
}
type Particle = { x: number; y: number; vx: number; vy: number; radius: number; color: string; life: number }
type FloatText = { id: number; text: string; x: number; y: number; negative?: boolean }

const DIFFICULTIES: Difficulty[] = [
  { id: 'easy', label: '簡單', description: '泡泡悠閒飄，適合放鬆一下', maxBubbles: 7, spawnMin: 900, spawnRange: 600, cloudChance: .15 },
  { id: 'hard', label: '困難', description: '泡泡狂湧現，挑戰你的反應力', maxBubbles: 14, spawnMin: 400, spawnRange: 300, cloudChance: .2 },
]

function rewardFor(score: number, checkedIn: boolean) {
  const base = Math.max(10, Math.floor(score * .1))
  return checkedIn ? Math.round(base * 1.2) : base
}

function resultMessage(score: number) {
  if (score >= 500) return '哇！你今天超厲害！繼續保持這份好心情。'
  if (score >= 200) return '太棒了！今天也辛苦囉，給自己一個大大的讚。'
  if (score >= 100) return '做得不錯喔！慢慢來，放鬆就是目的。'
  return '不管分數，今天願意玩一下就是很棒的事。'
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.beginPath()
  ctx.arc(x, y, radius * .55, 0, Math.PI * 2)
  ctx.arc(x + radius * .6, y + radius * .2, radius * .4, 0, Math.PI * 2)
  ctx.arc(x - radius * .5, y + radius * .2, radius * .35, 0, Math.PI * 2)
  ctx.arc(x, y + radius * .5, radius * .45, 0, Math.PI * 2)
  ctx.arc(x + radius * .55, y + radius * .5, radius * .38, 0, Math.PI * 2)
  ctx.fill()
}

interface Props {
  onAwardCoins: (amount: number) => Promise<number>
  coinBonus?: number      // 每場加值（+n 金幣）
  coinMultiplier?: number // 每場加成（倍率）
}

export default function BubbleGamePage({ onAwardCoins, coinBonus = 0, coinMultiplier = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const spawnRef = useRef<number | null>(null)
  const bubblesRef = useRef<Bubble[]>([])
  const particlesRef = useRef<Particle[]>([])
  const startedAtRef = useRef(0)
  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const bubbleIdRef = useRef(0)
  const textIdRef = useRef(0)
  const freezeUntilRef = useRef(0)
  const finishedRef = useRef(false)
  const awardedRef = useRef(0)

  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTIES[0])
  const [phase, setPhase] = useState<'choose' | 'playing' | 'result'>('choose')
  const [score, setScore] = useState(0)
  const [seconds, setSeconds] = useState(GAME_DURATION)
  const [bubbleCount, setBubbleCount] = useState(0)
  const [freezeSeconds, setFreezeSeconds] = useState(0)
  const [floatTexts, setFloatTexts] = useState<FloatText[]>([])
  const [reward, setReward] = useState(0)
  const [checkedIn, setCheckedIn] = useState(false)

  const stopGame = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    if (spawnRef.current !== null) window.clearTimeout(spawnRef.current)
    frameRef.current = null
    spawnRef.current = null
  }, [])

  const addFloatText = useCallback((text: string, x: number, y: number, negative = false) => {
    const id = ++textIdRef.current
    setFloatTexts(current => [...current, { id, text, x, y, negative }])
    window.setTimeout(() => setFloatTexts(current => current.filter(item => item.id !== id)), 800)
  }, [])

  const spawnParticles = (x: number, y: number, color: string, count = 12) => {
    for (let index = 0; index < count; index++) {
      const angle = (Math.PI * 2 * index) / count + Math.random() * .4
      const speed = 2 + Math.random() * 3
      particlesRef.current.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        radius: 4 + Math.random() * 4, color, life: 1,
      })
    }
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const background = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H)
    background.addColorStop(0, '#fce4ec')
    background.addColorStop(1, '#e8eaf6')
    ctx.fillStyle = background
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    for (const bubble of bubblesRef.current) {
      const { x, y, radius } = bubble
      if (bubble.type === 'cloud') {
        ctx.fillStyle = '#b8c4cc'
        drawCloud(ctx, x, y, radius)
        continue
      }
      const fill = ctx.createRadialGradient(x - radius * .3, y - radius * .35, radius * .08, x, y, radius)
      fill.addColorStop(0, '#ffffffcc')
      fill.addColorStop(.28, `${bubble.color}dd`)
      fill.addColorStop(1, `${bubble.color}8a`)
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = fill
      ctx.fill()
      ctx.strokeStyle = '#ffffffcc'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x - radius * .3, y - radius * .3, radius * .18, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff77'
      ctx.fill()
    }

    for (const particle of particlesRef.current) {
      ctx.save()
      ctx.globalAlpha = Math.max(0, particle.life)
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.radius * particle.life, 0, Math.PI * 2)
      ctx.fillStyle = particle.color
      ctx.fill()
      ctx.restore()
    }

    if (Date.now() < freezeUntilRef.current) {
      ctx.fillStyle = 'rgba(180, 220, 255, .22)'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    }
  }, [])

  const finishGame = useCallback((finalScore: number) => {
    if (finishedRef.current) return
    finishedRef.current = true
    stopGame()
    const base   = rewardFor(finalScore, false)
    const earned = Math.round(base * coinMultiplier) + coinBonus
    awardedRef.current = earned
    setReward(earned)
    void onAwardCoins(earned).catch(() => undefined)
    setFreezeSeconds(0)
    setPhase('result')
  }, [onAwardCoins, stopGame, coinBonus, coinMultiplier])

  const startGame = useCallback((nextDifficulty = difficulty) => {
    stopGame()
    bubblesRef.current = []
    particlesRef.current = []
    scoreRef.current = 0
    comboRef.current = 0
    freezeUntilRef.current = 0
    finishedRef.current = false
    awardedRef.current = 0
    setDifficulty(nextDifficulty)
    setScore(0)
    setSeconds(GAME_DURATION)
    setBubbleCount(0)
    setFreezeSeconds(0)
    setFloatTexts([])
    setReward(0)
    setCheckedIn(false)
    setPhase('playing')
    startedAtRef.current = performance.now()

    const createBubble = (): Bubble => {
      const baseRadius = 22 + Math.random() * 22
      const margin = baseRadius * 2 + 8
      const now = Date.now()
      return {
        id: ++bubbleIdRef.current,
        x: margin + Math.random() * (CANVAS_W - margin * 2),
        y: margin + Math.random() * (CANVAS_H - margin * 2),
        baseRadius,
        radius: baseRadius,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        type: Math.random() < nextDifficulty.cloudChance ? 'cloud' : 'bubble',
        phase: 'growing',
        phaseStartedAt: now,
        lastTick: now,
      }
    }

    const scheduleSpawn = () => {
      const delay = nextDifficulty.spawnMin + Math.random() * nextDifficulty.spawnRange
      spawnRef.current = window.setTimeout(() => {
        if (!finishedRef.current && bubblesRef.current.length < nextDifficulty.maxBubbles) {
          bubblesRef.current.push(createBubble())
          setBubbleCount(bubblesRef.current.length)
        }
        if (!finishedRef.current) scheduleSpawn()
      }, delay)
    }
    scheduleSpawn()

    const loop = (now: number) => {
      if (finishedRef.current) return
      const elapsed = (now - startedAtRef.current) / 1000
      const remaining = Math.max(0, Math.ceil(GAME_DURATION - elapsed))
      setSeconds(current => current === remaining ? current : remaining)
      if (elapsed >= GAME_DURATION) {
        finishGame(scoreRef.current)
        return
      }

      const frozen = Date.now() < freezeUntilRef.current
      setFreezeSeconds(frozen ? Math.ceil((freezeUntilRef.current - Date.now()) / 1000) : 0)
      const currentTime = Date.now()
      const nextBubbles: Bubble[] = []
      for (const bubble of bubblesRef.current) {
        const tickDelta = currentTime - bubble.lastTick
        bubble.lastTick = currentTime
        if (frozen) {
          bubble.phaseStartedAt += tickDelta
          nextBubbles.push(bubble)
          continue
        }
        const phaseElapsed = currentTime - bubble.phaseStartedAt
        const progress = Math.min(phaseElapsed / BUBBLE_PHASE_MS, 1)
        if (bubble.phase === 'growing') {
          bubble.radius = bubble.baseRadius * (1 + .8 * progress)
          if (progress === 1) {
            bubble.phase = 'shrinking'
            bubble.phaseStartedAt = currentTime
          }
          nextBubbles.push(bubble)
        } else if (progress === 1) {
          if (bubble.type === 'bubble') {
            const nextScore = Math.max(0, scoreRef.current - 5)
            scoreRef.current = nextScore
            comboRef.current = 0
            setScore(nextScore)
            spawnParticles(bubble.x, bubble.y, bubble.color, 10)
            addFloatText('−5 💥', bubble.x, bubble.y - 20, true)
          }
        } else {
          bubble.radius = bubble.baseRadius * (1.8 - .8 * progress)
          nextBubbles.push(bubble)
        }
      }
      bubblesRef.current = nextBubbles
      setBubbleCount(nextBubbles.length)

      particlesRef.current = particlesRef.current
        .map(particle => ({ ...particle, x: particle.x + particle.vx, y: particle.y + particle.vy, vy: particle.vy + .12, vx: particle.vx * .94, life: particle.life - .022 }))
        .filter(particle => particle.life > 0)
      draw()
      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
  }, [addFloatText, difficulty, draw, finishGame, stopGame])

  useEffect(() => () => stopGame(), [stopGame])

  const popAt = (clientX: number, clientY: number) => {
    if (phase !== 'playing' || Date.now() < freezeUntilRef.current) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (clientX - rect.left) * (CANVAS_W / rect.width)
    const y = (clientY - rect.top) * (CANVAS_H / rect.height)
    for (let index = bubblesRef.current.length - 1; index >= 0; index--) {
      const bubble = bubblesRef.current[index]
      if ((x - bubble.x) ** 2 + (y - bubble.y) ** 2 > bubble.radius ** 2) continue
      bubblesRef.current.splice(index, 1)
      setBubbleCount(bubblesRef.current.length)
      if (bubble.type === 'cloud') {
        freezeUntilRef.current = Date.now() + 2000
        spawnParticles(bubble.x, bubble.y, '#9aa8b2')
        addFloatText('❄️ 凍結 2 秒', bubble.x, bubble.y - 20, true)
      } else {
        comboRef.current += 1
        const points = 10 + Math.min(5, Math.max(0, comboRef.current - 2)) * 2
        const nextScore = scoreRef.current + points
        scoreRef.current = nextScore
        setScore(nextScore)
        spawnParticles(bubble.x, bubble.y, bubble.color)
        addFloatText(comboRef.current >= 3 ? `+${points} ${comboRef.current}x Combo!` : `+${points}`, bubble.x, bubble.y - 20)
      }
      return
    }
  }

  const toggleCheckIn = (enabled: boolean) => {
    const base = rewardFor(score, enabled)
    const nextReward = Math.round(base * coinMultiplier) + coinBonus
    const delta = nextReward - awardedRef.current
    awardedRef.current = nextReward
    setCheckedIn(enabled)
    setReward(nextReward)
    if (delta !== 0) void onAwardCoins(delta).catch(() => undefined)
  }

  return (
    <main className="mx-auto w-full max-w-xl space-y-5 px-4 py-6 animate-fade-in-up">
      <section className="overflow-hidden rounded-2xl border border-violet-400/25 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-5 text-white shadow-xl">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-violet-200">
          <IconSparkles size={14} aria-hidden="true" /> 每日紓壓挑戰
        </span>
        <h2 className="mt-3 text-xl font-bold">泡泡啵啵樂</h2>
        <p className="mt-1 text-sm text-violet-200">輕點夢幻馬卡龍氣泡，享受捏啵啵紙的治癒感。</p>
      </section>

      {phase === 'choose' && (
        <section className="app-surface rounded-2xl border p-5">
          <p className="app-text text-base font-semibold">選擇今天的難度</p>
          <p className="app-text-muted mt-1 text-sm">限時 45 秒，連續戳破泡泡可累積 Combo 加成。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {DIFFICULTIES.map(item => (
              <button key={item.id} type="button" onClick={() => setDifficulty(item)} aria-pressed={difficulty.id === item.id}
                className={`rounded-xl border p-4 text-left transition ${difficulty.id === item.id ? 'border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/20' : 'border-[var(--app-border)] app-hover'}`}>
                <span className="app-text font-semibold">{item.label}</span>
                <span className="app-text-muted mt-1 block text-xs">{item.description}</span>
              </button>
            ))}
          </div>
          <div className="app-surface-muted app-text-secondary mt-4 space-y-2 rounded-xl border border-[var(--app-border)] p-4 text-sm">
            <p className="flex items-center gap-2"><IconBubble className="app-accent" size={16} />戳破泡泡 +10 分起，連擊 3 顆後加成。</p>
            <p className="flex items-center gap-2"><IconCloud className="app-accent" size={16} />點到烏雲會凍結 2 秒，倒數照常進行。</p>
            <p className="flex items-center gap-2"><IconClock className="app-accent" size={16} />泡泡自己破掉會 −5 分，完成後獲得金幣。</p>
          </div>
          <button type="button" onClick={() => startGame()} className="btn-grad mt-5 inline-flex items-center justify-center gap-2"><IconPlayerPlay size={18} />開始遊戲</button>
        </section>
      )}

      {phase === 'playing' && (
        <section className="app-surface rounded-2xl border p-3 sm:p-5">
          <div className="app-surface-muted mb-3 grid grid-cols-3 divide-x divide-[var(--app-border)] rounded-xl border border-[var(--app-border)] text-center">
            <div className="py-2"><p className="app-text text-lg font-bold">{score}</p><p className="app-text-muted text-xs">得分</p></div>
            <div className="py-2"><p className={`text-lg font-bold ${seconds <= 10 ? 'text-rose-500' : 'app-accent'}`}>{seconds}s</p><p className="app-text-muted text-xs">剩餘時間</p></div>
            <div className="py-2"><p className="app-text text-lg font-bold">{bubbleCount}</p><p className="app-text-muted text-xs">場上泡泡</p></div>
          </div>
          <div className="relative mx-auto max-w-[480px] overflow-hidden rounded-2xl shadow-xl">
            <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="block h-auto w-full touch-manipulation" aria-label="泡泡啵啵樂遊戲區" onPointerDown={event => popAt(event.clientX, event.clientY)} />
            {freezeSeconds > 0 && <div className="absolute inset-0 flex flex-col items-center justify-center bg-sky-200/45 text-xl font-extrabold text-sky-700 backdrop-blur-[1px]">❄️ 凍結中！<span className="mt-1 text-sm">{freezeSeconds} 秒後解凍</span></div>}
            {floatTexts.map(item => <span key={item.id} className={`pointer-events-none absolute font-extrabold animate-fade-in-up ${item.negative ? 'text-rose-500' : 'text-violet-600'}`} style={{ left: `${item.x / CANVAS_W * 100}%`, top: `${item.y / CANVAS_H * 100}%` }}>{item.text}</span>)}
          </div>
          <p className="app-text-muted mt-3 text-center text-xs">輕點彩色泡泡；灰色烏雲會讓畫面暫時凍結。</p>
        </section>
      )}

      {phase === 'result' && (
        <section className="app-surface rounded-2xl border p-6 text-center animate-fade-in-up">
          <IconTrophy size={46} className="app-warning mx-auto" aria-hidden="true" />
          <h3 className="app-text mt-3 text-xl font-bold">今天的啵啵時光完成！</h3>
          <p className="app-text-muted mt-2 text-sm">{resultMessage(score)}</p>
          <div className="app-surface-muted mt-5 rounded-xl border border-[var(--app-border)] py-4"><p className="app-text text-3xl font-extrabold">{score} 分</p><p className="app-warning mt-1 inline-flex items-center gap-1 text-sm font-semibold"><IconCoin size={17} />獲得 {reward} 金幣</p></div>
          <label className="app-text-secondary mt-4 inline-flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={checkedIn} onChange={event => toggleCheckIn(event.target.checked)} className="h-4 w-4 accent-violet-600" />今日已完成情緒打卡（1.2× 金幣加成）</label>
          <div className="mt-5 flex gap-3"><button type="button" onClick={() => startGame()} className="btn-grad inline-flex flex-1 items-center justify-center gap-2"><IconRefresh size={17} />再玩一次</button><button type="button" onClick={() => setPhase('choose')} className="app-surface-muted app-text-secondary flex-1 rounded-xl border border-[var(--app-border)] py-2.5 text-sm font-semibold app-hover">選擇難度</button></div>
        </section>
      )}
    </main>
  )
}
