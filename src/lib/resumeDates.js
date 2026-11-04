// Month-and-year helpers for resume dates. Dates are stored as readable text
// ("Jul 2024") so older resumes keep working; the editor uses month pickers
// ("2024-07") and these functions convert between the two.
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const PRESENT = /^(present|current|currently|now|ongoing|till date|to date)$/i

export const isPresent = (t) => PRESENT.test(String(t || '').trim())

// -> { y, m } (m is 1-12, or null when only a year is known) or null.
export function parseMonthYear(text) {
  const t = String(text || '').trim()
  if (!t) return null
  let m = /^(\d{4})-(\d{1,2})$/.exec(t)
  if (m) return { y: +m[1], m: +m[2] }
  m = /^(\d{1,2})[/.-](\d{4})$/.exec(t)
  if (m) return { y: +m[2], m: +m[1] }
  m = /^([a-z]{3,9})\.?[\s,/-]*(\d{4})$/i.exec(t)
  if (m) {
    const idx = MONTHS.findIndex((x) => m[1].toLowerCase().startsWith(x.toLowerCase()))
    if (idx >= 0) return { y: +m[2], m: idx + 1 }
  }
  m = /^(\d{4})$/.exec(t)
  if (m) return { y: +m[1], m: null }
  return null
}

// Value for <input type="month">: only when the month is really known.
export function toMonthInput(text) {
  const p = parseMonthYear(text)
  return p && p.m ? `${p.y}-${String(p.m).padStart(2, '0')}` : ''
}

// "2024-07" -> "Jul 2024"
export function fromMonthInput(value) {
  const p = parseMonthYear(value)
  return p && p.m ? `${MONTHS[p.m - 1]} ${p.y}` : ''
}

// The end shown on the resume: "Present" while the job is current.
export const experienceEnd = (e) => (e?.current || isPresent(e?.end) ? 'Present' : String(e?.end || '').trim())
export const experiencePeriod = (e) => [String(e?.start || '').trim(), experienceEnd(e)].filter(Boolean).join(' – ')

// "Jul 2021 – Jun 2024". Falls back to the older single "year" text.
export function educationPeriod(e) {
  const start = String(e?.start || '').trim()
  const end = e?.current || isPresent(e?.end) ? 'Present' : String(e?.end || '').trim()
  const joined = [start, end].filter(Boolean).join(' – ')
  return joined || String(e?.year || '').trim()
}

// "2021 - 2024" / "Jul 2021 – Present" -> { start, end }
export function splitPeriod(text) {
  // "May-2021" is one date, so a plain hyphen only splits when it has spaces around it
  // or sits between two bare years ("2021-2024").
  const t = String(text || '').replace(/\b([A-Za-z]{3,9})\.?[-/](\d{4})\b/g, '$1 $2').trim()
  const parts = t.split(/\s*(?:–|—|\bto\b|\s-\s|(?<=\d{4})-(?=\d{4}|present|current))\s*/i).map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) return { start: '', end: '' }
  if (parts.length === 1) return { start: '', end: parts[0] }
  return { start: parts[0], end: parts[1] }
}
