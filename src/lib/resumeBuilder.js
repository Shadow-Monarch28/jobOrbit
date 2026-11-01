import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { categorizeSkill, CATEGORY_ORDER } from './skillCategories'
import { SKILL_SUGGESTIONS } from './data/skills'

const SKILL_WORDS = new Set(SKILL_SUGGESTIONS.map((x) => x.toLowerCase()))

// ---------- 1. pdf.js text items -> physical lines ----------

// pdf.js returns text as small positioned chunks. This groups them into lines
// in reading order. Two things make real resumes hard, and both are handled:
//  - Two-column layouts (a sidebar next to the main column). Chunks on the same
//    baseline but in different columns must NOT be glued into one line, or the
//    sidebar's contact details end up inside the job history. The page is split
//    at the empty vertical gutter and each column is read top to bottom.
//  - Letter-spaced headings ("W O R K   E X P E R I E N C E"), which pdf.js
//    delivers one character at a time.
// Pure function, so it can be tested without a browser.

const HEADING_WORDS = [
  'work', 'experience', 'professional', 'summary', 'profile', 'objective', 'education', 'skills', 'skill', 'technical',
  'projects', 'project', 'certifications', 'certification', 'achievements', 'awards', 'personal', 'details', 'contact',
  'languages', 'interests', 'references', 'employment', 'history', 'career', 'core', 'competencies', 'internship',
  'internships', 'training', 'courses', 'volunteer', 'key', 'and', 'academic', 'qualifications', 'publications', 'hobbies',
  'strengths', 'tools', 'technologies', 'about', 'me', 'information', 'licenses', 'honors', 'extracurricular', 'activities',
  'additional', 'relevant', 'selected', 'research', 'leadership', 'declaration', 'software', 'of', 'in', 'my',
]

// "WORKEXPERIENCE" -> "WORK EXPERIENCE" when it splits cleanly into known heading words.
export function respaceHeading(text) {
  const t = String(text || '').trim()
  if (!t || /\s/.test(t) || t.length < 6 || t.length > 40) return t
  const lower = t.toLowerCase()
  const best = new Array(lower.length + 1).fill(null)
  best[0] = []
  for (let i = 0; i < lower.length; i++) {
    if (!best[i]) continue
    for (const w of HEADING_WORDS) {
      if (lower.startsWith(w, i) && (!best[i + w.length] || best[i + w.length].length > best[i].length + 1)) best[i + w.length] = [...best[i], w]
    }
  }
  const words = best[lower.length]
  if (!words || words.length < 2) return t
  let pos = 0
  return words.map((w) => { const part = t.slice(pos, pos + w.length); pos += w.length; return part }).join(' ')
}

// Cleans a heading that was stored letter by letter ("S K I L L S", "W O R K E X P E R I E N C E").
export function cleanHeading(text) {
  let t = String(text || '').replace(/\s+/g, ' ').trim()
  const tokens = t.split(' ')
  if (tokens.length >= 4 && tokens.filter((x) => x.length === 1).length / tokens.length >= 0.8) t = tokens.join('')
  t = respaceHeading(t)
  // Short single words in capitals (IBM, AWS, CFA) are acronyms: keep them as written.
  if (t === t.toUpperCase() && /[A-Z]{3}/.test(t) && !(t.length <= 4 && !t.includes(' '))) t = t.toLowerCase().replace(/(^|[\s&/-])([a-z])/g, (m, a, b) => a + b.toUpperCase())
  return t
}

