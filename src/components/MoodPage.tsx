// src/components/MoodPage.tsx
// 情緒打卡頁面：馬卡龍天氣心情選擇 → 可選寫日記 → 存到 Firestore → 查看歷史趨勢
import { useState, useEffect, useCallback } from 'react'
import { Firestore } from 'firebase/firestore'
import {
  IconPencil, IconCheck,
  IconCalendar, IconTrendingUp, IconNotes, IconMoodSmile,
} from '@tabler/icons-react'
import {
  saveMoodCheckIn, fetchMoods, getTodayMood,
  MoodLevel, MoodRecord,
} from '../lib/firestore'
import { todayKey } from '../lib/gemini'
import AppNav from './AppNav'

interface Props {
  uid:      string
  db:       Firestore
  onBack:   () => void
  embedded?: boolean
}

// ── Mood config ──────────────────────────────────────────────
const MOODS: {
  key:    MoodLevel
  label:  string
  sub:    string
  color:  string   // text colour (Tailwind)
  border: string   // border colour (Tailwind)
  bg:     string   // card bg (Tailwind)
  icon:   () => JSX.Element
}[] = [
  {
    key: 'thunder', label: '焦慮', sub: '雷雨',
    color:  'text-[#8b7fc7]', border: 'border-[#b0a4d8]', bg: 'bg-[rgba(176,164,216,.18)]',
    icon: () => (
      <svg width="40" height="40" viewBox="0 0 38 38" fill="none">
        <path d="M10 22a7 7 0 01.7-14 7.5 7.5 0 0114.6 2A5.5 5.5 0 1128 22H10z" fill="#b0a4d8" opacity=".85"/>
        <line x1="13" y1="26" x2="11" y2="31" stroke="#8b7fc7" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="19" y1="26" x2="17" y2="31" stroke="#8b7fc7" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="25" y1="26" x2="23" y2="31" stroke="#8b7fc7" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M20 15l-4 7h4l-3 6" stroke="#f9e080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: 'rain', label: '難過', sub: '下雨',
    color:  'text-[#6aaad4]', border: 'border-[#a8c8e8]', bg: 'bg-[rgba(168,200,232,.18)]',
    icon: () => (
      <svg width="40" height="40" viewBox="0 0 38 38" fill="none">
        <path d="M10 20a7 7 0 01.7-14 7.5 7.5 0 0114.6 2A5.5 5.5 0 1128 20H10z" fill="#a8c8e8" opacity=".9"/>
        <line x1="13" y1="24" x2="12" y2="29" stroke="#6aaad4" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="18" y1="24" x2="17" y2="29" stroke="#6aaad4" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="23" y1="24" x2="22" y2="29" stroke="#6aaad4" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="10" y1="27" x2="9"  y2="32" stroke="#6aaad4" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="27" y1="27" x2="26" y2="32" stroke="#6aaad4" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: 'volcano', label: '生氣', sub: '火山',
    color:  'text-[#e05a4a]', border: 'border-[#f4a6a0]', bg: 'bg-[rgba(244,166,160,.18)]',
    icon: () => (
      <svg width="40" height="40" viewBox="0 0 38 38" fill="none">
        <path d="M6 32l13-22 13 22z" fill="#f4a6a0" opacity=".85"/>
        <path d="M16 17l-2 6h2l-1.5 4" stroke="#e05a4a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="20" cy="9" r="1.2" fill="#f9c4a0"/>
        <circle cx="23" cy="12" r=".9" fill="#f9c4a0"/>
        <circle cx="17" cy="11" r=".9" fill="#f9c4a0"/>
        <path d="M19 8c0-2 3-3 3-1M17 8c0-2-3-2.5-2-.5" stroke="#e8c8c0" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: 'sunny', label: '平靜', sub: '晴天',
    color:  'text-[#d4a000]', border: 'border-[#fde9a2]', bg: 'bg-[rgba(253,233,162,.28)]',
    icon: () => (
      <svg width="40" height="40" viewBox="0 0 38 38" fill="none">
        <circle cx="19" cy="19" r="8" fill="#fde047" opacity=".9"/>
        <line x1="19" y1="5"  x2="19" y2="9"  stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="19" y1="29" x2="19" y2="33" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="5"  y1="19" x2="9"  y2="19" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="29" y1="19" x2="33" y2="19" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="9.1"  y1="9.1"  x2="11.9" y2="11.9" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="26.1" y1="26.1" x2="28.9" y2="28.9" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="28.9" y1="9.1"  x2="26.1" y2="11.9" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="11.9" y1="26.1" x2="9.1"  y2="28.9" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: 'cloudy', label: '疲憊', sub: '陰天',
    color:  'text-[#6a9a6a]', border: 'border-[#c8d8c8]', bg: 'bg-[rgba(200,216,200,.28)]',
    icon: () => (
      <svg width="40" height="40" viewBox="0 0 38 38" fill="none">
        <path d="M8 24a6 6 0 01.6-12 6.5 6.5 0 0112.6 1.7A4.8 4.8 0 1124 24H8z" fill="#c8d8c8" opacity=".7"/>
        <path d="M14 28a5 5 0 01.5-10 5.4 5.4 0 0110.5 1.5A4 4 0 1128 28H14z" fill="#b0c8b0" opacity=".9"/>
      </svg>
    ),
  },
  {
    key: 'rainbow', label: '開心', sub: '彩虹',
    color:  'text-[#e8607a]', border: 'border-[#f9c4d0]', bg: 'bg-[rgba(249,196,208,.22)]',
    icon: () => (
      <svg width="40" height="40" viewBox="0 0 38 38" fill="none">
        <path d="M5 26a14 14 0 0128 0" stroke="#f4a6a0" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M8 26a11 11 0 0122 0" stroke="#fde9a2" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M11 26a8 8 0 0116 0" stroke="#a8d8c8" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M14 26a5 5 0 0110 0" stroke="#a8c8e8" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <ellipse cx="5.5"  cy="25.5" rx="3" ry="2" fill="#f9c4d0" opacity=".8"/>
        <ellipse cx="32.5" cy="25.5" rx="3" ry="2" fill="#f9c4d0" opacity=".8"/>
      </svg>
    ),
  },
]

function getMoodConfig(key: MoodLevel) {
  return MOODS.find(m => m.key === key) ?? MOODS[3]
}

// ── Bar chart: last 14 days ──────────────────────────────────
function MoodBarChart({ records }: { records: MoodRecord[] }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${mm}-${dd}`
  })

  // Map mood key → numeric score for bar height
  const MOOD_SCORE: Record<MoodLevel, number> = {
    thunder: 1, rain: 2, volcano: 2, cloudy: 3, sunny: 4, rainbow: 5,
  }

  const byDate = new Map(records.map(r => [r.date, r.mood]))

  return (
    <div className="app-surface border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <IconTrendingUp size={18} className="app-accent" />
        <h3 className="app-text text-sm font-semibold">近 14 天情緒趨勢</h3>
      </div>
      <div className="flex items-end gap-1.5 h-16">
        {days.map(date => {
          const moodKey = byDate.get(date)
          const cfg     = moodKey ? getMoodConfig(moodKey) : null
          const score   = moodKey ? MOOD_SCORE[moodKey] : 0
          const barH    = score ? `${(score / 5) * 100}%` : '8px'
          const shortDate = date.slice(5)
          return (
            <div key={date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-t-md transition-all duration-300 ${cfg ? cfg.bg : ''}`}
                style={{
                  height:    barH,
                  minHeight: '8px',
                  background: cfg ? undefined : 'var(--app-border)',
                  opacity:    score ? 1 : 0.4,
                }}
                title={cfg ? `${shortDate}: ${cfg.label}` : shortDate}
              />
              {moodKey && cfg && (
                <span className="text-[9px] app-text-muted leading-none">{cfg.sub[0]}</span>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] app-text-muted">{days[0].slice(5)}</span>
        <span className="text-[10px] app-text-muted">{days[6].slice(5)}</span>
        <span className="text-[10px] app-text-muted">{days[13].slice(5)}</span>
      </div>
    </div>
  )
}

// ── Mood stats ────────────────────────────────────────────────
function MoodStats({ records }: { records: MoodRecord[] }) {
  if (records.length === 0) return null

  const MOOD_SCORE: Record<MoodLevel, number> = {
    thunder: 1, rain: 2, volcano: 2, cloudy: 3, sunny: 4, rainbow: 5,
  }
  const avg = records.reduce((s, r) => s + MOOD_SCORE[r.mood], 0) / records.length
  // pick nearest mood
  const avgKey = (['thunder','rain','cloudy','sunny','rainbow'] as MoodLevel[])
    .reduce((best, k) => Math.abs(MOOD_SCORE[k] - avg) < Math.abs(MOOD_SCORE[best] - avg) ? k : best)
  const avgCfg = getMoodConfig(avgKey)

  // streak
  let streak = 0
  const d = new Date()
  while (streak < records.length) {
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const key = `${d.getFullYear()}-${mm}-${dd}`
    if (records.some(r => r.date === key)) { streak++; d.setDate(d.getDate() - 1) }
    else break
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="app-surface border rounded-xl p-3 text-center">
        <div className={`text-xl font-extrabold ${avgCfg.color}`}>{avgCfg.label}</div>
        <div className="app-text-muted text-xs mt-0.5">平均情緒</div>
      </div>
      <div className="app-surface border rounded-xl p-3 text-center">
        <div className="app-warning text-2xl font-extrabold">{streak}</div>
        <div className="app-text-muted text-xs mt-0.5">連續天數 🔥</div>
      </div>
      <div className="app-surface border rounded-xl p-3 text-center">
        <div className="app-accent text-2xl font-extrabold">{records.length}</div>
        <div className="app-text-muted text-xs mt-0.5">打卡次數</div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function MoodPage({ uid, db, onBack, embedded = false }: Props) {
  const today = todayKey()

  const [records,   setRecords]   = useState<MoodRecord[]>([])
  const [todayMood, setTodayMood] = useState<MoodRecord | null>(null)
  const [selected,  setSelected]  = useState<MoodLevel | null>(null)
  const [note,      setNote]      = useState('')
  const [saving,    setSaving]    = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [showNote,  setShowNote]  = useState(false)
  const [toast,     setToast]     = useState<string | null>(null)
  const [tab,       setTab]       = useState<'checkin' | 'history'>('checkin')

  const loadData = useCallback(async () => {
    const [all, td] = await Promise.all([
      fetchMoods(db, uid, 60),
      getTodayMood(db, uid, today),
    ])
    setRecords(all)
    setTodayMood(td)
    if (td) setSelected(td.mood)
  }, [db, uid, today])

  useEffect(() => {
    setLoading(true)
    loadData().finally(() => setLoading(false))
  }, [loadData])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await saveMoodCheckIn(db, { uid, date: today, mood: selected, note: note.trim() })
      await loadData()
      setNote('')
      setShowNote(false)
      showToast('打卡成功！好好照顧自己 💛')
    } catch (err) {
      console.error(err)
      showToast('儲存失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  const alreadyCheckedIn = todayMood !== null
  const todayCfg = todayMood ? getMoodConfig(todayMood.mood) : null

  return (
    <div className={embedded ? 'flex w-full flex-col' : 'app-page flex min-h-screen flex-col'}>

      {/* ── NAV ───────────────────────────────────────── */}
      {!embedded && (
        <AppNav
          onBack={onBack}
          title="情緒打卡"
          titleIcon={<IconMoodSmile size={18} className="text-rose-400" aria-hidden="true" />}
        />
      )}

      {/* ── BODY ──────────────────────────────────────── */}
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-6 space-y-5">

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin-slow" />
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div className="flex bg-[var(--app-surface-muted)] border rounded-xl p-1 gap-1">
              {(['checkin', 'history'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition
                    ${tab === t
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm'
                      : 'app-text-muted hover:app-text'
                    }`}
                >
                  {t === 'checkin' ? '今日打卡' : '歷史記錄'}
                </button>
              ))}
            </div>

            {/* ── CHECK-IN TAB ─────────────────────────── */}
            {tab === 'checkin' && (
              <div className="space-y-5 animate-fade-in-up">

                {/* Today status banner */}
                {alreadyCheckedIn && todayCfg ? (
                  <div className={`${todayCfg.bg} border ${todayCfg.border} rounded-2xl p-5 flex items-center gap-4`}>
                    <todayCfg.icon />
                    <div>
                      <p className={`font-semibold ${todayCfg.color}`}>
                        今天的心情：{todayCfg.label} · {todayCfg.sub}
                      </p>
                      <p className="app-text-muted text-sm mt-0.5">今日已打卡完成</p>
                      {todayMood.note && (
                        <p className="app-text-secondary text-sm mt-1.5 leading-relaxed">
                          📝 {todayMood.note}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="app-surface border rounded-2xl p-4">
                    <p className="app-text-muted text-xs mb-1">{today}</p>
                    <p className="app-text font-semibold">今天你的心情是什麼天氣呢？</p>
                  </div>
                )}

                {/* Mood grid — 3×2 macaron weather cards */}
                <div>
                  <p className="app-text-muted text-xs font-semibold uppercase tracking-wider mb-3">
                    選擇心情
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {MOODS.map(m => {
                      const isSelected = selected === m.key
                      return (
                        <button
                          key={m.key}
                          onClick={() => !alreadyCheckedIn && setSelected(m.key)}
                          disabled={alreadyCheckedIn}
                          className={`flex flex-col items-center gap-2 py-5 px-2 rounded-2xl border-2 transition
                            ${isSelected
                              ? `${m.bg} ${m.border} scale-[1.04] shadow-md`
                              : 'app-surface border-[var(--app-border)] hover:scale-[1.03]'
                            }
                            ${alreadyCheckedIn ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          {/* SVG weather icon */}
                          <div className={`flex items-center justify-center rounded-xl p-2 transition
                            ${isSelected ? m.bg : 'bg-[var(--app-surface-muted)]'}`}>
                            <m.icon />
                          </div>
                          <span className={`text-sm font-bold ${isSelected ? m.color : 'app-text'}`}>
                            {m.label}
                          </span>
                          <span className={`text-xs ${isSelected ? m.color : 'app-text-muted'}`}>
                            {m.sub}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Optional note */}
                {!alreadyCheckedIn && selected && (
                  <div className="animate-fade-in-up">
                    <button
                      onClick={() => setShowNote(v => !v)}
                      className="app-text-muted flex items-center gap-1.5 text-sm mb-3 hover:app-text transition"
                    >
                      <IconPencil size={16} />
                      {showNote ? '收起備註' : '新增備註（選填）'}
                    </button>
                    {showNote && (
                      <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        rows={3}
                        maxLength={300}
                        placeholder="今天發生了什麼事嗎？隨手記下來…"
                        className="w-full app-surface-muted app-text border border-[var(--app-border)] rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-rose-400 transition leading-relaxed"
                      />
                    )}
                  </div>
                )}

                {/* Submit button */}
                {!alreadyCheckedIn && (
                  <button
                    onClick={handleSave}
                    disabled={!selected || saving}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                        儲存中…
                      </>
                    ) : (
                      <>
                        <IconCheck size={18} />
                        {selected
                          ? `以「${getMoodConfig(selected).label}」打卡 ✓`
                          : '選擇心情後打卡 ✓'}
                      </>
                    )}
                  </button>
                )}

                {/* Stats & chart */}
                {records.length > 0 && (
                  <>
                    <MoodStats records={records} />
                    <MoodBarChart records={records} />
                  </>
                )}
              </div>
            )}

            {/* ── HISTORY TAB ──────────────────────────── */}
            {tab === 'history' && (
              <div className="space-y-3 animate-fade-in-up">
                {records.length === 0 ? (
                  <div className="app-surface border rounded-2xl px-4 py-12 text-center">
                    <IconNotes size={32} className="app-text-muted mx-auto mb-3" />
                    <p className="app-text-muted text-sm">還沒有打卡記錄</p>
                    <p className="app-text-muted text-xs mt-1">先去今日打卡吧！</p>
                  </div>
                ) : (
                  records.map(r => {
                    const cfg = getMoodConfig(r.mood)
                    return (
                      <div
                        key={r.id ?? r.date}
                        className={`${cfg.bg} border ${cfg.border} rounded-2xl p-4 flex items-start gap-4 animate-fade-in-up`}
                      >
                        {/* Small weather icon */}
                        <div className={`flex-shrink-0 rounded-xl p-1.5 ${cfg.bg}`}>
                          <cfg.icon />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm font-bold ${cfg.color}`}>
                              {cfg.label} · {cfg.sub}
                            </span>
                            <span className="app-text-muted text-xs flex-shrink-0 flex items-center gap-1">
                              <IconCalendar size={12} />
                              {r.date}
                            </span>
                          </div>
                          {r.note && (
                            <p className="app-text-secondary text-sm mt-1.5 leading-relaxed">
                              {r.note}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── TOAST ─────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-medium shadow-xl app-surface border animate-fade-in-up flex items-center gap-2 app-text-secondary">
          <IconCheck size={16} className="text-rose-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
