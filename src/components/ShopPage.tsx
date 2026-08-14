// src/components/ShopPage.tsx — 全新造型商城
import { useState } from 'react'
import { Firestore } from 'firebase/firestore'
import { doc, updateDoc } from 'firebase/firestore'
import { IconShoppingCart, IconCoin, IconX, IconSparkles } from '@tabler/icons-react'
import {
  UserData, ShopItem, BackpackEntry,
  purchaseShopItem, purchasePetSkin, equipPetSkin, equipBackground, equipAvatarFrame,
  useBackpackItem,
} from '../lib/firestore'

// ── 商品資料 ──────────────────────────────────────────────────

export const PET_SKINS: ShopItem[] = [
  { id: 'pet_a', category: 'pet', name: '毛茸寵物 A', price: 0, isFree: true,
    preview: '/assets/20260813_122337 (1).png', isImage: true, description: '預設基礎款，系統自動解鎖' },
  { id: 'pet_b', category: 'pet', name: '毛茸寵物 B', price: 0, isFree: true,
    preview: '/assets/20260813_122408.png', isImage: true, description: '預設基礎款，系統自動解鎖' },
  { id: 'pet_1', category: 'pet', name: '進階寵物 1', price: 100, isFree: false,
    preview: '/assets/20260813_122552.png', isImage: true, description: '解鎖後可永久使用的進階寵物造型' },
  { id: 'pet_2', category: 'pet', name: '進階寵物 2', price: 150, isFree: false,
    preview: '/assets/20260813_122657.png', isImage: true, description: '解鎖後可永久使用的進階寵物造型' },
  { id: 'pet_3', category: 'pet', name: '進階寵物 3', price: 200, isFree: false,
    preview: '/assets/20260813_122740.png', isImage: true, description: '解鎖後可永久使用的進階寵物造型' },
  { id: 'pet_4', category: 'pet', name: '進階寵物 4', price: 250, isFree: false,
    preview: '/assets/20260813_123300.png', isImage: true, description: '解鎖後可永久使用的進階寵物造型' },
]

// 角色解鎖（三層染色角色，熊/兔子免費，其餘需購買）
export const CHARACTER_ITEMS: ShopItem[] = [
  { id: 'char_bear',    category: 'pet', name: '熊',    price: 0,   isFree: true,  preview: '🐻', description: '免費角色，永久解鎖。' },
  { id: 'char_rabbit',  category: 'pet', name: '兔子',  price: 0,   isFree: true,  preview: '🐰', description: '免費角色，永久解鎖。' },
  { id: 'char_marmot',  category: 'pet', name: '土撥鼠', price: 120, isFree: false, preview: '🐹', description: '購買後永久解鎖，可在我的寵物中選用。' },
  { id: 'char_fox',     category: 'pet', name: '狐狸',  price: 150, isFree: false, preview: '🦊', description: '購買後永久解鎖，可在我的寵物中選用。' },
  { id: 'char_bee',     category: 'pet', name: '蜜蜂',  price: 180, isFree: false, preview: '🐝', description: '購買後永久解鎖，可在我的寵物中選用。' },
  { id: 'char_shrimp',  category: 'pet', name: '蝦子',  price: 200, isFree: false, preview: '🦐', description: '購買後永久解鎖，可在我的寵物中選用。' },
]

export const AVATAR_FRAME_ITEMS: ShopItem[] = [
  { id: 'frame_ghost',   category: 'avatarFrame', name: '鬼月限定框（鬼門開）',   price: 1000, preview: '👻', description: '購買並使用後，右上角頭像邊框顯示鬼月限定裝飾。效果維持一天。' },
  { id: 'frame_soldier', category: 'avatarFrame', name: '軍人節榮譽徽章',         price: 1000, preview: '🎖️', description: '購買並使用後，右上角頭像邊框顯示軍人節榮譽徽章。效果維持一天。' },
  { id: 'frame_teacher', category: 'avatarFrame', name: '教師節智慧光環',         price: 1000, preview: '📘', description: '購買並使用後，右上角頭像邊框顯示教師節智慧光環。效果維持一天。' },
  { id: 'frame_water',   category: 'avatarFrame', name: '處暑西瓜框',             price: 1000, preview: '🍉', description: '購買並使用後，右上角頭像邊框顯示處暑西瓜裝飾。效果維持一天。' },
]

