import { corsHeaders } from '../_shared/cors.ts'

declare const Deno: {
  serve(handler: (req: Request) => Response | Promise<Response>): void
  env: { get(name: string): string | undefined }
}

// Curated list of companies confirmed to have live public Lever postings.
// There's no discovery endpoint for this — verified manually; re-check periodically,
// since companies can switch ATS providers or disable their public board at any time.
const DEFAULT_LEVER_COMPANIES = ['jobgether', 'lyrahealth', 'shieldai', 'ciandt', 'paytm', 'paytmpayments', 'appzen', 'xsolla']

// Public Greenhouse job boards. Like the Lever list, this is curated by hand:
// a company that moves ATS or hides its board simply returns nothing.
const DEFAULT_GREENHOUSE_COMPANIES = ['stripe', 'airbnb', 'databricks', 'cloudflare', 'discord', 'figma', 'asana', 'instacart', 'robinhood', 'reddit', 'coinbase', 'pinterest', 'twilio', 'datadog', 'mongodb', 'elastic']

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

function matchesQuery(q: string, ...fields: Array<string | undefined | null>): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  return fields.some((f) => (f ?? '').toLowerCase().includes(needle))
}

// Strips HTML tags and decodes a handful of common entities — good enough for
// turning Lever's rich-text fields into a plain description snippet.
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

// Normalizes any source's workplace signal into one of a fixed set of labels,
// paired with a country/region string when we can tell what it is.
function normalizeWorkplace({
  workplaceType,
  country,
  locationText,
}: {
  workplaceType?: string | null
  country?: string | null
  locationText?: string | null
}): { workplace: 'remote' | 'hybrid' | 'onsite' | 'unspecified'; country: string | null } {
  const text = (locationText ?? '').toLowerCase()

  let workplace: 'remote' | 'hybrid' | 'onsite' | 'unspecified' = 'unspecified'
  if (workplaceType === 'remote' || /remote/.test(text)) workplace = 'remote'
  else if (workplaceType === 'hybrid' || /hybrid/.test(text)) workplace = 'hybrid'
  else if (workplaceType === 'on-site' || workplaceType === 'onsite') workplace = 'onsite'
  else if (locationText) workplace = 'onsite'

  return { workplace, country: country || locationText || null }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const source = url.searchParams.get('source')
    const q = url.searchParams.get('q') ?? ''
    const where = url.searchParams.get('where') ?? ''
    const page = Number(url.searchParams.get('page') ?? '1')
    const country = url.searchParams.get('country') ?? 'in'

    if (source === 'adzuna') {
      return await guarded('Adzuna', `adzuna|${country}|${q.toLowerCase()}|${where.toLowerCase()}|${page}`, () => handleAdzuna({ q, where, page, country }))
    }

    const companiesParam = url.searchParams.get('companies') ?? ''
    const ck = `${source}|${q.toLowerCase()}|${companiesParam}`
    const companies = (fallback: string[]) =>
      companiesParam ? companiesParam.split(',').map((c) => c.trim()).filter(Boolean) : fallback

    if (source === 'lever') return await guarded('Lever', ck, () => handleLever({ q, list: companies(DEFAULT_LEVER_COMPANIES) }))
    if (source === 'remotive') return await guarded('Remotive', ck, () => handleRemotive({ q }))
    if (source === 'themuse') return await guarded('The Muse', ck, () => handleTheMuse({ q }))
    if (source === 'jooble') return await guarded('Jooble', `${ck}|${where.toLowerCase()}`, () => handleJooble({ q, where }))
    if (source === 'jobicy') return await guarded('Jobicy', ck, () => handleJobicy({ q }))
    if (source === 'greenhouse') return await guarded('Greenhouse', ck, () => handleGreenhouse({ q, list: companies(DEFAULT_GREENHOUSE_COMPANIES) }))

    return jsonResponse({ error: 'Unknown or missing source.' }, 400)
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500)
  }
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Shared by every source: a fetch with a timeout and one retry on a network error or a
// server-side hiccup (never on 4xx, where a second try cannot help).
async function fetchRetry(url: string, init: RequestInit = {}): Promise<Response> {
  let last: Response | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(9000) })
      if (res.ok || (res.status < 500 && res.status !== 408)) return res
      last = res
    } catch (_err) {
      last = null
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 600))
  }
  if (last) return last
  throw new Error('unreachable')
}

