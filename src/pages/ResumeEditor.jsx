import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getDisplayName } from '../components/Avatar'
import MultiSelectInput from '../components/MultiSelectInput'
import ResumePaper from '../components/ResumePaper'
import AtsPanel from '../components/AtsPanel'
import { SKILL_SUGGESTIONS } from '../lib/data/skills'
import { RESUME_TEMPLATES, COVER_TEMPLATES, getResumeTemplate, getCoverTemplate } from '../lib/resumeTemplates'
import {
  emptyResume, emptyCoverLetter, newExperience, newEducation, newProject,
  tailorModelToJob, applyAiTailor, compactForAi, draftCoverLetter,
} from '../lib/resumeModel'
import { evaluateAts } from '../lib/atsEvaluator'
import { listDocs, listJobs, loadModel, saveDoc, setDefaultDoc, isResumeDoc, docTitle } from '../lib/builderApi'
import { requestBuilderAi } from '../lib/aiCoach'
import { renderBuilderPdf, renderCoverPdf, downloadPdfBytes } from '../lib/resumePdf'

const bs = { borderColor: 'var(--color-border)' }
const inputCls = 'w-full text-sm px-3 py-2 rounded-lg border bg-transparent'
const btn = 'px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50'

function Card({ title, children, action }) {
  return (
    <section className="rounded-xl border p-4" style={{ ...bs, backgroundColor: 'var(--color-surface)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-semibold">{title}</h3>
        {action}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-[var(--color-text-muted)] mb-1">{label}</span>
      {children}
    </label>
  )
}

function TextInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <Field label={label}>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} style={bs} />
    </Field>
  )
}

function TextArea({ label, value, onChange, rows = 3, placeholder }) {
  return (
    <Field label={label}>
      <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className={`${inputCls} resize-y`} style={bs} />
    </Field>
  )
}

function Bullets({ list, onChange, label = 'Bullets' }) {
  const set = (i, v) => onChange(list.map((b, j) => (j === i ? v : b)))
  return (
    <div>
      <span className="block text-xs text-[var(--color-text-muted)] mb-1">{label}</span>
      <div className="flex flex-col gap-2">
        {list.map((b, i) => (
          <div key={i} className="flex gap-2 items-start">
            <textarea value={b} rows={2} onChange={(e) => set(i, e.target.value)} className={`${inputCls} resize-y`} style={bs} placeholder="Start with a verb: Built, Led, Reduced..." />
            <button type="button" aria-label="Remove bullet" onClick={() => onChange(list.filter((_, j) => j !== i))} className="px-2 py-1 rounded-lg border text-sm" style={bs}>×</button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...list, ''])} className="self-start text-xs underline" style={{ color: 'var(--color-accent)' }}>+ Add bullet</button>
      </div>
    </div>
  )
}

function EntryShell({ index, count, onMove, onRemove, children }) {
  return (
    <div className="rounded-lg border p-3 flex flex-col gap-3" style={bs}>
      <div className="flex justify-end gap-1.5">
        <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)} className={btn} style={bs}>↑</button>
        <button type="button" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(1)} className={btn} style={bs}>↓</button>
        <button type="button" onClick={onRemove} className={btn} style={{ ...bs, color: 'var(--color-danger)' }}>Remove</button>
      </div>
      {children}
    </div>
  )
}

