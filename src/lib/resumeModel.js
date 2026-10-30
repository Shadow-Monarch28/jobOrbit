// The structured resume / cover-letter model used by the Resume Builder,
// plus import (text -> model), export (model -> plain text) and the
// deterministic "tailor to a job" fallback.
import { parseSections, splitSkillItems } from './resumeBuilder'
import { getJobRequiredSkills } from './matchingEngine'

let idCounter = 0
export const uid = () => `${Date.now().toString(36)}${(idCounter++).toString(36)}`

export function emptyResume(over = {}) {
  return {
    name: '', headline: '',
    contact: { email: '', phone: '', location: '', links: [] },
    summary: '',
    experience: [], education: [], projects: [],
    skills: [], certifications: [], extra: [],
    ...over,
  }
}

export const newExperience = () => ({ id: uid(), title: '', org: '', location: '', start: '', end: '', bullets: [''] })
export const newEducation = () => ({ id: uid(), degree: '', school: '', location: '', year: '', detail: '' })
export const newProject = () => ({ id: uid(), name: '', link: '', bullets: [''] })

export function emptyCoverLetter(over = {}) {
  return {
    name: '', contact: { email: '', phone: '', location: '' },
    date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
    recipient: 'Hiring Manager', company: '', role: '',
    paragraphs: ['', '', ''], closing: 'Sincerely,',
    ...over,
  }
}

// ---------- text -> model ----------

const BULLET = /^\s*([•▪●◦‣■□*]|[-–]\s)\s*/
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/
const LINK = /((https?:\/\/)?(www\.)?(linkedin\.com|github\.com|behance\.net|dribbble\.com|[a-z0-9-]+\.(com|io|dev|me|in|net))\/[^\s,|]*)/i
const MONTH = '(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?'
const DATE_PART = `(${MONTH}\\s+)?(19|20)\\d{2}|\\d{1,2}\\/(19|20)\\d{2}`
const RANGE = new RegExp(`((${DATE_PART}))\\s*(-|–|—|to)\\s*(present|current|now|(${DATE_PART}))`, 'i')
const DEGREE = /\b(bachelor|master|b\.?\s?tech|m\.?\s?tech|b\.?\s?sc|m\.?\s?sc|b\.?\s?e\b|m\.?\s?e\b|bca|mca|bba|mba|b\.?\s?com|m\.?\s?com|ph\.?d|diploma|associate|certificate|12th|10th|high school|hsc|ssc|b\.?a\b|m\.?a\b)/i
const SCHOOL = /\b(university|college|institute|school|academy|polytechnic)\b/i

function splitHeader(text) {
  const range = text.match(RANGE)
  let start = '', end = ''
  let rest = text
  if (range) {
    const parts = range[0].split(/\s*(?:-|–|—|\bto\b)\s*/i)
    start = (parts[0] || '').trim()
    end = (parts[1] || '').trim()
    rest = text.replace(range[0], ' ')
  }
  const pieces = rest
    .split(/\s[|·•–—@]\s|\s\|\s|\s+at\s+|,\s+(?=[A-Z])/)
    .map((p) => p.replace(/[()|]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  return { title: pieces[0] || '', org: pieces[1] || '', location: pieces[2] || '', start, end }
}

function parseExperience(lines) {
  const entries = []
  let cur = null
  let pending = ''
  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (!line) return
    const isBullet = BULLET.test(line)
    const hasDate = RANGE.test(line) && !isBullet && line.length < 140
    const next = (lines[i + 1] || '').trim()
    if (hasDate) {
      const h = splitHeader(line)
      if (!h.title && pending) h.title = pending
      else if (pending && !h.org) { h.org = h.title; h.title = pending }
      pending = ''
      cur = { id: uid(), ...h, bullets: [] }
      entries.push(cur)
    } else if (cur) {
      const text = line.replace(BULLET, '').trim()
      const looksLikeNewHeader = !isBullet && text.length < 70 && !/[.;]$/.test(text) && RANGE.test(next) && cur.bullets.length > 0
      if (looksLikeNewHeader) pending = text
      else if (!isBullet && cur.bullets.length === 0 && text.length < 60 && !cur.org) cur.org = text
      else if (!isBullet && cur.bullets.length > 0 && !/[.!?]$/.test(cur.bullets[cur.bullets.length - 1]) && /^[a-z]/.test(text))
        cur.bullets[cur.bullets.length - 1] += ` ${text}` // wrapped line
      else cur.bullets.push(text)
    } else {
      pending = line.replace(BULLET, '')
    }
  })
  return entries.map((e) => ({ ...e, bullets: e.bullets.length ? e.bullets : [''] }))
}

