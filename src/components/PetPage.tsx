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
import { PET_SKINS } from './ShopPage'
import { equipPetSkin } from '../lib/firestore'

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
  const [selectedEmotion, setSelectedEmotion] = useState<string>('happy')
  const [gemInput, setGemInput]     = useState(1)
  const [feeding, setFeeding]       = useState(false)
  const [previewColor, setPreviewColor] = useState<string | null>(null)

  const petR = userData.petColorR ?? 180
  const petG = userData.petColorG ?? 150
  const petB = userData.petColorB ?? 200
  const petHex = previewColor ?? rgbToHex(petR, petG, petB)

  const gems = userData.gems ?? 0

  // 擁有的外型：基礎款 + 已購買的進階款
  const ownedIds = new Set([
    ...PET_SKINS.filter(s => s.isFree).map(s => s.id),
    ...(userData.ownedCostumes ?? []),
  ])
  const ownedSkins = PET_SKINS.filter(s => ownedIds.has(s.id))

  // 當前裝備
  const equippedSkinId = userData.equippedPetSkin ?? null
  const equippedSkin = PET_SKINS.find(s => s.id === equippedSkinId) ?? ownedSkins[0] ?? null

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

  const handleEquipSkin = async (skinId: string) => {
    const nextId = equippedSkinId === skinId ? null : skinId
    await equipPetSkin(db, uid, nextId)
    onUserDataChanged({ equippedPetSkin: nextId })
    const skin = PET_SKINS.find(s => s.id === skinId)
    onShowToast(nextId ? `已裝備「${skin?.name ?? skinId}」` : '已卸下造型', 'success')
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

      {/* 我的造型 — 只顯示擁有的外型 */}
      <div className="app-surface border rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <IconHeart size={15} className="text-pink-400" aria-hidden="true" />
          我的造型
          <span className="text-xs font-normal app-text-muted ml-1">（共 {ownedSkins.length} 款）</span>
        </p>
        {ownedSkins.length === 0 ? (
          <p className="text-xs app-text-muted py-2 text-center">前往商城購買進階造型後會出現在這裡</p>
        ) : (
          <div className="flex gap-3 flex-wrap">
            {ownedSkins.map(skin => {
              const isEquipped = equippedSkinId === skin.id
              return (
                <button
                  key={skin.id}
                  onClick={() => handleEquipSkin(skin.id)}
                  title={skin.name}
                  className="relative flex flex-col items-center gap-1 rounded-xl p-2 border transition"
                  style={{
                    borderColor: isEquipped ? '#FFB7C5' : '#e5e7eb',
                    background: isEquipped ? 'linear-gradient(135deg,#fff5f7,#f0fff8)' : '#fafafa',
                  }}
                >
                  <img
                    src={skin.preview}
                    alt={skin.name}
                    className="w-16 h-16 object-contain rounded-lg"
                    style={{ border: '1.5px solid #FFDAC1' }}
                  />
                  <span className="text-[10px] font-medium" style={{ color: isEquipped ? '#7B2D3E' : '#57606a' }}>
                    {skin.name}
                  </span>
                  {isEquipped && (
                    <span
                      className="absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1 py-0.5 rounded-full"
                      style={{ background: '#FFB7C5', color: '#7B2D3E' }}
                    >
                      裝備中
                    </span>
                  )}
                  {skin.isFree && (
                    <span
                      className="absolute -top-1.5 -left-1.5 text-[9px] font-bold px-1 py-0.5 rounded-full"
                      style={{ background: '#B5EAD7', color: '#1a6040' }}
                    >
                      免費
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Pet preview card */}
      <div className="app-surface border rounded-2xl overflow-hidden">
        {/* Color gradient header */}
        <div
          className={`h-2 bg-gradient-to-r ${eSty?.gradient ?? 'from-violet-400 to-indigo-400'} transition-all duration-500`}
        />
        <div className="p-5 flex flex-col items-center gap-4">
          {/* Pet figure — 顯示裝備中的外型圖片 */}
          <div className="relative h-48 w-48 flex items-center justify-center">
            {equippedSkin ? (
              <img
                src={equippedSkin.preview}
                alt={equippedSkin.name}
                className="h-48 w-48 object-contain rounded-2xl"
                style={{
                  filter: `sepia(0.2) hue-rotate(${Math.round(((petR - 128) / 255) * 60)}deg) saturate(1.2)`,
                  transition: 'filter 0.6s ease',
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-48 w-48 rounded-2xl app-surface border border-dashed">
                <p className="text-xs app-text-muted text-center px-4">尚未裝備任何造型<br />點選上方圖片來裝備</p>
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
              {equippedSkin && (
                <p className="app-text-muted text-xs">
                  裝備中：{equippedSkin.name}
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
