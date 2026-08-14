// src/components/BackpackPage.tsx — 背包頁面：合併同款 + 防重複使用
import { useState } from 'react'
import { Firestore } from 'firebase/firestore'
import { doc, updateDoc } from 'firebase/firestore'
import { IconBackpack, IconClock, IconSparkles, IconPlayerPlay, IconPlayerStop } from '@tabler/icons-react'
import { UserData, BackpackEntry, useBackpackItem } from '../lib/firestore'
import { COIN_BONUS_ITEMS, COIN_MULTI_ITEMS } from './ShopPage'

interface Props {
  db: Firestore
  uid: string
  userData: UserData
  onUserDataChanged: (updated: Partial<UserData>) => void
  onShowToast: (msg: string, type?: string) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  pet:            '🐾 寵物',
  avatarFrame:    '🎖️ 節日頭像',
  particle:       '❄️ 雪花飄落',
  treasure:       '📦 寶石寶箱',
  background:     '🖼️ 背景主題',
  coinBonus:      '➕ 金幣加值',
  coinMultiplier: '✖️ 金幣加成',
}

// 「同類型」對應的欄位名（用於判斷是否已有同類型在使用中）
const CATEGORY_EQUIPPED_FIELD: Partial<Record<string, keyof UserData>> = {
  avatarFrame:    'equippedAvatarFrame',
  particle:       'equippedParticle',
  background:     'equippedBg',
  coinBonus:      'coinBonus',
  coinMultiplier: 'coinMultiplier',
}

