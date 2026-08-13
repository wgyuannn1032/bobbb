// src/lib/firestore.ts  — Firestore CRUD helpers

import {
  doc, getDoc, setDoc, updateDoc,
  collection, addDoc, query, where,
  orderBy, getDocs, serverTimestamp,
  limit, Firestore,
} from 'firebase/firestore'

export interface UserData {
  displayName:      string
  email:            string
  gems:             number
  streak:           number
  lastAnsweredDate: string | null
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
  uid: string,
  displayName: string,
  email: string
): Promise<void> {
  const ref  = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName,
      email,
      gems:             0,
      streak:           0,
      lastAnsweredDate: null,
      createdAt:        serverTimestamp(),
    })
  }
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
  const q    = query(
    collection(db, 'answers'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(max)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AnswerRecord))
}
