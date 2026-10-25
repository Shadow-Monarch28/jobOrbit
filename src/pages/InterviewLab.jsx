import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { statusLabel, STATUS_COLOR } from '../lib/applicationStatus'
import { getRecommendation } from '../lib/orbitRecommendation'
import MockInterviewChat from '../components/MockInterviewChat'
import QuestionBankPanel from '../components/QuestionBankPanel'
import ResumeReviewPanel from '../components/ResumeReviewPanel'

function timeAgo(iso) {
  if (!iso) return null
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export default function InterviewLab() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState([])
  const [resumes, setResumes] = useState([])
  // application ids that have a mock interview in progress (on any device)
  const [inProgress, setInProgress] = useState(() => new Set())
  const [selected, setSelected] = useState(null) // application object
  const [reloadKey, setReloadKey] = useState(0)
  const [activeMode, setActiveMode] = useState(null) // 'mock_interview' | 'question_bank' | 'skill_gaps'

  useEffect(() => {
    let active = true
    async function load() {
      if (!user) return
      setLoading(true)
      const [{ data: apps, error: appsErr }, { data: res, error: resErr }, { data: live }] = await Promise.all([
        supabase
          .from('applications')
          .select('*')
          .eq('user_id', user.id)
          .order('applied_at', { ascending: false }),
        supabase.from('resumes').select('id, file_name').eq('user_id', user.id),
        supabase
          .from('ai_sessions')
          .select('application_id')
          .eq('user_id', user.id)
          .eq('mode', 'mock_interview')
          .eq('status', 'in_progress'),
      ])
      if (!active) return
      if (appsErr) console.error('InterviewLab applications fetch failed:', appsErr)
      if (resErr) console.error('InterviewLab resumes fetch failed:', resErr)
      setApplications(apps || [])
      setResumes(res || [])
      setInProgress(new Set((live || []).map((r) => r.application_id)))
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
    // Depend on user?.id, not the user object itself — Supabase refreshes
    // the auth token (and hands back a new object with the same id) when
    // a backgrounded tab regains focus. Depending on the object reference
    // reran this fetch on every tab switch, flashing the whole page back
    // to a loading state even mid-interview.
  }, [user?.id, reloadKey])

  // "Start Mock Interview" becomes "Continue Interview" when one is already running.
  function labelFor(app, mode, label) {
    return mode === 'mock_interview' && inProgress.has(app.id) ? 'Continue Interview' : label
  }

  function selectApplication(app, mode) {
    setSelected(app)
    setActiveMode(mode)
  }

  function backToList() {
    setSelected(null)
    setActiveMode(null)
    setReloadKey((k) => k + 1)
  }

  // Check `selected` before `loading` — once you're mid-interview/review,
  // a background refetch of the applications list (e.g. from the auth
  // token refresh above) must never blank out the active session.
  if (selected) {
    const job = selected.job_data || {}
    return (
      <div className="p-4 sm:p-8 max-w-2xl mx-auto">
        <button onClick={backToList} className="text-sm mb-4" style={{ color: 'var(--color-accent)' }}>
          ← Back to Interview Lab
        </button>
        <h1 className="text-xl font-semibold font-heading">
          {job.title} <span className="text-[var(--color-text-muted)]">· {job.company}</span>
        </h1>

        <div
          className="rounded-xl border p-4 sm:p-5 mt-5 overflow-hidden"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          {activeMode === 'mock_interview' && (
            <MockInterviewChat applicationId={selected.id} />
          )}
          {activeMode === 'question_bank' && <QuestionBankPanel job={job} />}
          {activeMode === 'skill_gaps' && (
            <ResumeReviewPanel applicationId={selected.id} resumes={resumes} />
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <p className="text-[var(--color-text-muted)]">Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold font-heading">Interview Lab</h1>
      <p className="text-[var(--color-text-muted)] mt-1">
        Orbit Mentor — your job-specific interview & career preparation partner.
      </p>
      <p className="text-sm text-[var(--color-text-muted)] mt-4">Choose an application to prepare for.</p>

      {applications.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)] mt-6">
          You don't have any tracked applications yet. Apply to a job from Discover to get started.
        </p>
      )}

      <div className="flex flex-col gap-3 mt-4">
        {applications.map((app) => {
          const job = app.job_data || {}
          const rec = getRecommendation(app)
          return (
            <div
              key={app.id}
              className="rounded-xl border p-4 sm:p-5"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-heading font-semibold">{job.title}</h3>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {job.company} · {timeAgo(app.applied_at)}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: 'color-mix(in srgb, ' + STATUS_COLOR[app.status] + ' 18%, transparent)',
                    color: STATUS_COLOR[app.status],
                  }}
                >
                  {statusLabel(app.status)}
                </span>
              </div>

              {rec.note && <p className="text-sm mt-3">{rec.note}</p>}

              {rec.primary !== 'none' && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button
                    onClick={() => selectApplication(app, rec.primary)}
                    className="text-sm px-4 py-2 rounded-lg font-medium text-white"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    {labelFor(app, rec.primary, rec.primaryLabel)}
                  </button>
                  {rec.secondary && (
                    <button
                      onClick={() => selectApplication(app, rec.secondary)}
                      className="text-sm px-4 py-2 rounded-lg border"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      {labelFor(app, rec.secondary, rec.secondaryLabel)}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
