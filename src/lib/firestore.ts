// src/lib/firestore.ts  — Firestore CRUD helpers

import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, runTransaction,
  collection, addDoc, query, where, increment,
  getDocs, serverTimestamp, writeBatch, Firestore,
} from 'firebase/firestore'
import { User } from 'firebase/auth'

export interface UserData {
  displayName:      string
  description?:     string
  email:            string
  gems:             number
  coins:            number
  streak:           number
  lastAnsweredDate: string | null
  photoURL?:         string | null
  providerId?:       string | null
  createdAt?:        unknown
  lastLoginAt?:      unknown
  petEmotion?:       string | null
  petColorR?:        number
  petColorG?:        number
  petColorB?:        number
  ownedCostumes?:    string[]
  equippedCostume?:  string | null
  // 新商城系統
  equippedPetSkin?:     string | null   // 裝備中的寵物外型 id
  equippedBg?:          string | null   // 裝備中的背景 id
  equippedParticle?:    string | null   // 裝備中的粒子特效 id
  equippedDecor?:       string | null   // 裝備中的舊節日裝飾 id（已廢棄，改用頭像框）
  equippedAvatarFrame?: string | null   // 裝備中的頭像框 id
  coinBonus?:           number          // 金幣加值（+n/場，有效期內）
  coinMultiplier?:      number          // 金幣加成（倍率，有效期內）
  bonusExpiry?:         string | null   // 加值到期日 YYYY-MM-DD
  multiplierExpiry?:    string | null   // 加成到期日 YYYY-MM-DD
  particleExpiry?:      string | null   // 粒子特效到期日 YYYY-MM-DD
  avatarFrameExpiry?:   string | null   // 頭像框到期日 YYYY-MM-DD
  bgExpiry?:            string | null   // 背景到期日 YYYY-MM-DD
  // 背包：購買後未使用 / 已使用（開始計時）的條目
  backpack?:            BackpackEntry[]
}

/** 背包條目（購買後需手動「使用」才開始計時一天） */
export interface BackpackEntry {
  id:          string   // 商品 id
  name:        string
  category:    string   // 商品分類
  purchasedAt: string   // YYYY-MM-DD 購買日
  expiresAt:   string   // YYYY-MM-DD 到期日（使用後填入，未使用時為空字串）
  price:       number
  preview:     string   // emoji or url
  used:        boolean  // 是否已按「使用」開始計時
  usedAt?:     string   // YYYY-MM-DD 幾號開始使用
}

export interface CostumeItem {
  id:          string
  name:        string
  description: string
  price:       number
  preview:     string
  rarity:      'common' | 'rare' | 'epic' | 'legendary'
}

/** 新商城商品型別（統一介面） */
export type ShopCategory = 'pet' | 'avatarFrame' | 'particle' | 'treasure' | 'background' | 'coinBonus' | 'coinMultiplier'

export interface ShopItem {
  id:          string
  category:    ShopCategory
  name:        string
  description: string
  price:       number
  preview:     string        // emoji 或圖片路徑
  isImage?:    boolean       // preview 是否為圖片路徑
  isFree?:     boolean       // 基礎款（免費解鎖）
  bonusValue?: number        // 用於 coinBonus 的每場加值金額
  multiplierValue?: number   // 用於 coinMultiplier 的倍率
  gemRewards?:  number[]     // 寶箱開出可能的寶石數量範圍
  gemCount?:    number       // 寶箱一次開出幾種
}

export interface AnswerRecord {
  id?:             string
  uid:             string
  date:            string
  questionId?:     string
  question:        string
  category:        string
  answer:          string
  gems:            number
  isPublic?:       boolean
  createdAt?:      unknown
  updatedAt?:      unknown
}

type NewAnswerRecord = Omit<AnswerRecord, 'id' | 'questionId' | 'createdAt' | 'updatedAt'> & {
  questionId: string
  isPublic:   boolean
}

// ── 新商城 CRUD ──────────────────────────────────────────────

/** 購買新商城道具（可重複購買，寫入背包，扣除金幣；購買後 used=false，需手動使用） */
export async function purchaseShopItem(
  db:          Firestore,
  uid:         string,
  item:        ShopItem,
  currentData: UserData
): Promise<{ newCoins: number; backpack: BackpackEntry[] }> {
  const currentCoins = currentData.coins ?? 0
  if (currentCoins < item.price) throw new Error('金幣不足')
  const newCoins = currentCoins - item.price
  const todayStr = new Date().toISOString().slice(0, 10)
  const entry: BackpackEntry = {
    id:          item.id,
    name:        item.name,
    category:    item.category,
    purchasedAt: todayStr,
    expiresAt:   '',        // 未使用時為空，使用後填入隔天日期
    price:       item.price,
    preview:     item.preview,
    used:        false,
  }
  const existing = currentData.backpack ?? []
  const newBackpack = [...existing, entry]
  await updateDoc(doc(db, 'users', uid), {
    coins: newCoins,
    backpack: newBackpack,
  })
  return { newCoins, backpack: newBackpack }
}

