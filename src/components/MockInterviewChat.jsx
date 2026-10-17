import { useEffect, useRef, useState } from 'react'
import { startMockInterview, continueMockInterview } from '../lib/aiCoach'
import ErrorNotice from './ErrorNotice'

export default function MockInterviewChat({ applicationId, onComplete }) {
  const [sessionId, setSessionId] = useState(null)
  const [question, setQuestion] = useState(null)
  const [transcript, setTranscript] = useState([]) // [{role: 'assistant'|'user'|'feedback', text}]
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)
  const [pendingAnswer, setPendingAnswer] = useState(null) // kept so a failed send can be retried without retyping
  const [progress, setProgress] = useState({ turn: 0, max: 10 })

  const scrollAnchorRef = useRef(null)
  const textareaRef = useRef(null)

  // Auto-scroll to the latest message whenever the transcript grows, or
  // the loading/typing indicator appears — covers both a new question
  // arriving and the "Typing..." bubble showing up while waiting.
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [transcript, loading, summary])

  useEffect(() => {
    let active = true
    async function begin() {
      setLoading(true)
      setError(null)
      try {
        const res = await startMockInterview({ applicationId })
        if (!active) return
        setSessionId(res.sessionId)
        setQuestion(res.question)
        setTranscript([{ role: 'assistant', text: res.question }])
        setProgress({ turn: res.turnNumber, max: res.maxTurns })
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
    setLoading(true)
    setError(null)
    try {
      const res = await continueMockInterview({ sessionId, userAnswer: myAnswer })
      setPendingAnswer(null)
      if (res.completed) {
        setSummary(res.summary)
        setQuestion(null)
        onComplete?.(res.summary)
      } else {
        setQuestion(res.question)
        setTranscript((t) => [
          ...t,
          ...(res.feedback ? [{ role: 'feedback', text: res.feedback }] : []),
          { role: 'assistant', text: res.question },
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

  // Running question counter, derived straight from the transcript so it
  // never drifts from what's actually shown on screen — question N is
  // simply the Nth 'assistant' entry. This replaces the old "Question 5
  // of 6" header line with inline numbering on each question bubble.
  let questionCounter = 0

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
          if (isAssistant) questionCounter += 1

          return (
            <div key={i} className="flex" style={{ justifyContent: isAssistant ? 'flex-start' : 'flex-end' }}>
              <div
                className="rounded-2xl px-3.5 py-2.5 text-sm max-w-[80%] leading-relaxed whitespace-pre-wrap"
                style={{
                  backgroundColor: isAssistant ? 'var(--color-surface-alt)' : 'var(--color-accent)',
                  color: isAssistant ? 'var(--color-text)' : '#fff',
                  borderBottomLeftRadius: isAssistant ? 4 : undefined,
                  borderBottomRightRadius: isAssistant ? undefined : 4,
                }}
              >
                {isAssistant && (
                  <span className="block text-[11px] font-semibold mb-0.5" style={{ color: 'var(--color-accent)' }}>
                    Q{questionCounter}
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
          className="shrink-0 border-t px-3 sm:px-4 py-3 flex items-end gap-2"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <textarea
            ref={textareaRef}
            value={answer}
            onChange={handleAnswerChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer here…"
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