function parseEducation(lines) {
  const entries = []
  let cur = null
  for (const raw of lines) {
    const line = raw.replace(BULLET, '').trim()
    if (!line) continue
    const year = (line.match(/\b(19|20)\d{2}(\s*[-–—]\s*((19|20)\d{2}|present))?/i) || [''])[0]
    const hasDegree = DEGREE.test(line)
    const hasSchool = SCHOOL.test(line)
    const startsNew = !cur || ((hasDegree && cur.degree) || (hasSchool && cur.school && !hasDegree))
    if (startsNew) {
      cur = { id: uid(), degree: '', school: '', location: '', year: '', detail: '' }
      entries.push(cur)
    }
    if (year && !cur.year) cur.year = year
    const clean = line.replace(year, '').replace(/[()|,–—-]+\s*$/g, '').trim()
    if (hasDegree && !cur.degree) cur.degree = clean
    else if (hasSchool && !cur.school) cur.school = clean
    else if (clean) cur.detail = cur.detail ? `${cur.detail}; ${clean}` : clean
  }
  return entries
}

function parseProjects(lines) {
  const entries = []
  let cur = null
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const isBullet = BULLET.test(line)
    const text = line.replace(BULLET, '').trim()
    if (!isBullet && (!cur || (cur.bullets.length > 0 && text.length < 70 && !/[.]$/.test(text)))) {
      cur = { id: uid(), name: text, link: (text.match(LINK) || [''])[0], bullets: [] }
      entries.push(cur)
    } else if (cur) cur.bullets.push(text)
  }
  return entries.map((e) => ({ ...e, bullets: e.bullets.length ? e.bullets : [''] }))
}

const bulletsOf = (lines) => lines.map((l) => l.replace(BULLET, '').trim()).filter(Boolean)

/**
 * Best-effort import of a resume's lines (strings or {text,size}) into the
 * builder model. Anything unrecognised is kept under `extra`, never dropped.
 */
export function linesToModel(rawLines) {
  const lines = rawLines.map((l) => (typeof l === 'string' ? { text: l, size: 0 } : l)).filter((l) => l.text?.trim())
  const model = emptyResume()
  if (lines.length === 0) return model
  const { name, header, sections } = parseSections(lines)
  model.name = name.trim()

  const headerText = header.join(' | ')
  model.contact.email = (headerText.match(EMAIL) || [''])[0]
  const phone = (headerText.replace(EMAIL, '').match(PHONE) || [''])[0].trim()
  model.contact.phone = phone
  const links = []
  for (const h of header) {
    const m = h.match(LINK)
    if (m && !EMAIL.test(m[0])) links.push(m[0])
  }
  model.contact.links = [...new Set(links)]
  const rest = header
    .flatMap((h) => h.split(/\s[|•·]\s|\s{2,}/))
    .map((h) => h.trim())
    .filter((h) => h && !EMAIL.test(h) && !LINK.test(h) && h.replace(/\D/g, '').length < 7)
  model.headline = rest.find((h) => h.length <= 90 && !/,\s*[A-Z]{2}\b/.test(h) && !/^\d/.test(h)) || ''
  model.contact.location = rest.find((h) => h !== model.headline && h.length <= 60) || ''

  for (const sec of sections) {
    const h = sec.heading.toLowerCase()
    if (/summary|profile|objective|about/.test(h)) model.summary = bulletsOf(sec.lines).join(' ')
    else if (/experience|employment|internship/.test(h)) model.experience.push(...parseExperience(sec.lines))
    else if (/education|academic/.test(h)) model.education.push(...parseEducation(sec.lines))
    else if (/project/.test(h)) model.projects.push(...parseProjects(sec.lines))
    else if (/skill|competenc|technolog/.test(h)) model.skills.push(...splitSkillItems(sec.lines))
    else if (/certif|award|achievement|license/.test(h)) model.certifications.push(...bulletsOf(sec.lines))
    else model.extra.push({ id: uid(), heading: sec.heading, lines: bulletsOf(sec.lines) })
  }
  const seen = new Set()
  model.skills = model.skills.filter((s) => (seen.has(s.toLowerCase()) ? false : seen.add(s.toLowerCase())))
  return model
}