// Every source answer is remembered for 10 minutes. If a source then fails, the last good
// answer (up to 6 hours old) is returned instead of an error, so one bad moment upstream
// never empties someone's search.
const SOURCE_CACHE = new Map<string, { at: number; body: string }>()
const FRESH_MS = 10 * 60 * 1000
const STALE_MS = 6 * 60 * 60 * 1000

async function guarded(label: string, key: string, run: () => Promise<Response>): Promise<Response> {
  const hit = SOURCE_CACHE.get(key)
  const asJson = (body: string) => new Response(body, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  if (hit && Date.now() - hit.at < FRESH_MS) return asJson(hit.body)

  let res: Response
  try {
    res = await run()
  } catch (err) {
    console.error(label, 'failed', String(err))
    res = jsonResponse({ error: `${label} did not answer.`, code: 'unreachable' }, 502)
  }

  if (res.ok) {
    if (SOURCE_CACHE.size > 300) SOURCE_CACHE.clear()
    SOURCE_CACHE.set(key, { at: Date.now(), body: await res.clone().text() })
    return res
  }
  console.error(label, 'upstream error', res.status)
  if (hit && Date.now() - hit.at < STALE_MS) return asJson(hit.body)
  return res
}

// Adzuna's free plan is small (about 25 calls a minute and 250 a day), and an
// edge function instance lives only for a short while. So: remember recent answers,
// retry once on a hiccup, and say clearly why a call failed.
const ADZUNA_COUNTRY_CODES = new Set(['gb', 'us', 'at', 'au', 'be', 'br', 'ca', 'ch', 'de', 'es', 'fr', 'in', 'it', 'mx', 'nl', 'nz', 'pl', 'sg', 'za'])
const ADZUNA_CACHE = new Map<string, { at: number; body: unknown }>()
const ADZUNA_TTL_MS = 10 * 60 * 1000

function adzunaError(code: string, message: string, upstream?: number) {
  return jsonResponse({ error: message, code, upstream }, code === 'rate_limit' ? 429 : 502)
}

async function handleAdzuna({
  q,
  where,
  page,
  country,
}: {
  q: string
  where: string
  page: number
  country: string
}) {
  const appId = Deno.env.get('ADZUNA_APP_ID')
  const appKey = Deno.env.get('ADZUNA_APP_KEY')

  if (!appId || !appKey) {
    return adzunaError('not_configured', 'Adzuna is not set up on the server (missing ADZUNA_APP_ID or ADZUNA_APP_KEY).')
  }

  const site = ADZUNA_COUNTRY_CODES.has(country.toLowerCase()) ? country.toLowerCase() : 'in'
  const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1
  const what = q.replace(/[^\p{L}\p{N}\s+#.&/-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)
  const place = where.trim().slice(0, 100)

  const key = `${site}|${what.toLowerCase()}|${place.toLowerCase()}|${safePage}`
  const hit = ADZUNA_CACHE.get(key)
  if (hit && Date.now() - hit.at < ADZUNA_TTL_MS) return jsonResponse(hit.body)

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: '20',
    'content-type': 'application/json',
  })
  if (what) params.set('what', what)
  if (place) params.set('where', place)

  const apiUrl = `https://api.adzuna.com/v1/api/jobs/${site}/search/${safePage}?${params.toString()}`

  let res: Response | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) })
    } catch (_err) {
      res = null
    }
    // Retry once on a network failure or a server-side hiccup; never on rate limits or bad keys.
    if (res && (res.ok || (res.status < 500 && res.status !== 408))) break
    if (attempt === 0) await new Promise((r) => setTimeout(r, 700))
  }

  if (!res) return adzunaError('unreachable', 'Adzuna did not answer in time.')
  if (res.status === 429) return adzunaError('rate_limit', "Adzuna's free request limit has been reached. It frees up again soon.", 429)
  if (res.status === 401 || res.status === 403) return adzunaError('auth', 'Adzuna rejected the API keys. Check ADZUNA_APP_ID and ADZUNA_APP_KEY in Supabase.', res.status)
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 160)
    console.error('adzuna upstream', res.status, detail)
    return adzunaError('upstream', `Adzuna answered with an error (${res.status}).`, res.status)
  }

  const data = await res.json()

  const jobs = (data.results ?? []).map((job: any) => {
    const locationText = job.location?.display_name ?? ''
    const { workplace, country } = normalizeWorkplace({
      country: job.location?.area?.[0] ?? null,
      locationText: /remote/i.test(job.title ?? '') ? `${locationText} remote` : locationText,
    })

    return {
      id: `adzuna-${job.id}`,
      source: 'adzuna',
      sourceId: String(job.id),
      title: job.title,
      company: job.company?.display_name ?? 'Unknown company',
      location: locationText,
      url: job.redirect_url,
      description: job.description ?? '',
      tags: [job.category?.label].filter(Boolean),
      postedAt: job.created ?? null,
      workplace,
      country,
      salary:
        job.salary_min || job.salary_max
          ? `${Math.round(job.salary_min ?? job.salary_max)} - ${Math.round(job.salary_max ?? job.salary_min)}`
          : null,
      salaryMin: job.salary_min ? Math.round(job.salary_min) : null,
      salaryMax: job.salary_max ? Math.round(job.salary_max) : null,
    }
  })

  const body = { jobs, count: data.count ?? jobs.length, page: safePage }
  if (ADZUNA_CACHE.size > 200) ADZUNA_CACHE.clear()
  ADZUNA_CACHE.set(key, { at: Date.now(), body })
  return jsonResponse(body)
}

