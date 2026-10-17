import { useEffect, useRef, useState } from 'react'
import { startSkillBuilder, continueSkillBuilder } from '../lib/aiCoach'
import ErrorNotice from './ErrorNotice'

const MASTERY_THRESHOLD = 4
const ALREADY_FINISHED_MESSAGE = 'this skill session already finished'

// Teach -> exercise -> answer -> evaluate loop for one skill gap.
// Starts a fresh session automatically on mount (and again whenever the
// person clicks "Practice again"), independent of any previous attempt —
// each click is its own ai_sessions row, so past attempts stay in history.
export default function SkillBuilderSession({ skillName, onCompleted, onMastered }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [session, setSession] = useState(null) // { sessionId, teach, exercise }
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  // Guards against a double-click (or a stray re-render) firing begin()
  // twice concurrently, which raced two sessions against each other and
  // could leave the component holding a reference to one that the server
  // already considered finished — the root cause of the "This skill
  // session already finished" error on the second submit.
  const startingRef = useRef(false)

  async function begin() {
    if (startingRef.current) return
    startingRef.current = true
    setLoading(true)
    setError(null)
    setResult(null)
    setAnswer('')
    // Clear out any stale session immediately so a leftover submit can't
    // land against the session we're about to replace.
    setSession(null)
    try {
      const res = await startSkillBuilder({ skillName })
      setSession(res)
    } catch (err) {
      setError(err.message || 'Could not start this practice session.')
    } finally {
      setLoading(false)
      startingRef.current = false
    }
  }

  useEffect(() => {
    begin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillName])

  async function handleSubmit() {
    if (!answer.trim() || !session || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await continueSkillBuilder({ sessionId: session.sessionId, userAnswer: answer })
      setResult(res.result)
      onCompleted?.(res.result)
      if ((res.result?.readyRating ?? 0) >= MASTERY_THRESHOLD) {
        onMastered?.(res.result)
      }
    } catch (err) {
      const message = err.message || 'Could not evaluate your answer.'
      // The session this answer was meant for is gone server-side (most
      // often because a duplicate submit already closed it out). Rather
      // than show a confusing technical error, quietly start a fresh
      // session so the person can just answer again.
      if (message.toLowerCase().includes(ALREADY_FINISHED_MESSAGE)) {
        await begin()
      } else {
        setError(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center p-6">
        <p className="text-sm text-[var(--color-text-muted)]">Preparing a practice exercise...</p>
      </div>
    )
  }

  if (error && !session) {
    return <ErrorNotice message={error} onRetry={begin} />
  }

  const mastered = (result?.readyRating ?? 0) >= MASTERY_THRESHOLD

  return (
    <div>
      <h3 className="font-heading text-lg font-semibold">{skillName}</h3>

      {session && (
        <div
          className="mt-3 rounded-xl border p-3 sm:p-4"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-alt)' }}
        >
          <p className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
            Quick refresher
          </p>
          <p className="text-sm mt-1 leading-relaxed">{session.teach}</p>
        </div>
      )}

      {session && !result && (
        <div className="mt-4">
          <p className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
            Your exercise
          </p>
          <p className="text-sm mt-1 leading-relaxed">{session.exercise}</p>

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="Type your answer here..."
            rows={5}
            disabled={submitting}
            className="w-full mt-3 text-sm px-3 py-2 rounded-lg border resize-none"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          />
          <button
            onClick={handleSubmit}
            disabled={!answer.trim() || submitting}
            className="text-sm px-4 py-2 rounded-lg font-medium text-white mt-2 disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {submitting ? 'Evaluating...' : 'Submit answer'}
          </button>

          {error && (
            <div className="mt-3">
              <ErrorNotice message={error} onRetry={handleSubmit} />
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="mt-5">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold font-heading">{result.readyRating ?? '—'}</span>
            <span className="text-sm text-[var(--color-text-muted)]">/ 5 Just Rating</span>
          </div>
          <p className="text-sm mt-2 leading-relaxed">{result.feedback}</p>

          {mastered ? (
            <div
              className="mt-4 rounded-xl border p-3 sm:p-4 flex items-start gap-2"
              style={{
                borderColor: 'var(--color-success)',
                backgroundColor: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
              }}
            >
              <span className="text-lg leading-none" style={{ color: 'var(--color-success)' }}>
                ✓
              </span>
              <p className="text-sm" style={{ color: 'var(--color-success)' }}>
                You've learned this skill! It's been moved to your Newly Learned Skills, ready to add
                to your resume.
              </p>
            </div>
          ) : (
            <button
              onClick={begin}
              className="text-sm px-4 py-2 rounded-lg border mt-4"
              style={{ borderColor: 'var(--color-border)' }}
            >
              Practice again
            </button>
          )}
        </div>
      )}
    </div>
  )
}