function buildLines(chunks) {
  const sorted = [...chunks].sort((a, b) => (Math.abs(b.y - a.y) > 2.5 ? b.y - a.y : a.x - b.x))
  const rows = []
  for (const c of sorted) {
    const row = rows[rows.length - 1]
    if (row && Math.abs(row.y - c.y) <= 2.5) row.chunks.push(c)
    else rows.push({ y: c.y, chunks: [c] })
  }

  const lines = []
  for (const row of rows) {
    row.chunks.sort((a, b) => a.x - b.x)
    const letterSpaced = row.chunks.length >= 4 && row.chunks.filter((c) => c.str.trim().length === 1).length / row.chunks.length >= 0.7
    let text = ''
    let size = 0
    if (letterSpaced) {
      const gaps = []
      for (let i = 1; i < row.chunks.length; i++) gaps.push(row.chunks[i].x - (row.chunks[i - 1].x + row.chunks[i - 1].w))
      const sortedGaps = gaps.filter((g) => g > 0).sort((a, b) => a - b)
      const median = sortedGaps.length ? sortedGaps[Math.floor(sortedGaps.length / 2)] : 0
      let brk = false
      row.chunks.forEach((c, i) => {
        size = Math.max(size, c.size)
        if (c.str.trim() === '') { brk = true; return }
        if (i > 0 && median > 0 && gaps[i - 1] > Math.max(median * 2, c.size * 0.55)) brk = true
        text += (brk && text ? ' ' : '') + c.str.trim()
        brk = false
      })
      text = respaceHeading(text)
    } else {
      let prevEnd = null
      for (const c of row.chunks) {
        size = Math.max(size, c.size)
        if (prevEnd !== null) {
          const gap = c.x - prevEnd
          const needsSpace = gap > c.size * 0.15 && !text.endsWith(' ') && !c.str.startsWith(' ')
          if (needsSpace) text += ' '
        }
        text += c.str
        prevEnd = c.x + c.w
      }
    }
    text = text.replace(/\s+/g, ' ').replace(/\s+([,;:.)])/g, '$1').replace(/\(\s+/g, '(').trim()
    if (text) {
      const first = row.chunks[0]
      const last = row.chunks[row.chunks.length - 1]
      lines.push({ text, size, y: row.y, x0: first.x, x1: last.x + last.w })
    }
  }
  return mergeWrapped(lines)
}

// A line that ran to the right edge of its column and continues on the next line
// ("Advanced Data Analyst using" / "Python & MS Excel") is one line, not two.
function mergeWrapped(lines) {
  if (lines.length < 2) return lines
  const right = Math.max(...lines.map((l) => l.x1))
  const left = Math.min(...lines.map((l) => l.x0))
  const width = right - left
  if (width < 60) return lines
  const out = []
  for (const line of lines) {
    const prev = out[out.length - 1]
    const startsNewItem = /^\s*([•▪●◦‣■□*]|[-–]\s)/.test(line.text)
    const tight = prev && prev.y - line.y > 0 && prev.y - line.y <= Math.max(prev.size, line.size) * 1.55
    const sameSize = prev && Math.abs(prev.size - line.size) < 0.6
    const aligned = prev && Math.abs(prev.x0 - line.x0) <= 3
    // The previous line is "full" if the next word would not have fitted after it.
    const firstWord = prev ? line.text.split(' ')[0] : ''
    const nextWordW = prev ? ((line.x1 - line.x0) * firstWord.length) / Math.max(line.text.length, 1) : 0
    const reachedEdge = prev && prev.x1 + nextWordW + prev.size * 0.3 >= right - 2
    const ended = prev && /[.:;!?]$/.test(prev.text)
    const shouting = prev && /^[A-Z0-9 &/,-]{4,}$/.test(prev.text)
    // Wording that cannot end a line, or a continuation that cannot start one.
    const open = prev && (prev.text.match(/\(/g) || []).length > (prev.text.match(/\)/g) || []).length
    const signals = prev && (open || /[,(&]$|\b(using|and|of|with|in|for|to|the|a|an|by|on|at|from|or)$/i.test(prev.text) || /^[a-z)]/.test(line.text))
    const tail = line.text.trim().split(/\s+/).length <= 2 && !/\d/.test(line.text)
    if (prev && tight && sameSize && aligned && !ended && !shouting && !startsNewItem && (signals || (reachedEdge && tail))) {
      prev.text = `${prev.text} ${line.text}`
      prev.x1 = line.x1
      prev.y = line.y
    } else out.push({ ...line })
  }
  return out
}