async function handleLever({ q, list }: { q: string; list: string[] }) {
  const results = await Promise.allSettled(
    list.map(async (company) => {
      const res = await fetchRetry(`https://api.lever.co/v0/postings/${company}?mode=json`)
      if (!res.ok) return []
      const postings = await res.json()
      return postings.map((job: any) => {
        const rawDescription = job.descriptionPlain || (job.description ? stripHtml(job.description) : '')
        const listsText = Array.isArray(job.lists)
          ? job.lists
              .map((section: any) => `${section.text ?? ''}: ${stripHtml(section.content ?? '')}`)
              .join(' | ')
          : ''
        const description = rawDescription || listsText

        const { workplace, country } = normalizeWorkplace({
          workplaceType: job.workplaceType,
          country: job.country ?? null,
          locationText: job.categories?.location ?? '',
        })

        return {
          id: `lever-${company}-${job.id}`,
          source: 'lever',
          sourceId: job.id,
          title: job.text,
          company,
          location: job.categories?.location ?? '',
          url: job.applyUrl ?? job.hostedUrl,
          description,
          tags: [job.categories?.team, job.categories?.commitment].filter(Boolean),
          postedAt: job.createdAt ? new Date(job.createdAt).toISOString() : null,
          workplace,
          country,
          salary: null,
        }
      })
    })
  )

  let jobs = results
    .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)

  if (q) {
    const needle = q.toLowerCase()
    jobs = jobs.filter(
      (j) => j.title.toLowerCase().includes(needle) || j.description.toLowerCase().includes(needle)
    )
  }

  return jsonResponse({ jobs, count: jobs.length, page: 1 })
}

async function handleRemotive({ q }: { q: string }) {
  const apiUrl = `https://remotive.com/api/remote-jobs?limit=100${q ? `&search=${encodeURIComponent(q)}` : ''}`
  const res = await fetchRetry(apiUrl)
  if (!res.ok) return jsonResponse({ error: `Remotive answered with an error (${res.status}).`, code: res.status === 429 ? 'rate_limit' : 'upstream' }, res.status === 429 ? 429 : 502)
  const data = await res.json()

  const jobs = (data.jobs ?? []).map((job: any) => ({
    id: `remotive-${job.id}`,
    source: 'remotive',
    sourceId: String(job.id),
    title: job.title,
    company: job.company_name ?? 'Unknown company',
    location: job.candidate_required_location || 'Remote',
    url: job.url,
    description: stripHtml(job.description ?? ''),
    tags: [job.category, ...(Array.isArray(job.tags) ? job.tags : []), String(job.job_type ?? '').replace('_', '-')].filter(Boolean),
    postedAt: job.publication_date ? new Date(job.publication_date).toISOString() : null,
    workplace: 'remote',
    country: job.candidate_required_location || null,
    salary: job.salary || null,
    salaryMin: null,
    salaryMax: null,
  }))
  return jsonResponse({ jobs, count: jobs.length, page: 1 })
}

