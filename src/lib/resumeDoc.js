// Turns the resume / letter model into a neutral document description that
// both the on-screen preview and the PDF renderer draw, so they always agree.
import { sectionOrder } from './resumeTemplates'

export const SIDE_KEYS = ['skills', 'education', 'certifications']

const clean = (s) => String(s || '').trim()

export function contactLines(model) {
  const c = model.contact || {}
  return [c.email, c.phone, c.location, ...(c.links || [])].map(clean).filter(Boolean)
}

function sectionItems(key, m) {
  switch (key) {
    case 'summary':
      return clean(m.summary) ? { heading: 'Summary', items: [{ t: 'para', text: clean(m.summary) }] } : null
    case 'experience': {
      const items = (m.experience || [])
        .filter((e) => clean(e.title) || clean(e.org) || (e.bullets || []).some(clean))
        .map((e) => ({
          t: 'entry', title: clean(e.title) || clean(e.org),
          sub: [clean(e.title) ? clean(e.org) : '', clean(e.location)].filter(Boolean).join(' · '),
          meta: [clean(e.start), clean(e.end)].filter(Boolean).join(' – '),
          bullets: (e.bullets || []).map(clean).filter(Boolean),
        }))
      return items.length ? { heading: 'Experience', items } : null
    }
    case 'projects': {
      const items = (m.projects || [])
        .filter((p) => clean(p.name) || (p.bullets || []).some(clean))
        .map((p) => ({ t: 'entry', title: clean(p.name), sub: clean(p.link), meta: '', bullets: (p.bullets || []).map(clean).filter(Boolean) }))
      return items.length ? { heading: 'Projects', items } : null
    }
    case 'education': {
      const items = (m.education || [])
        .filter((e) => clean(e.degree) || clean(e.school))
        .map((e) => ({ t: 'entry', title: clean(e.degree) || clean(e.school), sub: [clean(e.degree) ? clean(e.school) : '', clean(e.location)].filter(Boolean).join(' · '), meta: clean(e.year), bullets: clean(e.detail) ? [clean(e.detail)] : [] }))
      return items.length ? { heading: 'Education', items } : null
    }
    case 'skills': {
      const list = (m.skills || []).map(clean).filter(Boolean)
      return list.length ? { heading: 'Skills', items: [{ t: 'tags', list }] } : null
    }
    case 'certifications': {
      const list = (m.certifications || []).map(clean).filter(Boolean)
      return list.length ? { heading: 'Certifications', items: [{ t: 'bullets', list }] } : null
    }
    case 'extra':
      return (m.extra || []).filter((x) => clean(x.heading) && (x.lines || []).some(clean)).map((x) => ({ heading: clean(x.heading), items: [{ t: 'bullets', list: x.lines.map(clean).filter(Boolean) }] }))
    default:
      return null
  }
}

// A sidebar needs to stay on one page, so very full resumes fall back to one column.
export function effectiveLayout(model, template) {
  if (template.layout !== 'sidebar') return template.layout
  const side = (model.skills?.length || 0) + (model.education?.length || 0) * 3 + (model.certifications?.length || 0) * 2
  return side > 34 ? 'single' : 'sidebar'
}

export function buildResumeDoc(model, template) {
  const layout = effectiveLayout(model, template)
  const sections = []
  for (const key of sectionOrder(template)) {
    const s = sectionItems(key, model)
    for (const sec of [].concat(s || [])) sections.push({ key, ...sec })
  }
  const side = layout === 'sidebar' ? sections.filter((s) => SIDE_KEYS.includes(s.key)) : []
  const main = layout === 'sidebar' ? sections.filter((s) => !SIDE_KEYS.includes(s.key)) : sections
  return { layout, name: clean(model.name) || 'Your Name', headline: clean(model.headline), contact: contactLines(model), main, side }
}

export function buildCoverDoc(letter) {
  const c = letter.contact || {}
  return {
    name: clean(letter.name) || 'Your Name',
    contact: [c.email, c.phone, c.location].map(clean).filter(Boolean),
    date: clean(letter.date),
    recipientLines: [clean(letter.recipient), clean(letter.company)].filter(Boolean),
    subject: clean(letter.role) ? `Application for ${clean(letter.role)}` : '',
    salutation: clean(letter.recipient) ? `Dear ${clean(letter.recipient)},` : 'Hello,',
    paragraphs: (letter.paragraphs || []).map(clean).filter(Boolean),
    closing: clean(letter.closing) || 'Sincerely,',
  }
}

export const FONT_STACK = {
  sans: 'Helvetica, Arial, sans-serif',
  serif: '"Times New Roman", Times, Georgia, serif',
  mono: '"Courier New", Courier, monospace',
}