export const PARTICLE_ITEMS: ShopItem[] = [
  { id: 'ptc_bubble',  category: 'particle', name: '泡泡',     price: 100,  preview: '🫧', description: '使用後寵物周圍飄落泡泡粒子特效，持續一天。' },
  { id: 'ptc_star',    category: 'particle', name: '星星',     price: 200,  preview: '⭐', description: '使用後寵物周圍飄落星星粒子特效，持續一天。' },
  { id: 'ptc_heart',   category: 'particle', name: '心形',     price: 300,  preview: '❤️', description: '使用後寵物周圍飄落心形粒子特效，持續一天。' },
  { id: 'ptc_clover',  category: 'particle', name: '四葉幸運草', price: 400,  preview: '🍀', description: '使用後寵物周圍飄落幸運草粒子特效，持續一天。' },
  { id: 'ptc_sparkle', category: 'particle', name: '閃爍光芒', price: 500,  preview: '✨', description: '使用後寵物周圍飄落閃爍光芒粒子特效，持續一天。' },
  { id: 'ptc_money',   category: 'particle', name: '錢錢',     price: 600,  preview: '💰', description: '使用後寵物周圍飄落金幣粒子特效，持續一天。' },
  { id: 'ptc_flowers', category: 'particle', name: '隨機花草', price: 1000, preview: '🌸', description: '使用後寵物周圍飄落多種花草混合（2～3種），持續一天。' },
  { id: 'ptc_fruits',  category: 'particle', name: '隨機水果', price: 1000, preview: '🍎', description: '使用後寵物周圍飄落多種水果混合（2～3種），持續一天。' },
]

export const TREASURE_ITEMS: ShopItem[] = [
  { id: 'chest_basic', category: 'treasure', name: '基礎寶箱', price: 1500, preview: '📦',
    gemCount: 1, gemRewards: [10, 30], description: '開出隨機 10～30 寶石（單次抽取），效果立即兌現。' },
  { id: 'chest_mid',   category: 'treasure', name: '中階寶箱', price: 2500, preview: '🎁',
    gemCount: 1, gemRewards: [30, 50], description: '開出隨機 30～50 寶石（單次抽取），效果立即兌現。' },
  { id: 'chest_high',  category: 'treasure', name: '高階寶箱', price: 3500, preview: '💎',
    gemCount: 1, gemRewards: [50, 100], description: '開出隨機 50～100 寶石（單次抽取），效果立即兌現。' },
]

export const BACKGROUND_ITEMS: ShopItem[] = [
  { id: 'dream_macaron', category: 'background', name: '夢幻馬卡龍', price: 0, isFree: true,  preview: '🌈', description: '預設背景，免費使用。粉嫩馬卡龍漸層，溫柔舒適。' },
  { id: 'bg_starlight',  category: 'background', name: '星空晨曦',  price: 500, preview: '🌠', description: '購買並使用後套用星空晨曦背景，持續一天。' },
  { id: 'bg_peach',      category: 'background', name: '日落蜜桃',  price: 500, preview: '🌅', description: '購買並使用後套用日落蜜桃背景，持續一天。' },
  { id: 'bg_mint',       category: 'background', name: '薄荷森林',  price: 500, preview: '🌿', description: '購買並使用後套用薄荷森林背景，持續一天。' },
  { id: 'bg_ocean',      category: 'background', name: '靜謐深海',  price: 500, preview: '🌊', description: '購買並使用後套用靜謐深海深色背景，持續一天。' },
]