// The Muse has moved its public endpoint before (a plain /api/public/jobs now answers 404 for
// us), so every known address is tried in turn, with the optional MUSE_API_KEY secret when set.
const MUSE_ENDPOINTS = [
  'https://www.themuse.com/api/public/jobs',
  'https://www.themuse.com/api/public/v2/jobs',
  'https://api.themuse.com/jobs',
]
async function museFetch(page: number): Promise<any[]> {
  const key = Deno.env.get('MUSE_API_KEY')
  const failures: string[] = []
  for (const base of MUSE_ENDPOINTS) {
    try {
      const url = `${base}?page=${page}${key ? `&api_key=${encodeURIComponent(key)}` : ''}`
      const res = await fetchRetry(url, { headers: { Accept: 'application/json', 'User-Agent': 'JobOrbit/1.0' } })
      if (!res.ok) { failures.push(`${new URL(base).pathname} ${res.status}`); continue }
      const body = await res.json()
      if (Array.isArray(body?.results)) return body.results
      failures.push(`${new URL(base).pathname} unexpected shape`)
    } catch (err) {
      failures.push(`${new URL(base).pathname} ${String(err).slice(0, 40)}`)
    }
  }
  throw new Error(failures.join('; '))
}

async function handleTheMuse({ q }: { q: string }) {
  const pages = await Promise.allSettled([1, 2, 3].map((page) => museFetch(page)))
  const results = pages.filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled').flatMap((r) => r.value)
  if (results.length === 0 && pages.every((r) => r.status === 'rejected')) {
    const why = String((pages[0] as PromiseRejectedResult).reason?.message ?? 'no detail')
    console.error('The Muse upstream:', why)
    return jsonResponse({ error: `The Muse answered with an error (${why}).`, code: 'upstream' }, 502)
  }

  const jobs = results
    .map((job: any) => {
      const locationText = (job.locations ?? []).map((l: any) => l.name).filter(Boolean).join(' / ')
      const { workplace, country } = normalizeWorkplace({ locationText })
      return {
        id: `themuse-${job.id}`,
        source: 'themuse',
        sourceId: String(job.id),
        title: job.name,
        company: job.company?.name ?? 'Unknown company',
        location: locationText,
        url: job.refs?.landing_page,
        description: stripHtml(job.contents ?? ''),
        tags: [...(job.categories ?? []).map((c: any) => c.name), ...(job.levels ?? []).map((l: any) => l.name)].filter(Boolean),
        postedAt: job.publication_date ?? null,
        workplace,
        country,
        salary: null,
        salaryMin: null,
        salaryMax: null,
      }
    })
    .filter((j: any) => matchesQuery(q, j.title, j.description, j.tags.join(' ')))
  return jsonResponse({ jobs, count: jobs.length, page: 1 })
}

