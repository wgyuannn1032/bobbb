// src/components/PetPage.tsx — 寵物頁面：寶石餵食換色 + 造型展示
import { useState } from 'react'
import { Firestore } from 'firebase/firestore'
import { doc, updateDoc } from 'firebase/firestore'
import { IconDiamond, IconHeart, IconRefresh, IconSparkles } from '@tabler/icons-react'
import {
  feedPetGems,
  rgbToHex,
  EMOTION_RGB_DELTAS,
  UserData,
} from '../lib/firestore'
import { SHOP_COSTUMES } from './ShopPage'

const CHARACTERS = [
  { id: '熊',     label: '熊' },
  { id: '兔子',   label: '兔子' },
  { id: '土撥鼠', label: '土撥鼠' },
  { id: '狐狸',   label: '狐狸' },
  { id: '蜜蜂',   label: '蜜蜂' },
  { id: '蝦子',   label: '蝦子' },
]

const EMOTION_OPTIONS = Object.entries(EMOTION_RGB_DELTAS).map(([key, val]) => ({
  key,
  label: val.label,
  r: val.r,
  g: val.g,
  b: val.b,
}))

const EMOTION_STYLE: Record<string, { gradient: string; desc: string; icon: string }> = {
  happy:   { gradient: 'from-amber-400 to-orange-400', desc: '溫暖橘黃，充滿活力', icon: '😊' },
  sad:     { gradient: 'from-blue-400 to-indigo-400',  desc: '冷藍色調，低落感',   icon: '😢' },
  angry:   { gradient: 'from-red-500 to-rose-500',     desc: '紅色偏向，發熱感',   icon: '😡' },
  fearful: { gradient: 'from-slate-400 to-purple-700', desc: '暗灰紫色，蒼白感',   icon: '😨' },
}

interface Props {
  db:          Firestore
  uid:         string
  userData:    UserData
  onUserDataChanged: (updated: Partial<UserData>) => void
  onShowToast: (msg: string, type?: string) => void
}

