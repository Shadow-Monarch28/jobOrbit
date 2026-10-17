// RemoteOK's API is direct/keyless — no proxy needed. Two things to know
// about their raw response:
// 1. The first item in the array is a "legal" notice object, not a job —
//    it has no `id`/`position` fields, so we filter it out.
// 2. Every listing on RemoteOK is remote by definition (it's a remote-only
//    board), so workplace is always 'remote'.
//
// Per RemoteOK's usage terms: always link directly to their own job URL,
// no redirects — so we use job.url as-is rather than rewriting it.

const RAW_ENDPOINT = 'https://remoteok.com/api'

import { stripHtml, deriveJobType, deriveExperienceLevel, deriveIndustryFromTags } from './shared'

export async function searchRemoteOk({ q = '' } = {}) {
  const res = await fetch(RAW_ENDPOINT)

  if (!res.ok) {
    throw new Error(`RemoteOK request failed (${res.status})`)
  }

  const raw = await res.json()

  const jobs = raw
    .filter((job) => job && job.id && job.position)
    .map((job) => {
      const tags = Array.isArray(job.tags) ? job.tags : []
      return {
        id: `remoteok-${job.id}`,
        source: 'remoteok',
        sourceId: String(job.id),
        title: job.position,
        company: job.company ?? 'Unknown company',
        location: job.location || 'Remote',
        url: job.url,
        description: stripHtml(job.description ?? ''),
        tags,
        postedAt: job.date ?? (job.epoch ? new Date(Number(job.epoch) * 1000).toISOString() : null),
        workplace: 'remote',
        country: job.location || null,
        salary:
          job.salary_min || job.salary_max
            ? `${job.salary_min ?? job.salary_max} - ${job.salary_max ?? job.salary_min}`
            : null,
        salaryMin: job.salary_min ? Number(job.salary_min) : null,
        salaryMax: job.salary_max ? Number(job.salary_max) : null,
        jobType: deriveJobType(tags, job.position),
        experienceLevel: deriveExperienceLevel(job.position, tags),
        industry: deriveIndustryFromTags(tags),
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
