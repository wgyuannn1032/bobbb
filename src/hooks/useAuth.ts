// src/hooks/useAuth.ts
import { useState, useEffect } from 'react'
import {
  onAuthStateChanged, User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider,
  signOut, updateProfile,
  browserLocalPersistence, setPersistence,
} from 'firebase/auth'
import { Auth } from 'firebase/auth'
import { Firestore } from 'firebase/firestore'
import { ensureUserDoc } from '../lib/firestore'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export function useAuth(auth: Auth | null, db: Firestore | null) {
  const [user,   setUser]   = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    if (!auth) {
      setUser(null)
      setStatus('loading')
      return
    }

    let active = true
    let unsubscribe: (() => void) | undefined
    setStatus('loading')

    const restoreSession = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence)
      } catch (error) {
        console.warn('無法啟用 Firebase 本機登入持久化：', error)
      }

      if (!active) return

      unsubscribe = onAuthStateChanged(auth, async (u) => {
        if (u && db) {
          try {
            await ensureUserDoc(db, u)
          } catch (error) {
            console.error('無法同步 Firestore 使用者資料：', error)
          }
        }

        if (!active) return
        setUser(u)
        setStatus(u ? 'authenticated' : 'unauthenticated')
      }, error => {
        console.error('無法恢復 Firebase 登入狀態：', error)
        if (!active) return
        setUser(null)
        setStatus('unauthenticated')
      })
    }

    void restoreSession()

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [auth, db])

  const login = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase 未初始化')
    await signInWithEmailAndPassword(auth, email, password)
  }

  const register = async (name: string, email: string, password: string) => {
    if (!auth) throw new Error('Firebase 未初始化')
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })
    if (db) await ensureUserDoc(db, cred.user)
  }

  const loginGoogle = async () => {
    if (!auth) throw new Error('Firebase 未初始化')
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  const logout = () => auth && signOut(auth)

  return { user, status, login, register, loginGoogle, logout }
}
