// src/components/HistoryPage.tsx
import { useState, useEffect } from 'react'
import { Firestore } from 'firebase/firestore'
import { IconArrowLeft, IconDiamond, IconHistory } from '@tabler/icons-react'
import { fetchAnswers, AnswerRecord } from '../lib/firestore'

interface Props {
  db:     Firestore
  uid:    string
  gems:   number
  onBack: () => void
}

export default function HistoryPage({ db, uid, gems, onBack }: Props) {
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnswers(db, uid, 100)
      .then(setAnswers)
      .finally(() => setLoading(false))
  }, [db, uid])

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      <nav className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#0f0f1a]/85 backdrop-blur border-b border-[#1e1e2e]">
        <button onClick={onBack} className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition text-sm px-1">
          <IconArrowLeft size={17} aria-hidden="true" />
          返回
        </button>
        <span className="flex items-center gap-1.5 font-semibold text-slate-200">
          <IconHistory size={18} className="text-violet-400" aria-hidden="true" />
          歷史記錄
        </span>
        <div className="flex items-center gap-1.5 bg-[#1e1e2e] border border-[#2d2d44] px-3 py-1.5 rounded-full text-sm font-semibold">
          <IconDiamond size={17} className="text-violet-400" aria-hidden="true" />
          {gems}
        </div>
      </nav>

      <main className="max-w-xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin-slow" />
          </div>
        ) : answers.length === 0 ? (
          <p className="text-center text-slate-600 py-16 text-sm">還沒有任何回答記錄</p>
        ) : (
          <div className="space-y-4">
            {answers.map(a => (
              <div key={a.id ?? a.date} className="bg-[#1e1e2e] border border-[#2d2d44] rounded-xl p-5 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-violet-400">{a.category}</span>
                  <span className="text-xs text-slate-600 ml-auto">{a.date}</span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-3">{a.question}</p>
                <p className="text-sm text-slate-200 leading-relaxed">{a.answer}</p>
                <p className="flex items-center gap-1 text-xs text-violet-400 font-semibold mt-3">
                  +{a.gems} <IconDiamond size={14} aria-hidden="true" />
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
