// The structured resume / cover-letter model used by the Resume Builder,
// plus import (text -> model), export (model -> plain text) and the
// deterministic "tailor to a job" fallback.
import { parseSections, splitSkillItems, cleanHeading, classifyHeading, despaceText } from './resumeBuilder'
import { normalizeLinks, linkLabel } from './resumeLinks'
import { splitPeriod, experiencePeriod, educationPeriod } from './resumeDates'
import { SKILL_SUGGESTIONS } from './data/skills'
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

export const newExperience = () => ({ id: uid(), title: '', org: '', location: '', start: '', end: '', current: false, bullets: [''] })
export const newEducation = () => ({ id: uid(), level: 'college', grade: '', degree: '', school: '', location: '', start: '', end: '', year: '', detail: '' })
export const newProject = () => ({ id: uid(), name: '', link: '', role: '', period: '', bullets: [''] })

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

const BULLET = /^\s*([•▪●◦‣■□*➢➤►▶✓✔→]|[-–]\s)\s*/
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/
const LINK = /((https?:\/\/)?(www\.)?(linkedin\.com|github\.com|behance\.net|dribbble\.com|[a-z0-9-]+\.(com|io|dev|me|in|net))\/[^\s,|]*)/i
const MONTH = '(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?'
const DATE_PART = `(${MONTH}\\s+)?(19|20)\\d{2}|\\d{1,2}\\/(19|20)\\d{2}`
const RANGE = new RegExp(`((${DATE_PART}))\\s*(-|–|—|to)\\s*(present|current|now|(${DATE_PART}))`, 'i')
const DEGREE = /\b(bachelor|master|b\.?\s?tech|m\.?\s?tech|b\.?\s?sc|m\.?\s?sc|b\.?\s?e\b|m\.?\s?e\b|bca|mca|bba|mba|b\.?\s?com|m\.?\s?com|ph\.?d|diploma|associate|certificate|12th|10th|high school|hsc|ssc|b\.?a\b|m\.?a\b)/i
const SCHOOL = /\b(university|college|institute|school|academy|polytechnic)\b/i

