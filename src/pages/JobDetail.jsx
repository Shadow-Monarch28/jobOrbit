import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { computeMatchScore, generateImprovementGuidance, SHORTLIST_THRESHOLD } from '../lib/matchingEngine'
import { STATUS_COLOR, statusLabel } from '../lib/applicationStatus'

// Job ids are built as "<source>-<sourceId>" (e.g. "arbeitnow-senior-dev-123").
// Source names never contain hyphens, so splitting on the first one recovers
// both parts even when sourceId itself has hyphens in it.
function parseJobId(id) {
  const dashIndex = id.indexOf('-')
  if (dashIndex === -1) return null
  return { source: id.slice(0, dashIndex), sourceId: id.slice(dashIndex + 1) }
}

export default function JobDetail() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [job, setJob] = useState(location.state?.job ?? null)
  const [loadingJob, setLoadingJob] = useState(!location.state?.job)
  const [notFound, setNotFound] = useState(false)
  const [defaultResume, setDefaultResume] = useState(null)
  const [loadingResume, setLoadingResume] = useState(true)
  const [application, setApplication] = useState(null)
  const [loadingApplication, setLoadingApplication] = useState(true)
  const [marking, setMarking] = useState(false)

  // Fall back to looking the job up in the user's own saved_jobs when landing
  // here directly (e.g. a reload) without navigation state.
  useEffect(() => {
    if (job || !user) return
    const parsed = parseJobId(id)
    if (!parsed) {
      setNotFound(true)
      setLoadingJob(false)
      return
    }

    supabase
      .from('saved_jobs')
      .select('job_data')
      .eq('user_id', user.id)
      .eq('job_source', parsed.source)
      .eq('job_source_id', parsed.sourceId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setJob(data[0].job_data)
        } else {
          setNotFound(true)
        }
        setLoadingJob(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, id])

  useEffect(() => {
    if (!user) return
    supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setDefaultResume((data ?? []).find((r) => r.is_default) ?? null)
        setLoadingResume(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (!user || !job) return
    supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      .eq('job_source', job.source)
      .eq('job_source_id', job.sourceId)
      .then(({ data }) => {
        setApplication(data && data.length > 0 ? data[0] : null)
        setLoadingApplication(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, job?.source, job?.sourceId])

  const matchResult =
    job && defaultResume ? computeMatchScore(defaultResume.parsed_skills ?? [], job) : null
  const guidance = matchResult ? generateImprovementGuidance(matchResult) : null

  async function handleApply() {
    window.open(job.url, '_blank', 'noopener,noreferrer')
    if (application || marking) return

    setMarking(true)
    const { data, error } = await supabase
      .from('applications')
      .insert({
        user_id: user.id,
        job_source: job.source,
        job_source_id: job.sourceId,
        job_data: job,
        external_url: job.url,
        status: 'applied_pending',
        match_score: matchResult?.score ?? null,
      })
      .select()
    if (!error && data?.[0]) setApplication(data[0])
    setMarking(false)
  }

  if (loadingJob) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[var(--color-text-muted)]">Loading job...</p>
      </div>
    )
  }

  if (notFound || !job) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <h1 className="font-heading text-xl font-semibold mb-2">Job details unavailable</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          This job wasn't opened from a search result and hasn't been saved, so there's no data to
          show here.
        </p>
        <Link to="/search" className="text-sm underline" style={{ color: 'var(--color-accent)' }}>
          Back to Search Jobs
        </Link>
      </div>
    )
  }

  const strong = matchResult && matchResult.score !== null && matchResult.score >= SHORTLIST_THRESHOLD

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="text-sm mb-4"
        style={{ color: 'var(--color-text-muted)' }}
      >
        ← Back
      </button>

      <h1 className="font-heading text-2xl font-semibold">{job.title}</h1>
      <p className="text-[var(--color-text-muted)] mt-1">
        {job.company} · {job.location}
      </p>

      <div className="flex flex-wrap gap-2 text-xs mt-3">
        {job.salary && (
          <span className="px-2 py-1 rounded-full bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]">
            {job.salary}
          </span>
        )}
        {job.jobType && (
          <span className="px-2 py-1 rounded-full bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]">
            {job.jobType}
          </span>
        )}
        {job.experienceLevel && (
          <span className="px-2 py-1 rounded-full bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]">
            {job.experienceLevel}
          </span>
        )}
      </div>

      <div
        className="rounded-xl border p-5 mt-6"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        {loadingResume ? (
          <p className="text-sm text-[var(--color-text-muted)]">Loading match score...</p>
        ) : !defaultResume ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            Set a default resume in My Resume to see your match score for this job.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="text-lg font-semibold px-3 py-1 rounded-full"
                style={{
                  color: matchResult.score === null ? 'var(--color-text-muted)' : strong ? 'var(--color-success)' : 'var(--color-warning)',
                  border: `2px solid ${matchResult.score === null ? 'var(--color-text-muted)' : strong ? 'var(--color-success)' : 'var(--color-warning)'}`,
                }}
              >
                {matchResult.score === null ? 'N/A' : `${matchResult.score}%`} match
              </span>
              {strong && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-success) 18%, transparent)',
                    color: 'var(--color-success)',
                  }}
                >
                  Strong Match
                </span>
              )}
            </div>

            {(matchResult.matchedSkills.length > 0 || matchResult.missingSkills.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {matchResult.matchedSkills.map((s) => (
                  <span
                    key={`m-${s}`}
                    className="text-xs px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-success) 14%, transparent)',
                      color: 'var(--color-success)',
                    }}
                  >
                    {s}
                  </span>
                ))}
                {matchResult.missingSkills.map((s) => (
                  <span
                    key={`x-${s}`}
                    className="text-xs px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            <p className="text-sm text-[var(--color-text-muted)] mt-3">{guidance}</p>
          </>
        )}
      </div>

      {job.description && (
        <div className="mt-6">
          <h2 className="font-heading text-lg font-semibold mb-2">Description</h2>
          <p className="text-sm whitespace-pre-line text-[var(--color-text)]">{job.description}</p>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap mt-8">
        <button
          onClick={handleApply}
          disabled={marking}
          className="text-sm px-4 py-2 rounded-lg font-medium text-white disabled:opacity-70"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          {marking ? 'Applying...' : `Apply on ${job.company}'s site`}
        </button>

        {loadingApplication ? (
          <span className="text-sm text-[var(--color-text-muted)]">Checking application status...</span>
        ) : application && (
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-1 rounded-full"
              style={{
                backgroundColor: 'color-mix(in srgb, ' + STATUS_COLOR[application.status] + ' 18%, transparent)',
                color: STATUS_COLOR[application.status],
              }}
            >
              {statusLabel(application.status)}
            </span>
            <Link to="/dashboard" className="text-xs underline" style={{ color: 'var(--color-text-muted)' }}>
              Manage status in Applications
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