// 更明顯的背景漸層（加大對比與色彩飽和度）
export const BG_GRADIENTS: Record<string, string> = {
  dream_macaron: 'linear-gradient(135deg, #ffd6e3 0%, #c8f5e0 50%, #dce8ff 100%)',
  bg_starlight:  'linear-gradient(135deg, #1a1740 0%, #2e2a5a 50%, #1e1e3c 100%)',
  bg_peach:      'linear-gradient(135deg, #fce0a2 0%, #fff0b0 40%, #ffc8b0 100%)',
  bg_mint:       'linear-gradient(135deg, #b2f0e8 0%, #c8fad8 50%, #c6eeaa 100%)',
  bg_ocean:      'linear-gradient(135deg, #0e0e2e 0%, #1c1c6a 40%, #1040a0 100%)',
}

// 深色模式保留各主題的色相，但降低明度與飽和度，避免淺色背景刺眼。
export const BG_DARK_MODE_GRADIENTS: Record<string, string> = {
  dream_macaron: 'linear-gradient(135deg, #2b2028 0%, #192a25 50%, #1c2435 100%)',
  bg_starlight:  'linear-gradient(135deg, #14122f 0%, #252147 50%, #17172f 100%)',
  bg_peach:      'linear-gradient(135deg, #33251d 0%, #342d1d 40%, #362122 100%)',
  bg_mint:       'linear-gradient(135deg, #172b29 0%, #1d3028 50%, #27331f 100%)',
  bg_ocean:      'linear-gradient(135deg, #09091f 0%, #151552 40%, #0d327c 100%)',
}

// 背景的文字顏色（深色背景需要白色文字）
export const BG_DARK: Record<string, boolean> = {
  bg_starlight: true,
  bg_ocean:     true,
}

export const COIN_BONUS_ITEMS: ShopItem[] = [
  { id: 'bonus_10',  category: 'coinBonus', name: '每場 +10 金幣',  price: 50,  preview: '🪙', bonusValue: 10,  description: '使用後每場小遊戲結算時額外加 10 金幣，持續一天。' },
  { id: 'bonus_50',  category: 'coinBonus', name: '每場 +50 金幣',  price: 200, preview: '🪙', bonusValue: 50,  description: '使用後每場小遊戲結算時額外加 50 金幣，持續一天。' },
  { id: 'bonus_100', category: 'coinBonus', name: '每場 +100 金幣', price: 400, preview: '🪙', bonusValue: 100, description: '使用後每場小遊戲結算時額外加 100 金幣，持續一天。' },
]

export const COIN_MULTI_ITEMS: ShopItem[] = [
  { id: 'multi_11',  category: 'coinMultiplier', name: '每場 ×1.1',  price: 100, preview: '✖️', multiplierValue: 1.1,  description: '使用後每場小遊戲金幣乘以 1.1，持續一天。' },
  { id: 'multi_135', category: 'coinMultiplier', name: '每場 ×1.35', price: 300, preview: '✖️', multiplierValue: 1.35, description: '使用後每場小遊戲金幣乘以 1.35，持續一天。' },
  { id: 'multi_15',  category: 'coinMultiplier', name: '每場 ×1.5',  price: 700, preview: '✖️', multiplierValue: 1.5,  description: '使用後每場小遊戲金幣乘以 1.5，持續一天。' },
]

export { }

// ── 分類設定 ──────────────────────────────────────────────────

type TabId = 'pet' | 'avatarFrame' | 'particle' | 'treasure' | 'background' | 'coinBonus' | 'coinMultiplier'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'pet',            label: '寵物',     icon: '🐾' },
  { id: 'avatarFrame',    label: '頭像裝飾', icon: '🎖️' },
  { id: 'particle',       label: '雪花飄落', icon: '❄️' },
  { id: 'treasure',       label: '寶石寶箱', icon: '📦' },
  { id: 'background',     label: '背景主題', icon: '🖼️' },
  { id: 'coinBonus',      label: '金幣加值', icon: '➕' },
  { id: 'coinMultiplier', label: '金幣加成', icon: '✖️' },
]

// ── 有效期工具 ────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10) }
function isEntryActive(e: BackpackEntry) {
  return e.used && e.expiresAt >= todayStr()
}

// ── 購買確認 Modal ─────────────────────────────────────────────

