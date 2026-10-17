import { edgeFunctionUrl, deriveJobType, deriveExperienceLevel } from './shared'

export async function searchLever({ q = '' } = {}) {
  const params = new URLSearchParams({ source: 'lever', q })
  const res = await fetch(`${edgeFunctionUrl('job-search')}?${params.toString()}`)

  if (!res.ok) {
    throw new Error(`Lever proxy failed (${res.status})`)
  }

  const data = await res.json()
  if (data.error) throw new Error(data.error)

  const jobs = (data.jobs ?? []).map((job) => ({
    ...job,
    jobType: deriveJobType(job.tags, job.title),
    experienceLevel: deriveExperienceLevel(job.title, job.tags),
    // Lever exposes team/department, not industry — closest real signal available.
    industry: job.tags?.[0] ?? null,
    salaryMin: null,
    salaryMax: null,
  }))

  return { jobs, count: data.count ?? 0 }
}