// ---------- model -> text ----------

export function resumeToText(m) {
  const out = []
  const push = (t) => t && String(t).trim() && out.push(String(t).trim())
  push(m.name)
  push(m.headline)
  push([m.contact?.email, m.contact?.phone, m.contact?.location, ...(m.contact?.links || [])].filter(Boolean).join(' | '))
  if (m.summary) { push('SUMMARY'); push(m.summary) }
  if (m.experience?.length) {
    push('EXPERIENCE')
    for (const e of m.experience) {
      push([e.title, e.org, e.location].filter(Boolean).join(' | ') + (e.start || e.end ? `  ${e.start} - ${e.end}` : ''))
      for (const b of e.bullets || []) if (b?.trim()) push(`- ${b.trim()}`)
    }
  }
  if (m.projects?.length) {
    push('PROJECTS')
    for (const p of m.projects) {
      push(p.name)
      for (const b of p.bullets || []) if (b?.trim()) push(`- ${b.trim()}`)
    }
  }
  if (m.education?.length) {
    push('EDUCATION')
    for (const e of m.education) push([e.degree, e.school, e.year, e.detail].filter(Boolean).join(' | '))
  }
  if (m.skills?.length) { push('SKILLS'); push(m.skills.join(', ')) }
  if (m.certifications?.length) { push('CERTIFICATIONS'); m.certifications.forEach((c) => push(`- ${c}`)) }
  for (const x of m.extra || []) { push(String(x.heading).toUpperCase()); (x.lines || []).forEach((l) => push(`- ${l}`)) }
  return out.join('\n')
}

export function coverLetterToText(c) {
  return [c.name, c.date, c.recipient, c.company, '', ...(c.paragraphs || []), '', c.closing, c.name].filter((x) => x !== undefined).join('\n')
}

// Every bullet in the resume, with where it lives (for ATS hints and tailoring).
export function allBullets(m) {
  const list = []
  ;(m.experience || []).forEach((e, ei) => (e.bullets || []).forEach((b, bi) => b?.trim() && list.push({ text: b.trim(), section: 'experience', ei, bi })))
  ;(m.projects || []).forEach((p, pi) => (p.bullets || []).forEach((b, bi) => b?.trim() && list.push({ text: b.trim(), section: 'projects', ei: pi, bi })))
  return list
}

// ---------- tailoring (no AI needed) ----------

const keyOf = (s) => String(s).toLowerCase()

export function jobKeywords(job) {
  return getJobRequiredSkills(job || {})
}

/**
 * Deterministic tailoring: reorders skills and bullets so what the job asks for
 * comes first, and fills an empty headline/summary. It never adds a skill or
 * claim that is not already in the resume.
 */