const NUM_PREFIX = /^\s*\d{1,2}[.)]\s+/
const stripNum = (t) => String(t).replace(NUM_PREFIX, '')
const TITLE_WORDS = 'specialist|manager|analyst|engineer|executive|representative|associate|intern|trainee|developer|consultant|officer|director|coordinator|administrator|assistant|designer|architect|scientist|lead|head|supervisor|advisor|agent|technician|clerk|accountant|recruiter|writer|teacher|tutor|researcher|programmer|tester|partner|president|owner|founder'
const TITLE_RE = new RegExp(`\\b(${TITLE_WORDS})\\b`, 'i')
const TITLE_LOC_RE = new RegExp(`^(.*\\b(?:${TITLE_WORDS}))\\s+([A-Z][A-Za-z.'-]+(?:\\s[A-Z][A-Za-z.'-]+)*,\\s*[A-Z][A-Za-z.'-]+(?:\\s[A-Z][A-Za-z.'-]+)*(?:,\\s*[A-Z][A-Za-z.'-]+)*)$`, 'i')
const PLACE_RE = /^[A-Z][A-Za-z.'-]+(?:\s[A-Za-z.'-]+)*,\s*[A-Z][A-Za-z.'-]+(?:\s[A-Za-z.'-]+)*(?:,\s*[A-Za-z.'-]+)*$/
export const looksLikePlace = (t) => t.length <= 60 && t.trim().split(/\s+/).length <= 6 && !/\d/.test(t) && !TITLE_RE.test(t) && PLACE_RE.test(t.trim())

// "Senior Analyst Gurgaon, Haryana" -> title + place.
function splitTitleLocation(text) {
  const m = TITLE_LOC_RE.exec(String(text || '').trim())
  return m ? { title: m[1].trim(), location: m[2].trim() } : { title: String(text || '').trim(), location: '' }
}

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
    .replace(/\(\s*\)/g, ' ')
    .split(/\s[|·•–—@]\s|\s\|\s|\s+at\s+|,\s+(?=[A-Z])/)
    .map((p) => p.replace(/\|/g, ' ').replace(/\s+/g, ' ').replace(/[\s:;,–—-]+$/g, '').trim())
    .filter(Boolean)
  const current = /^(present|current|now)$/i.test(end)
  return { title: pieces[0] || '', org: pieces[1] || '', location: pieces[2] || '', start, end: current ? '' : end, current }
}

function parseExperience(lines) {
  const entries = []
  let cur = null
  let pre = [] // lines seen just before a dated line: usually "Title" then "Company"
  const clean = (t) => t.replace(BULLET, '').trim()
  const usesBullets = lines.some((l) => BULLET.test(String(l)))
  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (!line) return
    const isBullet = BULLET.test(line)
    const hasDate = RANGE.test(line) && !isBullet && line.length < 140
    const next = (lines[i + 1] || '').trim()
    const next2 = (lines[i + 2] || '').trim()
    if (hasDate) {
      let h = splitHeader(line)
      // "Wipro — Senior Customer Service" wrapped onto "Representative (Jul 2024 – Present)"
      if (pre.length === 1 && /\s[—–|-]\s/.test(pre[0]) && !h.org) { h = splitHeader(`${pre[0]} ${line}`); pre = [] }
      if (pre.length >= 2 && !h.org) {
        // "Title / Company / Jul 2024 - Present | City": the dated line only adds dates and place
        h.location = [h.title, h.location].filter(Boolean).join(', ')
        h.org = pre[pre.length - 1]
        h.title = pre[pre.length - 2]
      } else if (pre.length >= 2 && h.org) {
        h.location = [h.title, h.org, h.location].filter(Boolean).join(', ')
        h.org = pre[pre.length - 1]
        h.title = pre[pre.length - 2]
      } else if (pre.length === 1) {
        if (!h.title) h.title = pre[0]
        else { h.org = h.title; h.title = pre[0] }
      }
      pre = []
      cur = { id: uid(), ...h, bullets: [] }
      entries.push(cur)
    } else if (cur) {
      const text = clean(line)
      const headerAhead = RANGE.test(next) || (RANGE.test(next2) && next.length < 60 && !BULLET.test(next))
      const looksLikeNewHeader = !isBullet && text.length < 70 && !/[.;]$/.test(text) && headerAhead && cur.bullets.length > 0
      if (looksLikeNewHeader) pre.push(text)
      else if (pre.length > 0 && !isBullet && text.length < 70 && !/[.;]$/.test(text)) pre.push(text)
      else if (!isBullet && cur.bullets.length === 0 && !cur.location && looksLikePlace(text)) cur.location = text
      else if (!isBullet && cur.bullets.length === 0 && text.length < 60 && !cur.org) cur.org = text
      else if (!isBullet && cur.bullets.length > 0 && usesBullets && !/[.!?]$/.test(cur.bullets[cur.bullets.length - 1]))
        cur.bullets[cur.bullets.length - 1] += ` ${text}` // wrapped line
      else if (!isBullet && cur.bullets.length > 0 && !/[.!?]$/.test(cur.bullets[cur.bullets.length - 1]) && /^[a-z]/.test(text))
        cur.bullets[cur.bullets.length - 1] += ` ${text}` // wrapped line
      else cur.bullets.push(text)
    } else {
      pre.push(clean(line))
      if (pre.length > 3) pre.shift()
    }
  })
  return entries.map((e) => {
    let { title, org, location } = e
    // "Wipro" on the dated line and "Senior Analyst Gurgaon, Haryana" under it: swap and split the place.
    if (title && org && !TITLE_RE.test(title) && TITLE_RE.test(org)) [title, org] = [org, title]
    const tl = splitTitleLocation(title)
    if (tl.location && !location) { title = tl.title; location = tl.location }
    return { ...e, title, org, location, bullets: e.bullets.length ? e.bullets : [''] }
  })
}

const SCHOOL_LEVEL = /\b(10th|12th|x{1,2}th|xii?th|matric(?:ulation)?|high school|higher secondary|senior secondary|secondary|sr\.?\s*sec|ssc|hsc|cbse|icse|class\s*(?:x|xii|10|12))\b/i
const COLLEGE_WORDS = /\b(university|college|institute|bachelor|master|b\.?\s?tech|m\.?\s?tech|b\.?\s?sc|m\.?\s?sc|bca|mca|bba|mba|b\.?\s?com|m\.?\s?com|ph\.?d|diploma|polytechnic|b\.?\s?e\b|m\.?\s?e\b)/i

