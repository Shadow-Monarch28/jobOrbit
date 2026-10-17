// Arbeitnow's API is direct/keyless too. It already tells us explicitly
// whether a job is remote via a boolean `remote` field, which is more
// reliable than guessing from location text. It also gives real job_types
// (Full-time, Contract, etc.) — much better signal than guessing from tags.

const RAW_ENDPOINT = 'https://www.arbeitnow.com/api/job-board-api'

import { stripHtml, deriveJobType, deriveExperienceLevel, deriveIndustryFromTags } from './shared'

export async function searchArbeitnow({ q = '' } = {}) {
  const res = await fetch(RAW_ENDPOINT)

  if (!res.ok) {
    throw new Error(`Arbeitnow request failed (${res.status})`)
  }

  const raw = await res.json()
  const list = raw.data ?? []

  const jobs = list.map((job) => {
    const skillTags = job.tags ?? []
    const jobTypeTags = job.job_types ?? []
    const combinedTags = [...skillTags, ...jobTypeTags]

    return {
      id: `arbeitnow-${job.slug}`,
      source: 'arbeitnow',
      sourceId: job.slug,
      title: job.title,
      company: job.company_name ?? 'Unknown company',
      location: job.location || '',
      url: job.url,
      description: stripHtml(job.description ?? ''),
      tags: combinedTags,
      postedAt: job.created_at ? new Date(Number(job.created_at) * 1000).toISOString() : null,
      workplace: job.remote ? 'remote' : job.location ? 'onsite' : 'unspecified',
      country: job.location || null,
      salary: null,
      salaryMin: null,
      salaryMax: null,
      // job_types from Arbeitnow is real structured data, not a guess — prefer it.
      jobType: jobTypeTags.length > 0 ? jobTypeTags[0] : deriveJobType(combinedTags, job.title),
      experienceLevel: deriveExperienceLevel(job.title, skillTags),
      industry: deriveIndustryFromTags(skillTags),
    }
  })

  const filtered = q
    ? jobs.filter((j) => {
        const needle = q.toLowerCase()
        return (
          j.title.toLowerCase().includes(needle) ||
          j.description.toLowerCase().includes(needle) ||
          j.tags.some((t) => t.toLowerCase().includes(needle))
        )
      })
    : jobs

  return { jobs: filtered, count: filtered.length }
}
