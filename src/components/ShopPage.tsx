// src/components/ShopPage.tsx — 遊戲商城：金幣購買寵物造型
import { useState } from 'react'
import { Firestore } from 'firebase/firestore'
import { IconShoppingCart, IconCheck, IconCoin, IconShirt, IconStar, IconCrown, IconWand } from '@tabler/icons-react'
import { purchaseCostume, equipCostume, UserData, CostumeItem } from '../lib/firestore'

// ── 商城造型清單 ─────────────────────────────────────────────
export const SHOP_COSTUMES: CostumeItem[] = [
  {
    id: 'wizard_hat',
    name: '巫師帽',
    description: '神秘的星空巫師帽，散發魔法光芒',
    price: 50,
    preview: '🧙',
    rarity: 'common',
  },
  {
    id: 'flower_crown',
    name: '花冠',
    description: '清新自然的花朵王冠，充滿春日氣息',
    price: 80,
    preview: '🌸',
    rarity: 'common',
  },
  {
    id: 'space_suit',
    name: '太空裝',
    description: '探索宇宙的全套太空裝備',
    price: 150,
    preview: '🚀',
    rarity: 'rare',
  },
  {
    id: 'rainbow_cape',
    name: '彩虹披風',
    description: '七彩繽紛的流光披風，隨風飄揚',
    price: 200,
    preview: '🌈',
    rarity: 'rare',
  },
  {
    id: 'crystal_armor',
    name: '水晶盔甲',
    description: '由純淨水晶打造的神聖護甲',
    price: 350,
    preview: '💎',
    rarity: 'epic',
  },
  {
    id: 'dragon_wings',
    name: '龍之翼',
    description: '傳說中的巨龍翅膀，乘風翱翔天際',
    price: 500,
    preview: '🐉',
    rarity: 'epic',
  },
  {
    id: 'golden_crown',
    name: '黃金王冠',
    description: '傳說帝王的至尊王冠，無人能及',
    price: 888,
    preview: '👑',
    rarity: 'legendary',
  },
  {
    id: 'star_mantle',
    name: '星辰斗篷',
    description: '由一千顆星星編織而成的神話斗篷',
    price: 999,
    preview: '✨',
    rarity: 'legendary',
  },
]

