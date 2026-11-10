// Every source the Discover page knows about.
//   kind 'api'  : jobs are fetched and shown in the results list.
//   kind 'link' : the site has no public job API (and blocks scraping). These
//                 are shown ONLY to the admin account, as "opens site" entries at
//                 the bottom of the Sources dropdown. Regular users never see them
//                 and no note is ever shown. Add a future feed-less source here with
//                 kind: 'link' and a case in buildSourceLink.
export const SOURCES = [
  { key: 'adzuna', label: 'Adzuna', kind: 'api' },
  { key: 'lever', label: 'Lever', kind: 'api' },
  { key: 'greenhouse', label: 'Greenhouse', kind: 'api' },
  { key: 'remoteok', label: 'RemoteOK', kind: 'api' },
  { key: 'remotive', label: 'Remotive', kind: 'api' },
  { key: 'jobicy', label: 'Jobicy', kind: 'api' },
  { key: 'jooble', label: 'Jooble', kind: 'api' },
  { key: 'themuse', label: 'The Muse', kind: 'api' },
  { key: 'foundit', label: 'Foundit', kind: 'link' },
  { key: 'cutshort', label: 'Cutshort', kind: 'link' },
  { key: 'wellfound', label: 'Wellfound', kind: 'link' },
  { key: 'naukri', label: 'Naukri', kind: 'link' },
  { key: 'indeed', label: 'Indeed', kind: 'link' },
  { key: 'linkedin', label: 'LinkedIn Jobs', kind: 'link' },
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
    case 'naukri':
      return title.trim() ? `https://www.naukri.com/${slug(title)}-jobs` : 'https://www.naukri.com/'
    case 'indeed':
      return q ? `https://www.indeed.com/jobs?q=${q}${country ? `&l=${encodeURIComponent(country)}` : ''}` : 'https://www.indeed.com/'
    case 'linkedin':
      return q ? `https://www.linkedin.com/jobs/search/?keywords=${q}${country ? `&location=${encodeURIComponent(country)}` : ''}` : 'https://www.linkedin.com/jobs/'
    default:
      return ''
  }
}
