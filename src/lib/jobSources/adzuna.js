import { edgeFunctionUrl, deriveJobType, deriveExperienceLevel } from './shared'
import { parseLocation } from '../data/locations'

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

// Recent answers are kept for a few minutes (this tab only) so changing a filter or
// going back and forth never spends one of Adzuna's limited free calls twice.
const TTL_MS = 10 * 60 * 1000
const inflight = new Map()
const readCache = (key) => {
  try {
    const raw = sessionStorage.getItem(`adzuna:${key}`)
    if (!raw) return null
    const { at, data } = JSON.parse(raw)
    return Date.now() - at < TTL_MS ? data : null
  } catch { return null }
}
const writeCache = (key, data) => { try { sessionStorage.setItem(`adzuna:${key}`, JSON.stringify({ at: Date.now(), data })) } catch { /* storage full or blocked */ } }

const FRIENDLY = {
  rate_limit: "Adzuna's free daily limit has been used up, so its jobs will be back soon.",
  auth: 'Adzuna is not connected properly on our side. We are on it.',
  not_configured: 'Adzuna is not connected on our side yet.',
}

async function callProxy(params) {
  let lastStatus = 0
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${edgeFunctionUrl('job-search')}?${params.toString()}`)
      const body = await res.json().catch(() => ({}))
      if (res.ok && !body.error) return body
      lastStatus = res.status
      const message = FRIENDLY[body.code]
      // Limits and bad keys will not fix themselves in a second; do not retry them.
      if (message) throw Object.assign(new Error(message), { final: true })
    } catch (err) {
      if (err.final) throw err
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 900))
  }
  throw new Error(lastStatus ? 'Adzuna did not answer properly just now. Try again in a minute.' : 'Could not reach Adzuna. Check your connection and try again.')
}

export async function searchAdzuna({ q = '', where: whereIn = '', page = 1, country: countryIn } = {}) {
  const resolved = resolveAdzunaLocation(whereIn)
  if (!resolved.supported) return { jobs: [], count: 0 }
  const country = countryIn ?? resolved.country
  const params = new URLSearchParams({ source: 'adzuna', q, where: resolved.where, page: String(page), country })
  const key = params.toString()

  let data = readCache(key)
  if (!data) {
    if (!inflight.has(key)) inflight.set(key, callProxy(params).finally(() => inflight.delete(key)))
    data = await inflight.get(key)
    writeCache(key, data)
  }

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
