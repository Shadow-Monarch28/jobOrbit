import { useState, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { STATUS_COLOR, statusLabel } from '../lib/applicationStatus'
import { computeMatchScore } from '../lib/matchingEngine'
import { SOURCE_LABEL } from '../lib/jobSources/sourceMeta'

const WORKPLACE_LABEL = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
  unspecified: 'Location unspecified',
}


function timeAgo(iso) {
  if (!iso) return null
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  return new Date(iso).toLocaleDateString()
}

function JobCard({ job, applicationStatus, defaultResume, onApplied }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const [applying, setApplying] = useState(false)

  async function handleSave(e) {
    e.stopPropagation()
    if (!user) return
    setSaveState('saving')
    const { error } = await supabase.from('saved_jobs').upsert(
      {
        user_id: user.id,
        job_source: job.source,
        job_source_id: job.sourceId,
        job_data: job,
      },
      { onConflict: 'user_id,job_source,job_source_id' }
    )
    setSaveState(error ? 'error' : 'saved')
  }

  async function handleApply(e) {
    e.stopPropagation()
    window.open(job.url, '_blank', 'noopener,noreferrer')

    // Already tracked — just open the link, don't touch the existing status.
    if (applicationStatus || applying) return

    setApplying(true)
    const matchResult = defaultResume ? computeMatchScore(defaultResume.parsed_skills ?? [], job) : null
    const { error } = await supabase.from('applications').insert({
      user_id: user.id,
      job_source: job.source,
      job_source_id: job.sourceId,
      job_data: job,
      external_url: job.url,
      status: 'applied_pending',
      match_score: matchResult?.score ?? null,
    })
    setApplying(false)
    // A unique-constraint violation here just means another click already
    // created it — safe to ignore.
    if (!error) onApplied?.(`${job.source}:${job.sourceId}`, 'applied_pending')
  }

  function handleOpenDetail() {
    navigate(`/jobs/${job.id}`, { state: { job } })
  }

  return (
    <div
      onClick={handleOpenDetail}
      className="jo-outer rounded-xl border p-5 flex flex-col gap-3 cursor-pointer hover:brightness-110"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <h3 className="font-heading text-base font-semibold leading-snug">{job.title}</h3>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{job.company}</p>
        </div>
        <div className="flex flex-row sm:flex-col flex-wrap items-start sm:items-end gap-1.5 shrink-0">
          <span
            className="text-xs px-2 py-1 rounded-full border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            {SOURCE_LABEL[job.source] ?? job.source}
          </span>
          {applicationStatus && (
            <span
              className="text-xs px-2 py-1 rounded-full"
              style={{
                backgroundColor: 'color-mix(in srgb, ' + STATUS_COLOR[applicationStatus] + ' 18%, transparent)',
                color: STATUS_COLOR[applicationStatus],
              }}
            >
              {statusLabel(applicationStatus)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span
          className="px-2 py-1 rounded-full font-medium"
          style={{
            backgroundColor:
              job.workplace === 'remote' ? 'color-mix(in srgb, var(--color-success) 18%, transparent)' : 'var(--color-surface-alt)',
            color: job.workplace === 'remote' ? 'var(--color-success)' : 'var(--color-text-muted)',
          }}
        >
          {WORKPLACE_LABEL[job.workplace] ?? 'Location unspecified'}
        </span>
        {job.country && (
          <span className="px-2 py-1 rounded-full bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]">
            {job.country}
          </span>
        )}
        {job.salary && (
          <span className="px-2 py-1 rounded-full bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]">
            {job.salary}
          </span>
        )}
      </div>

      {job.description && (
        <p className="text-sm text-[var(--color-text-muted)] line-clamp-3">{job.description}</p>
      )}

      {job.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.tags.slice(0, 5).map((tag, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded-md"
              style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2 mt-1">
        <span className="text-xs text-[var(--color-text-muted)]">{timeAgo(job.postedAt)}</span>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!user || saveState === 'saving' || saveState === 'saved'}
            className="text-sm px-3 py-1.5 rounded-lg border disabled:opacity-60"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleApply}
            disabled={applying}
            className="text-sm px-3 py-1.5 rounded-lg font-medium text-white disabled:opacity-70"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {applying ? 'Applying...' : 'Apply'}
          </button>
        </div>
      </div>
      {saveState === 'error' && (
        <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
          Couldn't save this job. Try again.
        </p>
      )}
    </div>
  )
}

export default memo(JobCard)
