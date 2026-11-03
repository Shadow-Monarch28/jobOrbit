// Social and portfolio links on a resume. Each one has a name people see
// ("LinkedIn") and a web address. Older resumes stored plain strings; this
// accepts both.
const KNOWN = [
  [/linkedin\.com/i, 'LinkedIn'], [/github\.com/i, 'GitHub'], [/gitlab\.com/i, 'GitLab'], [/behance\.net/i, 'Behance'],
  [/dribbble\.com/i, 'Dribbble'], [/twitter\.com|x\.com/i, 'X'], [/medium\.com/i, 'Medium'], [/kaggle\.com/i, 'Kaggle'],
  [/leetcode\.com/i, 'LeetCode'], [/hackerrank\.com/i, 'HackerRank'], [/stackoverflow\.com/i, 'Stack Overflow'], [/youtube\.com|youtu\.be/i, 'YouTube'],
  [/instagram\.com/i, 'Instagram'], [/facebook\.com/i, 'Facebook'], [/tableau\.com/i, 'Tableau Public'], [/notion\.(so|site)/i, 'Notion'],
]
let n = 0
const id = () => `l${Date.now().toString(36)}${(n++).toString(36)}`

export function linkLabel(url) {
  const u = String(url || '').trim()
  for (const [re, name] of KNOWN) if (re.test(u)) return name
  return u ? 'Portfolio' : ''
}

export function normalizeLink(x) {
  if (x && typeof x === 'object') return { id: x.id || id(), label: String(x.label ?? '').trim() || linkLabel(x.url), url: String(x.url ?? '').trim() }
  const url = String(x ?? '').trim()
  return { id: id(), label: linkLabel(url), url }
}

export const normalizeLinks = (list) => (Array.isArray(list) ? list : []).map(normalizeLink).filter((l) => l.url || l.label)
export const linkItems = (list) => normalizeLinks(list).filter((l) => l.label || l.url).map((l) => ({ ...l, label: l.label || l.url }))
export const newLink = () => ({ id: id(), label: '', url: '' })
export const linkHref = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`)
