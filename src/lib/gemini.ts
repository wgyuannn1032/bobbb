// src/lib/gemini.ts
// Gemini 2.0 Flash — question generation & answer feedback

const CATEGORIES = [
  '🎯 人生價值觀', '💡 創意思維', '🌍 世界觀', '❤️ 人際關係',
  '🧠 哲學思考', '🎭 個人成長', '🌿 生活態度', '🚀 夢想與目標',
  '😄 正向心理', '🎨 美學感受', '📚 學習觀', '💼 職涯與熱情',
]

const FALLBACK_QUESTIONS: { text: string; category: string }[] = [
  { text: '如果你可以改變世界上一件事，你會選擇改變什麼？為什麼這件事對你最重要？', category: '🌍 世界觀' },
  { text: '描述一個讓你感到最「自己」的時刻——那時你在做什麼、和誰在一起？', category: '❤️ 人際關係' },
  { text: '你認為成功對你個人的定義是什麼？和社會上普遍的看法有什麼不同？', category: '🎯 人生價值觀' },
  { text: '如果可以和歷史上任何一個人共進晚餐，你會選誰？你最想問他什麼問題？', category: '💡 創意思維' },
  { text: '你最近一次走出舒適圈是什麼時候？那次經歷帶給你什麼？', category: '🧠 哲學思考' },
  { text: '如果你的生活是一部電影，現在這個階段會是哪個場景？為什麼？', category: '🎭 個人成長' },
  { text: '你覺得「快樂」和「有意義」哪個更重要？可以用自己的例子說明嗎？', category: '😄 正向心理' },
  { text: '你有什麼童年夢想是到現在依然記得、甚至還有一部分想要實現的？', category: '🚀 夢想與目標' },
  { text: '如果有人偷偷觀察你的日常生活，他們會認為你最在乎的事情是什麼？', category: '🎯 人生價值觀' },
  { text: '你覺得「勇氣」是什麼？在你生命中，有沒有一個讓你覺得自己很勇敢的時刻？', category: '🌿 生活態度' },
  { text: '如果你只剩 24 小時可以自由使用，你會怎麼安排？這能說明你真正重視什麼嗎？', category: '🧠 哲學思考' },
  { text: '你最近學到的一件讓你改變看法的事情是什麼？是什麼讓你願意改變？', category: '📚 學習觀' },
  { text: '你覺得友情最重要的基礎是什麼？說說一段讓你印象深刻的友誼故事。', category: '❤️ 人際關係' },
  { text: '如果可以給 10 年前的自己一個建議，你會說什麼？為什麼是這個？', category: '🎭 個人成長' },
  { text: '你生命中有沒有一個習慣，讓你覺得「沒有它我就不是我」？它是什麼？', category: '🌿 生活態度' },
]

function getDayOfYear(): number {
  const now   = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((Number(now) - Number(start)) / 86_400_000)
}

export function todayKey(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function yesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export interface DailyQuestion {
  text: string
  category: string
}

const QUESTION_CACHE_PREFIX = 'dailygem_q_'

export async function fetchDailyQuestion(geminiApiKey?: string): Promise<DailyQuestion> {
  const key    = QUESTION_CACHE_PREFIX + todayKey()
  const cached = localStorage.getItem(key)
  if (cached) {
    try { return JSON.parse(cached) as DailyQuestion } catch (_) {}
  }

  let question: DailyQuestion | null = null

  if (geminiApiKey) {
    question = await fetchFromGemini(geminiApiKey)
  }

  if (!question) {
    const doy = getDayOfYear()
    question = FALLBACK_QUESTIONS[doy % FALLBACK_QUESTIONS.length]
  }

  localStorage.setItem(key, JSON.stringify(question))
  return question
}

async function fetchFromGemini(apiKey: string): Promise<DailyQuestion | null> {
  const doy      = getDayOfYear()
  const category = CATEGORIES[doy % CATEGORIES.length]
  const prompt   =
    `你是一位深思熟慮的引導者。請針對主題「${category}」提供一個中文的開放式簡述題，` +
    `問題要引發深度自我反思，字數在 30~60 字之間，不要加任何前言或編號，只輸出問題本身。`

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents:         [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 120 },
        }),
      }
    )
    const data = await resp.json()
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (text) return { text, category }
  } catch (_) {}
  return null
}

export async function fetchAIFeedback(
  question: string,
  answer:   string,
  apiKey:   string
): Promise<string> {
  const prompt =
    `針對以下問答，給出一段 30~50 字的溫暖回饋，以繁體中文表達，語氣要像一位好朋友，` +
    `不要重複問題內容，不要評分，只給予共鳴或鼓勵。\n問題：${question}\n回答：${answer}`

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents:         [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 150 },
        }),
      }
    )
    const data = await resp.json()
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
      '謝謝你的真誠分享！繼續保持這份反思的習慣 💎'
    )
  } catch (_) {
    return '謝謝你的真誠分享！繼續保持這份反思的習慣 💎'
  }
}

export function calcGems(answer: string): number {
  const len = answer.trim().length
  if (len >= 200) return 5
  if (len >= 100) return 4
  return 3
}