interface ConfirmModalProps {
  item: ShopItem; coins: number
  onConfirm: () => void; onCancel: () => void; buying: boolean
}
function ConfirmModal({ item, coins, onConfirm, onCancel, buying }: ConfirmModalProps) {
  const canAfford = coins >= item.price
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="app-surface app-text relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl">
        <button onClick={onCancel} className="app-text-muted app-hover absolute right-4 top-4 rounded-lg transition" aria-label="關閉">
          <IconX size={20} />
        </button>
        <div className="flex flex-col items-center gap-3 mb-4">
          {item.isImage
            ? <img src={item.preview} alt={item.name} className="w-24 h-24 object-contain rounded-xl" style={{ border: '2px solid #FFB7C5' }} />
            : <div className="text-5xl">{item.preview}</div>
          }
          <h3 className="app-text text-lg font-bold">{item.name}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: '#FFB7C5', color: '#7B2D3E' }}>
            {TABS.find(t => t.id === item.category)?.label ?? item.category}
          </span>
        </div>
        <p className="app-text-muted text-sm text-center leading-relaxed mb-4">{item.description}</p>
        {item.category !== 'pet' && item.category !== 'treasure' && !item.isFree && (
          <p className="text-xs text-center text-amber-600 mb-4 font-medium">
            💡 購買後需在背包按「<strong>使用</strong>」才會開始計時一天
          </p>
        )}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-2xl">🪙</span>
          <span className="text-xl font-extrabold" style={{ color: '#e65100' }}>{item.price}</span>
          <span className="app-text-muted text-sm">金幣 · 剩餘 {coins} 枚</span>
        </div>
        {!canAfford && <p className="text-center text-sm text-red-500 mb-3 font-semibold">💸 金幣不足，無法購買</p>}
        <div className="flex gap-3">
          <button onClick={onCancel} className="app-hover app-text-secondary flex-1 rounded-xl py-2 text-sm font-semibold border transition">取消</button>
          <button onClick={onConfirm} disabled={!canAfford || buying}
            className="flex-1 rounded-xl py-2 text-sm font-semibold transition flex items-center justify-center gap-1.5"
            style={{ background: canAfford ? 'linear-gradient(135deg,#FFB7C5,#C7CEEA)' : '#e5e7eb', color: canAfford ? '#7B2D3E' : '#9ca3af', cursor: canAfford ? 'pointer' : 'not-allowed' }}>
            {buying ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <>確認購買</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 寶箱開獎 Modal ─────────────────────────────────────────────

function ChestResultModal({ item, rewards, onClose }: { item: ShopItem; rewards: number[]; onClose: () => void }) {
  const total = rewards.reduce((a, b) => a + b, 0)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="app-surface app-text w-full max-w-xs rounded-2xl border p-7 shadow-2xl text-center">
        <div className="text-5xl mb-3">{item.preview}</div>
        <h3 className="text-lg font-bold mb-1" style={{ color: '#7B2D3E' }}>🎉 寶箱開啟！</h3>
        <p className="app-text-muted text-sm mb-4">{item.name}</p>
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {rewards.map((r, i) => (
            <span key={i} className="px-3 py-1.5 rounded-full text-sm font-bold" style={{ background: '#FFDAC1', color: '#7B2D3E' }}>💎 +{r}</span>
          ))}
        </div>
        <p className="font-extrabold text-2xl mb-5" style={{ color: '#5B21B6' }}>共獲得 {total} 寶石！</p>
        <button onClick={onClose} className="w-full rounded-xl py-2.5 text-sm font-semibold transition"
          style={{ background: 'linear-gradient(135deg,#C7CEEA,#B5EAD7)', color: '#2d3748' }}>好耶！</button>
      </div>
    </div>
  )
}

// ── 商品卡片 ──────────────────────────────────────────────────

