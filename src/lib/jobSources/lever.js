import { resilient, fetchJson } from './resilient'
import { edgeFunctionUrl, deriveJobType, deriveExperienceLevel } from './shared'

export async function searchLever({ q = '' } = {}) {
  const params = new URLSearchParams({ source: 'lever', q })
  const url = `${edgeFunctionUrl('job-search')}?${params.toString()}`
  const data = await resilient({ key: `lever:${params.toString()}`, label: 'Lever', load: () => fetchJson(url, 'Lever') })

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