// Finds the vertical gutter between two columns, or null for a single column.
export function findGutter(chunks) {
  if (chunks.length < 16) return null
  const minX = Math.min(...chunks.map((c) => c.x))
  const maxX = Math.max(...chunks.map((c) => c.x + c.w))
  const width = maxX - minX
  if (width < 220) return null
  const limit = Math.max(3, Math.floor(chunks.length * 0.07))
  let best = null
  let run = null
  const step = 3
  for (let x = minX + width * 0.18; x <= minX + width * 0.82; x += step) {
    const crossing = chunks.reduce((n, c) => n + (c.x < x && c.x + c.w > x ? 1 : 0), 0)
    if (crossing <= limit) {
      if (!run) run = { from: x, to: x }
      run.to = x
    } else if (run) {
      if (!best || run.to - run.from > best.to - best.from) best = run
      run = null
    }
  }
  if (run && (!best || run.to - run.from > best.to - best.from)) best = run
  if (!best || best.to - best.from < 7) return null
  const gutter = (best.from + best.to) / 2
  const left = chunks.filter((c) => c.x < gutter)
  const right = chunks.filter((c) => c.x >= gutter)
  const rowsOf = (list) => new Set(list.map((c) => Math.round(c.y / 3))).size
  const share = Math.min(left.length, right.length) / chunks.length
  if (share < 0.12 || rowsOf(left) < 4 || rowsOf(right) < 4) return null
  return gutter
}

function splitColumns(chunks) {
  const gutter = findGutter(chunks)
  if (gutter === null) return [chunks]
  const yMax = Math.max(...chunks.map((c) => c.y))
  const yMin = Math.min(...chunks.map((c) => c.y))
  // A banner (usually the name) that runs across both columns at the top is read first.
  const crossing = chunks.filter((c) => c.x < gutter && c.x + c.w > gutter && c.y >= yMax - (yMax - yMin) * 0.3)
  const bandBottom = crossing.length ? Math.min(...crossing.map((c) => c.y)) - 2.5 : Infinity
  const band = chunks.filter((c) => c.y >= bandBottom)
  const rest = chunks.filter((c) => c.y < bandBottom)
  const left = rest.filter((c) => c.x < gutter)
  const right = rest.filter((c) => c.x >= gutter)
  const biggest = (list) => list.reduce((m, c) => Math.max(m, c.size), 0)
  // Without a banner, the column holding the largest text (the name) comes first.
  const cols = band.length === 0 && biggest(right) > biggest(left) * 1.15 ? [right, left] : [left, right]
  return [band, ...cols].filter((c) => c.length)
}

export function groupItemsIntoLines(items) {
  const chunks = items
    .filter((it) => typeof it.str === 'string' && it.str.length > 0)
    .map((it) => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      w: it.width || 0,
      size: Math.abs(it.height || it.transform[3] || 0),
    }))
  return splitColumns(chunks).flatMap(buildLines)
}

// ---------- 2. lines -> sections ----------

const KNOWN_HEADING =
  /^(professional\s+|career\s+|technical\s+|key\s+)?(summary|profile|objective|experience|work experience|employment( history)?|education( and training)?|academic( background| qualifications)?|projects?|skills?|core competencies|certifications?( and awards)?|achievements?|awards?|publications?|languages|interests|hobbies|references|volunteer(ing)?( experience)?|internships?|training|courses|contact( details| information)?|personal( details| information)?|about me)\s*:?$/i
const SKILLS_HEADING = /^(technical\s+|key\s+|core\s+|professional\s+)?(skills?( summary| & .*)?|core competencies|technologies|competencies)\s*:?$/i
const BULLET_RE = /^\s*([•▪●◦‣■□*]|[-–]\s|[-])\s*/
const INSERT_BEFORE = /experience|education|project|employment|work/i

function bodySizeOf(lines) {
  const sizes = lines.map((l) => l.size).filter(Boolean).sort((a, b) => a - b)
  return sizes.length ? sizes[Math.floor(sizes.length / 2)] : 0
}

