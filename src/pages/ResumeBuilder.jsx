import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { extractResumeText } from '../lib/resumeParser'
import { extractSkillsFromText } from '../lib/matchingEngine'
import { listDocs, listJobs, deleteDocs, setDefaultDoc, loadModel, isCover, isBuilt, isResumeDoc, docTitle } from '../lib/builderApi'
import { renderBuilderPdf, renderCoverPdf, downloadPdfBytes, openPdfBytes } from '../lib/resumePdf'
import { RESUME_TEMPLATES, COVER_TEMPLATES, TEMPLATE_CATEGORIES, filterTemplates, getResumeTemplate, getCoverTemplate } from '../lib/resumeTemplates'
import { emptyResume, emptyCoverLetter } from '../lib/resumeModel'
import ResumePaper from '../components/ResumePaper'
import AtsPanel from '../components/AtsPanel'
import NewDocModal from '../components/NewDocModal'
import PillLink from '../components/PillLink'

const bs = { borderColor: 'var(--color-border)' }
const TABS = [['resumes', 'Resumes'], ['letters', 'Cover Letters'], ['templates', 'Templates'], ['ats', 'ATS Evaluator']]

function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]]
  for (const [name, secs] of units) {
    const n = Math.floor(s / secs)
    if (n >= 1) return `${n} ${name}${n === 1 ? '' : 's'} ago`
  }
  return 'just now'
}

function Badge({ children, tone }) {
  const style = tone === 'accent'
    ? { backgroundColor: 'var(--color-accent)', color: '#fff' }
    : { backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }
  return <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={style}>{children}</span>
}

function ActionCard({ title, blurb, onClick, icon }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl border p-4 text-left flex items-center gap-3 transition-colors hover:border-[var(--color-accent)]" style={{ ...bs, backgroundColor: 'var(--color-surface)' }}>
      <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 14%, transparent)', color: 'var(--color-accent)' }}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-[var(--color-text-muted)] mt-0.5">{blurb}</span>
      </span>
      <span className="text-[var(--color-text-muted)] text-lg">+</span>
    </button>
  )
}

function RowMenu({ row, onView, onDownload, onDefault, onCopy, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const item = 'w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-surface-alt)]'
  const run = (fn) => () => { setOpen(false); fn() }
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} className="text-sm px-2 py-1 rounded-lg hover:bg-[var(--color-surface-alt)]">More ▾</button>
      {open && (
        <div role="menu" className="absolute right-0 mt-1 w-48 rounded-lg border shadow-lg z-20 overflow-hidden" style={{ ...bs, backgroundColor: 'var(--color-surface)' }}>
          <button className={item} onClick={run(onView)}>View</button>
          <button className={item} onClick={run(onDownload)}>Download</button>
          {!isCover(row) && !row.is_default && <button className={item} onClick={run(onDefault)}>Set as default</button>}
          {!isBuilt(row) && !isCover(row) && <button className={item} onClick={run(onCopy)}>Edit a copy in builder</button>}
          <button className={item} style={{ color: 'var(--color-danger)' }} onClick={run(onDelete)}>Delete</button>
        </div>
      )}
    </div>
  )
}

