// src/components/FallingParticles.tsx — 全畫面飄落特效元件
import { useEffect, useRef } from 'react'

interface FallingParticlesProps {
  /** 粒子的 emoji 陣列（1 個或多個，多個則隨機混合） */
  emojis: string[]
  /** 同時存在的粒子數量，預設 18 */
  count?: number
}

interface Particle {
  emoji: string
  x: number       // vw 0~100
  y: number       // vh，初始負值（畫面外上方）
  size: number    // px
  speed: number   // vh/s
  sway: number    // 左右搖擺振幅 vw
  swaySpeed: number
  swayOffset: number
  rotation: number
  rotSpeed: number
  opacity: number
  born: number    // Date.now()
}

// emoji 對應的粒子 id 陣列（供多種時隨機選）
const PARTICLE_SETS: Record<string, string[]> = {
  ptc_bubble:  ['🫧'],
  ptc_star:    ['⭐'],
  ptc_heart:   ['❤️'],
  ptc_clover:  ['🍀'],
  ptc_sparkle: ['✨'],
  ptc_money:   ['💰'],
  ptc_flowers: ['🌸', '🌼', '🌺', '🌷', '🌻'],
  ptc_fruits:  ['🍎', '🍊', '🍋', '🍇', '🍓'],
}

export function getParticleEmojis(particleId: string | null | undefined): string[] {
  if (!particleId) return []
  return PARTICLE_SETS[particleId] ?? []
}

function makeParticle(emojis: string[]): Particle {
  return {
    emoji:      emojis[Math.floor(Math.random() * emojis.length)],
    x:          Math.random() * 100,
    y:          -(5 + Math.random() * 15),   // 從畫面上方 5~20vh 開始
    size:       20 + Math.random() * 22,     // 20~42px
    speed:      2.5 + Math.random() * 3.5,  // 2.5~6 vh/s（速度降慢）
    sway:       2 + Math.random() * 3,       // 2~5 vw 振幅
    swaySpeed:  0.3 + Math.random() * 0.5,  // 週期放慢
    swayOffset: Math.random() * Math.PI * 2,
    rotation:   Math.random() * 360,
    rotSpeed:   (Math.random() - 0.5) * 60, // -30~+30 deg/s（旋轉也慢）
    opacity:    0.55 + Math.random() * 0.35,
    born:       Date.now(),
  }
}

export default function FallingParticles({ emojis, count = 18 }: FallingParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef       = useRef<number>(0)
  const lastRef      = useRef<number>(0)

  useEffect(() => {
    if (!emojis.length) return

    // 初始化粒子（分散在不同高度，避免一起出現）
    particlesRef.current = Array.from({ length: count }, (_, i) => {
      const p = makeParticle(emojis)
      p.y = -10 + (i / count) * 120  // 初始散布在 -10~110vh
      return p
    })

    const container = containerRef.current
    if (!container) return

    // 建立 DOM 節點
    const nodes: HTMLSpanElement[] = particlesRef.current.map(p => {
      const span = document.createElement('span')
      span.textContent = p.emoji
      span.style.cssText = `
        position:absolute; pointer-events:none; user-select:none;
        font-size:${p.size}px; opacity:${p.opacity}; will-change:transform;
        left:${p.x}vw; top:${p.y}vh;
      `
      container.appendChild(span)
      return span
    })

    let running = true
    const animate = (ts: number) => {
      if (!running) return
      const dt = Math.min((ts - (lastRef.current || ts)) / 1000, 0.1) // clamp to 100ms
      lastRef.current = ts

      particlesRef.current.forEach((p, idx) => {
        p.y += p.speed * dt
        const t = (Date.now() - p.born) / 1000
        const dx = Math.sin(t * p.swaySpeed * Math.PI * 2 + p.swayOffset) * p.sway
        p.rotation += p.rotSpeed * dt

        const node = nodes[idx]
        if (!node) return

        if (p.y > 110) {
          // 重置到頂部
          Object.assign(p, makeParticle(emojis))
          p.y = -(5 + Math.random() * 10)
          node.textContent = p.emoji
          node.style.fontSize = `${p.size}px`
          node.style.opacity  = String(p.opacity)
        }

        node.style.transform = `translate(${dx}vw, 0) rotate(${p.rotation}deg)`
        node.style.left  = `${p.x}vw`
        node.style.top   = `${p.y}vh`
      })

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
      nodes.forEach(n => n.remove())
    }
  }, [emojis, count])

  if (!emojis.length) return null

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed', inset: 0,
        zIndex: 1,           // 背景漸層之上、所有 UI 之下（UI 無 position 時預設 auto > 1）
        pointerEvents: 'none', overflow: 'hidden',
      }}
      aria-hidden="true"
    />
  )
}