function takeGrade(text) {
  const m = text.match(/\b(?:cgpa|gpa|grade|percentage|score)\s*[:\-]?\s*(\d{1,3}(?:\.\d+)?\s*%?)/i) || text.match(/(\d{2,3}(?:\.\d+)?\s*%)/)
  return m ? { grade: m[1].trim(), rest: text.replace(m[0], ' ').replace(/\s+/g, ' ').trim() } : { grade: '', rest: text }
}

export const educationLevelOf = (e) => {
  const t = `${e.degree || ''} ${e.school || ''}`
  return SCHOOL_LEVEL.test(t) && !COLLEGE_WORDS.test(`${e.degree || ''}`) && !/\b(university|college|institute)\b/i.test(e.school || '') ? 'school' : 'college'
}

function parseEducation(lines) {
  const entries = []
  let cur = null
  const fresh = () => { cur = { id: uid(), level: 'college', degree: '', school: '', location: '', start: '', end: '', current: false, grade: '', year: '', detail: '' }; entries.push(cur); return cur }
  for (const raw of lines) {
    const isBullet = BULLET.test(raw)
    let line = stripNum(raw.replace(BULLET, '').trim())
    if (!line) continue
    if (isBullet && cur && (cur.degree || cur.school)) { cur.detail = cur.detail ? `${cur.detail} ${line}` : line; continue }
    // a line can be "2021 | 12th (Commerce) | 80%": split on pipes and place each piece
    const pieces = line.includes('|') ? line.split(/\s*\|\s*/).filter(Boolean) : [line]
    for (const piece0 of pieces) {
      let piece = piece0
      const g = takeGrade(piece)
      piece = g.rest
      const range = piece.match(RANGE) || piece.match(/\b(?:19|20)\d{2}\b/)
      let period = ''
      if (range) { period = range[0]; piece = piece.replace(range[0], ' ').replace(/\s+/g, ' ').trim() }
      piece = piece.replace(/^[\s,;:–—-]+|[\s,;:–—-]+$/g, '').trim()
      const isInst = SCHOOL.test(piece) && !SCHOOL_LEVEL.test(piece.replace(SCHOOL, '')) && !/^(high|secondary|senior secondary|higher secondary) school$/i.test(piece.trim())
      const isDeg = !isInst && (DEGREE.test(piece) || SCHOOL_LEVEL.test(piece))
      const instAlso = SCHOOL.test(piece) && /\bsr\.?\s*sec|senior secondary school|public school/i.test(piece) && piece.split(/\s+/).length > 2
      const openDegree = cur && /\b(of|in|and|&|with)$/i.test(cur.degree)
      if (piece && openDegree && !isInst) { cur.degree += ` ${piece}`; piece = '' }
      else if (piece && (isInst || instAlso) && !(isDeg && !instAlso)) {
        if (!cur || cur.school) fresh()
        const [name, ...place] = piece.split(/\s+-\s+|,\s+/)
        cur.school = (name || '').trim() + (/,\s*$/.test(piece) ? '' : '')
        if (place.length && !cur.location) cur.location = place.join(', ').trim()
        piece = ''
      } else if (piece && isDeg) {
        if (!cur || cur.degree) fresh()
        cur.degree = piece
        piece = ''
      }
      if (!cur && (piece || period || g.grade)) fresh()
      if (piece && piece === cur?.location) piece = ''
      if (piece) {
        if (cur.school && !cur.location && piece.length <= 40 && !/\d/.test(piece)) cur.location = piece
        else if (cur.detail && !/[.!?;]$/.test(cur.detail)) cur.detail = `${cur.detail} ${piece}`
        else cur.detail = cur.detail ? `${cur.detail}; ${piece}` : piece
      }
      if (period && !cur.start && !cur.end) { const p = splitPeriod(period); cur.start = p.start; cur.end = /^(present|current|now)$/i.test(p.end) ? '' : p.end; cur.current = /^(present|current|now)$/i.test(p.end) }
      if (g.grade && !cur.grade) cur.grade = g.grade
    }
  }
  return entries.map((e) => {
    const school = e.school.replace(/[,\s]+$/, '')
    return { ...e, school, level: educationLevelOf({ ...e, school }) }
  })
}