interface CardProps {
  item: ShopItem; coins: number
  isOwned: boolean; isEquipped: boolean; isActive?: boolean
  onBuyClick: (item: ShopItem) => void
  onEquip: (item: ShopItem) => void
}
function ShopCard({ item, coins, isOwned, isEquipped, isActive, onBuyClick, onEquip }: CardProps) {
  const isFree = !!item.isFree
  const canAfford = coins >= item.price
  const active = isEquipped || isActive

  return (
    <div className={`commerce-card relative flex flex-col items-center gap-2 rounded-2xl p-4 transition ${active ? 'is-active' : ''}`}>
      <span className="commerce-card-tag absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
        {TABS.find(t => t.id === item.category)?.label ?? item.category}
      </span>
      {active && (
        <span className="app-success absolute top-2 right-2 text-[10px] font-bold">✦ 使用中</span>
      )}
      <div className="mt-5 mb-1">
        {item.isImage
          ? <img src={item.preview} alt={item.name} className="commerce-card-preview w-20 h-20 object-contain rounded-xl border" />
          : <div className="text-4xl leading-none">{item.preview}</div>
        }
      </div>
      <p className="app-text text-sm font-semibold text-center leading-tight">{item.name}</p>
      {isFree && <span className="commerce-free-tag text-[10px] px-2 py-0.5 rounded-full font-semibold">免費</span>}

      {(isFree || isOwned) ? (
        <button onClick={() => onEquip(item)}
          className={`commerce-equip-button mt-auto w-full rounded-xl py-1.5 text-xs font-semibold transition ${isEquipped ? 'is-equipped' : ''}`}>
          {isEquipped ? '使用中 ✓' : '裝備'}
        </button>
      ) : (
        // 可購買的非免費品 — 顯示「購買 🪙xxx」
        <button onClick={() => onBuyClick(item)} disabled={!canAfford}
          className="commerce-buy-button mt-auto w-full rounded-xl py-1.5 text-xs font-semibold transition flex items-center justify-center gap-1">
          🪙 {item.price}
        </button>
      )}
    </div>
  )
}

// ── 主元件 ────────────────────────────────────────────────────

interface Props {
  db: Firestore; uid: string; userData: UserData
  onUserDataChanged: (updated: Partial<UserData>) => void
  onShowToast: (msg: string, type?: string) => void
}

