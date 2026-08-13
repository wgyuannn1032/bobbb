// src/components/MoodPage.tsx
// 情緒打卡頁面：選擇今日情緒 → 可選寫日記 → 存到 Firestore → 查看歷史趨勢
import { useState, useEffect, useCallback } from 'react'
import { Firestore } from 'firebase/firestore'
import {
  IconArrowLeft, IconMoodCry, IconMoodSad, IconMoodNeutral,
  IconMoodSmile, IconMoodHappy, IconPencil, IconCheck,
  IconCalendar, IconTrendingUp, IconNotes,
} from '@tabler/icons-react'
import {
  saveMoodCheckIn, fetchMoods, getTodayMood,
  MoodLevel, MoodRecord,
} from '../lib/firestore'
import { todayKey } from '../lib/gemini'

interface Props {
  uid:    string
  db:     Firestore
  onBack: () => void
}

// ── Mood config ──────────────────────────────────────────────
const MOODS: {
  level:     MoodLevel
  label:     string
  emoji:     string
  icon:      React.ReactNode
  color:     string
  bg:        string
  border:    string
}[] = [
  {
    level:  1,
    label:  '很糟',
    emoji:  '😢',
    icon:   <IconMoodCry   size={28} />,
    color:  'text-blue-500',
    bg:     'bg-blue-500/10',
    border: 'border-blue-500/40',
  },
  {
    level:  2,
    label:  '不好',
    emoji:  '😔',
    icon:   <IconMoodSad   size={28} />,
    color:  'text-indigo-400',
    bg:     'bg-indigo-500/10',
    border: 'border-indigo-500/40',
  },
  {
    level:  3,
    label:  '普通',
    emoji:  '😐',
    icon:   <IconMoodNeutral size={28} />,
    color:  'text-slate-400',
    bg:     'bg-slate-500/10',
    border: 'border-slate-500/30',
  },
  {
    level:  4,
    label:  '不錯',
    emoji:  '😊',
    icon:   <IconMoodSmile size={28} />,
    color:  'text-emerald-400',
    bg:     'bg-emerald-500/10',
    border: 'border-emerald-500/40',
  },
  {
    level:  5,
    label:  '很棒',
    emoji:  '😄',
    icon:   <IconMoodHappy size={28} />,
    color:  'text-yellow-400',
    bg:     'bg-yellow-500/10',
    border: 'border-yellow-500/40',
  },
]

function getMoodConfig(level: MoodLevel) {
  return MOODS.find(m => m.level === level) ?? MOODS[2]
}

