// Every source the Discover page knows about.
//   kind 'api'  : jobs are fetched and shown in the results list.
//   kind 'link' : the site has no public job API (and blocks scraping). It is
//                 listed inside the Sources dropdown as an "opens site" entry
//                 that opens the site's own search in a new tab. It is never
//                 selectable, never part of "All", and never shows a note.
//                 Add any future feed-less source here with kind: 'link' and a
//                 case in buildSourceLink; nothing else needs to change.
export const SOURCES = [
  { key: 'adzuna', label: 'Adzuna', kind: 'api' },
  { key: 'lever', label: 'Lever', kind: 'api' },
  { key: 'greenhouse', label: 'Greenhouse', kind: 'api' },
  { key: 'remoteok', label: 'RemoteOK', kind: 'api' },
  { key: 'remotive', label: 'Remotive', kind: 'api' },
  { key: 'jobicy', label: 'Jobicy', kind: 'api' },
  { key: 'themuse', label: 'The Muse', kind: 'api' },
  { key: 'arbeitnow', label: 'Arbeitnow', kind: 'api' },
  { key: 'foundit', label: 'Foundit', kind: 'link' },
  { key: 'cutshort', label: 'Cutshort', kind: 'link' },
  { key: 'wellfound', label: 'Wellfound', kind: 'link' },
]

export const SOURCE_LABEL = Object.fromEntries(SOURCES.map((s) => [s.key, s.label]))
export const API_SOURCE_KEYS = SOURCES.filter((s) => s.kind === 'api').map((s) => s.key)
export const LINK_SOURCES = SOURCES.filter((s) => s.kind === 'link')

// Search URL on each link-out site for the given title and country.
export function buildSourceLink(key, { title = '', country = '' } = {}) {
  const q = encodeURIComponent(title.trim())
  const slug = (t) => t.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  switch (key) {
    case 'foundit':
      return q
        ? `https://www.foundit.in/srp/results?query=${q}${country ? `&locations=${encodeURIComponent(country)}` : ''}`
        : 'https://www.foundit.in/'
    case 'cutshort':
      return q ? `https://cutshort.io/jobs?query=${q}` : 'https://cutshort.io/jobs'
    case 'wellfound':
      return title.trim() ? `https://wellfound.com/role/${slug(title)}` : 'https://wellfound.com/jobs'
    default:
      return ''
  }
}