export default function ShopPage({ db, uid, userData, onUserDataChanged, onShowToast }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('pet')
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null)
  const [buying, setBuying] = useState(false)
  const [chestResult, setChestResult] = useState<{ item: ShopItem; rewards: number[] } | null>(null)

  const coins        = userData.coins ?? 0
  const owned        = userData.ownedCostumes ?? []
  const equippedSkin = userData.equippedPetSkin ?? null
  const equippedCharacter = userData.equippedCharacter ?? '熊'
  const equippedBg   = userData.equippedBg ?? 'dream_macaron'
  const bgExpiry     = userData.bgExpiry ?? null
  const equippedParticle    = userData.equippedParticle ?? null
  const equippedAvatarFrame = userData.equippedAvatarFrame ?? null

  const today = todayStr()

  // 背包中「已使用且有效」的條目
  const hasActiveEntry = (id: string) =>
    (userData.backpack ?? []).some(e => e.id === id && isEntryActive(e))

  // 背景是否有效（免費的永遠有效，付費的需在 bgExpiry 有效期內）
  const isBgActive = (id: string) => {
    if (id === 'dream_macaron') return true
    return equippedBg === id && !!bgExpiry && bgExpiry >= today
  }

  // ── 裝備寵物外型 ────────────────────────────────────────
  const handleEquipPet = async (item: ShopItem) => {
    const nextId = equippedSkin === item.id ? null : item.id
    await equipPetSkin(db, uid, nextId)
    onUserDataChanged({ equippedPetSkin: nextId })
    onShowToast(nextId ? `已裝備「${item.name}」` : '已卸下造型', 'success')
  }

  // 角色與圖片寵物共用商城分類，但使用不同的裝備欄位。
  const handleEquipCharacter = async (item: ShopItem) => {
    await updateDoc(doc(db, 'users', uid), {
      equippedCharacter: item.name,
      equippedPetSkin: null,
    })
    onUserDataChanged({ equippedCharacter: item.name, equippedPetSkin: null })
    onShowToast(`已裝備「${item.name}」`, 'success')
  }

  // ── 套用背景（背包使用後呼叫） ──────────────────────────
  const handleEquipBg = async (item: ShopItem) => {
    if (!item.isFree && !hasActiveEntry(item.id)) {
      onShowToast('請先在背包按「使用」此背景', 'error'); return
    }
    const expiry = item.isFree ? null : (() => {
      const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10)
    })()
    await equipBackground(db, uid, item.id, expiry)
    onUserDataChanged({ equippedBg: item.id, bgExpiry: expiry })
    onShowToast(`已套用「${item.name}」背景`, 'success')
  }

  // ── 套用頭像框（背包使用後呼叫） ──────────────────────
  const handleEquipAvatarFrame = async (item: ShopItem) => {
    if (!hasActiveEntry(item.id)) {
      onShowToast('請先在背包按「使用」此頭像框', 'error'); return
    }
    const nextId = equippedAvatarFrame === item.id ? null : item.id
    const expiry = nextId ? (() => {
      const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10)
    })() : null
    await equipAvatarFrame(db, uid, nextId, expiry)
    onUserDataChanged({ equippedAvatarFrame: nextId, avatarFrameExpiry: expiry })
    onShowToast(nextId ? `已裝備「${item.name}」頭像框` : '已卸下頭像框', 'success')
  }

  // ── 套用粒子特效（背包使用後呼叫） ──────────────────────
  const handleEquipParticle = async (item: ShopItem) => {
    if (!hasActiveEntry(item.id)) {
      onShowToast('請先在背包按「使用」此粒子特效', 'error'); return
    }
    const nextId = equippedParticle === item.id ? null : item.id
    await updateDoc(doc(db, 'users', uid), { equippedParticle: nextId })
    onUserDataChanged({ equippedParticle: nextId })
    onShowToast(nextId ? `已啟用「${item.name}」粒子特效` : '已關閉粒子特效', 'success')
  }

  // ── 確認購買 ────────────────────────────────────────────
  const handleConfirmBuy = async () => {
    if (!confirmItem) return
    setBuying(true)
    try {
      if (confirmItem.category === 'pet') {
        const { newCoins, ownedCostumes } = await purchasePetSkin(db, uid, confirmItem, userData)
        onUserDataChanged({ coins: newCoins, ownedCostumes })
        onShowToast(`🎉 成功購買「${confirmItem.name}」！`, 'success')
        setConfirmItem(null)

      } else if (confirmItem.category === 'treasure') {
        // 寶箱：立即開出隨機寶石，不存入背包
        const { newCoins } = await purchaseShopItem(db, uid, confirmItem, userData)
        const [min, max] = confirmItem.gemRewards ?? [10, 30]
        const count = confirmItem.gemCount ?? 1
        const rewards: number[] = []
        for (let i = 0; i < count; i++) {
          rewards.push(Math.floor(Math.random() * (max - min + 1)) + min)
        }
        const totalGems = rewards.reduce((a, b) => a + b, 0)
        const newGems = (userData.gems ?? 0) + totalGems
        await updateDoc(doc(db, 'users', uid), { gems: newGems })
        onUserDataChanged({ coins: newCoins, gems: newGems })
        setConfirmItem(null)
        setChestResult({ item: confirmItem, rewards })

      } else {
        // 其他道具：存入背包（used=false），需手動在背包「使用」
        const { newCoins, backpack } = await purchaseShopItem(db, uid, confirmItem, userData)
        onUserDataChanged({ coins: newCoins, backpack })
        onShowToast(`✅ 已加入背包！請前往背包按「使用」來啟動效果`, 'success')
        setConfirmItem(null)
      }
    } catch (e: unknown) {
      onShowToast(e instanceof Error ? e.message : '購買失敗', 'error')
    } finally {
      setBuying(false)
    }
  }

  // ── 根據分頁渲染商品 ────────────────────────────────────
  const renderItems = () => {
    switch (activeTab) {
      case 'pet':
        return [...PET_SKINS, ...CHARACTER_ITEMS].map(item => (
          <ShopCard key={item.id} item={item} coins={coins}
            isOwned={item.isFree || owned.includes(item.id)}
            isEquipped={item.id.startsWith('char_')
              ? equippedSkin === null && equippedCharacter === item.name
              : equippedSkin === item.id}
            onBuyClick={setConfirmItem}
            onEquip={item.id.startsWith('char_') ? handleEquipCharacter : handleEquipPet} />
        ))

      case 'avatarFrame':
        return AVATAR_FRAME_ITEMS.map(item => (
          <ShopCard key={item.id} item={item} coins={coins}
            isOwned={false} isEquipped={false}
            isActive={equippedAvatarFrame === item.id && hasActiveEntry(item.id)}
            onBuyClick={setConfirmItem} onEquip={handleEquipAvatarFrame} />
        ))

      case 'particle':
        return PARTICLE_ITEMS.map(item => (
          <ShopCard key={item.id} item={item} coins={coins}
            isOwned={false} isEquipped={false}
            isActive={equippedParticle === item.id && hasActiveEntry(item.id)}
            onBuyClick={setConfirmItem} onEquip={handleEquipParticle} />
        ))

      case 'treasure':
        return TREASURE_ITEMS.map(item => (
          <ShopCard key={item.id} item={item} coins={coins}
            isOwned={false} isEquipped={false}
            onBuyClick={setConfirmItem} onEquip={() => {}} />
        ))

      case 'background':
        return BACKGROUND_ITEMS.map(item => (
          <ShopCard key={item.id} item={item} coins={coins}
            isOwned={item.isFree || hasActiveEntry(item.id)}
            isEquipped={isBgActive(item.id)}
            onBuyClick={setConfirmItem} onEquip={handleEquipBg} />
        ))

      case 'coinBonus':
        return COIN_BONUS_ITEMS.map(item => (
          <ShopCard key={item.id} item={item} coins={coins}
            isOwned={false} isEquipped={false}
            isActive={hasActiveEntry(item.id)}
            onBuyClick={setConfirmItem} onEquip={() => {}} />
        ))

      case 'coinMultiplier':
        return COIN_MULTI_ITEMS.map(item => (
          <ShopCard key={item.id} item={item} coins={coins}
            isOwned={false} isEquipped={false}
            isActive={hasActiveEntry(item.id)}
            onBuyClick={setConfirmItem} onEquip={() => {}} />
        ))
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-5 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <IconShoppingCart size={22} className="text-amber-500" />
            造型商城
          </h2>
          <p className="app-text-muted text-sm mt-0.5">用金幣為你的世界增添色彩</p>
        </div>
        <div className="commerce-coin-badge flex items-center gap-1.5 border px-4 py-2 rounded-full text-sm font-bold shadow-sm">
          <IconCoin size={18} stroke={1.8} color="#f59e0b" />
          <span style={{ color: '#e65100' }}>{coins}</span>
          <span className="font-normal text-xs" style={{ color: '#9a5a00' }}>金幣</span>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`commerce-tab flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition border ${activeTab === tab.id ? 'is-active' : ''}`}>
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{renderItems()}</div>

      <div className="commerce-info-card rounded-xl border px-4 py-3 text-xs flex items-start gap-2">
        <IconSparkles size={15} className="flex-shrink-0 mt-0.5" />
        <span>
          玩遊戲得 🪙 金幣；每日問答/打卡得 💎 寶石。
          <strong>購買後需在背包按「使用」才開始計時一天</strong>（寵物外型與寶箱除外）。
        </span>
      </div>

      {confirmItem && (
        <ConfirmModal item={confirmItem} coins={coins}
          onConfirm={handleConfirmBuy} onCancel={() => setConfirmItem(null)} buying={buying} />
      )}
      {chestResult && (
        <ChestResultModal item={chestResult.item} rewards={chestResult.rewards} onClose={() => setChestResult(null)} />
      )}
    </main>
  )
}