// Projects: a title line, an optional role line, then bullets. Bullets that wrap onto
// the next line are joined back together instead of becoming new projects.
const LINK_WORDS = /\s*[-–—|·]?\s*\b(link to project|view project|live demo|live link|project link|github link|source code|link)\b\s*$/i
function parseProjects(lines) {
  const usesBullets = lines.some((l) => BULLET.test(String(l)))
  const entries = []
  let cur = null
  const start = (name) => {
    let text = stripNum(name).trim()
    let period = ''
    const range = text.match(RANGE)
    if (range) { period = range[0].trim(); text = text.replace(range[0], ' ') }
    text = text.replace(/\s+/g, ' ').trim()
    const hadLink = LINK_WORDS.test(text)
    text = text.replace(LINK_WORDS, '').replace(/[\s–—|-]+$/g, '').trim()
    cur = { id: uid(), name: text, link: (text.match(LINK) || [''])[0], role: '', period, hadLink, bullets: [] }
    entries.push(cur)
  }
  lines.forEach((raw, i) => {
    const line = String(raw).trim()
    if (!line) return
    const isBullet = BULLET.test(line)
    const text = line.replace(BULLET, '').trim()
    const next = String(lines[i + 1] || '').trim()
    if (isBullet) {
      if (!cur) start('')
      cur.bullets.push(text)
      return
    }
    const prev = cur?.bullets[cur.bullets.length - 1]
    if (!cur) return start(text)
    if (!usesBullets) {
      if (cur.bullets.length > 0 && text.length < 70 && !/[.]$/.test(text)) start(text)
      else cur.bullets.push(text)
      return
    }
    const numbered = NUM_PREFIX.test(line)
    const open = prev !== undefined && !/[.!?)]$/.test(prev)
    const dated = RANGE.test(line) && text.length < 140 && !open && !/^[a-z]/.test(text)
    if (numbered || dated) return start(text)
    if (cur.bullets.length === 0) {
      if (!cur.role && text.length < 80) cur.role = text
      else cur.bullets.push(text)
      return
    }
    if (open || /^[a-z]/.test(text)) cur.bullets[cur.bullets.length - 1] = `${prev} ${text}`
    else if (BULLET.test(next) && text.length < 90) start(text)
    else cur.bullets[cur.bullets.length - 1] = `${prev} ${text}`
  })
  return entries.map((e) => ({ ...e, bullets: e.bullets.length ? e.bullets : [''] }))
}

const ISSUERS = new Set(['ibm', 'google', 'microsoft', 'aws', 'amazon', 'coursera', 'udemy', 'meta', 'oracle', 'cisco', 'salesforce', 'linkedin', 'simplilearn', 'edx', 'harvard', 'stanford', 'mit', 'infosys', 'wipro', 'tcs', 'nptel', 'datacamp', 'kaggle', 'tableau', 'sap', 'pmi', 'scrum.org', 'comptia', 'isc2', 'cfa institute', 'great learning', 'upgrad', 'unacademy', 'skillshare', 'codecademy', 'hackerrank', 'deeplearning.ai', 'duke university', 'university of michigan'])
const JOINERS = /(\b(using|and|of|with|in|for|to|the|a|an|by|on|at|from|or)|&)$/i

// Joins a certificate that wrapped over two lines, and attaches issuer headings
// ("IBM" above "Python (Pandas, NumPy)") to the line they introduce.
function tidyCertLines(lines) {
  const joined = []
  for (const l of lines) {
    const prev = joined[joined.length - 1]
    const open = prev && (prev.match(/\(/g) || []).length > (prev.match(/\)/g) || []).length
    if (prev && (open || JOINERS.test(prev) || /^[a-z)]/.test(l))) joined[joined.length - 1] = `${prev} ${l}`
    else joined.push(l)
  }
  const isIssuer = (t) => {
    const words = t.trim().split(/\s+/)
    return words.length <= 2 && !/\d/.test(t) && (ISSUERS.has(t.trim().toLowerCase()) || /^[A-Z]{2,6}$/.test(t.trim()))
  }
  const out = []
  for (let i = 0; i < joined.length; i++) {
    if (isIssuer(joined[i]) && joined[i + 1] && !isIssuer(joined[i + 1])) { out.push(`${joined[i].trim()}: ${joined[i + 1]}`); i++ }
    else out.push(joined[i])
  }
  return out
}

