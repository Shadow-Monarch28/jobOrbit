import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { listDocs, listJobs, isResumeDoc, docTitle } from '../lib/builderApi'
import { RESUME_TEMPLATES, COVER_TEMPLATES } from '../lib/resumeTemplates'

// Where a new resume or cover letter starts: blank, from an existing resume, or
// tailored to a saved job. It only collects choices; the editor does the work.
export default function NewDocModal({ kind = 'resume', initialTemplateId, initialMode = 'blank', onClose, onStart }) {
  const { user } = useAuth()
  const templates = kind === 'cover' ? COVER_TEMPLATES : RESUME_TEMPLATES
  const [templateId, setTemplateId] = useState(initialTemplateId || templates[kind === 'cover' ? 0 : 1].id)
  const [mode, setMode] = useState(initialMode)
  const [docs, setDocs] = useState([])
  const [jobs, setJobs] = useState([])
  const [resumeId, setResumeId] = useState('')
  const [jobKey, setJobKey] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    Promise.all([listDocs(user.id), listJobs(user.id)])
      .then(([d, j]) => {
        if (!live) return
        const resumes = d.filter(isResumeDoc)
        setDocs(resumes)
        setJobs(j)
        setResumeId((resumes.find((r) => r.is_default) ?? resumes[0])?.id ?? '')
        setJobKey(j[0]?.key ?? '')
      })
      .catch(() => {})
      .finally(() => live && setLoading(false))
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => { live = false; window.removeEventListener('keydown', onKey) }
  }, [user.id, onClose])

  const needsResume = mode === 'resume' || mode === 'tailor' || (kind === 'cover' && mode === 'tailor')
  const needsJob = mode === 'tailor'
  const disabled = (needsResume && !resumeId && kind === 'resume') || (needsJob && !jobKey)

  const options = kind === 'cover'
    ? [['blank', 'Start from a blank letter'], ['tailor', 'Draft it for a saved job']]
    : [['blank', 'Start from scratch'], ['resume', 'Start from one of my resumes'], ['tailor', 'Tailor one of my resumes to a saved job']]

  function start() {
    const job = jobs.find((j) => j.key === jobKey)?.job ?? null
    onStart({ kind, templateId, mode, resumeId: needsResume ? resumeId : '', job: needsJob ? job : null })
  }

  const field = 'w-full text-sm px-3 py-2 rounded-lg border bg-transparent'
  const bs = { borderColor: 'var(--color-border)' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,.55)' }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-xl border p-5 max-h-[90vh] overflow-y-auto" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <h2 className="font-heading font-semibold text-lg">{kind === 'cover' ? 'New cover letter' : 'New resume'}</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Pick a look and a starting point. You can change both in the editor.</p>

        <label className="block text-sm mt-4 mb-1 text-[var(--color-text-muted)]">Template</label>
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={field} style={bs}>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <div className="mt-4 flex flex-col gap-2">
          {options.map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="start" checked={mode === value} onChange={() => setMode(value)} style={{ accentColor: 'var(--color-accent)' }} />
              {label}
            </label>
          ))}
        </div>

        {loading && <p className="text-xs text-[var(--color-text-muted)] mt-3">Loading your resumes and saved jobs...</p>}

        {!loading && kind === 'resume' && (mode === 'resume' || mode === 'tailor') && (
          docs.length === 0 ? (
            <p className="text-xs mt-3" style={{ color: 'var(--color-warning)' }}>You have no resumes yet. Upload one or start from scratch.</p>
          ) : (
            <>
              <label className="block text-sm mt-4 mb-1 text-[var(--color-text-muted)]">Base resume</label>
              <select value={resumeId} onChange={(e) => setResumeId(e.target.value)} className={field} style={bs}>
                {docs.map((r) => <option key={r.id} value={r.id}>{docTitle(r)}{r.is_default ? ' (default)' : ''}</option>)}
              </select>
            </>
          )
        )}

        {!loading && mode === 'tailor' && (
          jobs.length === 0 ? (
            <p className="text-xs mt-3" style={{ color: 'var(--color-warning)' }}>Save or apply to a job in Discover first, then come back to tailor.</p>
          ) : (
            <>
              <label className="block text-sm mt-4 mb-1 text-[var(--color-text-muted)]">Job</label>
              <select value={jobKey} onChange={(e) => setJobKey(e.target.value)} className={field} style={bs}>
                {jobs.map((j) => <option key={j.key} value={j.key}>{j.job.title} · {j.job.company}</option>)}
              </select>
              <p className="text-xs text-[var(--color-text-muted)] mt-2 leading-relaxed">Orbit Mentor rewrites the summary and bullets using the job's wording. It only uses facts already in your resume.</p>
            </>
          )
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm" style={bs}>Cancel</button>
          <button onClick={start} disabled={disabled || loading} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--color-accent)' }}>
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
