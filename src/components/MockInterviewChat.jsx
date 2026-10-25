import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { startMockInterview, continueMockInterview } from '../lib/aiCoach'
import ErrorNotice from './ErrorNotice'

const HINT_KEY = 'jo_mock_hint_dismissed'
const SYNC_INTERVAL_MS = 4000

function readHintDismissed() {
  try {
    return localStorage.getItem(HINT_KEY) === '1'
  } catch {
    return false
  }
}

// Turns the stored ai_sessions.messages into what the chat shows. Feedback on
// an answer is shown as a pill just before the question it led to.
function toTranscript(messages) {
  const out = []
  for (const m of messages || []) {
    if (m.role === 'user') out.push({ role: 'user', text: m.text })
    else if (m.role === 'assistant') {
      if (m.feedback) out.push({ role: 'feedback', text: m.feedback })
      out.push({ role: 'assistant', kind: m.kind || 'question', text: m.text })
    }
  }
  return out
}

function countQuestionMessages(messages) {
  return (messages || []).filter((m) => m.role === 'assistant' && (!m.kind || m.kind === 'question')).length
}

function lastQuestionText(messages) {
  for (let i = (messages || []).length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role === 'assistant' && (!m.kind || m.kind === 'question')) return m.text
  }
  return null
}

export default function MockInterviewChat({ applicationId, onComplete }) {
  const [sessionId, setSessionId] = useState(null)
  const [question, setQuestion] = useState(null)
  // [{role: 'assistant'|'user'|'feedback', kind?: 'question'|'clarification'|'redirect', text}]
  // Only 'question' bubbles are numbered; doubts and redirects never use up a question.
  const [transcript, setTranscript] = useState([])
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)
  const [pendingAnswer, setPendingAnswer] = useState(null) // kept so a failed send can be retried without retyping
  const [progress, setProgress] = useState({ turn: 0, max: 10 })

  const [hintDismissed, setHintDismissed] = useState(readHintDismissed)
  const busyRef = useRef(false) // true while this device is waiting on the interviewer
  const syncedCountRef = useRef(0) // how many stored messages the screen already reflects
  const sessionIdRef = useRef(null)

  const scrollAnchorRef = useRef(null)
  const textareaRef = useRef(null)

  // Auto-scroll to the latest message whenever the transcript grows, or
  // the loading/typing indicator appears — covers both a new question
  // arriving and the "Typing..." bubble showing up while waiting.
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [transcript, loading, summary])

  // Puts a stored session on screen. `messages` is the source of truth, so the
  // same code serves first load, resuming on another device and live sync.
  function applyStored(row) {
    const msgs = row.messages || []
    syncedCountRef.current = msgs.length
    setTranscript(toTranscript(msgs))
    setProgress({ turn: countQuestionMessages(msgs), max: 10 })
    if (row.status === 'completed' && row.result) {
      setSummary(row.result)
      setQuestion(null)
    } else {
      setQuestion(lastQuestionText(msgs))
    }
  }

  useEffect(() => {
    let active = true
    async function begin() {
      setLoading(true)
      setError(null)
      try {
        // Resume an interview already in progress (started on any device).
        const { data: existing } = await supabase
          .from('ai_sessions')
          .select('id, messages, status, result')
          .eq('application_id', applicationId)
          .eq('mode', 'mock_interview')
          .eq('status', 'in_progress')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (!active) return
        if (existing) {
          setSessionId(existing.id)
          sessionIdRef.current = existing.id
          applyStored(existing)
          return
        }
        const res = await startMockInterview({ applicationId })
        if (!active) return
        setSessionId(res.sessionId)
        sessionIdRef.current = res.sessionId
        if (res.messages) {
          applyStored({ messages: res.messages, status: 'in_progress' })
        } else {
          syncedCountRef.current = 1
          setQuestion(res.question)
          setTranscript([{ role: 'assistant', kind: 'question', text: res.question }])
          setProgress({ turn: res.turnNumber, max: res.maxTurns })
        }
      } catch (err) {
        if (active) setError(err.message || 'Could not start the interview.')
      } finally {
        if (active) setLoading(false)
      }
    }
    begin()
    return () => {
      active = false
    }
  }, [applicationId])

  // Quiet background sync: reads the stored session straight from the
  // database (no AI call, so no usage), on a timer and on realtime pushes.
  // Nothing visible happens unless the other device added something.
  useEffect(() => {
    if (!sessionId) return undefined
    let cancelled = false

    async function sync() {
      if (busyRef.current || document.hidden) return
      const { data } = await supabase
        .from('ai_sessions')
        .select('messages, status, result')
        .eq('id', sessionId)
        .maybeSingle()
      if (cancelled || !data || busyRef.current) return
      const count = (data.messages || []).length
      if (count > syncedCountRef.current || (data.status === 'completed' && data.result)) {
        applyStored(data)
        setError(null)
      }
    }

    const timer = setInterval(sync, SYNC_INTERVAL_MS)
    const onVisible = () => {
      if (!document.hidden) sync()
    }
    document.addEventListener('visibilitychange', onVisible)

    const channel = supabase
      .channel(`ai_session_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ai_sessions', filter: `id=eq.${sessionId}` },
        () => sync()
      )
      .subscribe()

    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  function dismissHint() {
    setHintDismissed(true)
    try {
      localStorage.setItem(HINT_KEY, '1')
    } catch {
      // storage unavailable: it just comes back next visit
    }
  }

  function resetTextareaHeight() {
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  async function handleSubmit() {
    if (!answer.trim() || loading) return
    const myAnswer = answer.trim()
    setTranscript((t) => [...t, { role: 'user', text: myAnswer }])
    setAnswer('')
    resetTextareaHeight()
    setPendingAnswer(myAnswer)
    await sendAnswer(myAnswer)
  }

  // Enter submits; Shift+Enter inserts a newline, the standard chat-app
  // convention. Ctrl/Cmd+Enter also submits, since it falls into the same
  // "Enter without Shift" branch.
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleAnswerChange(e) {
    setAnswer(e.target.value)
    // Light auto-grow so the input behaves like a real chat composer
    // instead of a fixed 3-line box.
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
  }

  async function handleRetry() {
    if (!pendingAnswer || loading) return
    await sendAnswer(pendingAnswer)
  }

  async function sendAnswer(myAnswer) {
    busyRef.current = true
    setLoading(true)
    setError(null)
    try {
      const res = await continueMockInterview({ sessionId, userAnswer: myAnswer })
      setPendingAnswer(null)
      syncedCountRef.current += res.completed ? 1 : 2
      if (res.completed) {
        setSummary(res.summary)
        setQuestion(null)
        onComplete?.(res.summary)
      } else if (res.kind === 'clarification' || res.kind === 'redirect') {
        // A doubt, or a message that wasn't an answer: same question stays
        // open, the counter does not move.
        setTranscript((t) => [...t, { role: 'assistant', kind: res.kind, text: res.reply }])
      } else {
        setQuestion(res.question)
        setTranscript((t) => [
          ...t,
          ...(res.feedback ? [{ role: 'feedback', text: res.feedback }] : []),
          { role: 'assistant', kind: 'question', text: res.question },
        ])
        setProgress({ turn: res.turnNumber, max: res.maxTurns })
      }
    } catch (err) {
      // pendingAnswer stays set so "Retry" can resend without retyping
      setError(
        (err.message || '').includes('503') || (err.message || '').includes('UNAVAILABLE')
          ? "Orbit Mentor is under heavy load right now. Your answer wasn't lost — click Retry."
          : err.message || 'Something went wrong continuing the interview.'
      )
    } finally {
      busyRef.current = false
      setLoading(false)
    }
  }

  if (summary) {
    return (
      <div className="p-4 sm:p-5">
        <h3 className="font-heading text-lg font-semibold">Mock Interview — Result</h3>

        {summary.readinessRating != null && (
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1" aria-label={`Interview readiness: ${summary.readinessRating} out of 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className="text-xl leading-none"
                  style={{ color: n <= summary.readinessRating ? 'var(--color-accent)' : 'var(--color-border)' }}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-sm font-medium">{summary.readinessRating} / 5 interview readiness</span>
          </div>
        )}
        {summary.ratingReason && (
          <p className="text-xs text-[var(--color-text-muted)] mt-1">{summary.ratingReason}</p>
        )}

        <p className="text-sm text-[var(--color-text-muted)] mt-3">{summary.overallImpression}</p>

        <div className="mt-4">
          <h4 className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>
            Areas of Strength
          </h4>
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {summary.strengths.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>

        <div className="mt-4">
          <h4 className="text-sm font-medium" style={{ color: 'var(--color-warning)' }}>
            Areas of Improvement
          </h4>
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {summary.improvements.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  // Question numbers, derived from the transcript so they never drift from
  // what is on screen. Only real questions are numbered; doubts and "not an
  // answer" replies (kind clarification/redirect) get 0 and are not counted.
  const questionNumbers = []
  let askedSoFar = 0
  for (const m of transcript) {
    const isQuestion = m.role === 'assistant' && m.kind !== 'clarification' && m.kind !== 'redirect'
    if (isQuestion) askedSoFar += 1
    questionNumbers.push(isQuestion ? askedSoFar : 0)
  }

  return (
    // Negative margin cancels the parent card's p-4/sm:p-5 padding so the
    // header and input bar can sit flush against the card's edges, like a
    // real chat screen, while the card's rounded corners (overflow-hidden
    // on the parent) still clip everything neatly.
    <div className="flex flex-col h-[72vh] max-h-[640px] -m-4 sm:-m-5">
      <div
        className="flex items-center justify-between px-4 sm:px-5 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h3 className="font-heading text-base font-semibold">Mock Interview</h3>
        {progress.max > 0 && (
          <span
            className="text-xs px-2 py-0.5 rounded-full shrink-0"
            style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }}
          >
            {Math.min(progress.turn, progress.max)}/{progress.max}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 flex flex-col gap-2.5">
        {transcript.map((m, i) => {
          if (m.role === 'feedback') {
            return (
              <div key={i} className="flex justify-center my-1">
                <span
                  className="text-xs italic px-3 py-1.5 rounded-full max-w-[85%] text-center"
                  style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }}
                >
                  {m.text}
                </span>
              </div>
            )
          }

          const isAssistant = m.role === 'assistant'
          const isSide = isAssistant && (m.kind === 'clarification' || m.kind === 'redirect')
          const isRedirect = isAssistant && m.kind === 'redirect'

          return (
            <div key={i} className="flex" style={{ justifyContent: isAssistant ? 'flex-start' : 'flex-end' }}>
              <div
                className="rounded-2xl px-3.5 py-2.5 text-sm max-w-[80%] leading-relaxed whitespace-pre-wrap"
                style={{
                  backgroundColor: isRedirect
                    ? 'color-mix(in srgb, var(--color-warning) 14%, var(--color-surface))'
                    : isAssistant
                      ? 'var(--color-surface-alt)'
                      : 'var(--color-accent)',
                  color: isAssistant ? 'var(--color-text)' : '#fff',
                  border: isRedirect ? '1px solid var(--color-warning)' : undefined,
                  borderBottomLeftRadius: isAssistant ? 4 : undefined,
                  borderBottomRightRadius: isAssistant ? undefined : 4,
                }}
              >
                {isAssistant && !isSide && (
                  <span className="block text-[11px] font-semibold mb-0.5" style={{ color: 'var(--color-accent)' }}>
                    Q{questionNumbers[i]}
                  </span>
                )}
                {isRedirect && (
                  <span className="block text-[11px] font-semibold mb-0.5" style={{ color: 'var(--color-warning)' }}>
                    Not quite what we're looking for
                  </span>
                )}
                {m.kind === 'clarification' && (
                  <span className="block text-[11px] font-semibold mb-0.5 text-[var(--color-text-muted)]">
                    Interviewer
                  </span>
                )}
                {m.text}
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl px-3.5 py-2.5 text-sm italic"
              style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }}
            >
              {transcript.length === 0 ? 'Preparing your first question…' : 'Typing…'}
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center my-1">
            <div className="max-w-[90%]">
              <ErrorNotice
                message={error}
                onRetry={pendingAnswer ? handleRetry : undefined}
                retryDisabled={loading}
              />
            </div>
          </div>
        )}

        <div ref={scrollAnchorRef} />
      </div>

      {question && (
        <div
          className="shrink-0 border-t px-3 sm:px-4 py-3 flex flex-wrap items-end gap-2"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          {!hintDismissed && (
            <div className="basis-full flex items-center gap-2 -mt-1">
              <p className="flex-1 text-[11px] text-[var(--color-text-muted)]">
                Answer in a few sentences. Not sure what's being asked? Ask first. Doubts don't count as a question.
              </p>
              <button
                onClick={dismissHint}
                className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border shrink-0"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}
              >
                OK
              </button>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={answer}
            onChange={handleAnswerChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer or doubt…"
            rows={1}
            disabled={loading}
            className="flex-1 text-sm px-3.5 py-2.5 rounded-2xl border resize-none max-h-32 disabled:opacity-60"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}
          />
          <button
            onClick={handleSubmit}
            disabled={!answer.trim() || loading}
            className="text-sm px-4 py-2.5 rounded-full font-medium text-white disabled:opacity-50 shrink-0"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            Send
          </button>
        </div>
      )}
    </div>
  )
}
