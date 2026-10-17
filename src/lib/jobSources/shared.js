// Every job source service returns objects in this exact shape, so the
// Search UI never needs to know which source a job came from.
//
// {
//   id: string            // globally unique, e.g. "remoteok-12345"
//   source: string        // 'adzuna' | 'lever' | 'remoteok' | 'arbeitnow'
//   sourceId: string
//   title: string
//   company: string
//   location: string      // human-readable, e.g. "Bengaluru, India"
//   url: string           // real external apply/detail link
//   description: string
//   tags: string[]
//   postedAt: string | null   // ISO date, or null if unknown
//   workplace: 'remote' | 'hybrid' | 'onsite' | 'unspecified'
//   country: string | null
//   salary: string | null
// }

export function edgeFunctionUrl(path) {
  const base = import.meta.env.VITE_SUPABASE_URL
  return `${base}/functions/v1/${path}`
}

// Strips HTML tags and decodes a handful of common entities, so every
// source's description ends up as clean plain text regardless of whether
// the raw API returned HTML or plain text.
export function stripHtml(input) {
  if (!input) return ''
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

// --- Best-effort derived fields ---
// None of the 4 sources consistently expose job type / experience level /
// industry as clean structured data, so these are inferred from whatever
// tags/title text is available. They're genuinely computed (not fake), but
// they're estimates, not authoritative fields — surfaced in the UI as such.

const JOB_TYPE_KEYWORDS = [
  { type: 'Internship', match: ['intern', 'internship'] },
  { type: 'Part-time', match: ['part-time', 'part time', 'parttime'] },
  { type: 'Contract', match: ['contract', 'contractor', 'freelance'] },
  { type: 'Temporary', match: ['temporary', 'temp'] },
  { type: 'Full-time', match: ['full-time', 'full time', 'fulltime'] },
]

export function deriveJobType(tags = [], title = '') {
  const haystack = [...tags, title].join(' ').toLowerCase()
  for (const { type, match } of JOB_TYPE_KEYWORDS) {
    if (match.some((kw) => haystack.includes(kw))) return type
  }
  return 'Unspecified'
}

const SENIOR_KEYWORDS = ['senior', 'sr.', 'lead', 'principal', 'staff', 'head of', 'director', 'chief']
const ENTRY_KEYWORDS = ['intern', 'junior', 'jr.', 'entry', 'graduate', 'trainee']

export function deriveExperienceLevel(title = '', tags = []) {
  const haystack = `${title} ${tags.join(' ')}`.toLowerCase()
  if (SENIOR_KEYWORDS.some((kw) => haystack.includes(kw))) return 'Senior'
  if (ENTRY_KEYWORDS.some((kw) => haystack.includes(kw))) return 'Entry-level'
  return 'Mid-level'
}

const INDUSTRY_KEYWORDS = [
  'fintech', 'healthcare', 'health', 'ecommerce', 'e-commerce', 'education', 'edtech',
  'gaming', 'crypto', 'blockchain', 'ai', 'marketing', 'logistics', 'saas',
  'insurance', 'real estate', 'media', 'security', 'cybersecurity',
]

export function deriveIndustryFromTags(tags = []) {
  const haystack = tags.join(' ').toLowerCase()
  const found = INDUSTRY_KEYWORDS.find((kw) => haystack.includes(kw))
  return found ? found.replace(/\b\w/g, (c) => c.toUpperCase()) : null
}
