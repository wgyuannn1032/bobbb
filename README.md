# DailyGem 💎 — 每日一問應用

互動式每日反思網頁應用，每天回答一個 AI 生成的深度問題，累積寶石獎勵。

## 技術架構

| 層次 | 技術 |
|------|------|
| 前端 | React 18 + TypeScript + Vite |
| 樣式 | Tailwind CSS v3 |
| 認證 | Firebase Authentication（Email/Password + Google） |
| 資料庫 | Firebase Firestore |
| AI 問題 | Google Gemini 2.0 Flash |

## 快速開始

### 1. 建立 Firebase 專案

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 建立新專案
3. 啟用 **Authentication** → 登入方式：電子郵件/密碼 + Google
4. 建立 **Firestore Database**（先用測試模式，之後套用 `firestore.rules`）
5. Firebase Web App 設定已內建於 `src/lib/firebase.ts`

### 2. 取得 Gemini API Key（可選，未填則使用內建備用問題）

1. 前往 [Google AI Studio](https://aistudio.google.com/)
2. 建立並複製 API Key

### 3. 啟動開發伺服器

```bash
npm install
npm run dev
```

開啟 `http://localhost:5173`，App 會使用內建的 Firebase 設定並直接進入登入畫面。

### 4. 部署

```bash
# Build
npm run build

# 使用 Firebase Hosting
npm install -g firebase-tools
firebase login
firebase init hosting   # 選 dist 為 public 目錄
firebase deploy

# 套用 Firestore 安全規則（專案已設定為 my-awesome-project-116fd）
firebase deploy --only firestore:rules
```

## 功能說明

| 功能 | 說明 |
|------|------|
| 🔐 登入/註冊 | Email+密碼 或 Google OAuth |
| 💬 每日問題 | Gemini AI 每天生成 3 個不同主題的深度問題 |
| 💎 寶石獎勵 | 20~99字 → 3顆，100~199字 → 4顆，200字以上 → 5顆 |
| 🔥 連續天數 | 連續每天作答累積連勤 |
| 📜 歷史記錄 | 查看所有歷史問答 |
| 🌐 公開分享 | 作答時選擇是否公開，並在首頁瀏覽其他人的公開回答 |
| ✏️ 回答管理 | 編輯自己的回答、調整公開狀態或刪除內容 |
| 🤖 AI 回饋 | Gemini 針對你的回答給予溫暖回饋 |
| ⚙️ 設定頁面 | 首次進入自動引導設定 Firebase/Gemini |

## Firestore 資料結構

```
users/{uid}
  displayName:      string
  email:            string
  photoURL:         string | null
  providerId:       string | null
  gems:             number
  streak:           number
  lastAnsweredDate: string | null   (YYYY-MM-DD)
  createdAt:        Timestamp
  lastLoginAt:      Timestamp

publicProfiles/{uid}
  displayName: string
  photoURL:    string | null

answers/{uid}_{YYYY-MM-DD}_{questionId}
  uid:       string   (User ID，對應 publicProfiles/{uid})
  date:      string   (YYYY-MM-DD)
  questionId: string  (q1、q2、q3)
  question:  string
  category:  string
  answer:    string
  gems:      number
  isPublic:  boolean
  createdAt: Timestamp
  updatedAt: Timestamp | null

moods/{uid}_{YYYY-MM-DD}
  uid:       string
  date:      string   (YYYY-MM-DD)
  mood:      number   (1–5)
  note:      string
  createdAt: Timestamp
  updatedAt: Timestamp | null
```

## 專案成員
- 待補充