const RARITY_CONFIG = {
  common:    { label: '普通',   color: 'text-slate-400',  bg: 'bg-slate-100 dark:bg-slate-800',  border: 'border-slate-300 dark:border-slate-600' },
  rare:      { label: '稀有',   color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20',  border: 'border-blue-300 dark:border-blue-700' },
  epic:      { label: '史詩',   color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-300 dark:border-purple-700' },
  legendary: { label: '傳說',   color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300 dark:border-amber-700' },
}

const RARITY_ICON = {
  common:    <IconShirt size={12} />,
  rare:      <IconStar  size={12} />,
  epic:      <IconWand  size={12} />,
  legendary: <IconCrown size={12} />,
}

interface Props {
  db:          Firestore
  uid:         string
  userData:    UserData
  onUserDataChanged: (updated: Partial<UserData>) => void
  onShowToast: (msg: string, type?: string) => void
}

export default function ShopPage({ db, uid, userData, onUserDataChanged, onShowToast }: Props) {
  const [buying, setBuying] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | CostumeItem['rarity']>('all')

  const coins        = userData.coins ?? 0
  const owned        = userData.ownedCostumes ?? []
  const equipped     = userData.equippedCostume ?? null

  const filtered = filter === 'all'
    ? SHOP_COSTUMES
    : SHOP_COSTUMES.filter(c => c.rarity === filter)

  const handleBuy = async (costume: CostumeItem) => {
    if (owned.includes(costume.id)) {
      onShowToast('已擁有此造型', 'error')
      return
    }
    if (coins < costume.price) {
      onShowToast(`金幣不足！需要 ${costume.price} 枚，目前只有 ${coins} 枚`, 'error')
      return
    }
    setBuying(costume.id)
    try {
      const { newCoins, ownedCostumes } = await purchaseCostume(db, uid, costume.id, costume.price, userData)
      onUserDataChanged({ coins: newCoins, ownedCostumes })
      onShowToast(`🎉 成功購買「${costume.name}」！`, 'success')
    } catch (e: unknown) {
      onShowToast(e instanceof Error ? e.message : '購買失敗', 'error')
    } finally {
      setBuying(null)
    }
  }

  const handleEquip = async (costumeId: string) => {
    const next = equipped === costumeId ? null : costumeId
    await equipCostume(db, uid, next)
    onUserDataChanged({ equippedCostume: next })
    const costume = SHOP_COSTUMES.find(c => c.id === costumeId)
    onShowToast(next ? `已裝備「${costume?.name ?? costumeId}」` : '已卸下造型', 'success')
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <IconShoppingCart size={22} className="text-amber-500" aria-hidden="true" />
            造型商城
          </h2>
          <p className="app-text-muted text-sm mt-0.5">用金幣為你的寵物換上特別造型</p>
        </div>
        {/* Coin balance */}
        <div className="flex items-center gap-1.5 app-surface border px-4 py-2 rounded-full text-sm font-bold shadow-sm">
          <IconCoin size={18} stroke={1.8} color="#f59e0b" aria-hidden="true" />
          <span style={{ color: '#e65100' }}>{coins}</span>
          <span className="app-text-muted font-normal text-xs">金幣</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'common', 'rare', 'epic', 'legendary'] as const).map(r => (
          <button
            key={r}
            onClick={() => setFilter(r)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition border ${
              filter === r
                ? 'bg-violet-500 text-white border-violet-500'
                : 'app-surface app-text-secondary border hover:border-violet-400'
            }`}
          >
            {r === 'all' ? '全部' : RARITY_CONFIG[r].label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map(costume => {
          const isOwned    = owned.includes(costume.id)
          const isEquipped = equipped === costume.id
          const isBuying   = buying === costume.id
          const rCfg       = RARITY_CONFIG[costume.rarity]
          const canAfford  = coins >= costume.price

          return (
            <div
              key={costume.id}
              className={`relative flex flex-col items-center gap-2 rounded-2xl border p-4 transition
                ${isEquipped
                  ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20 shadow-sm'
                  : isOwned
                    ? 'border-emerald-300 dark:border-emerald-700 app-surface'
                    : `${rCfg.border} ${rCfg.bg}`}
              `}
            >
              {/* Rarity badge */}
              <span className={`absolute top-2 right-2 flex items-center gap-0.5 text-[10px] font-semibold ${rCfg.color}`}>
                {RARITY_ICON[costume.rarity]}
                {rCfg.label}
              </span>

              {/* Equipped badge */}
              {isEquipped && (
                <span className="absolute top-2 left-2 text-[10px] font-bold text-violet-500">裝備中</span>
              )}

              {/* Preview emoji */}
              <div className="text-5xl leading-none mt-2">{costume.preview}</div>

              {/* Name */}
              <p className="app-text text-sm font-semibold text-center leading-tight">{costume.name}</p>
              <p className="app-text-muted text-[11px] text-center leading-snug line-clamp-2">{costume.description}</p>

              {/* Price / Action */}
              {isOwned ? (
                <button
                  onClick={() => handleEquip(costume.id)}
                  className={`mt-auto w-full rounded-xl py-1.5 text-xs font-semibold transition ${
                    isEquipped
                      ? 'bg-violet-500/20 text-violet-600 hover:bg-violet-500/30'
                      : 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25'
                  }`}
                >
                  {isEquipped ? '卸下造型' : '裝備'}
                  {isEquipped && <IconCheck size={12} className="inline ml-1" />}
                </button>
              ) : (
                <button
                  onClick={() => handleBuy(costume)}
                  disabled={isBuying || !canAfford}
                  className={`mt-auto w-full flex items-center justify-center gap-1 rounded-xl py-1.5 text-xs font-semibold transition
                    ${canAfford
                      ? 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}
                  `}
                >
                  {isBuying ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <IconCoin size={13} stroke={2} />
                      {costume.price}
                    </>
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Tip */}
      <div className="app-surface border rounded-xl px-4 py-3 text-xs app-text-muted flex items-start gap-2">
        <IconCoin size={16} className="text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          玩紓壓小遊戲可獲得金幣，金幣可在此商城購買寵物特殊造型。
          造型購入後可隨時在寵物頁面切換裝備。
        </span>
      </div>
    </main>
  )
}
