import { edgeFunctionUrl, deriveJobType, deriveExperienceLevel } from './shared'
import { parseLocation } from '../data/locations'
import { resilient, fetchJson } from './resilient'

// Adzuna is split by country site. When the chosen place is one of its
// countries we query that site directly instead of text-matching the name.
const ADZUNA_COUNTRIES = {
  'united kingdom': 'gb', 'united states': 'us', austria: 'at', australia: 'au', belgium: 'be',
  brazil: 'br', canada: 'ca', switzerland: 'ch', germany: 'de', spain: 'es', france: 'fr',
  india: 'in', italy: 'it', mexico: 'mx', netherlands: 'nl', 'new zealand': 'nz', poland: 'pl',
  singapore: 'sg', 'south africa': 'za',
}

// Where to look on Adzuna for a chosen place: a country ("India"), a city ("Gurgaon, India")
// or free text. Returns supported:false when Adzuna has no site for that country.
export function resolveAdzunaLocation(where = '') {
  const t = where.trim()
  if (!t || /^remote/i.test(t)) return { country: 'in', where: '', supported: true }
  const loc = parseLocation(t)
  if (loc.city) {
    const code = ADZUNA_COUNTRIES[loc.country.toLowerCase()]
    return code ? { country: code, where: loc.city, supported: true } : { country: 'in', where: '', supported: false }
  }
  if (loc.country) {
    const code = ADZUNA_COUNTRIES[loc.country.toLowerCase()]
    return code ? { country: code, where: '', supported: true } : { country: 'in', where: '', supported: false }
  }
  return { country: 'in', where: t, supported: true }
}

export async function searchAdzuna({ q = '', where: whereIn = '', page = 1, country: countryIn } = {}) {
  const resolved = resolveAdzunaLocation(whereIn)
  if (!resolved.supported) return { jobs: [], count: 0 }
  const country = countryIn ?? resolved.country
  const params = new URLSearchParams({ source: 'adzuna', q, where: resolved.where, page: String(page), country })
  const url = `${edgeFunctionUrl('job-search')}?${params.toString()}`
  const data = await resilient({ key: `adzuna:${params.toString()}`, label: 'Adzuna', load: () => fetchJson(url, 'Adzuna') })

  // When the whole country site was queried, label its jobs with that country
  // so the page's location filter recognises them (Adzuna says "US", not "United States").
  const wholeCountry = resolved.where === '' && whereIn && !/^remote/i.test(whereIn)
  const countryLabel = wholeCountry ? parseLocation(whereIn).country ?? null : null

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
