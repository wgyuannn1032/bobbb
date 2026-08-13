// src/components/DailyQuestionPage.tsx
// Standalone daily-question check-in page.
import { useEffect, useRef, useState } from 'react'
import {
  IconArrowRight, IconCheck, IconCircleCheck,
  IconDiamond, IconLock, IconMessageCircle, IconSparkles, IconWorld,
} from '@tabler/icons-react'
import { DailyQuestion, calcGems } from '../lib/gemini'
import { AnswerRecord } from '../lib/firestore'

interface Props {
  questions: DailyQuestion[]
  initialQuestionIndex: number
  publicAnswers: AnswerRecord[]
  answered: (question: DailyQuestion) => boolean
  onSubmit: (questionIndex: number, answer: string, gems: number, isPublic: boolean) => Promise<string>
}

export default function DailyQuestionPage({ questions, initialQuestionIndex, publicAnswers, answered, onSubmit }: Props) {
  const firstOpen = questions.findIndex(question => !answered(question))
  const [questionIndex, setQuestionIndex] = useState(Math.max(0, initialQuestionIndex >= 0 ? initialQuestionIndex : firstOpen))
  const [answer, setAnswer] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const question = questions[questionIndex]
  const minLength = 20
  const remaining = Math.max(0, minLength - answer.trim().length)

  useEffect(() => {
    if (question && !answered(question) && !submitted) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [questionIndex, question, submitted])

  const selectQuestion = (index: number) => {
    setQuestionIndex(index)
    setAnswer('')
    setIsPublic(false)
    setFeedback('')
    setSubmitted(false)
  }

  const submit = async () => {
    if (!question || answer.trim().length < minLength || busy) return
    setBusy(true)
    try {
      const result = await onSubmit(questionIndex, answer, calcGems(answer), isPublic)
      setFeedback(result)
      setSubmitted(true)
    } finally {
      setBusy(false)
    }
  }

  if (questions.length === 0) {
    return <main className="max-w-xl mx-auto px-4 py-16 text-center app-text-muted text-sm">AI 問題載入中…</main>
  }

  const completed = questions.filter(answered).length
  const currentAnswered = !!question && answered(question)

  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-5 w-full animate-fade-in-up">
      <section className="app-surface border rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="app-accent inline-flex items-center gap-1 text-xs font-semibold bg-violet-500/15 px-3 py-1 rounded-full">
              <IconSparkles size={14} aria-hidden="true" />每日心情提問
            </span>
            <h2 className="app-text text-xl font-bold mt-3">用一題，好好和自己聊聊</h2>
            <p className="app-text-muted text-sm mt-1">今天已完成 {completed}/{questions.length} 題</p>
          </div>
          <div className="app-gem-card rounded-xl px-3 py-2 text-xs font-semibold app-accent">回答可得 3–5 💎</div>
        </div>
        <div className="flex gap-2">
          {questions.map((item, index) => {
            const done = answered(item)
            return <button key={item.id} type="button" onClick={() => selectQuestion(index)} className={`flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition ${index === questionIndex ? 'border-violet-500 bg-violet-500/10 app-accent' : 'border-[var(--app-border)] app-text-muted'} `}>
              {done ? <IconCircleCheck size={15} className="inline mr-1" aria-hidden="true" /> : null}第 {index + 1} 題
            </button>
          })}
        </div>
      </section>

      {submitted || currentAnswered ? (
        <section className="app-surface border rounded-2xl p-6 text-center animate-fade-in-up">
          <div className="app-accent flex justify-center gap-1 mb-4"><IconDiamond size={36} /><IconDiamond size={36} /><IconDiamond size={36} /></div>
          <h3 className="app-text text-xl font-bold">這一題完成了</h3>
          <p className="app-text-muted text-sm mt-2">謝謝你留一點時間，聽聽自己。</p>
          {feedback && <div className="app-surface-muted app-text-secondary flex items-start gap-2 border border-[var(--app-border)] rounded-xl px-4 py-3 text-sm leading-relaxed text-left mt-5"><IconMessageCircle size={18} className="app-accent mt-0.5 flex-shrink-0" /><span>{feedback}</span></div>}
          {questions.some(item => !answered(item)) && <button type="button" onClick={() => selectQuestion(questions.findIndex(item => !answered(item)))} className="mt-5 app-accent inline-flex items-center gap-1 text-sm font-semibold hover:underline">前往下一題 <IconArrowRight size={16} /></button>}
        </section>
      ) : question && (
        <section className="app-surface border rounded-2xl p-5 space-y-4">
          <div className="app-success inline-block text-xs font-semibold bg-emerald-500/10 px-3 py-1 rounded-full">{question.category}</div>
          <p className="app-text text-lg leading-relaxed font-medium">{question.text}</p>
          <textarea ref={textareaRef} value={answer} onChange={event => setAnswer(event.target.value)} rows={7} placeholder="寫下此刻的想法…（至少 20 個字）" className="app-surface-muted app-text w-full border border-[var(--app-border)] focus:border-violet-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none transition leading-relaxed" />
          <div className={`text-right text-xs ${remaining === 0 ? 'app-success' : 'app-text-muted'}`}>{remaining === 0 ? <span className="inline-flex items-center gap-1"><IconCheck size={14} />可以提交了</span> : `尚需 ${remaining} 字`}</div>
          <button type="button" role="switch" aria-checked={isPublic} onClick={() => setIsPublic(value => !value)} className="app-surface-muted app-text-secondary app-hover w-full flex items-center gap-3 border border-[var(--app-border)] rounded-xl px-3.5 py-3 text-left transition">
            {isPublic ? <IconWorld size={21} className="app-accent flex-shrink-0" /> : <IconLock size={21} className="app-text-muted flex-shrink-0" />}
            <span className="flex-1"><span className="block text-sm font-semibold">{isPublic ? '匿名公開回答' : '私人回答'}</span><span className="app-text-muted block text-xs mt-0.5">{isPublic ? '其他使用者可看到內容，但不會知道是你。' : '只有你可以看到這則回答。'}</span></span>
            <span className={`relative h-6 w-11 rounded-full transition-colors ${isPublic ? 'bg-violet-600' : 'bg-slate-400/40'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`} /></span>
          </button>
          <button onClick={submit} disabled={remaining > 0 || busy} className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition">{busy ? '提交中…' : '完成今日打卡'}</button>
        </section>
      )}

      <section>
        <div className="flex items-center gap-2 mb-3">
          <IconWorld size={18} className="app-accent" aria-hidden="true" />
          <h3 className="app-text text-sm font-semibold">社群回答</h3>
        </div>
        {publicAnswers.length === 0 ? (
          <div className="app-surface border rounded-xl px-4 py-6 text-center">
            <IconWorld size={28} className="app-text-muted mx-auto mb-2" aria-hidden="true" />
            <p className="app-text-muted text-sm">目前還沒有其他人的匿名回答</p>
          </div>
        ) : (
          <div className="space-y-3">
            {publicAnswers.map(record => <PublicAnswerCard key={record.id} record={record} />)}
          </div>
        )}
      </section>
    </main>
  )
}

function PublicAnswerCard({ record }: { record: AnswerRecord }) {
  return (
    <article className="app-surface border rounded-xl p-4">
      <header className="flex items-center justify-between gap-2 mb-3">
        <p className="app-text-muted text-xs">匿名分享 · {record.date}</p>
        <span className="app-accent ml-auto flex items-center gap-1 text-xs font-medium">
          <IconWorld size={14} aria-hidden="true" />匿名公開
        </span>
      </header>
      <p className="app-accent text-xs font-semibold mb-1.5">{record.category}</p>
      <p className="app-text-muted text-xs mb-2">{record.question}</p>
      <p className="app-text-secondary text-sm leading-relaxed whitespace-pre-wrap">{record.answer}</p>
    </article>
  )
}