const bulletsOf = (lines) => lines.map((l) => l.replace(BULLET, '').trim()).filter(Boolean)
const certLines = (lines) => lines.map((l) => stripNum(l.replace(BULLET, '').trim())).filter(Boolean)


const LABEL_ONLY = /^(email|e-mail|phone|mobile|tel|telephone|contact|address|location|linkedin|github|portfolio|website|links?)\s*:?$/i
const SKILL_SET = new Set(SKILL_SUGGESTIONS.map((x) => x.toLowerCase()))
const wordCount = (t) => t.trim().split(/\s+/).filter(Boolean).length

// A full sentence of work description, not a skill, degree or certificate name.
function looksLikeSentence(text) {
  const t = text.replace(BULLET, '').trim()
  const w = wordCount(t)
  if (DEGREE.test(t) && SCHOOL.test(t)) return false
  const startsWithAction = /^(?:[A-Z][a-z]+(?:ed|ing)|Led|Ran|Built|Wrote|Drove|Made)\s+[a-z0-9]/.test(t)
  return w >= 11 || (BULLET.test(text) && w >= 7) || (startsWithAction && w >= 6)
}

// Short comma-separated tool names with no degree, school or year in them.
function looksLikeSkillLine(text) {
  const t = text.replace(BULLET, '').trim()
  if (!t || DEGREE.test(t) || SCHOOL.test(t) || /\b(19|20)\d{2}\b/.test(t) || looksLikeSentence(t)) return false
  const parts = splitSkillItems([t])
  return parts.length > 0 && parts.every((p) => wordCount(p) <= 4) && parts.some((p) => SKILL_SET.has(p.toLowerCase()) || SKILL_SET.has(p.toLowerCase().replace(/\s*\(.*\)$/, '')))
}

// Splits a line into contact bits (email, phone, link, bare "Email" labels) and what is left.
const PHONE_ANY = /(?:\+?\d[\d\s().-]{7,}\d)/
function pullContact(line) {
  const text = String(line).trim()
  if (LABEL_ONLY.test(text)) return { moved: [], rest: '' }
  const moved = []
  let rest = text
  const email = rest.match(EMAIL)
  if (email) { moved.push(email[0]); rest = rest.replace(email[0], ' ') }
  const link = rest.match(LINK)
  if (link && !BULLET.test(text)) { moved.push(link[0]); rest = rest.replace(link[0], ' ') }
  const phone = rest.match(PHONE_ANY)
  if (phone && phone[0].replace(/\D/g, '').length >= 9 && !/\b(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}\b/.test(phone[0])) { moved.push(phone[0].trim()); rest = rest.replace(phone[0], ' ') }
  rest = rest.replace(/\b(email|e-mail|phone|mobile|tel|linkedin|github)\s*:?\s*$/i, '').replace(/^\s*(email|e-mail|phone|mobile|tel)\s*:?\s+/i, '').replace(/\s+/g, ' ').trim()
  return { moved, rest }
}