// ── Bar chart: last 14 days ──────────────────────────────────
function MoodBarChart({ records }: { records: MoodRecord[] }) {
  // Build last-14-day date keys
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${mm}-${dd}`
  })

  const byDate = new Map(records.map(r => [r.date, r.mood]))

  return (
    <div className="app-surface border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <IconTrendingUp size={18} className="app-accent" />
        <h3 className="app-text text-sm font-semibold">近 14 天情緒趨勢</h3>
      </div>
      <div className="flex items-end gap-1.5 h-16">
        {days.map(date => {
          const mood = byDate.get(date)
          const cfg  = mood ? getMoodConfig(mood) : null
          const barH = mood ? `${(mood / 5) * 100}%` : '8px'
          const shortDate = date.slice(5) // MM-DD
          return (
            <div key={date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md transition-all duration-300"
                style={{
                  height:     barH,
                  minHeight:  '8px',
                  background: mood ? undefined : 'var(--app-border)',
                  opacity:    mood ? 1 : 0.4,
                }}
              >
                {mood && (
                  <div
                    className={`w-full h-full rounded-t-md ${cfg!.bg}`}
                    title={`${shortDate}: ${cfg!.label}`}
                  />
                )}
              </div>
              {mood && (
                <span className="text-[9px] app-text-muted leading-none">{cfg!.emoji}</span>
              )}
            </div>
          )
        })}
      </div>
      {/* X axis labels: show only first/mid/last */}
      <div className="flex justify-between mt-1">
        <span className="text-[10px] app-text-muted">{days[0].slice(5)}</span>
        <span className="text-[10px] app-text-muted">{days[6].slice(5)}</span>
        <span className="text-[10px] app-text-muted">{days[13].slice(5)}</span>
      </div>
    </div>
  )
}

// ── Mood stats: avg + streak ──────────────────────────────────
function MoodStats({ records }: { records: MoodRecord[] }) {
  if (records.length === 0) return null

  const avg    = records.reduce((s, r) => s + r.mood, 0) / records.length
  const avgCfg = getMoodConfig(Math.round(avg) as MoodLevel)

  // Current consecutive streak
  let streak = 0
  const today = todayKey()
  const d = new Date()
  while (streak < records.length) {
    const key = (() => {
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${d.getFullYear()}-${mm}-${dd}`
    })()
    if (records.some(r => r.date === key)) {
      streak++
      d.setDate(d.getDate() - 1)
    } else break
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="app-surface border rounded-xl p-3 text-center">
        <div className={`text-2xl font-extrabold ${avgCfg.color}`}>{avg.toFixed(1)}</div>
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
export default function MoodPage({ uid, db, onBack }: Props) {
  const today = todayKey()

  const [records,     setRecords]     = useState<MoodRecord[]>([])
  const [todayMood,   setTodayMood]   = useState<MoodRecord | null>(null)
  const [selected,    setSelected]    = useState<MoodLevel | null>(null)
  const [note,        setNote]        = useState('')
  const [saving,      setSaving]      = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [showNote,    setShowNote]    = useState(false)
  const [toast,       setToast]       = useState<string | null>(null)
  const [tab,         setTab]         = useState<'checkin' | 'history'>('checkin')

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
      showToast('情緒打卡成功！')
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
    <div className="app-page flex flex-col min-h-screen">

      {/* ── NAV ───────────────────────────────────────── */}
      <nav className="app-nav sticky top-0 z-20 flex items-center justify-between px-4 py-3 backdrop-blur border-b">
        <button
          onClick={onBack}
          className="app-text-muted hover:app-text flex items-center gap-1.5 text-sm transition"
        >
          <IconArrowLeft size={18} />
          返回首頁
        </button>
        <span className="app-text font-semibold flex items-center gap-1.5">
          <IconMoodSmile size={18} className="text-rose-400" />
          情緒打卡
        </span>
        <div className="w-20" /> {/* spacer */}
      </nav>

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

                {/* Today status */}
                {alreadyCheckedIn && todayCfg ? (
                  <div className={`${todayCfg.bg} border ${todayCfg.border} rounded-2xl p-5 flex items-center gap-4`}>
                    <span className="text-4xl">{todayCfg.emoji}</span>
                    <div>
                      <p className={`font-semibold ${todayCfg.color}`}>
                        今天的心情：{todayCfg.label}
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
                    <p className="app-text font-semibold">今天你的心情如何？</p>
                  </div>
                )}

                {/* Mood selector */}
                <div>
                  <p className="app-text-muted text-xs font-semibold uppercase tracking-wider mb-3">
                    選擇情緒
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {MOODS.map(m => {
                      const isSelected = selected === m.level
                      return (
                        <button
                          key={m.level}
                          onClick={() => !alreadyCheckedIn && setSelected(m.level)}
                          disabled={alreadyCheckedIn}
                          className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition
                            ${isSelected
                              ? `${m.bg} ${m.border} ${m.color} scale-105 shadow-md`
                              : 'app-surface border-[var(--app-border)] app-text-muted hover:scale-105'
                            }
                            ${alreadyCheckedIn ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <span className={isSelected ? m.color : 'app-text-muted'}>
                            {m.icon}
                          </span>
                          <span className="text-xs font-medium">{m.label}</span>
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
                        完成打卡
                      </>
                    )}
                  </button>
                )}

                {/* Stats & chart (if has data) */}
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
                        className={`${cfg.bg} border ${cfg.border} rounded-2xl p-4 flex items-start gap-3 animate-fade-in-up`}
                      >
                        <span className="text-3xl flex-shrink-0 mt-0.5">{cfg.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
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