/** 使用背包條目（開始計時一天），回傳到期日與更新後背包 */
export async function useBackpackItem(
  db:          Firestore,
  uid:         string,
  entryIndex:  number,      // 背包陣列中的索引
  currentData: UserData
): Promise<{ backpack: BackpackEntry[]; expiresAt: string }> {
  const backpack = [...(currentData.backpack ?? [])]
  const entry = backpack[entryIndex]
  if (!entry) throw new Error('找不到背包條目')
  if (entry.used) throw new Error('此道具已在使用中')

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)

  backpack[entryIndex] = { ...entry, used: true, usedAt: todayStr, expiresAt: tomorrowStr }
  await updateDoc(doc(db, 'users', uid), { backpack })
  return { backpack, expiresAt: tomorrowStr }
}

/** 購買進階寵物外型（只能買一次，無過期） */
export async function purchasePetSkin(
  db:          Firestore,
  uid:         string,
  item:        ShopItem,
  currentData: UserData
): Promise<{ newCoins: number; ownedCostumes: string[] }> {
  const currentCoins = currentData.coins ?? 0
  if (currentCoins < item.price) throw new Error('金幣不足')
  const owned = currentData.ownedCostumes ?? []
  if (owned.includes(item.id)) throw new Error('已擁有此造型')
  const newCoins = currentCoins - item.price
  const newOwned = [...owned, item.id]
  await updateDoc(doc(db, 'users', uid), {
    coins: newCoins,
    ownedCostumes: newOwned,
  })
  return { newCoins, ownedCostumes: newOwned }
}

/** 裝備寵物外型 */
export async function equipPetSkin(
  db:  Firestore,
  uid: string,
  skinId: string | null
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { equippedPetSkin: skinId })
}

/** 裝備背景 */
export async function equipBackground(
  db:  Firestore,
  uid: string,
  bgId: string | null,
  bgExpiry?: string | null
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { equippedBg: bgId, bgExpiry: bgExpiry ?? null })
}

/** 裝備頭像框 */
export async function equipAvatarFrame(
  db:  Firestore,
  uid: string,
  frameId: string | null,
  frameExpiry?: string | null
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { equippedAvatarFrame: frameId, avatarFrameExpiry: frameExpiry ?? null })
}

export async function ensureUserDoc(
  db: Firestore,
  user: User
): Promise<void> {
  const ref = doc(db, 'users', user.uid)
  const identity = {
    email:      user.email ?? '',
    photoURL:   user.photoURL ?? null,
    providerId: user.providerData[0]?.providerId ?? null,
    lastLoginAt: serverTimestamp(),
  }
  await runTransaction(db, async transaction => {
    const snap = await transaction.get(ref)

    if (snap.exists()) {
      transaction.update(ref, {
        ...identity,
        ...(user.displayName ? { displayName: user.displayName } : {}),
      })
      return
    }

    transaction.set(ref, {
        ...identity,
        displayName:      user.displayName ?? '朋友',
        gems:             0,
        coins:            0,
        streak:           0,
        lastAnsweredDate: null,
        petColorR:        180,
        petColorG:        150,
        petColorB:        200,
        petEmotion:       null,
        ownedCostumes:    [],
        equippedCostume:     null,
        equippedPetSkin:     null,
        equippedBg:          'dream_macaron',
        equippedParticle:    null,
        equippedDecor:       null,
        equippedAvatarFrame: null,
        coinBonus:           0,
        coinMultiplier:      1,
        bonusExpiry:         null,
        multiplierExpiry:    null,
        particleExpiry:      null,
        avatarFrameExpiry:   null,
        bgExpiry:            null,
        backpack:            [],
        createdAt:        serverTimestamp(),
      })
  })
}

