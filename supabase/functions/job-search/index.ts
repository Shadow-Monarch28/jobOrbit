import { corsHeaders } from '../_shared/cors.ts'

declare const Deno: {
  serve(handler: (req: Request) => Response | Promise<Response>): void
  env: { get(name: string): string | undefined }
}

// Curated list of companies confirmed to have live public Lever postings.
// There's no discovery endpoint for this — verified manually; re-check periodically,
// since companies can switch ATS providers or disable their public board at any time.
const DEFAULT_LEVER_COMPANIES = ['jobgether', 'lyrahealth', 'shieldai', 'ciandt', 'paytm', 'paytmpayments', 'appzen', 'xsolla']

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
      return await handleAdzuna({ q, where, page, country })
    }

    if (source === 'lever') {
      const companiesParam = url.searchParams.get('companies')
      const list = companiesParam
        ? companiesParam.split(',').map((c) => c.trim()).filter(Boolean)
        : DEFAULT_LEVER_COMPANIES
      return await handleLever({ q, list })
    }

    return jsonResponse({ error: 'Unknown or missing source. Use source=adzuna or source=lever.' }, 400)
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
    return jsonResponse({ error: 'Adzuna credentials not configured on the server.' }, 500)
  }

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: '20',
    'content-type': 'application/json',
  })
  if (q) params.set('what', q)
  if (where) params.set('where', where)

  const apiUrl = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${params.toString()}`
  const res = await fetch(apiUrl)

  if (!res.ok) {
    return jsonResponse({ error: `Adzuna request failed (${res.status})` }, 502)
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

  return jsonResponse({ jobs, count: data.count ?? jobs.length, page })
}

async function handleLever({ q, list }: { q: string; list: string[] }) {
  const results = await Promise.allSettled(
    list.map(async (company) => {
      const res = await fetch(`https://api.lever.co/v0/postings/${company}?mode=json`)
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