function DocTable({ rows, allRows, kind, refresh, setError, onNew }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selected, setSelected] = useState([])
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState(null) // rows awaiting delete confirmation
  const [deleting, setDeleting] = useState(false)
  const fileRef = useRef(null)

  const shown = useMemo(() => rows.filter((r) => {
    if (q && !docTitle(r).toLowerCase().includes(q.toLowerCase())) return false
    if (filter === 'uploaded') return !isBuilt(r)
    if (filter === 'built') return isBuilt(r) && !r.target_job
    if (filter === 'tailored') return isBuilt(r) && !!r.target_job
    return true
  }), [rows, q, filter])

  useEffect(() => setSelected((s) => s.filter((id) => rows.some((r) => r.id === id))), [rows])
  const allChecked = shown.length > 0 && shown.every((r) => selected.includes(r.id))

  async function upload(file) {
    if (!file) return
    if (!/\.(pdf|docx)$/i.test(file.name)) return setError('Only PDF or DOCX resumes are supported.')
    setError('')
    setUploading(true)
    try {
      const text = await extractResumeText(file)
      if (!text || text.length < 20) throw new Error("Couldn't read text from that file. Try a PDF exported straight from Word or Google Docs.")
      const path = `${user.id}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('resumes').upload(path, file, { upsert: false })
      if (upErr) throw upErr
      const { error: insErr } = await supabase.from('resumes').insert({
        user_id: user.id, file_path: path, file_name: file.name, parsed_text: text, parsed_skills: extractSkillsFromText(text),
        is_default: !allRows.some(isResumeDoc),
      })
      if (insErr) throw insErr
      await refresh()
    } catch (e) {
      setError(e.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function bytesFor(row) {
    if (isCover(row)) return renderCoverPdf(row.content || emptyCoverLetter(), getCoverTemplate(row.template_id))
    return renderBuilderPdf(row.content || emptyResume(), getResumeTemplate(row.template_id))
  }

  async function view(row) {
    setError('')
    try {
      if (isBuilt(row)) return openPdfBytes(await bytesFor(row))
      const { data, error: e } = await supabase.storage.from('resumes').createSignedUrl(row.file_path, 60)
      if (e || !data?.signedUrl) throw new Error("Couldn't open this file. It may have been removed from storage.")
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (e) { setError(e.message) }
  }

  async function download(row) {
    setError('')
    try {
      if (isBuilt(row)) return downloadPdfBytes(await bytesFor(row), docTitle(row).replace(/[^\w\- ]+/g, ''))
      const { data, error: e } = await supabase.storage.from('resumes').download(row.file_path)
      if (e || !data) throw new Error("Couldn't download this file. It may have been removed from storage.")
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url; a.download = row.file_name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch (e) { setError(e.message) }
  }

  async function makeDefault(row) {
    try { await setDefaultDoc(user.id, row.id); await refresh() } catch (e) { setError(e.message) }
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      await deleteDocs(user.id, pending, allRows)
      setSelected([])
      setPending(null)
      await refresh()
    } catch (e) { setError(e.message); setPending(null) } finally { setDeleting(false) }
  }

  const edit = (row) => navigate(`/resume-builder/edit/${row.id}`)
  const copy = (row) => navigate('/resume-builder/new', { state: { kind: 'resume', mode: 'resume', resumeId: row.id, templateId: 'modern' } })

  return (
    <div className="rounded-xl border" style={{ ...bs, backgroundColor: 'var(--color-surface)' }}>
      <div className="flex flex-wrap items-center gap-3 p-3 border-b" style={bs}>
        <span className="text-sm text-[var(--color-text-muted)] min-w-[80px]">{selected.length} selected</span>
        {selected.length > 0 && (
          <button onClick={() => setPending(rows.filter((r) => selected.includes(r.id)))} className="text-sm px-3 py-1.5 rounded-lg border" style={{ ...bs, color: 'var(--color-danger)' }}>Delete selected</button>
        )}
        <div className="flex-1" />
        {kind === 'resume' && (
          <>
            <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="text-sm px-3 py-1.5 rounded-lg border disabled:opacity-60" style={bs}>{uploading ? 'Uploading...' : '⬆ Upload'}</button>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter documents" className="text-sm px-2.5 py-1.5 rounded-lg border bg-transparent" style={bs}>
              <option value="all">All</option><option value="uploaded">Uploaded</option><option value="built">Built here</option><option value="tailored">Tailored to a job</option>
            </select>
          </>
        )}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search documents" className="text-sm px-3 py-1.5 rounded-lg border bg-transparent w-40" style={bs} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-[var(--color-text-muted)] border-b" style={bs}>
              <th className="p-3 w-10"><input type="checkbox" aria-label="Select all" checked={allChecked} onChange={() => setSelected(allChecked ? [] : shown.map((r) => r.id))} style={{ accentColor: 'var(--color-accent)' }} /></th>
              <th className="p-3 font-semibold text-[var(--color-text)]">Name</th>
              <th className="p-3 font-semibold text-[var(--color-text)]">Created</th>
              <th className="p-3 font-semibold text-[var(--color-text)]">Last Edited</th>
              <th className="p-3 font-semibold text-[var(--color-text)] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const built = isBuilt(r)
              return (
                <tr key={r.id} className="border-b last:border-0" style={bs}>
                  <td className="p-3"><input type="checkbox" aria-label={`Select ${docTitle(r)}`} checked={selected.includes(r.id)} onChange={() => setSelected((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))} style={{ accentColor: 'var(--color-accent)' }} /></td>
                  <td className="p-3">
                    <button type="button" disabled={!built} onClick={() => edit(r)} className="font-medium text-left disabled:cursor-default hover:underline disabled:no-underline">{docTitle(r)}</button>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {r.is_default && <Badge tone="accent">Default</Badge>}
                      {built ? <Badge>{r.target_job ? 'Tailored' : 'Built'}</Badge> : <><Badge>Uploaded</Badge><Badge>{/\.docx$/i.test(r.file_name || '') ? 'DOCX' : 'PDF'}</Badge></>}
                      {typeof r.ats_score === 'number' && <Badge>ATS {r.ats_score}</Badge>}
                    </div>
                  </td>
                  <td className="p-3 whitespace-nowrap">{timeAgo(r.uploaded_at)}</td>
                  <td className="p-3 whitespace-nowrap">{timeAgo(r.updated_at || r.uploaded_at)}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" disabled={!built} onClick={() => edit(r)} title={built ? 'Edit' : 'Uploaded files can\'t be edited. Use More → Edit a copy in builder.'} className="text-sm px-2 py-1 rounded-lg hover:bg-[var(--color-surface-alt)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent">✎ Edit</button>
                      <RowMenu row={r} onView={() => view(r)} onDownload={() => download(r)} onDefault={() => makeDefault(r)} onCopy={() => copy(r)} onDelete={() => setPending([r])} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {shown.length === 0 && (
        <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
          {rows.length === 0 ? (kind === 'resume' ? 'No resumes yet. Upload one, or build one from a template.' : 'No cover letters yet. Draft one for a saved job.') : 'Nothing matches that search or filter.'}
          <div className="mt-3"><button onClick={onNew} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--color-accent)' }}>{kind === 'resume' ? 'New resume' : 'New cover letter'}</button></div>
        </div>
      )}

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,.55)' }} onMouseDown={(e) => e.target === e.currentTarget && setPending(null)}>
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-xl border p-5" style={{ ...bs, backgroundColor: 'var(--color-surface)' }}>
            <h2 className="font-heading font-semibold mb-2">Delete {pending.length === 1 ? 'this document' : `${pending.length} documents`}?</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4" style={{ overflowWrap: 'anywhere' }}>
              {pending.length === 1 ? `"${docTitle(pending[0])}" will be permanently deleted.` : 'They will be permanently deleted.'} This can't be undone.
              {pending.some((r) => r.is_default) && ' Your newest remaining resume becomes the default.'}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPending(null)} disabled={deleting} className="px-4 py-2 rounded-lg border text-sm" style={bs}>Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ backgroundColor: 'var(--color-danger)' }}>{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TemplateCard({ t, kind, onUse }) {
  const sample = useMemo(() => (kind === 'cover' ? SAMPLE_LETTER : SAMPLE_RESUME), [kind])
  return (
    <div className="rounded-xl border overflow-hidden flex flex-col" style={{ ...bs, backgroundColor: 'var(--color-surface)' }} data-testid="template-card">
      <div className="p-3 pb-0 overflow-hidden" style={{ height: 230, backgroundColor: 'var(--color-surface-alt)' }}>
        <ResumePaper model={sample} template={t} kind={kind} />
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <p className="font-medium">{t.name}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{t.blurb}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {[...t.tags.vibe.slice(0, 1), ...t.tags.level.slice(0, 1), ...t.tags.industry.slice(0, 1), ...t.tags.format.slice(0, 1)].map((v) => <Badge key={v}>{v}</Badge>)}
        </div>
        <button onClick={() => onUse(t)} className="mt-auto px-3 py-1.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--color-accent)' }}>Use this template</button>
      </div>
    </div>
  )
}

const SAMPLE_RESUME = emptyResume({
  name: 'Alex Morgan', headline: 'Business Analyst', contact: { email: 'alex@example.com', phone: '+1 555 0100', location: 'Remote', links: [] },
  summary: 'Analyst who turns messy data into clear decisions.',
  experience: [{ id: 's1', title: 'Business Analyst', org: 'Northwind', location: '', start: '2022', end: 'Present', bullets: ['Cut reporting time by 40% with automated dashboards', 'Led weekly KPI reviews for 5 teams'] }],
  education: [{ id: 's2', degree: 'B.Sc. Statistics', school: 'State University', location: '', year: '2021', detail: '' }],
  skills: ['SQL', 'Excel', 'Power BI', 'Tableau'],
})
const SAMPLE_LETTER = emptyCoverLetter({
  name: 'Alex Morgan', contact: { email: 'alex@example.com', phone: '+1 555 0100', location: 'Remote' }, date: 'January 5, 2026', company: 'Northwind', role: 'Business Analyst',
  paragraphs: ['I am excited to apply for the Business Analyst role at Northwind.', 'In my current role I turn messy data into clear decisions and I would love to do the same for your team.', 'Thank you for your time and consideration.'],
})

function TemplatesTab({ onUse }) {
  const [type, setType] = useState('resume')
  const [filters, setFilters] = useState({ vibe: '', level: '', industry: '', format: '' })
  const list = type === 'cover' ? COVER_TEMPLATES : RESUME_TEMPLATES
  const shown = filterTemplates(list, type === 'cover' ? { vibe: filters.vibe } : filters)
  const groups = type === 'cover' ? ['vibe'] : Object.keys(TEMPLATE_CATEGORIES)
  const active = Object.values(filters).some(Boolean)
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex rounded-lg border overflow-hidden" style={bs}>
          {[['resume', 'Resumes / CVs'], ['cover', 'Cover letters']].map(([k, label]) => (
            <button key={k} onClick={() => setType(k)} className="px-3 py-1.5 text-sm" style={type === k ? { backgroundColor: 'var(--color-accent)', color: '#fff' } : undefined}>{label}</button>
          ))}
        </div>
        {groups.map((g) => (
          <select key={g} value={filters[g]} onChange={(e) => setFilters((f) => ({ ...f, [g]: e.target.value }))} aria-label={TEMPLATE_CATEGORIES[g].label} className="text-sm px-2.5 py-1.5 rounded-lg border bg-transparent" style={bs}>
            <option value="">{TEMPLATE_CATEGORIES[g].label}: All</option>
            {TEMPLATE_CATEGORIES[g].values.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        ))}
        {active && <button onClick={() => setFilters({ vibe: '', level: '', industry: '', format: '' })} className="text-sm underline" style={{ color: 'var(--color-accent)' }}>Clear filters</button>}
        <span className="text-xs text-[var(--color-text-muted)] ml-auto">{shown.length} template{shown.length === 1 ? '' : 's'}</span>
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] py-10 text-center">No template has all of those. Loosen a filter or two.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((t) => <TemplateCard key={t.id} t={t} kind={type} onUse={(tpl) => onUse(type, tpl)} />)}
        </div>
      )}
      <p className="text-xs text-[var(--color-text-muted)] mt-6 leading-relaxed">All templates are original JobOrbit designs, free to use for your own applications. Filters combine: pick a level and an industry to narrow it down.</p>
    </div>
  )
}

function AtsTab({ docs }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const resumes = docs.filter(isResumeDoc)
  const [jobs, setJobs] = useState([])
  const [resumeId, setResumeId] = useState('')
  const [jobKey, setJobKey] = useState('')
  const [model, setModel] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listJobs(user.id).then((j) => {
      setJobs(j)
      const wanted = params.get('job')
      setJobKey(j.find((x) => x.key === wanted)?.key || j[0]?.key || '')
    }).catch(() => {})
  }, [user.id, params])
  useEffect(() => { if (!resumeId && resumes.length) setResumeId((resumes.find((r) => r.is_default) ?? resumes[0]).id) }, [resumes, resumeId])
  useEffect(() => { setModel(null); setError('') }, [resumeId, jobKey])

  const job = jobs.find((j) => j.key === jobKey)?.job

  async function evaluate() {
    setBusy(true)
    setError('')
    try {
      const row = resumes.find((r) => r.id === resumeId)
      const loaded = await loadModel(row)
      setModel(loaded.model)
    } catch (e) { setError(e.message || "Couldn't read that resume.") } finally { setBusy(false) }
  }

  const sel = 'w-full text-sm px-3 py-2 rounded-lg border bg-transparent'
  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-6 items-start">
      <div className="rounded-xl border p-4 flex flex-col gap-3" style={{ ...bs, backgroundColor: 'var(--color-surface)' }}>
        <h2 className="font-heading font-semibold">ATS Evaluator</h2>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">Pick a resume and a saved job. You get a score out of 100, the keywords you're missing, and fixes you can apply in the builder.</p>
        {resumes.length === 0 ? <p className="text-sm" style={{ color: 'var(--color-warning)' }}>Upload or build a resume first.</p> : (
          <>
            <label className="text-xs text-[var(--color-text-muted)]">Resume</label>
            <select value={resumeId} onChange={(e) => setResumeId(e.target.value)} className={sel} style={bs}>
              {resumes.map((r) => <option key={r.id} value={r.id}>{docTitle(r)}{r.is_default ? ' (default)' : ''}</option>)}
            </select>
          </>
        )}
        {jobs.length === 0 ? <p className="text-sm" style={{ color: 'var(--color-warning)' }}>Save or apply to a job in <PillLink to="/search">Discover</PillLink> first.</p> : (
          <>
            <label className="text-xs text-[var(--color-text-muted)]">Saved job</label>
            <select value={jobKey} onChange={(e) => setJobKey(e.target.value)} className={sel} style={bs}>
              {jobs.map((j) => <option key={j.key} value={j.key}>{j.job.title} · {j.job.company}</option>)}
            </select>
          </>
        )}
        <button onClick={evaluate} disabled={busy || !resumeId || !job} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--color-accent)' }}>{busy ? 'Reading your resume...' : 'Evaluate'}</button>
        {error && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      </div>

      <div className="rounded-xl border p-4 min-h-[200px]" style={{ ...bs, backgroundColor: 'var(--color-surface)' }}>
        {!model ? (
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">Your score and suggestions appear here. Nothing is saved or changed until you open the builder.</p>
        ) : (
          <>
            <AtsPanel model={model} job={job} />
            <div className="mt-5 pt-4 border-t flex flex-wrap items-center gap-3" style={bs}>
              <button onClick={() => navigate('/resume-builder/new', { state: { kind: 'resume', mode: 'resume', resumeId, job, templateId: 'modern' } })} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--color-accent)' }}>Fix it in Resume Builder</button>
              <span className="text-xs text-[var(--color-text-muted)]">Creates a new resume. Your original stays untouched.</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ResumeBuilder() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'resumes'
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)

  const refresh = useCallback(async () => {
    try { setDocs(await listDocs(user.id)) } catch (e) { setError(e.message || "Couldn't load your documents.") } finally { setLoading(false) }
  }, [user.id])
  useEffect(() => { refresh() }, [refresh])

  const resumes = docs.filter(isResumeDoc)
  const letters = docs.filter(isCover)

  function start(cfg) {
    setModal(null)
    navigate('/resume-builder/new', { state: cfg })
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      <h1 className="font-heading text-2xl font-semibold mb-1">My Documents</h1>
      <p className="font-heading text-lg font-medium mt-3">Build Resumes That Beat the Bots.</p>
      <p className="text-sm text-[var(--color-text-muted)] mt-2 mb-6 leading-relaxed max-w-2xl">
        Craft a resume or cover letter, tailor it to a saved job, and let the ATS evaluator tell you what to fix. Your default resume powers matches across JobOrbit.
      </p>

      <div className="grid gap-3 sm:grid-cols-3 mb-8">
        <ActionCard icon="📄" title="New Resume" blurb="Pick a template and craft it" onClick={() => setModal({ kind: 'resume' })} />
        <ActionCard icon="✉️" title="New Cover Letter" blurb="Write one, or draft it for a job" onClick={() => setModal({ kind: 'cover' })} />
        <ActionCard icon="🎯" title="Tailor to a Job" blurb="Reshape a resume for a saved job" onClick={() => setModal({ kind: 'resume', initialMode: 'tailor' })} />
      </div>

      <div className="flex gap-1 border-b mb-5 overflow-x-auto" style={bs} role="tablist">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setParams(k === 'resumes' ? {} : { tab: k })} className="px-4 py-2.5 text-sm whitespace-nowrap -mb-px border-b-2" style={{ borderColor: tab === k ? 'var(--color-accent)' : 'transparent', color: tab === k ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: tab === k ? 600 : 400 }}>{label}</button>
        ))}
      </div>

      {error && <p className="text-sm mb-3" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {loading && tab !== 'templates' && <p className="text-sm text-[var(--color-text-muted)] py-6">Loading your documents...</p>}

      {!loading && tab === 'resumes' && <DocTable rows={resumes} allRows={docs} kind="resume" refresh={refresh} setError={setError} onNew={() => setModal({ kind: 'resume' })} />}
      {!loading && tab === 'letters' && <DocTable rows={letters} allRows={docs} kind="cover" refresh={refresh} setError={setError} onNew={() => setModal({ kind: 'cover' })} />}
      {tab === 'templates' && <TemplatesTab onUse={(type, t) => setModal({ kind: type === 'cover' ? 'cover' : 'resume', initialTemplateId: t.id })} />}
      {!loading && tab === 'ats' && <AtsTab docs={docs} />}

      {modal && <NewDocModal {...modal} onClose={() => setModal(null)} onStart={start} />}
      <p className="text-xs text-[var(--color-text-muted)] mt-8">
        Want to upload a file instead? <Link to="/account#resume" className="underline" style={{ color: 'var(--color-accent)' }}>Resume Dock</Link> in Account Details works too.
      </p>
    </div>
  )
}
