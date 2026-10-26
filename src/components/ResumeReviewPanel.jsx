import { Link } from 'react-router-dom'
import { useState } from 'react'
import { requestResumeReview } from '../lib/aiCoach'
import { getSkillResources } from '../lib/skillResources'
import ErrorNotice from './ErrorNotice'

export default function ResumeReviewPanel({ applicationId, resumes }) {
  const [resumeId, setResumeId] = useState(resumes?.[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  async function handleReview() {
    if (!resumeId) return
    setLoading(true)
    setError(null)
    try {
      const res = await requestResumeReview({ applicationId, resumeId })
      setResult(res.result)
    } catch (err) {
      setError(err.message || 'Could not review this resume.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h3 className="font-heading text-lg font-semibold">Your Resume. Their Expectations. One Clear Picture.</h3>
      <p className="text-sm text-[var(--color-text-muted)] mt-2 leading-relaxed">
        See how your resume stacks up against the job description and discover how well your experience
        aligns with the role.
      </p>

      {!result && (resumes || []).length === 0 && (
        <div className="mt-6">
          <p className="font-medium">No resume on file yet.</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
            Upload your resume in{' '}
            <Link to="/account#resume" className="underline" style={{ color: 'var(--color-accent)' }}>
              Account Details
            </Link>{' '}
            to unlock your personalized review and discover your fit for this role.
          </p>
        </div>
      )}

      {!result && (resumes || []).length > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <select
            value={resumeId}
            onChange={(e) => setResumeId(e.target.value)}
            className="flex-1 text-sm px-3 py-2 rounded-lg border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            {(resumes || []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.file_name}
              </option>
            ))}
          </select>
          <button
            onClick={handleReview}
            disabled={!resumeId || loading}
            className="text-sm px-4 py-2 rounded-lg font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {loading ? 'Reviewing...' : 'Review this resume'}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3">
          <ErrorNotice message={error} onRetry={handleReview} retryDisabled={loading} retryLabel="Try again" />
        </div>
      )}

      {result && (
        <div className="mt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold font-heading">{result.rating ?? '—'}</span>
            <span className="text-sm text-[var(--color-text-muted)]">/ 100 match for this role</span>
          </div>
          <p className="text-sm mt-2">{result.summary}</p>

          {result.strengths?.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>
                Strengths
              </h4>
              <ul className="mt-1 flex flex-col gap-1 text-sm">
                {result.strengths.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
          )}

          {result.missingSkills?.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium" style={{ color: 'var(--color-danger)' }}>
                Likely Why You Weren't Selected
              </h4>
              <div className="mt-2 flex flex-col gap-3">
                {result.missingSkills.map((skill) => (
                  <div
                    key={skill}
                    className="rounded-xl border p-3"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
                  >
                    <p className="text-sm font-medium">{skill}</p>
                    <div className="flex flex-col gap-1 mt-1.5">
                      {getSkillResources(skill).map((res) => (
                        <a
                          key={res.url}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          {res.label} →
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
