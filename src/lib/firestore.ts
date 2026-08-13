// src/lib/firestore.ts  — Firestore CRUD helpers

import {
  doc, getDoc, updateDoc, runTransaction,
  collection, addDoc, query, where,
  getDocs, serverTimestamp, Firestore,
} from 'firebase/firestore'
import { User } from 'firebase/auth'

export interface UserData {
  displayName:      string
  email:            string
  gems:             number
  streak:           number
  lastAnsweredDate: string | null
  photoURL?:         string | null
  providerId?:       string | null
  createdAt?:        unknown
  lastLoginAt?:      unknown
}

export interface AnswerRecord {
  id?:       string
  uid:       string
  date:      string
  question:  string
  category:  string
  answer:    string
  gems:      number
  createdAt?: unknown
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
      streak:           0,
      lastAnsweredDate: null,
      createdAt:        serverTimestamp(),
    })
  })
}

export async function getUserData(db: Firestore, uid: string): Promise<UserData> {
  const snap = await getDoc(doc(db, 'users', uid))
  return (snap.data() ?? { displayName: '朋友', email: '', gems: 0, streak: 0, lastAnsweredDate: null }) as UserData
}

export async function saveAnswer(
  db: Firestore,
  record: Omit<AnswerRecord, 'id' | 'createdAt'>
): Promise<void> {
  await addDoc(collection(db, 'answers'), {
    ...record,
    createdAt: serverTimestamp(),
  })
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
  const newStreak = prevDate === yesterday ? (currentData.streak || 0) + 1 : 1
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

function timestampMillis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value) {
    const toMillis = (value as { toMillis?: unknown }).toMillis
    if (typeof toMillis === 'function') {
      return toMillis.call(value) as number
    }
  }
  return 0
}