const move = (list, i, d) => {
  const j = i + d
  if (j < 0 || j >= list.length) return list
  const next = [...list]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

function ResumeForm({ model, setModel }) {
  const up = (patch) => setModel({ ...model, ...patch })
  const upContact = (patch) => up({ contact: { ...model.contact, ...patch } })
  const upList = (key, i, patch) => up({ [key]: model[key].map((x, j) => (j === i ? { ...x, ...patch } : x)) })
  return (
    <>
      <Card title="Basics">
        <div className="grid sm:grid-cols-2 gap-3">
          <TextInput label="Full name" value={model.name} onChange={(v) => up({ name: v })} />
          <TextInput label="Headline" value={model.headline} onChange={(v) => up({ headline: v })} placeholder="e.g. Data Analyst" />
          <TextInput label="Email" type="email" value={model.contact.email} onChange={(v) => upContact({ email: v })} />
          <TextInput label="Phone" value={model.contact.phone} onChange={(v) => upContact({ phone: v })} />
          <TextInput label="Location" value={model.contact.location} onChange={(v) => upContact({ location: v })} />
          <TextInput label="Links (comma separated)" value={(model.contact.links || []).join(', ')} onChange={(v) => upContact({ links: v.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="linkedin.com/in/you, github.com/you" />
        </div>
      </Card>

      <Card title="Summary">
        <TextArea label="Two or three lines about you and the role you want" rows={4} value={model.summary} onChange={(v) => up({ summary: v })} />
      </Card>

      <Card title="Experience" action={<button type="button" className={btn} style={bs} onClick={() => up({ experience: [...model.experience, newExperience()] })}>+ Add role</button>}>
        {model.experience.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No roles yet.</p>}
        {model.experience.map((e, i) => (
          <EntryShell key={e.id} index={i} count={model.experience.length} onMove={(d) => up({ experience: move(model.experience, i, d) })} onRemove={() => up({ experience: model.experience.filter((_, j) => j !== i) })}>
            <div className="grid sm:grid-cols-2 gap-3">
              <TextInput label="Job title" value={e.title} onChange={(v) => upList('experience', i, { title: v })} />
              <TextInput label="Company" value={e.org} onChange={(v) => upList('experience', i, { org: v })} />
              <TextInput label="Location" value={e.location} onChange={(v) => upList('experience', i, { location: v })} />
              <div className="grid grid-cols-2 gap-3">
                <TextInput label="Start" value={e.start} onChange={(v) => upList('experience', i, { start: v })} placeholder="Jan 2022" />
                <TextInput label="End" value={e.end} onChange={(v) => upList('experience', i, { end: v })} placeholder="Present" />
              </div>
            </div>
            <Bullets list={e.bullets} onChange={(b) => upList('experience', i, { bullets: b })} />
          </EntryShell>
        ))}
      </Card>

      <Card title="Projects" action={<button type="button" className={btn} style={bs} onClick={() => up({ projects: [...model.projects, newProject()] })}>+ Add project</button>}>
        {model.projects.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No projects yet.</p>}
        {model.projects.map((p, i) => (
          <EntryShell key={p.id} index={i} count={model.projects.length} onMove={(d) => up({ projects: move(model.projects, i, d) })} onRemove={() => up({ projects: model.projects.filter((_, j) => j !== i) })}>
            <div className="grid sm:grid-cols-2 gap-3">
              <TextInput label="Project name" value={p.name} onChange={(v) => upList('projects', i, { name: v })} />
              <TextInput label="Link" value={p.link} onChange={(v) => upList('projects', i, { link: v })} />
            </div>
            <Bullets list={p.bullets} onChange={(b) => upList('projects', i, { bullets: b })} />
          </EntryShell>
        ))}
      </Card>

      <Card title="Education" action={<button type="button" className={btn} style={bs} onClick={() => up({ education: [...model.education, newEducation()] })}>+ Add education</button>}>
        {model.education.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No education yet.</p>}
        {model.education.map((e, i) => (
          <EntryShell key={e.id} index={i} count={model.education.length} onMove={(d) => up({ education: move(model.education, i, d) })} onRemove={() => up({ education: model.education.filter((_, j) => j !== i) })}>
            <div className="grid sm:grid-cols-2 gap-3">
              <TextInput label="Degree" value={e.degree} onChange={(v) => upList('education', i, { degree: v })} />
              <TextInput label="School" value={e.school} onChange={(v) => upList('education', i, { school: v })} />
              <TextInput label="Location" value={e.location} onChange={(v) => upList('education', i, { location: v })} />
              <TextInput label="Years" value={e.year} onChange={(v) => upList('education', i, { year: v })} placeholder="2021 – 2024" />
            </div>
            <TextInput label="Details (optional)" value={e.detail} onChange={(v) => upList('education', i, { detail: v })} />
          </EntryShell>
        ))}
      </Card>

      <Card title="Skills">
        <MultiSelectInput values={model.skills} onChange={(v) => up({ skills: v })} suggestions={SKILL_SUGGESTIONS} placeholder="Type a skill and press Enter" />
      </Card>

      <Card title="Certifications and awards">
        <Bullets label="One per line" list={model.certifications.length ? model.certifications : []} onChange={(v) => up({ certifications: v })} />
      </Card>

      {model.extra.length > 0 && (
        <Card title="Other sections">
          {model.extra.map((x, i) => (
            <EntryShell key={x.id} index={i} count={model.extra.length} onMove={(d) => up({ extra: move(model.extra, i, d) })} onRemove={() => up({ extra: model.extra.filter((_, j) => j !== i) })}>
              <TextInput label="Heading" value={x.heading} onChange={(v) => upList('extra', i, { heading: v })} />
              <Bullets label="Lines" list={x.lines} onChange={(l) => upList('extra', i, { lines: l })} />
            </EntryShell>
          ))}
        </Card>
      )}
    </>
  )
}

function CoverForm({ model, setModel }) {
  const up = (patch) => setModel({ ...model, ...patch })
  const upContact = (patch) => up({ contact: { ...model.contact, ...patch } })
  return (
    <>
      <Card title="You">
        <div className="grid sm:grid-cols-2 gap-3">
          <TextInput label="Full name" value={model.name} onChange={(v) => up({ name: v })} />
          <TextInput label="Email" value={model.contact.email} onChange={(v) => upContact({ email: v })} />
          <TextInput label="Phone" value={model.contact.phone} onChange={(v) => upContact({ phone: v })} />
          <TextInput label="Location" value={model.contact.location} onChange={(v) => upContact({ location: v })} />
        </div>
      </Card>
      <Card title="Recipient">
        <div className="grid sm:grid-cols-2 gap-3">
          <TextInput label="Date" value={model.date} onChange={(v) => up({ date: v })} />
          <TextInput label="Addressed to" value={model.recipient} onChange={(v) => up({ recipient: v })} />
          <TextInput label="Company" value={model.company} onChange={(v) => up({ company: v })} />
          <TextInput label="Role" value={model.role} onChange={(v) => up({ role: v })} />
        </div>
      </Card>
      <Card title="Letter" action={<button type="button" className={btn} style={bs} onClick={() => up({ paragraphs: [...model.paragraphs, ''] })}>+ Paragraph</button>}>
        {model.paragraphs.map((p, i) => (
          <div key={i} className="flex gap-2 items-start">
            <textarea rows={5} value={p} onChange={(e) => up({ paragraphs: model.paragraphs.map((x, j) => (j === i ? e.target.value : x)) })} className={`${inputCls} resize-y`} style={bs} />
            <button type="button" aria-label="Remove paragraph" onClick={() => up({ paragraphs: model.paragraphs.filter((_, j) => j !== i) })} className="px-2 py-1 rounded-lg border text-sm" style={bs}>×</button>
          </div>
        ))}
        <TextInput label="Closing" value={model.closing} onChange={(v) => up({ closing: v })} />
      </Card>
    </>
  )
}

export default function ResumeEditor() {
  const { id } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const started = useRef(false)

  const [kind, setKind] = useState(state?.kind || 'resume')
  const [model, setModelRaw] = useState(null)
  const [templateId, setTemplateId] = useState(state?.templateId || (state?.kind === 'cover' ? COVER_TEMPLATES[0].id : 'modern'))
  const [title, setTitle] = useState('')
  const [docId, setDocId] = useState(id || null)
  const [isDefault, setIsDefault] = useState(false)
  const [makeDefault, setMakeDefault] = useState(false)
  const [job, setJob] = useState(state?.job || null)
  const [jobs, setJobs] = useState([])
  const [tab, setTab] = useState(state?.job && state?.kind !== 'cover' ? 'ats' : 'preview')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [pages, setPages] = useState(1)

  const setModel = useCallback((m) => { setModelRaw(m); setDirty(true) }, [])
  const template = kind === 'cover' ? getCoverTemplate(templateId) : getResumeTemplate(templateId)
  const templates = kind === 'cover' ? COVER_TEMPLATES : RESUME_TEMPLATES

  useEffect(() => {
    if (started.current || !user) return
    started.current = true
    ;(async () => {
      try {
        listJobs(user.id).then(setJobs).catch(() => {})
        if (id) {
          const { data: row, error: err } = await supabase.from('resumes').select('*').eq('id', id).eq('user_id', user.id).single()
          if (err || !row) throw new Error("We couldn't find that document.")
          const k = row.doc_type === 'cover_letter' ? 'cover' : 'resume'
          setKind(k)
          setModelRaw(row.content || (k === 'cover' ? emptyCoverLetter() : emptyResume()))
          if (!row.content) {
            const loaded = await loadModel(row)
            setModelRaw(loaded.model)
            setNotice('We imported your uploaded file into sections. Check each one before saving a copy.')
            setDirty(true)
          }
          setTemplateId(row.template_id || (k === 'cover' ? COVER_TEMPLATES[0].id : 'modern'))
          setTitle(docTitle(row))
          setIsDefault(!!row.is_default)
          setMakeDefault(!!row.is_default)
          if (row.target_job) { setJob(row.target_job); if (k === 'resume') setTab('ats') }
          return
        }
        await startNew(state || {})
      } catch (e) {
        setError(e.message || 'Something went wrong while opening the editor.')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function startNew(cfg) {
    const k = cfg.kind || 'resume'
    setKind(k)
    const name = getDisplayName(user)
    const fresh = () => emptyResume({ name, contact: { email: user.email || '', phone: '', location: '', links: [] } })

    // Base resume content for "from resume", "tailor" and cover-letter drafts.
    let base = null
    let baseTitle = 'My Resume'
    if (cfg.resumeId || (k === 'cover' && cfg.mode === 'tailor')) {
      const all = await listDocs(user.id)
      const row = all.find((r) => r.id === cfg.resumeId) || all.find((r) => isResumeDoc(r) && r.is_default) || all.find(isResumeDoc)
      if (row) {
        const loaded = await loadModel(row)
        base = loaded.model
        baseTitle = docTitle(row)
        if (loaded.imported) setNotice('We imported your uploaded resume into sections. Check each one before saving.')
      }
    }

    if (k === 'cover') {
      let letter = emptyCoverLetter({ name, contact: { email: user.email || '', phone: '', location: '' } })
      if (cfg.mode === 'tailor' && cfg.job) {
        letter = draftCoverLetter(base || fresh(), cfg.job, name)
        try {
          const res = await requestBuilderAi({ task: 'cover_letter', resume: compactForAi(base || fresh()), job: cfg.job })
          const paras = (res?.result?.paragraphs || []).filter((p) => typeof p === 'string' && p.trim())
          if (paras.length) { letter.paragraphs = paras.slice(0, 5); setNotice('Drafted with Orbit Mentor. Read it through and make it sound like you.') }
        } catch {
          setNotice('Orbit Mentor was busy, so this is a simple draft. Edit it to make it yours.')
        }
        setTitle(`Cover letter – ${cfg.job.title}`)
      } else setTitle('Cover letter')
      setModelRaw(letter)
      setDirty(true)
      return
    }

    let m = base ? JSON.parse(JSON.stringify(base)) : fresh()
    if (!m.name) m.name = name
    if (!m.contact.email) m.contact.email = user.email || ''
    if (cfg.mode === 'tailor' && cfg.job) {
      const offline = tailorModelToJob(m, cfg.job)
      try {
        const res = await requestBuilderAi({ task: 'tailor_resume', resume: compactForAi(m), job: cfg.job })
        m = applyAiTailor(offline, res?.result)
        setNotice('Tailored with Orbit Mentor using only what is already in your resume. Review every line before you send it.')
      } catch {
        m = offline
        setNotice('Orbit Mentor was busy, so we reordered your skills and bullets for this job without AI. Review it before you send it.')
      }
      setTitle(`${cfg.job.title} – ${baseTitle}`)
    } else if (base) setTitle(`${baseTitle} (copy)`)
    else setTitle('My Resume')
    setModelRaw(m)
    setDirty(true)
  }

  const ats = useMemo(() => (kind === 'resume' && model && job ? evaluateAts({ model, job }) : null), [kind, model, job])

  async function save() {
    if (!model) return
    setBusy('save')
    setError('')
    try {
      const cleanTitle = title.trim() || (kind === 'cover' ? 'Cover letter' : 'My Resume')
      let hasAny = true
      if (!docId && kind === 'resume') hasAny = (await listDocs(user.id)).some(isResumeDoc)
      const row = await saveDoc({
        userId: user.id, id: docId, docType: kind === 'cover' ? 'cover_letter' : 'resume', title: cleanTitle,
        content: model, templateId, targetJob: job, atsScore: ats?.score ?? null, makeDefault: kind === 'resume' && makeDefault, hasAnyResume: hasAny,
      })
      if (kind === 'resume' && docId && makeDefault && !isDefault) await setDefaultDoc(user.id, row.id)
      if (kind === 'resume' && makeDefault) setIsDefault(true)
      setDocId(row.id)
      setTitle(cleanTitle)
      setDirty(false)
      setNotice(makeDefault && kind === 'resume' ? 'Saved, and set as your default resume.' : 'Saved to My Documents.')
      if (!docId) navigate(`/resume-builder/edit/${row.id}`, { replace: true })
    } catch (e) {
      setError(e.message || "Couldn't save. Please try again.")
    } finally {
      setBusy('')
    }
  }

  async function download() {
    setBusy('pdf')
    try {
      const bytes = kind === 'cover' ? await renderCoverPdf(model, template) : await renderBuilderPdf(model, template)
      downloadPdfBytes(bytes, (title || 'resume').replace(/[^\w\- ]+/g, ''))
    } catch (e) {
      setError(e.message || "Couldn't build the PDF.")
    } finally {
      setBusy('')
    }
  }

  async function redraft(jobKey) {
    const j = jobs.find((x) => x.key === jobKey)?.job
    if (!j) return
    setBusy('draft')
    try {
      const all = await listDocs(user.id)
      const row = all.find((r) => isResumeDoc(r) && r.is_default) || all.find(isResumeDoc)
      const base = row ? (await loadModel(row)).model : emptyResume()
      const letter = { ...draftCoverLetter(base, j, model.name), name: model.name, date: model.date }
      try {
        const res = await requestBuilderAi({ task: 'cover_letter', resume: compactForAi(base), job: j })
        const paras = (res?.result?.paragraphs || []).filter((p) => typeof p === 'string' && p.trim())
        if (paras.length) letter.paragraphs = paras.slice(0, 5)
      } catch { /* keep the offline draft */ }
      setModel({ ...model, ...letter })
      setJob(j)
      setNotice('Drafted a fresh letter for this job. Read it through before you send it.')
    } finally {
      setBusy('')
    }
  }

  if (loading) return <div className="p-8 text-sm text-[var(--color-text-muted)]">Opening the editor...</div>
  if (error && !model) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
        <Link to="/resume-builder" className="text-sm underline mt-3 inline-block" style={{ color: 'var(--color-accent)' }}>Back to My Documents</Link>
      </div>
    )
  }

  const preview = (
    <div>
      <div className="flex items-center justify-between mb-2 text-xs text-[var(--color-text-muted)]">
        <span>{template.name}</span>
        <span>{pages} page{pages === 1 ? '' : 's'}</span>
      </div>
      <ResumePaper model={model} template={template} kind={kind} onPages={setPages} />
    </div>
  )

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Link to="/resume-builder" className="text-sm underline" style={{ color: 'var(--color-accent)' }} onClick={(e) => { if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) e.preventDefault() }}>← My Documents</Link>
        <input value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true) }} aria-label="Document name" placeholder="Document name" className="flex-1 min-w-[180px] text-base font-heading font-semibold px-3 py-1.5 rounded-lg border bg-transparent" style={bs} />
        <select value={templateId} onChange={(e) => { setTemplateId(e.target.value); setDirty(true) }} aria-label="Template" className="text-sm px-2.5 py-2 rounded-lg border bg-transparent" style={bs}>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {ats && <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 16%, transparent)', color: 'var(--color-accent)' }}>ATS {ats.score}/100</span>}
        {kind === 'resume' && (
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={makeDefault} onChange={(e) => { setMakeDefault(e.target.checked); setDirty(true) }} style={{ accentColor: 'var(--color-accent)' }} />
            Set as default
          </label>
        )}
        <button onClick={download} disabled={!!busy} className={btn} style={bs}>{busy === 'pdf' ? 'Building...' : 'Download PDF'}</button>
        <button onClick={save} disabled={!!busy} className="px-4 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ backgroundColor: 'var(--color-accent)' }}>
          {busy === 'save' ? 'Saving...' : dirty ? 'Save' : 'Saved'}
        </button>
      </div>

      {notice && <p className="text-sm mb-3 rounded-lg border px-3 py-2" style={{ ...bs, backgroundColor: 'var(--color-surface)' }}>{notice}</p>}
      {error && <p className="text-sm mb-3" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {kind === 'resume' && isDefault && <p className="text-xs text-[var(--color-text-muted)] mb-3">This is your default resume. Saving changes updates what match scores use.</p>}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col gap-4 min-w-0 order-2 lg:order-1">
          {kind === 'cover' ? <CoverForm model={model} setModel={setModel} /> : <ResumeForm model={model} setModel={setModel} />}
        </div>

        <div className="min-w-0 order-1 lg:order-2 lg:sticky lg:top-4">
          <div className="flex gap-1 mb-3 border-b" style={bs}>
            {[['preview', 'Preview'], ...(kind === 'resume' ? [['ats', 'ATS score']] : [['draft', 'Draft for a job']])].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} className="px-3 py-2 text-sm -mb-px border-b-2" style={{ borderColor: tab === key ? 'var(--color-accent)' : 'transparent', color: tab === key ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                {label}
              </button>
            ))}
          </div>

          <div className="lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto pr-1">
            {tab === 'preview' && preview}
            {tab === 'ats' && kind === 'resume' && (
              <div className="rounded-xl border p-4" style={{ ...bs, backgroundColor: 'var(--color-surface)' }}>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">Check this resume against</label>
                <select value={job ? jobs.find((j) => j.job.sourceId === job.sourceId && j.job.source === job.source)?.key || '' : ''} onChange={(e) => setJob(jobs.find((j) => j.key === e.target.value)?.job || null)} className={`${inputCls} mb-4`} style={bs}>
                  <option value="">{job && !jobs.some((j) => j.job.sourceId === job.sourceId) ? `${job.title} · ${job.company}` : 'Choose a saved job...'}</option>
                  {jobs.map((j) => <option key={j.key} value={j.key}>{j.job.title} · {j.job.company}</option>)}
                </select>
                {job ? <AtsPanel model={model} job={job} onChange={setModel} /> : <p className="text-sm text-[var(--color-text-muted)]">Pick a saved job and JobOrbit scores this resume against it, then tells you what to fix.</p>}
              </div>
            )}
            {tab === 'draft' && kind === 'cover' && (
              <div className="rounded-xl border p-4" style={{ ...bs, backgroundColor: 'var(--color-surface)' }}>
                <p className="text-sm text-[var(--color-text-muted)] mb-3 leading-relaxed">Pick a saved job and Orbit Mentor drafts a fresh letter from your default resume. It replaces the paragraphs on the left.</p>
                {jobs.length === 0 ? <p className="text-sm" style={{ color: 'var(--color-warning)' }}>Save or apply to a job in Discover first.</p> : (
                  <select defaultValue="" disabled={busy === 'draft'} onChange={(e) => e.target.value && redraft(e.target.value)} className={inputCls} style={bs}>
                    <option value="">{busy === 'draft' ? 'Drafting...' : 'Choose a saved job...'}</option>
                    {jobs.map((j) => <option key={j.key} value={j.key}>{j.job.title} · {j.job.company}</option>)}
                  </select>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
