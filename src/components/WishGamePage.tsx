import { useCallback, useEffect, useRef, useState } from 'react'
import { IconCoin, IconPlayerPlay, IconRefresh, IconSparkles, IconStar } from '@tabler/icons-react'

const CANVAS_W = 480
const CANVAS_H = 560
const GAME_DURATION = 45
const PET_Y = CANVAS_H - 60
const PET_W = 64
const PET_H = 48

type FallingObject = {
  id: number
  x: number
  y: number
  w: number
  h: number
  type: 'meteor' | 'obstacle'
  speed: number
  cloudRadius: number
  pauseSeconds: number
}

type FloatText = { id: number; text: string; x: number; y: number }

const CLOUD_SIZES = [
  { radius: 18, pauseSeconds: 1, label: '小雲' },
  { radius: 28, pauseSeconds: 2, label: '中雲' },
  { radius: 40, pauseSeconds: 3.5, label: '大雲' },
]

function readCoins() {
  const value = Number.parseInt(localStorage.getItem('game_coins') ?? '0', 10)
  return Number.isFinite(value) && value > 0 ? value : 0
}

function writeCoins(value: number) {
  const coins = Math.max(0, Math.floor(value))
  localStorage.setItem('game_coins', String(coins))
  window.dispatchEvent(new Event('game-coins-updated'))
  return coins
}

