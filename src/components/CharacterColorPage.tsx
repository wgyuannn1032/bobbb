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

export default function CharacterColorPage() {
  const [color, setColor] = useState('#FFB6C1')
  const [selected, setSelected] = useState('熊')
  const inputRef = useRef<HTMLInputElement>(null)

  const base    = `/character/${selected}base.png`
  const mask    = `/character/${selected}mask.png`
  const overlay = `/character/${selected}overlay.png`

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-800">角色換色</h1>

      {/* 角色選擇 */}
      <div className="flex gap-2 flex-wrap justify-center">
        {CHARACTERS.map(c => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors
              ${selected === c.id
                ? 'bg-violet-500 text-white border-violet-500'
                : 'bg-white text-gray-600 border-gray-300 hover:border-violet-400'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 顏色選擇器 */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="colorPicker"
          className="text-sm font-medium text-gray-600 cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          幫角色換個顏色：
        </label>
        <div
          className="w-10 h-10 rounded-full border-2 border-gray-300 cursor-pointer shadow-sm transition-transform hover:scale-110"
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
      <div style={{ position: 'relative', width: 300, height: 300 }}>
        {/* 底層：灰階底圖 */}
        <img
          src={base}
          alt={`${selected}底圖`}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%', objectFit: 'contain',
          }}
        />

        {/* 中層：染色層 */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            backgroundColor: color,
            mixBlendMode: 'multiply',
            WebkitMaskImage: `url('${mask}')`,
            maskImage: `url('${mask}')`,
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          } as React.CSSProperties}
        />

        {/* 頂層：不被染色的部分 */}
        <img
          src={overlay}
          alt={`${selected}頂層`}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%', objectFit: 'contain',
          }}
        />
      </div>
    </div>
  )
}
