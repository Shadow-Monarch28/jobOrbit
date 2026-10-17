import { edgeFunctionUrl, deriveJobType, deriveExperienceLevel } from './shared'

export async function searchAdzuna({ q = '', where = '', page = 1, country = 'in' } = {}) {
  const params = new URLSearchParams({ source: 'adzuna', q, where, page: String(page), country })
  const res = await fetch(`${edgeFunctionUrl('job-search')}?${params.toString()}`)

  if (!res.ok) {
    throw new Error(`Adzuna proxy failed (${res.status})`)
  }

  const data = await res.json()
  if (data.error) throw new Error(data.error)

  const jobs = (data.jobs ?? []).map((job) => ({
    ...job,
    jobType: deriveJobType(job.tags, job.title),
    experienceLevel: deriveExperienceLevel(job.title, job.tags),
    // Adzuna's own category label doubles as the closest real "industry" signal we have.
    industry: job.tags?.[0] ?? null,
  }))

  return { jobs, count: data.count ?? 0 }
}
