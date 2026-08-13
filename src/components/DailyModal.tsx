// src/components/DailyModal.tsx
// Pop-up modal for daily question: loading → question → reward
import { useState, useEffect, useRef } from 'react'
import {
  IconArrowRight,
  IconCheck,
  IconDiamond,
  IconMessageCircle,
  IconSparkles,
  IconX,
} from '@tabler/icons-react'
import { DailyQuestion, calcGems } from '../lib/gemini'

type Stage = 'loading' | 'question' | 'reward'

interface Props {
  question:     DailyQuestion | null
  geminiApiKey: string
  onSubmit:     (answer: string, gems: number) => Promise<string> // returns AI feedback
  onClose:      () => void
}

export default function DailyModal({ question, geminiApiKey, onSubmit, onClose }: Props) {
  const [stage,    setStage]    = useState<Stage>(question ? 'question' : 'loading')
  const [answer,   setAnswer]   = useState('')
  const [gems,     setGems]     = useState(3)
  const [feedback, setFeedback] = useState('')
  const [busy,     setBusy]     = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (question) setStage('question')
  }, [question])

  useEffect(() => {
    if (stage === 'question') {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [stage])

  const MIN_LEN = 20
  const remaining = Math.max(0, MIN_LEN - answer.trim().length)
  const canSubmit = answer.trim().length >= MIN_LEN

  const handleSubmit = async () => {
    if (!canSubmit || busy) return
    setBusy(true)
    try {
      const earned = calcGems(answer)
      setGems(earned)
      // onSubmit saves to Firestore and returns AI feedback
      const fb = await onSubmit(answer, earned)
      setFeedback(fb)
      setStage('reward')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#1e1e2e] border border-[#2d2d44] rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">

        {/* ── LOADING ── */}
        {stage === 'loading' && (
          <div className="flex flex-col items-center py-10 gap-4">
            <div className="flex gap-2">
              <span className="w-3 h-3 rounded-full bg-violet-500 dot-bounce" />
              <span className="w-3 h-3 rounded-full bg-violet-500 dot-bounce-2" />
              <span className="w-3 h-3 rounded-full bg-violet-500 dot-bounce-3" />
            </div>
            <p className="text-slate-400 text-sm">AI 正在思考今日問題…</p>
          </div>
        )}

        {/* ── QUESTION ── */}
        {stage === 'question' && question && (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1 text-xs font-semibold bg-violet-500/20 text-violet-300 px-3 py-1 rounded-full">
                <IconSparkles size={14} aria-hidden="true" />
                今日一問
              </span>
              <button onClick={onClose} aria-label="關閉" className="text-slate-500 hover:text-slate-300 p-1 rounded-lg">
                <IconX size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="inline-block text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full mb-4">
              {question.category}
            </div>

            <p className="text-base text-slate-100 leading-relaxed font-medium mb-5">
              {question.text}
            </p>

            <textarea
              ref={textareaRef}
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              rows={5}
              placeholder="寫下你的想法…（至少 20 個字）"
              className="w-full bg-[#0f0f1a] border border-[#2d2d44] focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-slate-100 resize-none focus:outline-none transition leading-relaxed"
            />

            <div className={`text-right text-xs mt-1 mb-4 ${remaining === 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
              {remaining === 0 ? (
                <span className="inline-flex items-center gap-1"><IconCheck size={14} aria-hidden="true" />可以提交了</span>
              ) : `尚需 ${remaining} 字`}
            </div>

            {/* Gem preview */}
            <div className="flex items-center gap-2 mb-4 text-xs text-slate-400">
              <span>回答長度獎勵：</span>
              {[
                { len: '20~99 字', gems: 3 },
                { len: '100~199 字', gems: 4 },
                { len: '200+ 字', gems: 5 },
              ].map(({ len, gems }) => (
                <span key={len} className="inline-flex items-center gap-1 bg-violet-500/10 text-violet-300 px-2 py-0.5 rounded-full">
                  {len} = {gems}<IconDiamond size={13} aria-hidden="true" />
                </span>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || busy}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
            >
              {busy ? '提交中…' : '提交回答'}
            </button>
          </>
        )}

        {/* ── REWARD ── */}
        {stage === 'reward' && (
          <div className="flex flex-col items-center text-center py-4 gap-3 animate-fade-in-up">
            <div className="flex items-center gap-1 text-violet-400 animate-reward-pop">
              {[0, 1, 2].map(i => <IconDiamond key={i} size={42} stroke={1.6} aria-hidden="true" />)}
            </div>
            <h2 className="text-2xl font-bold mt-2">太棒了！</h2>
            <p className="text-slate-400 text-sm">你獲得了</p>
            <div className="text-4xl font-extrabold gradient-text-2">{gems} 顆寶石</div>

            {feedback && (
              <div className="flex items-start gap-2 bg-[#0f0f1a] border border-[#2d2d44] rounded-xl px-4 py-3 text-sm text-slate-300 leading-relaxed max-w-sm">
                <IconMessageCircle size={18} className="mt-0.5 flex-shrink-0 text-violet-400" aria-hidden="true" />
                <span>{feedback}</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="mt-2 w-full max-w-xs py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:opacity-90 transition"
            >
              <span className="inline-flex items-center gap-1.5">繼續探索 <IconArrowRight size={18} aria-hidden="true" /></span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
