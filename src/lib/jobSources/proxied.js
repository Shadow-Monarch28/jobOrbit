// Sources that are fetched server-side by the job-search edge function
// (no CORS or key handling in the browser). Each returns the shared job shape
// with the derived fields filled in.
import { edgeFunctionUrl, deriveJobType, deriveExperienceLevel, deriveIndustryFromTags } from './shared'

async function fetchProxied(source, q, label) {
  const params = new URLSearchParams({ source, q })
  const res = await fetch(`${edgeFunctionUrl('job-search')}?${params.toString()}`)
  if (!res.ok) throw new Error(`${label} proxy failed (${res.status})`)
  const data = await res.json()
  if (data.error) throw new Error(data.error)

  const jobs = (data.jobs ?? []).map((job) => ({
    ...job,
    tags: job.tags ?? [],
    description: job.description ?? '',
    jobType: deriveJobType(job.tags, job.title),
    experienceLevel: deriveExperienceLevel(job.title, job.tags),
    industry: deriveIndustryFromTags(job.tags) ?? job.tags?.[0] ?? null,
  }))
  return { jobs, count: jobs.length }
}

export const searchRemotive = ({ q = '' } = {}) => fetchProxied('remotive', q, 'Remotive')
export const searchTheMuse = ({ q = '' } = {}) => fetchProxied('themuse', q, 'The Muse')
export const searchJobicy = ({ q = '' } = {}) => fetchProxied('jobicy', q, 'Jobicy')
export const searchGreenhouse = ({ q = '' } = {}) => fetchProxied('greenhouse', q, 'Greenhouse')