// Real resumes get read imperfectly (columns, odd layouts). This is a safety net that
// moves obvious strays back where they belong instead of leaving them in the wrong
// section: contact blocks go to the header, work sentences leave Skills/Education/
// Certifications, and tool lists leave Education.
export function repairSections(sectionsIn, header) {
  const sections = sectionsIn.map((s) => ({ ...s, lines: [...s.lines] }))
  const kindIs = (s, k) => classifyHeading(s.heading) === k
  const kept = []
  for (const s of sections) {
    if (kindIs(s, 'contact')) header.push(...s.lines)
    else kept.push(s)
  }
  // Contact details that ended up inside a section (a sidebar read as part of the
  // job history): the email, phone and link go to the header and the rest stays.
  for (const s of kept) {
    const stay = []
    for (const l of s.lines) {
      const { moved, rest } = pullContact(l)
      if (moved.length) header.push(...moved)
      if (rest) stay.push(rest)
    }
    s.lines = stay
  }
  const last = (k) => [...kept].reverse().find((s) => kindIs(s, k))

  // A profile paragraph with no heading of its own (common in two-column layouts)
  // is read at the end of the sidebar. Give it back its Summary section.
  if (!kept.some((s) => kindIs(s, 'summary') && s.lines.some((l) => wordCount(l) > 5))) {
    for (const s of kept) {
      if (!(kindIs(s, 'skills') || kindIs(s, 'education') || kindIs(s, 'certs'))) continue
      const i = s.lines.findIndex((l) => !BULLET.test(l) && !NUM_PREFIX.test(l) && wordCount(l) >= 25 && !/^[^:]{1,30}:/.test(l))
      if (i >= 0) {
        const [para] = s.lines.splice(i, 1)
        const existing = kept.find((x) => kindIs(x, 'summary'))
        if (existing) existing.lines.unshift(para)
        else kept.unshift({ heading: 'Summary', lines: [para] })
        break
      }
    }
  }

  const work = last('experience') || last('projects')
  let skills = last('skills')
  const strayWork = []
  const strayTools = []
  const startsWithAction = (t) => /^(?:[A-Z][a-z]+(?:ed|ing)|Led|Ran|Built|Wrote|Drove|Made)\s+[a-z0-9]/.test(t)
  for (const s of kept) {
    if (kindIs(s, 'skills') || kindIs(s, 'education') || kindIs(s, 'certs')) {
      const stay = []
      for (const l of s.lines) {
        const t = l.replace(BULLET, '').trim()
        const commas = (t.match(/,/g) || []).length
        const sentence = startsWithAction(t) && wordCount(t) >= 6 && !/^[^:]{1,30}:/.test(t) && (BULLET.test(l) || commas <= 2) && !(DEGREE.test(t) && SCHOOL.test(t))
        if (work && sentence) strayWork.push(l)
        else if (kindIs(s, 'education') && looksLikeSkillLine(l)) strayTools.push(l)
        else stay.push(l)
      }
      s.lines = stay
    }
  }
  if (strayWork.length && work) work.lines.push(...strayWork.map((l) => (BULLET.test(l) ? l : `- ${l}`)))
  if (strayTools.length) {
    if (!skills) { skills = { heading: 'Skills', lines: [] }; kept.push(skills) }
    skills.lines.push(...strayTools)
  }
  return kept
}


/**
 * Best-effort import of a resume's lines (strings or {text,size}) into the
 * builder model. Anything unrecognised is kept under `extra`, never dropped.
 */
