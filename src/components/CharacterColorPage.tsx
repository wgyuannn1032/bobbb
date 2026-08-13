// src/components/CharacterColorPage.tsx — 角色換色頁面
import { useState, useRef } from 'react'

const CHARACTERS = [
  { id: '熊',    label: '熊' },
  { id: '兔子',  label: '兔子' },
  { id: '土撥鼠', label: '土撥鼠' },
  { id: '狐狸',  label: '狐狸' },
  { id: '蜜蜂',  label: '蜜蜂' },
  { id: '蝦子',  label: '蝦子' },
]

interface Props {
  embedded?: boolean
}

export default function CharacterColorPage({ embedded = false }: Props) {
  const [color, setColor] = useState('#FFB6C1')
  const [selected, setSelected] = useState('熊')
  const inputRef = useRef<HTMLInputElement>(null)

  const base    = `/character/${selected}base.png`
  const mask    = `/character/${selected}mask.png`
  const overlay = `/character/${selected}overlay.png`

  const content = (
    <>
      <div className="text-center">
        <h1 className="text-xl font-bold app-text">我的小寵物</h1>
        <p className="app-text-muted mt-1 text-xs">選擇角色與喜歡的顏色</p>
      </div>

      {/* 角色選擇 */}
      <div className="flex gap-2 flex-wrap justify-center">
        {CHARACTERS.map(c => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
              ${selected === c.id
                ? 'bg-violet-500 text-white border-violet-500'
                : 'app-surface app-text-secondary border hover:border-violet-400'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 顏色選擇器 */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="colorPicker"
          className="app-text-secondary text-sm font-medium cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          幫角色換個顏色：
        </label>
        <div
          className="w-10 h-10 rounded-full border-2 border-[var(--app-border)] cursor-pointer shadow-sm transition-transform hover:scale-110"
          style={{ backgroundColor: color }}
          onClick={() => inputRef.current?.click()}
          title="點我選色"
        />
        <input
          ref={inputRef}
          id="colorPicker"
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
          className="sr-only"
        />
      </div>

      {/* 角色容器 */}
      <div className="relative isolate h-64 w-64 sm:h-72 sm:w-72" aria-label={`${selected}預覽`}>
        {/* 底層：先鋪上實色，避免半透明陰影與深色頁面背景混合。 */}
        <div
          style={{
            backgroundColor: color,
            WebkitMaskImage: `url('${mask}')`,
            maskImage: `url('${mask}')`,
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          } as React.CSSProperties}
          className="absolute inset-0 h-full w-full"
        />

        {/* 中層：灰階陰影只與染色區混合，不受頁面明暗主題影響。 */}
        <img
          src={base}
          alt=""
          aria-hidden="true"
          style={{ mixBlendMode: 'multiply' }}
          className="absolute inset-0 h-full w-full object-contain"
        />

        {/* 頂層：不被染色的部分 */}
        <img
          src={overlay}
          alt={`${selected}頂層`}
          className="absolute inset-0 h-full w-full object-contain"
        />
      </div>
    </>
  )

  if (embedded) {
    return <section className="app-surface flex h-full flex-col items-center justify-center gap-5 rounded-2xl border p-5 shadow-sm">{content}</section>
  }

  return (
    <div className="app-page flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      {content}
    </div>
  )
}