export async function getUserData(db: Firestore, uid: string): Promise<UserData> {
  const snap = await getDoc(doc(db, 'users', uid))
  const data = snap.data() ?? {}
  return {
    displayName:     '朋友',
    email:           '',
    gems:            0,
    coins:           0,
    streak:          0,
    lastAnsweredDate: null,
    petColorR:       180,
    petColorG:       150,
    petColorB:       200,
    petEmotion:      null,
    ownedCostumes:       [],
    equippedCostume:     null,
    equippedPetSkin:     null,
    equippedBg:          'dream_macaron',
    equippedParticle:    null,
    equippedDecor:       null,
    equippedAvatarFrame: null,
    coinBonus:           0,
    coinMultiplier:      1,
    bonusExpiry:         null,
    multiplierExpiry:    null,
    particleExpiry:      null,
    avatarFrameExpiry:   null,
    bgExpiry:            null,
    backpack:            [],
    ...data,
  } as UserData
}

export async function saveAnswer(
  db: Firestore,
  record: NewAnswerRecord
): Promise<void> {
  await setDoc(doc(db, 'answers', answerDocumentId(record.uid, record.date, record.questionId)), {
    ...record,
    createdAt: serverTimestamp(),
  })
}

function answerDocumentId(uid: string, date: string, questionId: string): string {
  return `${uid}_${date}_${questionId}`
}

export async function rewardUser(
  db:           Firestore,
  uid:          string,
  gemsEarned:   number,
  today:        string,
  yesterday:    string,
  currentData:  UserData
): Promise<{ newGems: number; newStreak: number }> {
  const prevDate  = currentData.lastAnsweredDate
  const newStreak = prevDate === today
    ? (currentData.streak || 0)
    : prevDate === yesterday
      ? (currentData.streak || 0) + 1
      : 1
  const newGems   = (currentData.gems || 0) + gemsEarned

  await updateDoc(doc(db, 'users', uid), {
    gems:             newGems,
    streak:           newStreak,
    lastAnsweredDate: today,
  })

  return { newGems, newStreak }
}

export async function fetchAnswers(
  db:  Firestore,
  uid: string,
  max: number = 50
): Promise<AnswerRecord[]> {
  const q = query(
    collection(db, 'answers'),
    where('uid', '==', uid)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as AnswerRecord))
    .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt))
    .slice(0, max)
}

export async function updateUserData(
  db: Firestore,
  uid: string,
  profile: Pick<UserData, 'displayName' | 'description'>
): Promise<void> {
  const displayName = profile.displayName.trim()
  const batch = writeBatch(db)
  batch.update(doc(db, 'users', uid), {
    displayName,
    description: profile.description?.trim() ?? '',
  })
  await batch.commit()
}

export async function fetchPublicAnswers(
  db: Firestore,
  currentUid: string,
  max: number = 12
): Promise<AnswerRecord[]> {
  const q = query(
    collection(db, 'answers'),
    where('isPublic', '==', true)
  )
  const snap = await getDocs(q)
  const answers = snap.docs
    .map(d => ({ id: d.id, ...d.data() } as AnswerRecord))
    .filter(answer => answer.uid !== currentUid)
    .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt))
    .slice(0, max)

  return answers
}

export async function updateAnswer(
  db: Firestore,
  answerId: string,
  answer: string,
  isPublic: boolean
): Promise<void> {
  await updateDoc(doc(db, 'answers', answerId), {
    answer: answer.trim(),
    isPublic,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteAnswer(
  db: Firestore,
  answerId: string
): Promise<void> {
  await deleteDoc(doc(db, 'answers', answerId))
}

// ── Mood Check-in ──────────────────────────────────────────

export type MoodLevel = 'thunder' | 'rain' | 'volcano' | 'sunny' | 'cloudy' | 'rainbow'

export interface MoodRecord {
  id?:       string
  uid:       string
  date:      string        // YYYY-MM-DD
  mood:      MoodLevel
  note:      string
  createdAt?: unknown
}

export async function saveMoodCheckIn(
  db:     Firestore,
  record: Omit<MoodRecord, 'id' | 'createdAt'>
): Promise<void> {
  await addDoc(collection(db, 'moods'), {
    ...record,
    createdAt: serverTimestamp(),
  })
}

export async function fetchMoods(
  db:  Firestore,
  uid: string,
  max: number = 60
): Promise<MoodRecord[]> {
  const q    = query(collection(db, 'moods'), where('uid', '==', uid))
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as MoodRecord))
    .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt))
    .slice(0, max)
}

export async function getTodayMood(
  db:    Firestore,
  uid:   string,
  today: string
): Promise<MoodRecord | null> {
  // Querying also keeps records created with the previous auto-ID format readable.
  const q    = query(
    collection(db, 'moods'),
    where('uid',  '==', uid),
    where('date', '==', today)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as MoodRecord
}

function timestampMillis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value) {
    const toMillis = (value as { toMillis?: unknown }).toMillis
    if (typeof toMillis === 'function') {
      return toMillis.call(value) as number
    }
  }
  return 0
}

