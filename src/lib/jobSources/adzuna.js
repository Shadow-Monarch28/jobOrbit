import { edgeFunctionUrl, deriveJobType, deriveExperienceLevel } from './shared'

// Adzuna is split by country site. When the chosen place is one of its
// countries we query that site directly instead of text-matching the name.
const ADZUNA_COUNTRIES = {
  'united kingdom': 'gb', 'united states': 'us', austria: 'at', australia: 'au', belgium: 'be',
  brazil: 'br', canada: 'ca', switzerland: 'ch', germany: 'de', spain: 'es', france: 'fr',
  india: 'in', italy: 'it', mexico: 'mx', netherlands: 'nl', 'new zealand': 'nz', poland: 'pl',
  singapore: 'sg', 'south africa': 'za',
}

export function resolveAdzunaLocation(where = '') {
  const code = ADZUNA_COUNTRIES[where.trim().toLowerCase()]
  return code ? { country: code, where: '' } : { country: 'in', where }
}

export async function searchAdzuna({ q = '', where: whereIn = '', page = 1, country: countryIn } = {}) {
  const resolved = resolveAdzunaLocation(whereIn)
  const where = resolved.where
  const country = countryIn ?? resolved.country
  const params = new URLSearchParams({ source: 'adzuna', q, where, page: String(page), country })
  const res = await fetch(`${edgeFunctionUrl('job-search')}?${params.toString()}`)

  if (!res.ok) {
    throw new Error(`Adzuna proxy failed (${res.status})`)
  }

  const data = await res.json()
  if (data.error) throw new Error(data.error)

  // When the whole country site was queried, label its jobs with that country
  // so the page's location filter recognises them (Adzuna says "US", not "United States").
  const countryLabel = resolved.where === '' && whereIn ? whereIn : null

  const jobs = (data.jobs ?? []).map((job) => ({
    ...job,
    country: countryLabel ?? job.country,
    jobType: deriveJobType(job.tags, job.title),
    experienceLevel: deriveExperienceLevel(job.title, job.tags),
    // Adzuna's own category label doubles as the closest real "industry" signal we have.
    industry: job.tags?.[0] ?? null,
  }))

  return { jobs, count: data.count ?? 0 }
}
