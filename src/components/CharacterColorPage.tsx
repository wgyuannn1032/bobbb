// src/components/CharacterColorPage.tsx — 角色換色頁面
import { useState, useRef } from 'react'

/**
 * 三張圖片放在 public/character/ 資料夾下：
 *   base.png    — 灰階底圖（會被染色）
 *   mask.png    — 剪影遮罩（只用來限制染色範圍，純黑白 PNG）
 *   overlay.png — 不被染色的頂層（例如角、裝飾）
 */
const BASE_IMG    = '/character/base.png'
const MASK_IMG    = '/character/mask.png'
const OVERLAY_IMG = '/character/overlay.png'

export default function CharacterColorPage() {
  const [color, setColor] = useState('#FFB6C1')
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-800">角色換色</h1>

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
      <div
        style={{ position: 'relative', width: 300, height: 300 }}
      >
        {/* 底層：灰階底圖 */}
        <img
          src={BASE_IMG}
          alt="灰階底圖"
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%', objectFit: 'contain',
          }}
        />

        {/* 中層：染色層，用 mask 限制範圍，multiply 混合 */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            backgroundColor: color,
            mixBlendMode: 'multiply',
            WebkitMaskImage: `url('${MASK_IMG}')`,
            maskImage: `url('${MASK_IMG}')`,
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          } as React.CSSProperties}
        />

        {/* 頂層：不被染色的部分（角、裝飾等） */}
        <img
          src={OVERLAY_IMG}
          alt="不變色的頂層"
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%', objectFit: 'contain',
          }}
        />
      </div>

      <p className="text-xs text-gray-400">
        圖片放置於 <code className="bg-gray-100 px-1 rounded">public/character/</code>
      </p>
    </div>
  )
}
