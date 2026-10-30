import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { categorizeSkill, CATEGORY_ORDER } from './skillCategories'

// ---------- 1. pdf.js text items -> physical lines ----------

// pdf.js returns text as small positioned chunks. Group chunks that share a
// baseline (y) into one line, left to right, inserting a space only where
// there's a real visual gap. Pure function so it can be tested without a
// browser; resumeExtract.js feeds it real pdf.js output.
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
    .sort((a, b) => (Math.abs(b.y - a.y) > 2.5 ? b.y - a.y : a.x - b.x))

  const rows = []
  for (const c of chunks) {
    const row = rows[rows.length - 1]
    if (row && Math.abs(row.y - c.y) <= 2.5) row.chunks.push(c)
    else rows.push({ y: c.y, chunks: [c] })
  }

  const lines = []
  for (const row of rows) {
    row.chunks.sort((a, b) => a.x - b.x)
    let text = ''
    let prevEnd = null
    let size = 0
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
    text = text.replace(/\s+/g, ' ').trim()
    if (text) lines.push({ text, size })
  }
  return lines
}

// ---------- 2. lines -> sections ----------

const KNOWN_HEADING =
  /^(professional\s+|career\s+|technical\s+|key\s+)?(summary|profile|objective|experience|work experience|employment( history)?|education|projects?|skills?|core competencies|certifications?|achievements?|awards?|publications?|languages|interests|references|volunteer(ing)?( experience)?|internships?|training|courses)\s*:?$/i
const SKILLS_HEADING = /^(technical\s+|key\s+|core\s+|professional\s+)?(skills?( summary| & .*)?|core competencies|technologies|competencies)\s*:?$/i
const BULLET_RE = /^\s*([•▪●◦‣■□*]|[-–]\s|[-])\s*/
const INSERT_BEFORE = /experience|education|project|employment|work/i

function bodySizeOf(lines) {
  const sizes = lines.map((l) => l.size).filter(Boolean).sort((a, b) => a - b)
  return sizes.length ? sizes[Math.floor(sizes.length / 2)] : 0
}

function isHeading(line, bodySize) {
  const t = line.text.trim()
  if (!t || t.length > 40 || BULLET_RE.test(line.text)) return false
  if (KNOWN_HEADING.test(t)) return true
  const caps = /^[A-Z][A-Z0-9 &/,\-]{2,}$/.test(t)
  const bigger = bodySize > 0 && line.size > bodySize * 1.15
  return caps || (bigger && !/[.,;]$/.test(t))
}

export function parseSections(lines) {
  const body = bodySizeOf(lines)
  const nameLine = lines[0] ?? { text: '' }
  const header = []
  const sections = []
  let current = null
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (isHeading(line, body)) {
      current = { heading: line.text.trim().replace(/:$/, ''), lines: [] }
      sections.push(current)
    } else if (current) current.lines.push(line.text)
    else header.push(line.text)
  }
  return { name: nameLine.text, header, sections }
}

// ---------- 3. skills section ----------

export function splitSkillItems(bodyLines) {
  const items = []
  for (const raw of bodyLines) {
    const text = raw.replace(BULLET_RE, '')
    // A line can hold several labelled groups: "Languages: SQL, Python | Tools: Excel".
    // Split into groups first, then strip each group's own "Label:" prefix.
    for (const segment of text.split(/[|;•·\u2022]|\s{3,}/)) {
      const colon = segment.indexOf(':')
      const values = colon > 0 && colon <= 30 ? segment.slice(colon + 1) : segment
      for (const part of values.split(',')) {
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
