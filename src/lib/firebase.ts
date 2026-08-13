// src/lib/firebase.ts
// Firebase is initialized lazily from config stored in localStorage.
// On first visit, the user sees a setup modal to enter their credentials.

import { initializeApp, FirebaseApp, getApps } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'

export interface AppConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
  geminiApiKey: string
}

const CONFIG_KEY = 'dailygem_config'

export function loadConfig(): AppConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) return JSON.parse(raw) as AppConfig
  } catch (_) {}
  return null
}

export function persistConfig(cfg: AppConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
}

let _auth: Auth | null = null
let _db: Firestore | null = null

export function initFirebase(cfg: AppConfig): { auth: Auth; db: Firestore } {
  if (!_auth || !_db) {
    const existing = getApps()
    const app: FirebaseApp =
      existing.length > 0
        ? existing[0]
        : initializeApp({
            apiKey:            cfg.apiKey,
            authDomain:        cfg.authDomain,
            projectId:         cfg.projectId,
            storageBucket:     cfg.storageBucket,
            messagingSenderId: cfg.messagingSenderId,
            appId:             cfg.appId,
          })
    _auth = getAuth(app)
    _db   = getFirestore(app)
  }
  return { auth: _auth, db: _db }
}

export function getFirebaseAuth() { return _auth }
export function getFirebaseDb()   { return _db }