async function handleJobicy({ q }: { q: string }) {
  const res = await fetchRetry(`https://jobicy.com/api/v2/remote-jobs?count=50${q ? `&tag=${encodeURIComponent(q)}` : ''}`)
  if (!res.ok) return jsonResponse({ error: `Jobicy answered with an error (${res.status}).`, code: res.status === 429 ? 'rate_limit' : 'upstream' }, res.status === 429 ? 429 : 502)
  const data = await res.json()

  const jobs = (data.jobs ?? []).map((job: any) => {
    const min = job.annualSalaryMin ?? job.salaryMin ?? null
    const max = job.annualSalaryMax ?? job.salaryMax ?? null
    return {
      id: `jobicy-${job.id}`,
      source: 'jobicy',
      sourceId: String(job.id),
      title: decodeEntities(job.jobTitle ?? ''),
      company: decodeEntities(job.companyName ?? 'Unknown company'),
      location: job.jobGeo || 'Remote',
      url: job.url,
      description: stripHtml(job.jobDescription || job.jobExcerpt || ''),
      tags: [...(Array.isArray(job.jobIndustry) ? job.jobIndustry : []), ...(Array.isArray(job.jobType) ? job.jobType : [])].map((t: string) => decodeEntities(String(t))),
      postedAt: job.pubDate ? new Date(String(job.pubDate).replace(' ', 'T')).toISOString() : null,
      workplace: 'remote',
      country: job.jobGeo || null,
      salary: min || max ? `${min ?? max} - ${max ?? min}` : null,
      salaryMin: min ? Number(min) : null,
      salaryMax: max ? Number(max) : null,
    }
  })
  return jsonResponse({ jobs, count: jobs.length, page: 1 })
}

async function handleGreenhouse({ q, list }: { q: string; list: string[] }) {
  const results = await Promise.allSettled(
    list.map(async (company) => {
      const res = await fetchRetry(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`)
      if (!res.ok) return []
      const data = await res.json()
      return (data.jobs ?? []).map((job: any) => {
        const locationText = job.location?.name ?? ''
        const { workplace, country } = normalizeWorkplace({ locationText })
        return {
          id: `greenhouse-${company}-${job.id}`,
          source: 'greenhouse',
          sourceId: `${company}-${job.id}`,
          title: job.title,
          company,
          location: locationText,
          url: job.absolute_url,
          description: stripHtml(decodeEntities(job.content ?? '')),
          tags: (job.departments ?? []).map((d: any) => d.name).filter(Boolean),
          postedAt: job.updated_at ? new Date(job.updated_at).toISOString() : null,
          workplace,
          country,
          salary: null,
          salaryMin: null,
          salaryMax: null,
        }
      })
    })
  )
  const jobs = results
    .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .filter((j: any) => matchesQuery(q, j.title, j.description))
    // keep the payload small: description is only used for skill matching and display
    .map((j: any) => ({ ...j, description: j.description.slice(0, 3000) }))
  return jsonResponse({ jobs, count: jobs.length, page: 1 })
}


// Jooble aggregates listings for about 70 countries and takes any country or city name as the
// location, so it is the broad "every country" source. Needs the free JOOBLE_API_KEY secret.
async function handleJooble({ q, where }: { q: string; where: string }) {
  const key = Deno.env.get('JOOBLE_API_KEY')
  if (!key) return jsonResponse({ error: 'Jooble is not configured.', code: 'not_configured' }, 503)
  const res = await fetch(`https://jooble.org/api/${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords: q, location: where, page: '1' }),
    signal: AbortSignal.timeout(12000),
  })
  if (res.status === 401 || res.status === 403) return jsonResponse({ error: 'Jooble rejected the key.', code: 'auth' }, 502)
  if (res.status === 429) return jsonResponse({ error: 'Jooble rate limit.', code: 'rate_limit' }, 429)
  if (!res.ok) return jsonResponse({ error: `Jooble answered ${res.status}.`, code: 'upstream' }, 502)
  const body = await res.json()
  const jobs = (body?.jobs ?? []).map((job: any) => {
    const { workplace, country } = normalizeWorkplace({ locationText: job.location ?? '' })
    return {
      id: `jooble-${job.id ?? job.link}`,
      source: 'jooble',
      sourceId: String(job.id ?? job.link),
      title: stripHtml(job.title ?? ''),
      company: job.company || 'Unknown company',
      location: job.location ?? '',
      url: job.link,
      description: stripHtml(job.snippet ?? ''),
      tags: job.type ? [job.type] : [],
      postedAt: job.updated ?? null,
      workplace,
      country: where || country,
      salary: job.salary || null,
      salaryMin: null,
      salaryMax: null,
    }
  })
  return jsonResponse({ jobs, count: jobs.length, page: 1 })
}