export function tailorModelToJob(model, job) {
  const m = JSON.parse(JSON.stringify(model))
  const wanted = new Set(jobKeywords(job).map(keyOf))
  const have = (m.skills || []).filter((s) => wanted.has(keyOf(s)))
  m.skills = [...have, ...(m.skills || []).filter((s) => !wanted.has(keyOf(s)))]

  const score = (b) => [...wanted].reduce((n, k) => n + (keyOf(b).includes(k) ? 1 : 0), 0)
  m.experience = (m.experience || []).map((e) => ({ ...e, bullets: [...(e.bullets || [])].sort((a, b) => score(b) - score(a)) }))

  if (!m.headline && job?.title) m.headline = job.title
  if (!m.summary?.trim() && job?.title) m.summary = draftSummary(m, job)
  return m
}

export function draftSummary(model, job) {
  const wanted = new Set(jobKeywords(job).map(keyOf))
  const skills = (model.skills || []).filter((s) => wanted.has(keyOf(s))).slice(0, 4)
  const fallback = (model.skills || []).slice(0, 4)
  const list = (skills.length ? skills : fallback).join(', ')
  const role = job?.title || model.headline || 'professional'
  const company = job?.company ? ` at ${job.company}` : ''
  return `Motivated candidate for the ${role} role${company}${list ? `, bringing hands-on experience with ${list}` : ''}. Focused on delivering clear, measurable results and learning quickly.`
    .replace(/\s+/g, ' ')
}

// Merge an AI rewrite onto the model, but only where it is safe: no new skills,
// no extra employers, no more bullets than before.
export function applyAiTailor(model, ai) {
  const m = JSON.parse(JSON.stringify(model))
  if (!ai || typeof ai !== 'object') return m
  if (typeof ai.headline === 'string' && ai.headline.trim() && ai.headline.length <= 100) m.headline = ai.headline.trim()
  if (typeof ai.summary === 'string' && ai.summary.trim() && ai.summary.length <= 700) m.summary = ai.summary.trim()
  if (Array.isArray(ai.skills)) {
    const own = new Map((m.skills || []).map((s) => [keyOf(s), s]))
    const ordered = ai.skills.map((s) => own.get(keyOf(s))).filter(Boolean)
    const rest = (m.skills || []).filter((s) => !ordered.includes(s))
    if (ordered.length) m.skills = [...new Set([...ordered, ...rest])]
  }
  if (Array.isArray(ai.experience)) {
    for (const item of ai.experience) {
      const e = m.experience?.[item?.i]
      if (!e || !Array.isArray(item.bullets)) continue
      const clean = item.bullets.filter((b) => typeof b === 'string' && b.trim()).map((b) => b.trim())
      if (clean.length && clean.length <= e.bullets.length) e.bullets = clean
    }
  }
  return m
}

export function compactForAi(model) {
  return {
    headline: model.headline,
    summary: model.summary,
    skills: model.skills,
    experience: (model.experience || []).map((e, i) => ({ i, title: e.title, org: e.org, bullets: (e.bullets || []).filter(Boolean) })),
  }
}

export function draftCoverLetter(model, job, name) {
  const role = job?.title || 'the open role'
  const company = job?.company || 'your company'
  const wanted = new Set(jobKeywords(job).map(keyOf))
  const skills = (model?.skills || []).filter((s) => wanted.has(keyOf(s))).slice(0, 4)
  const list = skills.length ? skills.join(', ') : (model?.skills || []).slice(0, 3).join(', ')
  const lastRole = model?.experience?.[0]
  return emptyCoverLetter({
    name: name || model?.name || '',
    contact: { email: model?.contact?.email || '', phone: model?.contact?.phone || '', location: model?.contact?.location || '' },
    company: job?.company || '',
    role: job?.title || '',
    paragraphs: [
      `I am excited to apply for the ${role} position at ${company}. The role lines up closely with the work I enjoy and the experience I have built so far.`,
      `${lastRole?.title ? `In my work as ${lastRole.title}${lastRole.org ? ` at ${lastRole.org}` : ''}, ` : ''}I have ${list ? `worked hands-on with ${list}` : 'built a strong foundation in the skills this role needs'}, and I care about turning that into clear, measurable results for the team.`,
      `I would welcome the chance to talk about how I can contribute to ${company}. Thank you for your time and consideration.`,
    ],
  })
}