export default function PetPage({ db, uid, userData, onUserDataChanged, onShowToast }: Props) {
  const [selectedChar, setSelectedChar] = useState(CHARACTERS[0].id)
  const [selectedEmotion, setSelectedEmotion] = useState<string>('happy')
  const [gemInput, setGemInput]     = useState(1)
  const [feeding, setFeeding]       = useState(false)
  const [previewColor, setPreviewColor] = useState<string | null>(null)

  const petR = userData.petColorR ?? 180
  const petG = userData.petColorG ?? 150
  const petB = userData.petColorB ?? 200
  const petHex = previewColor ?? rgbToHex(petR, petG, petB)

  const gems = userData.gems ?? 0
  const equippedCostume = userData.equippedCostume ?? null
  const costume = SHOP_COSTUMES.find(c => c.id === equippedCostume)

  // 預覽計算（不寫入 DB）
  const handleEmotionChange = (emotion: string) => {
    setSelectedEmotion(emotion)
    const delta = EMOTION_RGB_DELTAS[emotion]
    if (!delta) { setPreviewColor(null); return }
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
    const r = clamp(petR + delta.r * gemInput)
    const g = clamp(petG + delta.g * gemInput)
    const b = clamp(petB + delta.b * gemInput)
    setPreviewColor(rgbToHex(r, g, b))
  }

  const handleGemChange = (count: number) => {
    const clamped = Math.max(1, Math.min(gems, count))
    setGemInput(clamped)
    const delta = EMOTION_RGB_DELTAS[selectedEmotion]
    if (!delta) { setPreviewColor(null); return }
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
    const r = clamp(petR + delta.r * clamped)
    const g = clamp(petG + delta.g * clamped)
    const b = clamp(petB + delta.b * clamped)
    setPreviewColor(rgbToHex(r, g, b))
  }

  const handleFeed = async () => {
    if (gems < gemInput) {
      onShowToast('寶石不足', 'error')
      return
    }
    if (gemInput < 1) {
      onShowToast('至少需要 1 顆寶石', 'error')
      return
    }
    setFeeding(true)
    try {
      const { newGems, newPetR, newPetG, newPetB } = await feedPetGems(
        db, uid, selectedEmotion, gemInput, userData
      )
      onUserDataChanged({
        gems: newGems,
        petColorR: newPetR,
        petColorG: newPetG,
        petColorB: newPetB,
        petEmotion: selectedEmotion,
      })
      setPreviewColor(null)
      const emotionLabel = EMOTION_RGB_DELTAS[selectedEmotion]?.label ?? selectedEmotion
      onShowToast(`🌈 餵食成功！寵物因「${emotionLabel}」改變了顏色`, 'success')
    } catch (e) {
      onShowToast('餵食失敗，請稍後再試', 'error')
    } finally {
      setFeeding(false)
    }
  }

  const handleReset = async () => {
    setFeeding(true)
    try {
      await updateDoc(doc(db, 'users', uid), {
        petColorR:  180,
        petColorG:  150,
        petColorB:  200,
        petEmotion: null,
      })
      onUserDataChanged({ petColorR: 180, petColorG: 150, petColorB: 200, petEmotion: null })
      setPreviewColor(null)
      onShowToast('寵物顏色已重置', 'success')
    } catch {
      onShowToast('重置失敗，請稍後再試', 'error')
    } finally {
      setFeeding(false)
    }
  }

  const eSty = EMOTION_STYLE[selectedEmotion]

  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-5 w-full">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <IconHeart size={22} className="text-rose-400" aria-hidden="true" />
          我的寵物
        </h2>
        <p className="app-text-muted text-sm mt-0.5">餵食寶石來改變寵物的顏色</p>
      </div>

      {/* Character selector */}
      <div className="flex gap-2 flex-wrap">
        {CHARACTERS.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedChar(c.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
              selectedChar === c.id
                ? 'bg-violet-500 text-white border-violet-500'
                : 'app-surface app-text-secondary border hover:border-violet-400'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Pet preview card */}
      <div className="app-surface border rounded-2xl overflow-hidden">
        {/* Color gradient header */}
        <div
          className={`h-2 bg-gradient-to-r ${eSty?.gradient ?? 'from-violet-400 to-indigo-400'} transition-all duration-500`}
        />
        <div className="p-5 flex flex-col items-center gap-4">
          {/* Pet figure */}
          <div className="relative h-48 w-48" aria-label={`${selectedChar}預覽`}>
            {/* Base */}
            <img
              src={`/character/${selectedChar}base.png`}
              alt={`${selectedChar}底圖`}
              className="absolute inset-0 h-full w-full object-contain"
            />
            {/* Color layer — blends with mask */}
            <div
              style={{
                backgroundColor: petHex,
                mixBlendMode: 'multiply',
                WebkitMaskImage: `url('/character/${selectedChar}mask.png')`,
                maskImage: `url('/character/${selectedChar}mask.png')`,
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
                transition: 'background-color 0.6s ease',
              } as React.CSSProperties}
              className="absolute inset-0 h-full w-full"
            />
            {/* Overlay */}
            <img
              src={`/character/${selectedChar}overlay.png`}
              alt={`${selectedChar}頂層`}
              className="absolute inset-0 h-full w-full object-contain"
            />
            {/* Equipped costume badge */}
            {costume && (
              <div className="absolute -top-2 -right-2 text-3xl" title={`裝備中：${costume.name}`}>
                {costume.preview}
              </div>
            )}
          </div>

          {/* Color info */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-[var(--app-border)] shadow-sm"
              style={{ backgroundColor: petHex }}
            />
            <div>
              <p className="app-text text-sm font-semibold">
                {previewColor ? '預覽顏色' : '目前顏色'}
                <span className="app-text-muted font-mono text-xs ml-1.5">{petHex}</span>
              </p>
              {userData.petEmotion && !previewColor && (
                <p className="app-text-muted text-xs">
                  上次餵食情緒：{EMOTION_RGB_DELTAS[userData.petEmotion]?.label ?? userData.petEmotion}
                </p>
              )}
              {costume && (
                <p className="app-text-muted text-xs flex items-center gap-1">
                  裝備中：{costume.preview} {costume.name}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feed panel */}
      <div className="app-surface border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-1.5">
            <IconSparkles size={17} className="app-accent" aria-hidden="true" />
            餵食寶石
          </h3>
          <div className="flex items-center gap-1 text-sm font-semibold">
            <IconDiamond size={15} className="app-accent" aria-hidden="true" />
            <span>{gems} 顆可用</span>
          </div>
        </div>

        {/* Emotion selector */}
        <div>
          <p className="app-text-muted text-xs mb-2 font-medium">選擇情緒類型（影響顏色偏移方向）</p>
          <div className="grid grid-cols-2 gap-2">
            {EMOTION_OPTIONS.map(e => {
              const sty = EMOTION_STYLE[e.key]
              return (
                <button
                  key={e.key}
                  onClick={() => handleEmotionChange(e.key)}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-sm font-medium transition ${
                    selectedEmotion === e.key
                      ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20 app-text'
                      : 'app-surface app-text-secondary hover:border-violet-300'
                  }`}
                >
                  <span className="text-xl">{sty?.icon}</span>
                  <div className="text-left">
                    <p className="font-semibold">{e.label}</p>
                    <p className="app-text-muted text-[10px]">
                      R{e.r >= 0 ? '+' : ''}{e.r} G{e.g >= 0 ? '+' : ''}{e.g} B{e.b >= 0 ? '+' : ''}{e.b}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Gem count */}
        <div>
          <p className="app-text-muted text-xs mb-2 font-medium">餵食寶石數量（每顆放大一次偏移效果）</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleGemChange(gemInput - 1)}
              disabled={gemInput <= 1}
              className="w-8 h-8 rounded-full app-surface border flex items-center justify-center text-lg font-bold app-text-secondary hover:bg-violet-50 disabled:opacity-30 transition"
            >−</button>
            <input
              type="number"
              min={1}
              max={gems}
              value={gemInput}
              onChange={e => handleGemChange(Number(e.target.value))}
              className="w-16 text-center app-surface border rounded-xl py-1.5 text-sm font-semibold app-text focus:outline-none focus:border-violet-400"
            />
            <button
              onClick={() => handleGemChange(gemInput + 1)}
              disabled={gemInput >= gems}
              className="w-8 h-8 rounded-full app-surface border flex items-center justify-center text-lg font-bold app-text-secondary hover:bg-violet-50 disabled:opacity-30 transition"
            >+</button>
          </div>
        </div>

        {/* Predicted color */}
        {previewColor && selectedEmotion && (
          <div className="flex items-center gap-3 app-surface-muted rounded-xl px-3 py-2.5">
            <div className="flex gap-1.5 items-center">
              <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: petHex }} />
              <span className="app-text-muted text-xs">→</span>
              <div className="w-6 h-6 rounded-full border border-violet-400" style={{ backgroundColor: previewColor }} />
            </div>
            <p className="app-text-muted text-xs">
              預計變為 <span className="font-mono">{previewColor}</span>
              （<span className="app-text font-medium">{EMOTION_STYLE[selectedEmotion]?.desc}</span>）
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleFeed}
            disabled={feeding || gems < 1 || gemInput < 1}
            className="flex-1 btn-grad flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {feeding ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <IconDiamond size={16} aria-hidden="true" />
                餵食 {gemInput} 顆寶石
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            disabled={feeding}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl app-surface border app-text-secondary hover:border-rose-300 hover:text-rose-400 transition"
            title="重置顏色"
          >
            <IconRefresh size={16} />
          </button>
        </div>
      </div>

      {/* Emotion table legend */}
      <div className="app-surface border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--app-border)]">
          <p className="text-sm font-semibold">情緒 × 顏色對照表</p>
        </div>
        <div className="divide-y divide-[var(--app-border)]">
          {EMOTION_OPTIONS.map(e => {
            const sty = EMOTION_STYLE[e.key]
            return (
              <div key={e.key} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{sty?.icon}</span>
                <div className="flex-1">
                  <p className="app-text text-sm font-semibold">{e.label}</p>
                  <p className="app-text-muted text-xs">{sty?.desc}</p>
                </div>
                <div className="text-right">
                  <div className="flex gap-1 text-[11px] font-mono app-text-secondary">
                    <span className="text-red-500">R{e.r >= 0 ? '+' : ''}{e.r}</span>
                    <span className="text-green-500">G{e.g >= 0 ? '+' : ''}{e.g}</span>
                    <span className="text-blue-500">B{e.b >= 0 ? '+' : ''}{e.b}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
