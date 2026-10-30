// JobOrbit's ATS evaluator: scores a resume against one job using deterministic
// checks (no AI), so the same resume and job always give the same score and
// every point can be explained. It estimates how an applicant tracking system
// would read the resume; real systems differ, so treat it as guidance.
import { extractSkillsFromText } from './matchingEngine'
import { jobKeywords, resumeToText, allBullets, draftSummary } from './resumeModel'

const STOP = new Set('the and for with that this you your are our will from have has was were been into about their they them than then also can able must should would could who what when where which while over under more most such other any all each per via etc not but use used using work working team teams role roles job company business experience years year plus strong good great excellent ability skills skill knowledge looking join help well new within across including include based within responsible responsibilities requirements required preferred candidate candidates position apply'.split(' '))

const STRONG_VERBS = new Set('led managed built developed designed created launched delivered improved increased reduced optimized automated analyzed implemented established streamlined drove owned coordinated mentored trained negotiated resolved generated achieved executed planned organized supported maintained migrated deployed engineered produced presented collaborated initiated researched evaluated forecasted audited processed handled administered supervised scaled architected integrated tested secured sold closed grew saved cut boosted won shipped redesigned standardized documented configured monitored reviewed prepared'.split(' '))
const WEAK_OPENERS = /^(responsible for|worked on|helped( with| to)?|assisted( with| in)?|involved in|duties included|tasked with|participated in)\b/i
const NUMBER = /(\d|%|\$|₹|€|£)/

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
const words = (t) => (String(t || '').toLowerCase().match(/[a-z][a-z0-9+#.]{1,}/g) || [])
const wordCount = (t) => words(t).length

function titleTerms(title) {
  const generic = new Set(['senior', 'junior', 'lead', 'jr', 'sr', 'i', 'ii', 'iii', 'associate', 'executive', 'specialist', 'remote', 'hybrid'])
  return [...new Set(words(title).filter((w) => w.length > 2 && !STOP.has(w) && !generic.has(w)))]
}

// Frequent meaningful words in the job text, for jobs that name no known skills.
function fallbackTerms(job, limit = 12) {
  const freq = new Map()
  for (const w of words(`${job?.title || ''} ${job?.title || ''} ${job?.description || ''}`)) {
    if (w.length < 4 || STOP.has(w)) continue
    freq.set(w, (freq.get(w) || 0) + 1)
  }
  return [...freq.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([w]) => w)
}

export function scoreLabel(score) {
  if (score >= 80) return 'Excellent'
  if (score >= 65) return 'Good'
  if (score >= 50) return 'Fair'
  return 'Needs work'
}

export function evaluateAts({ model, job }) {
  const text = resumeToText(model)
  const lower = text.toLowerCase()
  const bullets = allBullets(model)
  const checks = []
  const suggestions = []
  const add = (id, label, points, max, detail, fix) => {
    const ratio = max ? points / max : 0
    checks.push({ id, label, points: Math.round(points * 10) / 10, max, status: ratio >= 0.85 ? 'pass' : ratio >= 0.5 ? 'warn' : 'fail', detail, fix: ratio >= 0.85 ? '' : fix })
  }

  // 1. Keywords (40)
  const skillKw = jobKeywords(job)
  const resumeSkills = new Set(extractSkillsFromText(text).map((s) => s.toLowerCase()))
  let matched = [], missing = []
  if (skillKw.length > 0) {
    matched = skillKw.filter((s) => resumeSkills.has(s.toLowerCase()))
    missing = skillKw.filter((s) => !resumeSkills.has(s.toLowerCase()))
  } else {
    const terms = fallbackTerms(job)
    matched = terms.filter((t) => lower.includes(t))
    missing = terms.filter((t) => !lower.includes(t))
  }
  const kwTotal = matched.length + missing.length
  const kwRatio = kwTotal ? matched.length / kwTotal : 0.6
  add('keywords', 'Job keywords', 40 * kwRatio, 40,
    kwTotal ? `${matched.length} of ${kwTotal} keywords from the job appear in your resume.` : 'The job lists no clear keywords, so this is scored neutrally.',
    missing.length ? `Add the keywords you genuinely have: ${missing.slice(0, 6).join(', ')}.` : '')
  if (missing.length) {
    suggestions.push({ id: 'add-skills', type: 'add_skills', title: 'Add missing keywords', detail: 'Tick only the ones you really have. They go into your Skills section.', items: missing.slice(0, 12) })
  }

  // 2. Title alignment (10)
  const terms = titleTerms(job?.title)
  const textWords = new Set(words(text))
  const hit = terms.filter((t) => textWords.has(t))
  const exact = job?.title && lower.includes(String(job.title).toLowerCase())
  const titleRatio = terms.length ? clamp(hit.length / terms.length + (exact ? 0.3 : 0), 0, 1) : 0.7
  add('title', 'Job title alignment', 10 * titleRatio, 10,
    terms.length ? `${hit.length} of ${terms.length} words from "${job?.title}" appear in your resume.` : 'No job title to compare against.',
    `Use the job's own wording in your headline, for example "${job?.title}".`)
  if (job?.title && titleRatio < 0.6 && !(model.headline || '').toLowerCase().includes(String(job.title).toLowerCase())) {
    suggestions.push({ id: 'headline', type: 'set_headline', title: 'Match your headline to the role', detail: `Set your headline to "${job.title}".`, value: job.title })
  }

  // 3. Sections (15)
  const email = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(model.contact?.email || '')
  const phone = (model.contact?.phone || '').replace(/\D/g, '').length >= 8
  const sec = [
    ['Email', email, 3], ['Phone', phone, 2], ['Summary', (model.summary || '').trim().length >= 40, 3],
    ['Experience or projects', (model.experience?.length || 0) + (model.projects?.length || 0) > 0, 3],
    ['Education', (model.education?.length || 0) > 0, 2], ['Skills', (model.skills?.length || 0) >= 4, 2],
  ]
  const secPoints = sec.reduce((n, [, ok, p]) => n + (ok ? p : 0), 0)
  const secMissing = sec.filter(([, ok]) => !ok).map(([l]) => l)
  add('sections', 'Complete sections', secPoints, 15,
    secMissing.length ? `Missing or thin: ${secMissing.join(', ')}.` : 'All the sections an ATS looks for are there.',
    `Fill in: ${secMissing.join(', ')}.`)
  if (!(model.summary || '').trim() && job?.title) {
    suggestions.push({ id: 'summary', type: 'set_summary', title: 'Add a short summary', detail: 'A two-line summary that names the role. Edit it to sound like you.', value: draftSummary(model, job) })
  }

  // 4. Quantified results (10)
  const withNumbers = bullets.filter((b) => NUMBER.test(b.text))
  const qRatio = bullets.length ? withNumbers.length / bullets.length : 0
  add('quantified', 'Numbers and results', 10 * clamp(qRatio / 0.35, 0, 1), 10,
    bullets.length ? `${withNumbers.length} of ${bullets.length} bullets include a number, percentage or amount.` : 'No experience bullets to check.',
    'Add a figure to more bullets: how many, how much, how fast or how often.')
  const noNumber = bullets.filter((b) => !NUMBER.test(b.text)).slice(0, 3)
  if (qRatio < 0.35 && noNumber.length) {
    suggestions.push({ id: 'quantify', type: 'advice', title: 'Quantify your impact', detail: 'These bullets have no numbers yet:', items: noNumber.map((b) => b.text) })
  }

  // 5. Action verbs (10)
  const first = (b) => (words(b.text)[0] || '')
  const strong = bullets.filter((b) => STRONG_VERBS.has(first(b)) || /ed$/.test(first(b)) && first(b).length > 4)
  const weak = bullets.filter((b) => WEAK_OPENERS.test(b.text))
  const vRatio = bullets.length ? clamp((strong.length - weak.length) / bullets.length, 0, 1) : 0
  add('verbs', 'Strong action verbs', 10 * clamp(vRatio / 0.6, 0, 1), 10,
    bullets.length ? `${strong.length} of ${bullets.length} bullets start with an action verb.` : 'No experience bullets to check.',
    'Start each bullet with a verb such as Led, Built, Reduced or Delivered.')
  if (weak.length) {
    suggestions.push({ id: 'weak', type: 'advice', title: 'Replace weak openers', detail: 'Swap phrases like "Responsible for" or "Worked on" for a verb that shows what you did:', items: weak.slice(0, 3).map((b) => b.text) })
  }

  // 6. Length and structure (10)
  const wc = wordCount(text)
  let lenPts = 0
  if (wc >= 350 && wc <= 900) lenPts = 7
  else if ((wc >= 200 && wc < 350) || (wc > 900 && wc <= 1200)) lenPts = 4
  else lenPts = 1
  const hasDates = (model.experience || []).every((e) => e.start || e.end) && (model.experience?.length || 0) > 0
  lenPts += hasDates ? 3 : (model.experience?.length ? 0 : 1)
  add('structure', 'Length and dates', lenPts, 10,
    `${wc} words${hasDates ? ', and every role has dates.' : (model.experience?.length ? ', but some roles have no dates.' : '.')}`,
    wc < 350 ? 'Add detail: aim for 350 to 900 words.' : wc > 900 ? 'Trim it: aim for 900 words or fewer.' : 'Add start and end dates to every role.')

  // 7. Readability (5)
  const lens = bullets.map((b) => wordCount(b.text))
  const avg = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0
  const readPts = !lens.length ? 0 : avg >= 8 && avg <= 28 ? 5 : avg >= 5 && avg <= 38 ? 3 : 1
  add('readability', 'Bullet length', readPts, 5,
    lens.length ? `Your bullets average ${Math.round(avg)} words.` : 'No bullets to check.',
    'Keep bullets to one or two lines: about 10 to 25 words.')

  const score = Math.round(checks.reduce((n, c) => n + c.points, 0))
  return { score: clamp(score, 0, 100), label: scoreLabel(score), checks, keywords: { matched, missing }, suggestions }
}

// Apply one suggestion to a model. `selected` is the list of ticked items for add_skills.
export function applySuggestion(model, suggestion, selected = []) {
  const m = JSON.parse(JSON.stringify(model))
  if (suggestion.type === 'add_skills') {
    const have = new Set((m.skills || []).map((s) => s.toLowerCase()))
    for (const s of selected) if (!have.has(s.toLowerCase())) m.skills.push(s)
  } else if (suggestion.type === 'set_headline') m.headline = suggestion.value
  else if (suggestion.type === 'set_summary') m.summary = suggestion.value
  return m
}
