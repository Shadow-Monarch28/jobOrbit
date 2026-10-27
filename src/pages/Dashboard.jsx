import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { computeMatchScore, SHORTLIST_THRESHOLD } from '../lib/matchingEngine'
import { createApplicationIfNeeded } from '../lib/applyToJob'
import { STATUS_COLOR, statusLabel } from '../lib/applicationStatus'
import PillLink from '../components/PillLink'
import OrbitArt from '../components/OrbitArt'

function StatCard({ label, value, sub, onClick, active, tone }) {
  const clickable = typeof onClick === 'function'
  return (
    <button
      onClick={onClick}
      disabled={!clickable}
      className={`jo-kpi jo-kpi-${tone} rounded-xl p-4 text-left ${active ? 'jo-kpi-active' : ''} ${
        clickable ? 'cursor-pointer hover:brightness-105' : 'cursor-default'
      }`}
    >
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className="jo-kpi-value text-2xl font-heading font-semibold mt-1">{value}</p>
      {sub && <p className="text-xs text-[var(--color-text-muted)] mt-1">{sub}</p>}
    </button>
  )
}

function MatchJobCard({ job, score, onRemove, removing, onApply, applying, statusNote }) {
  const hasScore = score !== null && score !== undefined
  const strong = hasScore && score >= SHORTLIST_THRESHOLD
  const ringColor = !hasScore
    ? 'var(--color-text-muted)'
    : strong
    ? 'var(--color-success)'
    : 'var(--color-warning)'

  return (
    <div
      onClick={() => job.url && window.open(job.url, '_blank', 'noopener,noreferrer')}
      className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 cursor-pointer hover:brightness-110"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div
          className="text-sm font-semibold shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
          style={{ color: ringColor, border: `2px solid ${ringColor}` }}
        >
          {hasScore ? `${score}%` : 'N/A'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">{job.title}</p>
            {strong && (
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
            {statusNote && (
              <span
                className="text-xs px-2 py-0.5 rounded-full shrink-0"
                style={{
                  backgroundColor: 'color-mix(in srgb, ' + STATUS_COLOR[statusNote] + ' 18%, transparent)',
                  color: STATUS_COLOR[statusNote],
                }}
              >
                {statusLabel(statusNote)}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--color-text-muted)] truncate">
            {job.company} · {job.location}
          </p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onApply()
          }}
          disabled={applying}
          className="text-xs px-2 py-1 rounded-md shrink-0 disabled:opacity-50 text-white"
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
          className="text-xs px-2 py-1 rounded-md shrink-0 disabled:opacity-50"
          style={{ color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}
        >
          {removing ? 'Removing...' : 'Remove'}
        </button>
      </div>
    </div>
  )
}



export default function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [savedJobs, setSavedJobs] = useState([])
  const [defaultResume, setDefaultResume] = useState(null)
  const [applications, setApplications] = useState([])
  const [removingId, setRemovingId] = useState(null)
  const [applyingId, setApplyingId] = useState(null)
  const [activeView, setActiveView] = useState('top') // 'top' | 'saved' | 'strong'

  useEffect(() => {
    if (!user) return
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function fetchAll() {
    setLoading(true)

    const [resumesRes, savedJobsRes, applicationsRes] = await Promise.all([
      supabase.from('resumes').select('*').eq('user_id', user.id),
      supabase.from('saved_jobs').select('*').eq('user_id', user.id),
      supabase.from('applications').select('*').eq('user_id', user.id),
    ])

    const resumes = resumesRes.data ?? []
    setDefaultResume(resumes.find((r) => r.is_default) ?? null)
    setSavedJobs(savedJobsRes.data ?? [])
    setApplications(applicationsRes.data ?? [])
    setLoading(false)
  }

  async function handleRemoveSavedJob(savedJobId) {
    setRemovingId(savedJobId)
    const { error } = await supabase.from('saved_jobs').delete().eq('id', savedJobId)
    if (error) {
      console.error('Failed to remove saved job:', error.message)
    } else {
      setSavedJobs((prev) => prev.filter((sj) => sj.id !== savedJobId))
    }
    setRemovingId(null)
  }

  async function handleApplyFromSaved(savedJobId, job, score) {
    window.open(job.url, '_blank', 'noopener,noreferrer')
    setApplyingId(savedJobId)

    const { error, data } = await createApplicationIfNeeded({ userId: user.id, job, matchScore: score ?? null })
    if (!error) {
      // Real move, not a copy — the saved_jobs row goes away once it's tracked as an application.
      const { error: deleteError } = await supabase.from('saved_jobs').delete().eq('id', savedJobId)
      if (!deleteError) {
        setSavedJobs((prev) => prev.filter((sj) => sj.id !== savedJobId))
        if (data) setApplications((prev) => [...prev, data])
      }
    }
    setApplyingId(null)
  }

  function toggleView(view) {
    setActiveView((prev) => (prev === view ? 'top' : view))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[var(--color-text-muted)]">Loading dashboard...</p>
      </div>
    )
  }

  // Score every saved job live against the default resume — same deterministic
  // engine used on My Resume, so numbers here never drift from that page.
  const allSavedScored = defaultResume
    ? savedJobs.map((sj) => ({
        id: sj.id,
        job: sj.job_data,
        statusNote: sj.status_note ?? null,
        ...computeMatchScore(defaultResume.parsed_skills ?? [], sj.job_data),
      }))
    : savedJobs.map((sj) => ({
        id: sj.id,
        job: sj.job_data,
        statusNote: sj.status_note ?? null,
        score: null,
        matchedSkills: [],
        missingSkills: [],
      }))

  const scoredOnly = allSavedScored.filter((r) => r.score !== null)

  const avgScore =
    scoredOnly.length > 0
      ? Math.round(scoredOnly.reduce((sum, r) => sum + r.score, 0) / scoredOnly.length)
      : null

  const strongMatches = scoredOnly.filter((r) => r.score >= SHORTLIST_THRESHOLD)

  const topMatches = [...scoredOnly].sort((a, b) => b.score - a.score).slice(0, 3)

  const allSavedSorted = [...allSavedScored].sort((a, b) => {
    if (a.score === null && b.score === null) return 0
    if (a.score === null) return 1
    if (b.score === null) return -1
    return b.score - a.score
  })


  const viewConfig = {
    top: { title: 'Top Matches', jobs: topMatches },
    saved: { title: 'All Saved Jobs', jobs: allSavedSorted },
    strong: { title: 'Strong Matches', jobs: strongMatches },
  }
  const current = viewConfig[activeView]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const meta = user?.user_metadata || {}
  const fullName = meta.full_name || meta.name || ''
  const firstName = fullName ? fullName.split(' ')[0] : user?.email ? user.email.split('@')[0] : ''

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="jo-bg-mist relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div className="pr-16 sm:pr-0">
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold">
            {greeting}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-[var(--color-text-muted)] mt-3 max-w-md leading-relaxed">
            Your next big break could be one click away. Check your matches, revisit saved jobs, and keep your applications on track.
          </p>
        </div>
        <OrbitArt size={84} variant="rose" float className="absolute -right-3 top-3 sm:hidden" />
        <OrbitArt size={150} variant="rose" float className="absolute -right-2 top-1/2 -translate-y-1/2 hidden sm:block" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-5">
        <StatCard
          label="Saved Jobs"
          tone="saved"
          value={savedJobs.length}
          onClick={() => toggleView('saved')}
          active={activeView === 'saved'}
        />
        <StatCard tone="avg" label="Avg Match Score" value={avgScore === null ? 'N/A' : `${avgScore}%`} />
        <StatCard
          label="Strong Matches"
          tone="strong"
          value={strongMatches.length}
          sub={`${SHORTLIST_THRESHOLD}%+ match`}
          onClick={() => toggleView('strong')}
          active={activeView === 'strong'}
        />
      </div>

      <h2 className="font-heading text-xl font-semibold mt-10 mb-3">{current.title}</h2>

      {!defaultResume && activeView === 'top' ? (
        <div>
          <p className="font-heading text-lg font-medium">Let's Find Your Perfect Fit.</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-2 leading-relaxed">
            No resume, no matchmaking magic. Set a default resume in{' '}
            <PillLink to="/account#resume">Resume Dock</PillLink>{' '}
            to see which jobs are giving career chemistry.
          </p>
        </div>
      ) : current.jobs.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
          {activeView === 'saved'
            ? 'No saved jobs yet — save some from Search Jobs.'
            : activeView === 'strong'
              ? 'No stars aligned just yet! Save jobs from Search Jobs and let JobOrbit guide you to your next career constellation.'
              : 'No scored saved jobs yet — save some jobs from Search Jobs to see your best matches.'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {current.jobs.map((m) => (
            <MatchJobCard
              key={m.id}
              job={m.job}
              score={m.score}
              onRemove={() => handleRemoveSavedJob(m.id)}
              removing={removingId === m.id}
              onApply={() => handleApplyFromSaved(m.id, m.job, m.score)}
              applying={applyingId === m.id}
              statusNote={m.statusNote}
            />
          ))}
        </div>
      )}
    </div>
  )
}