function rewardFor(score: number, checkedIn: boolean) {
  const base = Math.max(10, Math.floor(score * 0.1))
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

export default function WishGamePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const spawnRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)
  const lastFrameRef = useRef(0)
  const objectIdRef = useRef(0)
  const floatIdRef = useRef(0)
  const objectsRef = useRef<FallingObject[]>([])
  const petXRef = useRef(CANVAS_W / 2)
  const scoreRef = useRef(0)
  const pausedUntilRef = useRef(0)
  const pauseVisibleRef = useRef(false)
  const keysRef = useRef(new Set<string>())
  const finishedRef = useRef(false)
  const awardedRef = useRef(0)

  const [phase, setPhase] = useState<'intro' | 'playing' | 'result'>('intro')
  const [score, setScore] = useState(0)
  const [seconds, setSeconds] = useState(GAME_DURATION)
  const [pauseLabel, setPauseLabel] = useState('')
  const [floatTexts, setFloatTexts] = useState<FloatText[]>([])
  const [coins, setCoins] = useState(readCoins)
  const [reward, setReward] = useState(0)
  const [checkedIn, setCheckedIn] = useState(false)

  const stopGame = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    if (spawnRef.current !== null) window.clearInterval(spawnRef.current)
    frameRef.current = null
    spawnRef.current = null
  }, [])

  const addFloatText = useCallback((text: string, x: number, y: number) => {
    const id = ++floatIdRef.current
    setFloatTexts(current => [...current, { id, text, x, y }])
    window.setTimeout(() => setFloatTexts(current => current.filter(item => item.id !== id)), 800)
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const background = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
    background.addColorStop(0, '#17173c')
    background.addColorStop(1, '#3d2164')
    ctx.fillStyle = background
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    ctx.fillStyle = '#ffffff88'
    for (let index = 0; index < 48; index++) {
      ctx.beginPath()
      ctx.arc((index * 127) % CANVAS_W, (index * 83) % (CANVAS_H * .72), index % 4 === 0 ? 1.8 : 1.1, 0, Math.PI * 2)
      ctx.fill()
    }

    for (const object of objectsRef.current) {
      if (object.type === 'meteor') {
        const tail = 10 + object.speed * 4
        const trail = ctx.createLinearGradient(object.x, object.y, object.x - tail * .7, object.y - tail)
        trail.addColorStop(0, '#fffde7')
        trail.addColorStop(1, 'transparent')
        ctx.strokeStyle = trail
        ctx.lineWidth = Math.max(2, object.speed * .7)
        ctx.beginPath()
        ctx.moveTo(object.x, object.y)
        ctx.lineTo(object.x - tail * .7, object.y - tail)
        ctx.stroke()
        const radius = 8 + object.speed * .4
        const glow = ctx.createRadialGradient(object.x - radius * .3, object.y - radius * .3, 1, object.x, object.y, radius)
        glow.addColorStop(0, '#fffde7')
        glow.addColorStop(1, '#ffa000')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(object.x, object.y, radius, 0, Math.PI * 2)
        ctx.fill()
      } else {
        const shade = Math.round(50 + (object.cloudRadius / 40) * 60)
        ctx.fillStyle = `rgb(${shade + 30},${shade + 10},${shade})`
        drawCloud(ctx, object.x, object.y, object.cloudRadius)
        ctx.fillStyle = '#fff'
        ctx.font = `bold ${Math.max(10, object.cloudRadius * .55)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`-${object.pauseSeconds}s`, object.x, object.y + object.cloudRadius * .15)
      }
    }

    const x = petXRef.current
    ctx.fillStyle = '#f8e1f4'
    ctx.beginPath()
    ctx.ellipse(x, PET_Y, 26, 20, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x, PET_Y - 22, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffb7c5'
    ctx.beginPath()
    ctx.ellipse(x - 10, PET_Y - 38, 5, 12, -.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + 10, PET_Y - 38, 5, 12, .2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#7c5cd8'
    ctx.beginPath()
    ctx.arc(x - 6, PET_Y - 22, 3, 0, Math.PI * 2)
    ctx.arc(x + 6, PET_Y - 22, 3, 0, Math.PI * 2)
    ctx.fill()
  }, [])

  const finishGame = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    stopGame()
    const earned = rewardFor(scoreRef.current, false)
    awardedRef.current = earned
    setReward(earned)
    setCoins(writeCoins(readCoins() + earned))
    setPhase('result')
  }, [stopGame])

  const spawnObjects = useCallback(() => {
    const count = 1 + Math.floor(Math.random() * 2)
    for (let index = 0; index < count; index++) {
      const obstacle = Math.random() < .32
      const cloud = CLOUD_SIZES[Math.floor(Math.random() * CLOUD_SIZES.length)]
      const radius = obstacle ? cloud.radius : 0
      objectsRef.current.push({
        id: ++objectIdRef.current,
        x: 40 + Math.random() * (CANVAS_W - 80),
        y: -40 - index * 30,
        w: obstacle ? radius * 2.4 : 28,
        h: obstacle ? radius * 1.6 : 28,
        type: obstacle ? 'obstacle' : 'meteor',
        speed: obstacle ? 1.5 + (1 - radius / 45) + Math.random() * .3 : 2.5 + Math.random() * 1.5,
        cloudRadius: radius,
        pauseSeconds: obstacle ? cloud.pauseSeconds : 0,
      })
    }
  }, [])

  const gameLoop = useCallback((now: number) => {
    if (finishedRef.current) return
    const elapsed = (now - startedAtRef.current) / 1000
    const remaining = Math.max(0, Math.ceil(GAME_DURATION - elapsed))
    setSeconds(current => current === remaining ? current : remaining)
    if (elapsed >= GAME_DURATION) {
      finishGame()
      return
    }

    const frameScale = Math.min(2, (now - lastFrameRef.current) / (1000 / 60) || 1)
    lastFrameRef.current = now
    const paused = Date.now() < pausedUntilRef.current
    if (!paused) {
      if (pauseVisibleRef.current) {
        pauseVisibleRef.current = false
        setPauseLabel('')
      }
      if (keysRef.current.has('arrowleft') || keysRef.current.has('a')) petXRef.current -= 7 * frameScale
      if (keysRef.current.has('arrowright') || keysRef.current.has('d')) petXRef.current += 7 * frameScale
      petXRef.current = Math.max(PET_W / 2, Math.min(CANVAS_W - PET_W / 2, petXRef.current))

      for (const object of objectsRef.current) object.y += object.speed * frameScale
      const remainingObjects: FallingObject[] = []
      for (const object of objectsRef.current) {
        const hit = petXRef.current - PET_W / 2 < object.x + object.w / 2
          && petXRef.current + PET_W / 2 > object.x - object.w / 2
          && PET_Y - PET_H / 2 < object.y + object.h / 2
          && PET_Y + PET_H / 2 > object.y - object.h / 2
        if (hit) {
          if (object.type === 'meteor') {
            scoreRef.current += 20
            setScore(scoreRef.current)
            addFloatText('+20', object.x, object.y - 20)
          } else {
            const cloud = CLOUD_SIZES.find(item => item.radius === object.cloudRadius)
            pausedUntilRef.current = Date.now() + object.pauseSeconds * 1000
            pauseVisibleRef.current = true
            setPauseLabel(`${cloud?.label ?? '烏雲'}凍結 ${object.pauseSeconds} 秒`)
            addFloatText(`凍結 ${object.pauseSeconds}s！`, object.x, object.y - 24)
          }
        } else if (object.y < CANVAS_H + 60) {
          remainingObjects.push(object)
        }
      }
      objectsRef.current = remainingObjects
    }

    draw()
    frameRef.current = requestAnimationFrame(gameLoop)
  }, [addFloatText, draw, finishGame])

  const startGame = useCallback(() => {
    stopGame()
    objectsRef.current = []
    petXRef.current = CANVAS_W / 2
    scoreRef.current = 0
    pausedUntilRef.current = 0
    pauseVisibleRef.current = false
    finishedRef.current = false
    awardedRef.current = 0
    setScore(0)
    setSeconds(GAME_DURATION)
    setPauseLabel('')
    setFloatTexts([])
    setCheckedIn(false)
    setReward(0)
    setPhase('playing')
    startedAtRef.current = performance.now()
    lastFrameRef.current = startedAtRef.current
    spawnObjects()
    spawnRef.current = window.setInterval(spawnObjects, 900)
    frameRef.current = requestAnimationFrame(gameLoop)
  }, [gameLoop, spawnObjects, stopGame])

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (phase !== 'playing') return
      const key = event.key.toLowerCase()
      if (['arrowleft', 'arrowright', 'a', 'd'].includes(key)) event.preventDefault()
      keysRef.current.add(key)
    }
    const keyUp = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase())
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    return () => {
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
    }
  }, [phase])

  useEffect(() => () => stopGame(), [stopGame])

  const movePet = (clientX: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    petXRef.current = Math.max(PET_W / 2, Math.min(CANVAS_W - PET_W / 2, (clientX - rect.left) * (CANVAS_W / rect.width)))
  }

  const toggleCheckIn = (enabled: boolean) => {
    setCheckedIn(enabled)
    const nextReward = rewardFor(score, enabled)
    const delta = nextReward - awardedRef.current
    awardedRef.current = nextReward
    setReward(nextReward)
    setCoins(writeCoins(readCoins() + delta))
  }

  return (
    <main className="mx-auto w-full max-w-xl space-y-5 px-4 py-6 animate-fade-in-up">
      <section className="overflow-hidden rounded-2xl border border-violet-400/25 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-5 text-white shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-violet-200">
              <IconSparkles size={14} />每日紓壓挑戰
            </span>
            <h2 className="mt-3 text-xl font-bold">流星許願樹</h2>
            <p className="mt-1 text-sm text-violet-200">陪粉紅小兔接住幸運星，小心避開灰烏雲。</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-400/15 px-3 py-1.5 text-sm font-bold text-amber-300">
            <IconCoin size={18} />{coins}
          </span>
        </div>
      </section>

      {phase === 'intro' && (
        <section className="app-surface rounded-2xl border p-5">
          <div className="text-center text-5xl" aria-hidden="true">🌠</div>
          <h3 className="app-text mt-3 text-center text-lg font-bold">接住今晚的幸運星</h3>
          <ul className="app-surface-muted app-text-secondary mt-4 space-y-2 rounded-xl border border-[var(--app-border)] p-4 text-sm">
            <li>⭐ 接住流星，每顆獲得 20 分</li>
            <li>⌨️ 使用 ← →、A D，或滑鼠／手指移動小兔</li>
            <li>☁️ 碰到烏雲會依大小凍結 1～3.5 秒</li>
            <li>⏱️ 限時 45 秒，結算後獲得遊戲金幣</li>
          </ul>
          <button type="button" onClick={startGame} className="btn-grad mt-5 inline-flex items-center justify-center gap-2">
            <IconPlayerPlay size={18} />開始遊戲
          </button>
        </section>
      )}

      {phase === 'playing' && (
        <section className="app-surface rounded-2xl border p-3 sm:p-5">
          <div className="app-surface-muted mb-3 grid grid-cols-2 rounded-xl border border-[var(--app-border)] text-center">
            <div className="border-r border-[var(--app-border)] py-2"><p className="app-text text-lg font-bold">{score}</p><p className="app-text-muted text-xs">得分</p></div>
            <div className="py-2"><p className={`text-lg font-bold ${seconds <= 10 ? 'text-rose-500' : 'app-accent'}`}>{seconds}s</p><p className="app-text-muted text-xs">剩餘時間</p></div>
          </div>
          <div className="relative mx-auto max-w-[480px] overflow-hidden rounded-2xl shadow-xl">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="block h-auto w-full touch-none"
              aria-label="流星許願樹遊戲區"
              onPointerMove={event => movePet(event.clientX)}
              onPointerDown={event => movePet(event.clientX)}
            />
            {pauseLabel && <div className="absolute inset-0 flex items-center justify-center bg-violet-200/35 text-xl font-extrabold text-white backdrop-blur-[1px]">{pauseLabel}</div>}
            {floatTexts.map(item => (
              <span key={item.id} className="pointer-events-none absolute font-extrabold text-amber-300 animate-fade-in-up" style={{ left: `${item.x / CANVAS_W * 100}%`, top: `${item.y / CANVAS_H * 100}%` }}>{item.text}</span>
            ))}
          </div>
          <p className="app-text-muted mt-3 text-center text-xs">移動滑鼠、手指或使用方向鍵控制小兔</p>
        </section>
      )}

      {phase === 'result' && (
        <section className="app-surface rounded-2xl border p-6 text-center animate-fade-in-up">
          <IconStar size={46} className="mx-auto text-amber-400" fill="currentColor" />
          <h3 className="app-text mt-3 text-xl font-bold">今晚的流星收集完成！</h3>
          <p className="app-text-muted mt-2 text-sm">{resultMessage(score)}</p>
          <div className="app-surface-muted mt-5 rounded-xl border border-[var(--app-border)] py-4">
            <p className="app-text text-3xl font-extrabold">{score} 分</p>
            <p className="app-warning mt-1 inline-flex items-center gap-1 text-sm font-semibold"><IconCoin size={17} />獲得 {reward} 金幣</p>
          </div>
          <label className="app-text-secondary mt-4 inline-flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={checkedIn} onChange={event => toggleCheckIn(event.target.checked)} className="h-4 w-4 accent-violet-600" />
            今日已完成情緒打卡（1.2× 金幣加成）
          </label>
          <div className="mt-5 flex gap-3">
            <button type="button" onClick={startGame} className="btn-grad inline-flex flex-1 items-center justify-center gap-2"><IconRefresh size={17} />再玩一次</button>
            <button type="button" onClick={() => setPhase('intro')} className="app-surface-muted app-text-secondary flex-1 rounded-xl border border-[var(--app-border)] py-2.5 text-sm font-semibold app-hover">遊戲說明</button>
          </div>
        </section>
      )}
    </main>
  )
}
