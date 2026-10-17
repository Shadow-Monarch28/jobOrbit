import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { computeMatchScore, generateImprovementGuidance, SHORTLIST_THRESHOLD } from '../lib/matchingEngine'
import { createApplicationIfNeeded } from '../lib/applyToJob'
import { STATUS_COLOR, statusLabel } from '../lib/applicationStatus'

const BORDERLINE_THRESHOLD = 40

function scoreTier(score) {
  if (score === null) return 'unknown'
  if (score >= SHORTLIST_THRESHOLD) return 'strong'
  if (score >= BORDERLINE_THRESHOLD) return 'borderline'
  return 'weak'
}

function tierColor(tier) {
  switch (tier) {
    case 'strong':
      return 'var(--color-success)'
    case 'borderline':
      return 'var(--color-warning)'
    case 'weak':
      return 'var(--color-danger)'
    default:
      return 'var(--color-text-muted)'
  }
}

function ScoreRing({ score }) {
  const tier = scoreTier(score)
  const color = tierColor(tier)
  const pct = score ?? 0
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct / 100)

  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
        <circle cx="28" cy="28" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="5" />
        {score !== null && (
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        )}
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center text-xs font-semibold"
        style={{ color }}
      >
        {score === null ? 'N/A' : `${score}%`}
      </div>
    </div>
  )
}

function SavedJobMatchCard({ savedJob, defaultResume, user, onApply, applying, onRemove, removing }) {
  const [result, setResult] = useState(null)

  const job = savedJob.job_data

  useEffect(() => {
    const computed = computeMatchScore(defaultResume.parsed_skills ?? [], job)
    setResult(computed)
    upsertScore(computed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultResume?.id, savedJob.id])

  async function upsertScore(computed) {
    // A job with no extractable skill data has nothing meaningful to persist —
    // storing it would misrepresent "no data" as a real 0% score in history.
    if (computed.score === null) return

    // Using user.id (from auth) rather than defaultResume.user_id — the
    // resumes query in Resume.jsx doesn't select user_id, so relying on it
    // here silently sent undefined and RLS rejected every insert.
    const { error } = await supabase.from('match_scores').upsert(
      {
        user_id: user.id,
        resume_id: defaultResume.id,
        job_source: savedJob.job_source,
        job_source_id: savedJob.job_source_id,
        score: computed.score,
        matched_skills: computed.matchedSkills,
        missing_skills: computed.missingSkills,
        computed_at: new Date().toISOString(),
      },
      { onConflict: 'resume_id,job_source,job_source_id' }
    )
    if (error) console.error('match_scores upsert failed:', error.message)
  }

  if (!result) return null

  const tier = scoreTier(result.score)
  const guidance = generateImprovementGuidance(result)

  return (
    <div
      onClick={() => job.url && window.open(job.url, '_blank', 'noopener,noreferrer')}
      className="rounded-xl border p-4 flex gap-4 cursor-pointer hover:brightness-110"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <ScoreRing score={result.score} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium truncate">{job.title}</p>
          {tier === 'strong' && (
            <span
              className="text-xs px-2 py-0.5 rounded-full shrink-0"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-success) 18%, transparent)',
                color: 'var(--color-success)',
              }}
            >
              Strong Match
            </span>
          )}
          {savedJob.status_note && (
            <span
              className="text-xs px-2 py-0.5 rounded-full shrink-0"
              style={{
                backgroundColor: 'color-mix(in srgb, ' + STATUS_COLOR[savedJob.status_note] + ' 18%, transparent)',
                color: STATUS_COLOR[savedJob.status_note],
              }}
            >
              {statusLabel(savedJob.status_note)}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
          {job.company} · {job.location}
        </p>

        {(result.matchedSkills.length > 0 || result.missingSkills.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {result.matchedSkills.map((skill) => (
              <span
                key={`m-${skill}`}
                className="text-xs px-2 py-0.5 rounded-md"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-success) 14%, transparent)',
                  color: 'var(--color-success)',
                }}
              >
                {skill}
              </span>
            ))}
            {result.missingSkills.map((skill) => (
              <span
                key={`x-${skill}`}
                className="text-xs px-2 py-0.5 rounded-md"
                style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }}
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-[var(--color-text-muted)] mt-2">{guidance}</p>
      </div>

      <div className="flex flex-col gap-1.5 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onApply()
          }}
          disabled={applying}
          className="text-xs px-2 py-1 rounded-md disabled:opacity-50 text-white"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          {applying ? 'Applying...' : 'Apply'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          disabled={removing}
          className="text-xs px-2 py-1 rounded-md disabled:opacity-50"
          style={{ color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}
        >
          {removing ? 'Removing...' : 'Remove'}
        </button>
      </div>
    </div>
  )
}

export default function SavedJobsMatchSection({ user, defaultResume }) {
  const [savedJobs, setSavedJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [applyingId, setApplyingId] = useState(null)
  const [removingId, setRemovingId] = useState(null)

  useEffect(() => {
    if (!user) return
    fetchSavedJobs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function fetchSavedJobs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('saved_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })

    if (!error) setSavedJobs(data ?? [])
    setLoading(false)
  }

  async function handleRemove(savedJobId) {
    setRemovingId(savedJobId)
    const { error } = await supabase.from('saved_jobs').delete().eq('id', savedJobId)
    if (error) {
      console.error('Failed to remove saved job:', error.message)
    } else {
      setSavedJobs((prev) => prev.filter((sj) => sj.id !== savedJobId))
    }
    setRemovingId(null)
  }

  async function handleApply(savedJob) {
    const job = savedJob.job_data
    window.open(job.url, '_blank', 'noopener,noreferrer')
    setApplyingId(savedJob.id)

    const matchScore = defaultResume
      ? computeMatchScore(defaultResume.parsed_skills ?? [], job).score
      : null
    const { error } = await createApplicationIfNeeded({ userId: user.id, job, matchScore })
    if (!error) {
      // Real move, not a copy — the saved_jobs row goes away once it's tracked as an application.
      const { error: deleteError } = await supabase.from('saved_jobs').delete().eq('id', savedJob.id)
      if (!deleteError) setSavedJobs((prev) => prev.filter((sj) => sj.id !== savedJob.id))
    }
    setApplyingId(null)
  }

  if (!defaultResume) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Set a default resume above to see match scores for your saved jobs.
      </p>
    )
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Loading saved jobs...</p>
  }

  if (savedJobs.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        No saved jobs yet — save jobs from search to see how they match your resume.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {savedJobs.map((sj) => (
        <SavedJobMatchCard
          key={sj.id}
          savedJob={sj}
          defaultResume={defaultResume}
          user={user}
          onApply={() => handleApply(sj)}
          applying={applyingId === sj.id}
          onRemove={() => handleRemove(sj.id)}
          removing={removingId === sj.id}
        />
      ))}
    </div>
  )
}