// Size of the lines that are clearly section headings (WORK EXPERIENCE, SKILLS ...).
function headingSizeOf(lines) {
  const sizes = lines
    .filter((l) => l.size && l.text.length <= 40 && (KNOWN_HEADING.test(cleanHeading(l.text.trim().replace(/:$/, ''))) || KNOWN_HEADING.test(l.text.trim())))
    .map((l) => l.size)
    .sort((a, b) => a - b)
  return sizes.length ? sizes[Math.floor(sizes.length / 2)] : 0
}

function isHeading(line, bodySize, headSize = 0) {
  const raw = line.text.trim()
  if (!raw || raw.length > 40 || BULLET_RE.test(line.text)) return false
  const t = cleanHeading(raw) === raw ? raw : respaceHeading(raw)
  if (KNOWN_HEADING.test(t) || KNOWN_HEADING.test(raw)) return true
  if (SKILL_WORDS.has(raw.toLowerCase())) return false // "SQL", "EXCEL" in a skills list, not a heading
  // Once real headings are known, an unknown line only counts as one if it is as big
  // as them. An issuer name like "IBM" or "Google" under Certifications is smaller.
  if (headSize && line.size && line.size < headSize * 0.92) return false
  const caps = /^[A-Z][A-Z0-9 &/,\-]{3,}$/.test(t)
  const bigger = bodySize > 0 && line.size > bodySize * 1.15
  return caps || (bigger && !/[.,;]$/.test(t))
}

export function parseSections(lines) {
  const body = bodySizeOf(lines)
  const headSize = headingSizeOf(lines)
  const nameLine = lines[0] ?? { text: '' }
  const header = []
  const sections = []
  let current = null
  let seenKnown = false
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const raw = line.text.trim().replace(/:$/, '')
    const known = KNOWN_HEADING.test(cleanHeading(raw)) || KNOWN_HEADING.test(raw)
    // Until a real section heading has appeared, the first few lines under the name
    // (a job title, tagline, contact line) are header text, never headings.
    const guarded = !seenKnown && !known && i <= 3
    if (!guarded && isHeading(line, body, headSize)) {
      if (known) seenKnown = true
      current = { heading: cleanHeading(line.text.trim().replace(/:$/, '')), lines: [] }
      sections.push(current)
    } else if (current) current.lines.push(line.text)
    else header.push(line.text)
  }
  return { name: nameLine.text, header, sections }
}

// ---------- 3. skills section ----------

// Splits on commas that are not inside brackets: "Python (Pandas, NumPy), SQL" -> 2 items.
export function splitOutsideParens(text) {
  const out = []
  let depth = 0
  let cur = ''
  for (const ch of String(text)) {
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1)
    if (ch === ',' && depth === 0) { out.push(cur); cur = '' } else cur += ch
  }
  out.push(cur)
  return out
}

export function splitSkillItems(bodyLines) {
  const items = []
  for (const raw of bodyLines) {
    const text = raw.replace(BULLET_RE, '')
    // A line can hold several labelled groups: "Languages: SQL, Python | Tools: Excel".
    // Split into groups first, then strip each group's own "Label:" prefix.
    for (const segment of text.split(/[|;•·\u2022]|\s{3,}/)) {
      const colon = segment.indexOf(':')
      const values = colon > 0 && colon <= 30 ? segment.slice(colon + 1) : segment
      for (const part of splitOutsideParens(values)) {
        const item = part.trim().replace(/[.:]+$/, '')
        if (item && item.length <= 40) items.push(item)
      }
    }
  }
  return items
}