// 同類型已在使用中的道具 id（若有的話）
function getActiveIdForCategory(category: string, userData: UserData): string | null {
  const today = new Date().toISOString().slice(0, 10)
  switch (category) {
    case 'avatarFrame':
      return (userData.avatarFrameExpiry ?? '') >= today ? (userData.equippedAvatarFrame ?? null) : null
    case 'particle':
      return (userData.particleExpiry ?? '') >= today ? (userData.equippedParticle ?? null) : null
    case 'background': {
      const bg = userData.equippedBg ?? 'dream_macaron'
      if (bg === 'dream_macaron') return null
      return (userData.bgExpiry ?? '') >= today ? bg : null
    }
    case 'coinBonus':
      return (userData.bonusExpiry ?? '') >= today ? 'active' : null
    case 'coinMultiplier':
      return (userData.multiplierExpiry ?? '') >= today ? 'active' : null
    default:
      return null
  }
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

function isActive(entry: BackpackEntry): boolean {
  return entry.used && !!entry.expiresAt && entry.expiresAt >= todayStr()
}

// ── 合併相同 id 的道具（按 id 分組，保留「最舊未使用」的真實 index） ──────────
interface GroupedEntry {
  id:      string
  entry:   BackpackEntry  // 代表這一組的條目（未使用中最舊的一筆）
  realIdx: number         // 在原始背包陣列中的 index，供 useBackpackItem 使用
  count:   number         // 未使用的數量
  hasActive: boolean      // 同 id 是否已有一筆在使用中（有效）
  hasExpired: boolean     // 同 id 是否有已過期
}

function groupUnused(backpack: BackpackEntry[]): GroupedEntry[] {
  const map = new Map<string, GroupedEntry>()

  backpack.forEach((e, i) => {
    if (e.used) return  // 已使用的不進入「待使用」區
    const existing = map.get(e.id)
    if (!existing) {
      map.set(e.id, { id: e.id, entry: e, realIdx: i, count: 1, hasActive: false, hasExpired: false })
    } else {
      existing.count++
      // 保留最早購買的 index（FIFO 使用順序）
      if (e.purchasedAt < existing.entry.purchasedAt) {
        existing.entry = e
        existing.realIdx = i
      }
    }
  })

  // 掃描已使用的，標記 hasActive / hasExpired
  backpack.forEach(e => {
    if (!e.used) return
    const g = map.get(e.id)
    if (!g) return
    if (isActive(e)) g.hasActive = true
    else g.hasExpired = true
  })

  return [...map.values()].sort((a, b) => a.entry.purchasedAt.localeCompare(b.entry.purchasedAt))
}

// 依 category 組出要清除的 Firestore 欄位
function getClearFields(category: string): Record<string, unknown> {
  switch (category) {
    case 'avatarFrame':    return { equippedAvatarFrame: null, avatarFrameExpiry: null }
    case 'particle':       return { equippedParticle: null,    particleExpiry: null }
    case 'background':     return { equippedBg: 'dream_macaron', bgExpiry: null }
    case 'coinBonus':      return { coinBonus: 0,              bonusExpiry: null }
    case 'coinMultiplier': return { coinMultiplier: 1,         multiplierExpiry: null }
    default: return {}
  }
}

export default function BackpackPage({ db, uid, userData, onUserDataChanged, onShowToast }: Props) {
  const [using, setUsing] = useState<number | null>(null)
  const [stopping, setStopping] = useState<number | null>(null)
  const backpack: BackpackEntry[] = userData.backpack ?? []

  // 已使用且有效的（顯示在「使用中」區，不合併）
  const activeEntries = backpack
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => isActive(e))
    .sort((a, b) => b.e.purchasedAt.localeCompare(a.e.purchasedAt))

  // 已過期（歷史）
  const expiredEntries = backpack
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.used && !isActive(e))
    .sort((a, b) => b.e.purchasedAt.localeCompare(a.e.purchasedAt))
    .slice(0, 12)

  // 待使用（合併相同 id）
  const grouped = groupUnused(backpack)

  // ── 使用道具 ──────────────────────────────────────────────
  const handleUse = async (group: GroupedEntry) => {
    const { realIdx, entry, id } = group

    // ① 同類型防重複使用
    const conflictId = getActiveIdForCategory(entry.category, userData)
    if (conflictId !== null) {
      // 找出同類型使用中的道具名稱
      const conflictEntry = backpack.find(e => e.used && isActive(e) && e.category === entry.category)
      const conflictName = conflictEntry?.name ?? '另一項道具'
      onShowToast(`⚠️ 同類型「${CATEGORY_LABELS[entry.category] ?? entry.category}」已有「${conflictName}」使用中，請等到期後再換`, 'error')
      return
    }

    setUsing(realIdx)
    try {
      const { backpack: newBackpack, expiresAt } = await useBackpackItem(db, uid, realIdx, userData)
      onUserDataChanged({ backpack: newBackpack })

      const usedEntry = newBackpack[realIdx]

      if (usedEntry.category === 'background') {
        await updateDoc(doc(db, 'users', uid), { equippedBg: id, bgExpiry: expiresAt })
        onUserDataChanged({ equippedBg: id, bgExpiry: expiresAt })
        onShowToast(`✅「${usedEntry.name}」已套用！效果到 ${expiresAt}`, 'success')

      } else if (usedEntry.category === 'avatarFrame') {
        await updateDoc(doc(db, 'users', uid), { equippedAvatarFrame: id, avatarFrameExpiry: expiresAt })
        onUserDataChanged({ equippedAvatarFrame: id, avatarFrameExpiry: expiresAt })
        onShowToast(`✅「${usedEntry.name}」頭像框已套用！效果到 ${expiresAt}`, 'success')

      } else if (usedEntry.category === 'particle') {
        await updateDoc(doc(db, 'users', uid), { equippedParticle: id, particleExpiry: expiresAt })
        onUserDataChanged({ equippedParticle: id, particleExpiry: expiresAt })
        onShowToast(`✅「${usedEntry.name}」粒子特效已啟用！效果到 ${expiresAt}`, 'success')

      } else if (usedEntry.category === 'coinBonus') {
        const item = COIN_BONUS_ITEMS.find(i => i.id === id)
        if (item) {
          await updateDoc(doc(db, 'users', uid), { coinBonus: item.bonusValue ?? 0, bonusExpiry: expiresAt })
          onUserDataChanged({ coinBonus: item.bonusValue ?? 0, bonusExpiry: expiresAt })
        }
        onShowToast(`✅「${usedEntry.name}」金幣加值已啟動！效果到 ${expiresAt}`, 'success')

      } else if (usedEntry.category === 'coinMultiplier') {
        const item = COIN_MULTI_ITEMS.find(i => i.id === id)
        if (item) {
          await updateDoc(doc(db, 'users', uid), { coinMultiplier: item.multiplierValue ?? 1, multiplierExpiry: expiresAt })
          onUserDataChanged({ coinMultiplier: item.multiplierValue ?? 1, multiplierExpiry: expiresAt })
        }
        onShowToast(`✅「${usedEntry.name}」金幣加成已啟動！效果到 ${expiresAt}`, 'success')

      } else {
        onShowToast(`✅「${usedEntry.name}」已使用！效果到 ${expiresAt}`, 'success')
      }
    } catch (e) {
      onShowToast(e instanceof Error ? e.message : '使用失敗', 'error')
    } finally {
      setUsing(null)
    }
  }

  // ── 提前結束道具 ───────────────────────────────────────────────
  const handleStop = async (idx: number, entry: BackpackEntry) => {
    setStopping(idx)
    try {
      // 把 expiresAt 改為昨天讓它立即過期
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().slice(0, 10)

      const newBackpack = (userData.backpack ?? []).map((e, i) =>
        i === idx ? { ...e, expiresAt: yesterdayStr } : e
      )
      const clearFields = getClearFields(entry.category)
      await updateDoc(doc(db, 'users', uid), { backpack: newBackpack, ...clearFields })
      onUserDataChanged({ backpack: newBackpack, ...clearFields } as Partial<UserData>)
      onShowToast(`「${entry.name}」效果已提前結束`, 'success')
    } catch {
      onShowToast('操作失敗，請稍後再試', 'error')
    } finally {
      setStopping(null)
    }
  }

  const today = todayStr()

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-5 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <IconBackpack size={22} style={{ color: '#C7CEEA' }} />
            背包
          </h2>
          <p className="app-text-muted text-sm mt-0.5">
            待使用 {grouped.length} 種 · 使用中 {activeEntries.length} 件
          </p>
        </div>
        <span className="commerce-date-badge flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border">
          <IconClock size={13} />{today}
        </span>
      </div>

      {/* 待使用（合併同款） */}
      {grouped.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-3 uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#b45309' }}>
            <IconPlayerPlay size={13} />
            待使用（按「使用」開始計時一天）
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {grouped.map(g => (
              <BackpackCard
                key={g.id}
                entry={g.entry}
                status="unused"
                count={g.count}
                onUse={() => handleUse(g)}
                loading={using === g.realIdx}
              />
            ))}
          </div>
        </div>
      )}

      {/* 使用中（有效，不合併） */}
      {activeEntries.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-3 uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#057857' }}>
            <IconSparkles size={13} />
            使用中（今日有效）
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {activeEntries.map(({ e, i }) => (
              <BackpackCard
                key={`active-${i}`}
                entry={e}
                status="active"
                count={1}
                onStop={() => handleStop(i, e)}
                stopping={stopping === i}
              />
            ))}
          </div>
        </div>
      )}

      {/* 空背包 */}
      {grouped.length === 0 && activeEntries.length === 0 && (
        <div className="commerce-empty-card rounded-2xl px-6 py-12 text-center">
          <div className="text-4xl mb-3">🎒</div>
          <p className="text-sm font-semibold" style={{ color: '#9a3055' }}>背包是空的</p>
          <p className="app-text-muted text-xs mt-1">前往造型商城購買道具，購買後這裡會出現！</p>
        </div>
      )}

      {/* 歷史紀錄 */}
      {expiredEntries.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-3 uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#9ca3af' }}>
            <IconClock size={13} />
            歷史紀錄（已過期）
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {expiredEntries.map(({ e, i }) => (
              <BackpackCard key={`expired-${i}`} entry={e} status="expired" count={1} />
            ))}
          </div>
        </div>
      )}

      <div className="commerce-info-card rounded-xl border px-4 py-3 text-xs flex items-start gap-2">
        <IconSparkles size={15} className="flex-shrink-0 mt-0.5" />
        <span>
          購買後在此按「<strong>使用</strong>」開始計時一天。
          同一類型同時只能啟用一種效果，到期後才可換用。
        </span>
      </div>
    </main>
  )
}