// ── Anonymous treehole ──────────────────────────────────────

export interface TreeholePost {
  id?: string
  text: string
  moodKey: MoodLevel | null
  anonName: string
  anonEmoji: string
  likes: number
  resonates: number
  createdAt?: unknown
}

export async function saveTreeholePost(
  db: Firestore,
  post: Omit<TreeholePost, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'treehole'), { ...post, createdAt: serverTimestamp() })
  return ref.id
}

export async function fetchTreeholePosts(db: Firestore, max: number = 100): Promise<TreeholePost[]> {
  const snap = await getDocs(query(collection(db, 'treehole')))
  return snap.docs
    .map(item => ({ id: item.id, ...item.data() } as TreeholePost))
    .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt))
    .slice(0, max)
}

export async function toggleTreeholeReaction(
  db: Firestore,
  postId: string,
  field: 'likes' | 'resonates',
  delta: 1 | -1
): Promise<void> {
  await updateDoc(doc(db, 'treehole', postId), { [field]: increment(delta) })
}

// ── Shop & Pet Color System ──────────────────────────────────

// 情緒 RGB 偏移規則（來自設計表格）
export const EMOTION_RGB_DELTAS: Record<string, { r: number; g: number; b: number; label: string }> = {
  happy:   { r: +3,  g: +3,  b: -2, label: '快樂' },
  sad:     { r: -3,  g: -3,  b: +4, label: '悲傷' },
  angry:   { r: +6,  g: -3,  b: -3, label: '憤怒' },
  fearful: { r: -4,  g: -4,  b: -1, label: '恐懼' },
}

/** 將寶石餵食應用到寵物顏色，每顆寶石放大一次 delta */
export function applyEmotionToColor(
  baseR: number, baseG: number, baseB: number,
  emotion: string,
  gemCount: number
): { r: number; g: number; b: number } {
  const delta = EMOTION_RGB_DELTAS[emotion]
  if (!delta) return { r: baseR, g: baseG, b: baseB }
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return {
    r: clamp(baseR + delta.r * gemCount),
    g: clamp(baseG + delta.g * gemCount),
    b: clamp(baseB + delta.b * gemCount),
  }
}

/** 以 RGB 建構 hex 色碼 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

/** 用寶石餵食寵物，更新 petColorR/G/B 到 Firestore */
export async function feedPetGems(
  db: Firestore,
  uid: string,
  emotion: string,
  gemCount: number,
  currentData: UserData
): Promise<{ newGems: number; newPetR: number; newPetG: number; newPetB: number }> {
  const baseR = currentData.petColorR ?? 180
  const baseG = currentData.petColorG ?? 150
  const baseB = currentData.petColorB ?? 200
  const { r, g, b } = applyEmotionToColor(baseR, baseG, baseB, emotion, gemCount)
  const newGems = Math.max(0, (currentData.gems ?? 0) - gemCount)
  await updateDoc(doc(db, 'users', uid), {
    gems:       newGems,
    petColorR:  r,
    petColorG:  g,
    petColorB:  b,
    petEmotion: emotion,
  })
  return { newGems, newPetR: r, newPetG: g, newPetB: b }
}

/** 用金幣購買造型 */
export async function purchaseCostume(
  db: Firestore,
  uid: string,
  costumeId: string,
  price: number,
  currentData: UserData
): Promise<{ newCoins: number; ownedCostumes: string[] }> {
  const currentCoins = currentData.coins ?? 0
  if (currentCoins < price) throw new Error('金幣不足')
  const owned = currentData.ownedCostumes ?? []
  if (owned.includes(costumeId)) throw new Error('已擁有此造型')
  const newCoins = currentCoins - price
  const newOwned = [...owned, costumeId]
  await updateDoc(doc(db, 'users', uid), {
    coins:         newCoins,
    ownedCostumes: newOwned,
  })
  return { newCoins, ownedCostumes: newOwned }
}

/** 裝備造型 */
export async function equipCostume(
  db: Firestore,
  uid: string,
  costumeId: string | null
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { equippedCostume: costumeId })
}

/** 新增金幣（遊戲或其他來源） */
export async function addCoins(
  db: Firestore,
  uid: string,
  amount: number
): Promise<number> {
  const userRef = doc(db, 'users', uid)
  const delta = Math.floor(amount)

  return runTransaction(db, async transaction => {
    const snap = await transaction.get(userRef)
    if (!snap.exists()) throw new Error('找不到使用者資料')

    const current = Number(snap.data().coins ?? 0)
    const newCoins = Math.max(0, current + delta)
    transaction.update(userRef, { coins: newCoins })
    return newCoins
  })
}
