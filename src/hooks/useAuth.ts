// src/hooks/useAuth.ts
import { useState, useEffect } from 'react'
import {
  onAuthStateChanged, User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider,
  signOut, updateProfile,
} from 'firebase/auth'
import { Auth } from 'firebase/auth'
import { Firestore } from 'firebase/firestore'
import { ensureUserDoc } from '../lib/firestore'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export function useAuth(auth: Auth | null, db: Firestore | null) {
  const [user,   setUser]   = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    if (!auth) { setStatus('unauthenticated'); return }
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u && db) {
        await ensureUserDoc(db, u.uid, u.displayName ?? '朋友', u.email ?? '')
      }
      setUser(u)
      setStatus(u ? 'authenticated' : 'unauthenticated')
    })
    return unsub
  }, [auth, db])

  const login = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase 未初始化')
    await signInWithEmailAndPassword(auth, email, password)
  }

  const register = async (name: string, email: string, password: string) => {
    if (!auth) throw new Error('Firebase 未初始化')
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })
    if (db) await ensureUserDoc(db, cred.user.uid, name, email)
  }

  const loginGoogle = async () => {
    if (!auth) throw new Error('Firebase 未初始化')
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  const logout = () => auth && signOut(auth)

  return { user, status, login, register, loginGoogle, logout }
}