// ── 背包卡片 ──────────────────────────────────────────────────

type CardStatus = 'unused' | 'active' | 'expired'

interface BackpackCardProps {
  entry:    BackpackEntry
  status:   CardStatus
  count:    number
  onUse?:   () => void
  loading?: boolean
  onStop?:  () => void
  stopping?: boolean
}

function BackpackCard({ entry, status, count, onUse, loading, onStop, stopping }: BackpackCardProps) {
  return (
    <div className={`backpack-card is-${status} relative flex flex-col items-center gap-2 rounded-2xl p-4 transition`}>

      {/* Category tag（左上） */}
      <span className={`backpack-card-tag absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${status === 'active' ? 'is-active' : ''}`}>
        {CATEGORY_LABELS[entry.category] ?? entry.category}
      </span>

      {/* 數量徽章（右上） */}
      {count > 1 && (
        <span
          className="absolute top-2 right-2 text-[10px] font-extrabold w-5 h-5 flex items-center justify-center rounded-full"
          style={{ background: '#FFB7C5', color: '#7B2D3E' }}
        >
          {count}
        </span>
      )}

      {/* 狀態標籤（右上，無數量時顯示） */}
      {count <= 1 && (
        <span className="absolute top-2 right-2 text-[10px] font-bold"
          style={{ color: status === 'active' ? '#059669' : status === 'unused' ? '#b45309' : '#9ca3af' }}>
          {status === 'active' ? '✦ 使用中' : status === 'unused' ? '◎ 待使用' : '✕ 已過期'}
        </span>
      )}

      {/* Preview */}
      <div className="text-3xl mt-5 mb-1">{entry.preview}</div>

      {/* Name */}
      <p className="app-text text-xs font-semibold text-center leading-tight">{entry.name}</p>

      {/* Expiry info */}
      {status === 'active' && (
        <p className="app-success text-[10px]">
          <IconClock size={10} className="inline mr-0.5" />到期：{entry.expiresAt}
        </p>
      )}
      {status === 'unused' && (
        <p className="app-warning text-[10px]">購買於 {entry.purchasedAt}</p>
      )}
      {status === 'expired' && (
        <p className="text-[10px] text-gray-400">已過期（{entry.expiresAt}）</p>
      )}

      {/* Price */}
      <p className="app-warning text-[10px]">🪙 {entry.price} 金幣</p>

      {/* 使用按鈕（只有「待使用」顯示） */}
      {status === 'unused' && onUse && (
        <button
          onClick={onUse}
          disabled={loading}
          className="commerce-use-button mt-1 w-full rounded-xl py-1.5 text-xs font-bold transition flex items-center justify-center gap-1"
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : <><IconPlayerPlay size={12} />使用</>
          }
        </button>
      )}

      {/* 提前結束按鈕（只有「使用中」顯示） */}
      {status === 'active' && onStop && (
        <button
          onClick={onStop}
          disabled={stopping}
          className="commerce-stop-button mt-1 w-full rounded-xl border py-1.5 text-xs font-bold transition flex items-center justify-center gap-1"
        >
          {stopping
            ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : <><IconPlayerStop size={12} />提前結束</>
          }
        </button>
      )}
    </div>
  )
}
