// src/lib/firebase.ts
// Firebase is initialized lazily from the built-in project configuration.
// A localStorage value, when present, is kept for backwards compatibility.

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
  measurementId?: string
  geminiApiKey: string
}

const CONFIG_KEY = 'dailygem_config'

const DEFAULT_CONFIG: AppConfig = {
  apiKey: 'AIzaSyBh5shEZOkiCKxKQ0sQ8VFE0bRHMv4anBI',
  authDomain: 'my-awesome-project-116fd.firebaseapp.com',
  projectId: 'my-awesome-project-116fd',
  storageBucket: 'my-awesome-project-116fd.firebasestorage.app',
  messagingSenderId: '735684914733',
  appId: '1:735684914733:web:b54ace4157d4df339bd2a4',
  measurementId: 'G-ZCV660FPHW',
  geminiApiKey: '',
}

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<AppConfig>
      return { ...DEFAULT_CONFIG, geminiApiKey: saved.geminiApiKey ?? '' }
    }
  } catch (_) {}
  return { ...DEFAULT_CONFIG }
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
            measurementId:     cfg.measurementId,
          })
    _auth = getAuth(app)
    _db   = getFirestore(app)
  }
  return { auth: _auth, db: _db }
}

export function getFirebaseAuth() { return _auth }
export function getFirebaseDb()   { return _db }
