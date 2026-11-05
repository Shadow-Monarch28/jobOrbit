// Sources that are fetched server-side by the job-search edge function
// (no CORS or key handling in the browser). Each returns the shared job shape
// with the derived fields filled in.
import { resilient, fetchJson } from './resilient'
import { edgeFunctionUrl, deriveJobType, deriveExperienceLevel, deriveIndustryFromTags } from './shared'

async function fetchProxied(source, q, label) {
  const params = new URLSearchParams({ source, q })
  const url = `${edgeFunctionUrl('job-search')}?${params.toString()}`
  const data = await resilient({ key: `${source}:${params.toString()}`, label, load: () => fetchJson(url, label) })

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