export function linesToModel(rawLines) {
  const lines = rawLines.map((l) => (typeof l === 'string' ? { text: l, size: 0 } : l)).filter((l) => l.text?.trim())
  const model = emptyResume()
  if (lines.length === 0) return model
  const spaced = lines.map((l) => ({ ...l, text: despaceText(l.text) }))
  // A big name split over two lines ("ABISHEK" / "M"): join a lone initial back onto it.
  const initialAt = spaced.slice(1).findIndex((l) => /^[A-Za-z]\.?$/.test(l.text.trim()) && l.size >= (spaced[0].size || 0) * 0.8)
  if (initialAt >= 0 && /^[A-Za-z][A-Za-z'.-]+$/.test(spaced[0].text.trim())) {
    spaced[0] = { ...spaced[0], text: `${spaced[0].text.trim()} ${spaced[initialAt + 1].text.trim()}` }
    spaced.splice(initialAt + 1, 1)
  }
  const parsed = parseSections(spaced)
  const name = parsed.name
  const header = [...parsed.header]
  const sections = repairSections(parsed.sections, header)
  model.name = name.trim()

  const headerText = header.join(' | ')
  model.contact.email = (headerText.match(EMAIL) || [''])[0]
  const phone = (headerText.replace(EMAIL, '').match(PHONE) || [''])[0].trim()
  model.contact.phone = phone
  const links = []
  for (const h of header) {
    const m = h.match(LINK)
    if (m && !EMAIL.test(m[0])) links.push({ label: linkLabel(m[0]), url: m[0] })
  }
  // "LinkedIn | GitHub" written as plain words: keep them as named links to fill in.
  const SOCIAL = /^(linkedin|github|gitlab|portfolio|website|behance|dribbble|twitter|leetcode|kaggle|medium)$/i
  const pieces = header
    .flatMap((h) => h.split(/\s[|•·]\s|\s{2,}/))
    .map((h) => h.trim())
    .map((h) => h.replace(/^(email|e-mail|phone|mobile|tel|contact|address|location|linkedin|github|portfolio|website)\s*:\s*/i, ''))
    .filter(Boolean)
  for (const h of pieces) if (SOCIAL.test(h) && !links.some((l) => l.label.toLowerCase() === h.toLowerCase())) links.push({ label: h.replace(/^./, (c) => c.toUpperCase()).replace(/^linkedin$/i, 'LinkedIn').replace(/^github$/i, 'GitHub'), url: '' })
  // Real web addresses behind the words, when the PDF carries them.
  const annots = Array.isArray(rawLines.links) ? rawLines.links : []
  for (const l of links) {
    if (l.url) continue
    const hit = annots.find((a) => a.text.toLowerCase().includes(l.label.toLowerCase()) || linkLabel(a.url).toLowerCase() === l.label.toLowerCase())
    if (hit) l.url = hit.url
  }
  const seenUrl = new Set()
  model.contact.links = normalizeLinks(links.filter((l) => { const k = (l.url || l.label).toLowerCase(); return seenUrl.has(k) ? false : seenUrl.add(k) }))
  const rest = pieces.filter((h) => !LABEL_ONLY.test(h) && !SOCIAL.test(h) && !EMAIL.test(h) && !LINK.test(h) && h.replace(/\D/g, '').length < 7)
  model.contact.location = rest.find((h) => looksLikePlace(h)) || ''
  const headline = rest.find((h) => h !== model.contact.location && h.length <= 90 && !/^\d/.test(h) && !/^(contact|profile|about)\b/i.test(h) && !/^[A-Z]\/[A-Z]$/.test(h)) || ''
  model.headline = headline && headline === headline.toUpperCase() ? headline.toLowerCase().replace(/(^|[\s&/-])([a-z])/g, (m, x, y) => x + y.toUpperCase()) : headline
  if (!model.contact.location) model.contact.location = rest.find((h) => h !== model.headline && h.length <= 40 && !/[.!?]$/.test(h) && /,/.test(h)) || ''

  for (const sec of sections) {
    const kind = classifyHeading(sec.heading)
    if (kind === 'summary') model.summary = bulletsOf(sec.lines).join(' ')
    else if (kind === 'experience') model.experience.push(...parseExperience(sec.lines))
    else if (kind === 'education') model.education.push(...parseEducation(sec.lines))
    else if (kind === 'projects') model.projects.push(...parseProjects(sec.lines))
    else if (kind === 'skills') model.skills.push(...splitSkillItems(sec.lines))
    else if (kind === 'certs') model.certifications.push(...tidyCertLines(certLines(sec.lines)))
    else model.extra.push({ id: uid(), heading: sec.heading, lines: bulletsOf(sec.lines) })
  }
  // "Link to Project" in the PDF is a hyperlink: give each project the address behind it.
  const spare = annots.filter((a) => !model.contact.links.some((l) => l.url === a.url) && !/linkedin\.com|github\.com\/[^/]+\/?$/i.test(a.url))
  model.projects.forEach((p) => {
    if (p.hadLink && !p.link && spare.length) p.link = spare.shift().url
    delete p.hadLink
  })
  const seen = new Set()
  model.skills = model.skills.filter((s) => (seen.has(s.toLowerCase()) ? false : seen.add(s.toLowerCase())))
  return model
}

// Repairs resumes saved before the reader was fixed: letter-spaced extra headings
// ("W O R K E X P E R I E N C E") become "Work Experience". Safe to run repeatedly.
export function normalizeModel(m) {
  if (!m || typeof m !== 'object') return m
  const out = { ...m, extra: [] }
  const next = { ...m, contact: { ...(m.contact || {}) }, experience: [...(m.experience || [])], education: [...(m.education || [])], projects: [...(m.projects || [])], skills: [...(m.skills || [])], certifications: [...(m.certifications || [])] }
  const header = []
  const stranded = []
  for (const x of m.extra || []) {
    const heading = cleanHeading(x.heading || '')
    // A resume saved before the reader was fixed can hold a real section ("W O R K
    // E X P E R I E N C E", "SKILLS") as an extra block. Put it back where it belongs.
    if (classifyHeading(heading) && classifyHeading(heading) !== 'summary' && classifyHeading(heading) !== 'contact') stranded.push({ heading, lines: x.lines || [] })
    else if (ISSUERS.has(heading.trim().toLowerCase()) || /^[A-Z]{2,6}$/.test(heading.trim())) {
      // An issuer name ("IBM", "Google") that was read as a section: back under Certifications.
      for (const l of bulletsOf(x.lines || [])) next.certifications.push(`${heading.trim()}: ${l}`)
    } else out.extra.push({ ...x, heading })
  }
  if (stranded.length) {
    const repaired = repairSections(stranded.map((s) => ({ heading: s.heading, lines: [...s.lines] })), header)
    for (const sec of repaired) {
      const kind = classifyHeading(sec.heading)
      if (kind === 'experience') next.experience.push(...parseExperience(sec.lines))
      else if (kind === 'education') next.education.push(...parseEducation(sec.lines))
      else if (kind === 'projects') next.projects.push(...parseProjects(sec.lines))
      else if (kind === 'skills') next.skills.push(...splitSkillItems(sec.lines))
      else next.certifications.push(...tidyCertLines(certLines(sec.lines)))
    }
    const headerText = header.join(' | ')
    if (!next.contact.email) next.contact.email = (headerText.match(EMAIL) || [''])[0]
    if (!next.contact.phone) next.contact.phone = (headerText.replace(EMAIL, '').match(PHONE) || [''])[0].trim()
    const seen = new Set()
    next.skills = next.skills.filter((s) => (seen.has(String(s).toLowerCase()) ? false : seen.add(String(s).toLowerCase())))
  }
  // Basics typed letter by letter, plain-text links, and older single "year" fields.
  const fix = (t) => despaceText(String(t ?? ''))
  next.name = fix(next.name)
  next.headline = fix(next.headline)
  next.contact = { ...next.contact, email: fix(next.contact.email).replace(/\s+/g, ''), phone: fix(next.contact.phone), location: fix(next.contact.location), links: normalizeLinks(next.contact.links) }
  next.experience = next.experience.map((e) => {
    const cur = e.current ?? /^(present|current|now)$/i.test(String(e.end || '').trim())
    return { ...e, current: !!cur, end: cur ? '' : e.end || '' }
  })
  next.education = next.education.map((e) => {
    const base = { level: e.level || educationLevelOf(e), grade: '', ...e }
    if (e.start || e.end || !e.year) return { start: '', end: '', ...base }
    const p = splitPeriod(e.year)
    return { ...base, start: p.start, end: p.end, year: '' }
  })
  return { ...next, extra: out.extra }
}

// ---------- model -> text ----------

export function resumeToText(m) {
  const out = []
  const push = (t) => t && String(t).trim() && out.push(String(t).trim())
  push(m.name)
  push(m.headline)
  push([m.contact?.email, m.contact?.phone, m.contact?.location, ...normalizeLinks(m.contact?.links).map((l) => (l.url && l.label !== l.url ? `${l.label}: ${l.url}` : l.url || l.label))].filter(Boolean).join(' | '))
  if (m.summary) { push('SUMMARY'); push(m.summary) }
  if (m.experience?.length) {
    push('EXPERIENCE')
    for (const e of m.experience) {
      push([e.title, e.org, e.location].filter(Boolean).join(' | ') + (e.start || e.end || e.current ? `  ${experiencePeriod(e)}` : ''))
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
    for (const e of m.education) push([e.degree, e.school, educationPeriod(e), e.detail].filter(Boolean).join(' | '))
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