function uniqueCI(list) {
  const seen = new Set()
  return list.filter((s) => {
    const k = s.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export function categorizedSkillLines(skills) {
  const groups = new Map()
  for (const s of uniqueCI(skills)) {
    const cat = categorizeSkill(s)
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat).push(s)
  }
  return CATEGORY_ORDER.filter((c) => groups.has(c)).map((c) => ({
    label: c,
    text: groups.get(c).join(', '),
  }))
}

// Builds the document model for the rebuilt resume. Existing skills-section
// items are preserved (anything not in our vocabulary lands under "Other"),
// so nothing the person wrote is lost — it's regrouped, plus the new skills.
export function buildResumeModel(lines, newSkills, fallbackSkills = []) {
  const { name, header, sections } = parseSections(lines)
  const idx = sections.findIndex((s) => SKILLS_HEADING.test(s.heading))
  const existing = idx >= 0 ? splitSkillItems(sections[idx].lines) : fallbackSkills
  const skillLines = categorizedSkillLines([...existing, ...newSkills])
  const skillsSection = { heading: 'Skills', lines: skillLines }

  const out = [...sections]
  if (idx >= 0) out[idx] = skillsSection
  else {
    const at = out.findIndex((s) => INSERT_BEFORE.test(s.heading))
    if (at >= 0) out.splice(at, 0, skillsSection)
    else out.push(skillsSection)
  }
  return { name, header, sections: out }
}

export function modelToText(model) {
  const parts = [model.name, ...model.header]
  for (const s of model.sections) {
    parts.push(s.heading.toUpperCase())
    for (const l of s.lines) parts.push(typeof l === 'string' ? l : `${l.label}: ${l.text}`)
  }
  return parts.filter(Boolean).join('\n')
}

// ---------- 4. render ----------

export async function renderResumePdf(model) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const W = 595.28
  const H = 841.89
  const M = 50
  const maxW = W - M * 2
  const ink = rgb(0.1, 0.1, 0.12)
  const muted = rgb(0.35, 0.35, 0.4)

  const safeCache = new Map()
  const safe = (str) =>
    [...str.replace(BULLET_RE, '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"')]
      .map((ch) => {
        if (safeCache.has(ch)) return safeCache.get(ch)
        let out = ch
        try {
          font.encodeText(ch)
        } catch {
          out = '?'
        }
        safeCache.set(ch, out)
        return out
      })
      .join('')

  let page = pdf.addPage([W, H])
  let y = H - M

  const ensure = (needed) => {
    if (y - needed < M) {
      page = pdf.addPage([W, H])
      y = H - M
    }
  }

  const wrap = (text, f, size, width) => {
    const words = text.split(' ')
    const rows = []
    let cur = ''
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w
      if (f.widthOfTextAtSize(test, size) <= width || !cur) cur = test
      else {
        rows.push(cur)
        cur = w
      }
    }
    if (cur) rows.push(cur)
    return rows
  }

  const drawRows = (rows, f, size, x, color, lead) => {
    for (const r of rows) {
      ensure(lead)
      y -= lead
      page.drawText(r, { x, y, size, font: f, color })
    }
  }

  // Name + contact block
  drawRows(wrap(safe(model.name), bold, 18, maxW), bold, 18, M, ink, 22)
  for (const h of model.header) drawRows(wrap(safe(h), font, 9.5, maxW), font, 9.5, M, muted, 12.5)

  for (const section of model.sections) {
    y -= 10
    ensure(34)
    y -= 13
    page.drawText(safe(section.heading).toUpperCase(), { x: M, y, size: 11.5, font: bold, color: ink })
    y -= 4
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: muted })
    y -= 2

    for (const l of section.lines) {
      if (typeof l !== 'string') {
        // "Category: a, b, c" — bold label, wrapped value with hanging indent
        const label = `${safe(l.label)}: `
        const lw = bold.widthOfTextAtSize(label, 10) + 3
        const rows = wrap(safe(l.text), font, 10, maxW - lw)
        ensure(14)
        y -= 14
        page.drawText(label, { x: M, y, size: 10, font: bold, color: ink })
        page.drawText(rows[0] ?? '', { x: M + lw, y, size: 10, font, color: ink })
        drawRows(rows.slice(1), font, 10, M + lw, ink, 13)
        continue
      }
      const isBullet = BULLET_RE.test(l)
      const text = safe(l)
      if (isBullet) {
        const rows = wrap(text, font, 10, maxW - 14)
        ensure(13)
        y -= 13
        page.drawText('-', { x: M + 3, y, size: 10, font, color: ink })
        page.drawText(rows[0] ?? '', { x: M + 14, y, size: 10, font, color: ink })
        drawRows(rows.slice(1), font, 10, M + 14, ink, 13)
      } else {
        drawRows(wrap(text, font, 10, maxW), font, 10, M, ink, 13)
      }
    }
  }

  return pdf.save()
}
