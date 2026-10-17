import { searchAdzuna } from './adzuna'
import { searchLever } from './lever'
import { searchRemoteOk } from './remoteok'
import { searchArbeitnow } from './arbeitnow'

function dedupe(jobs) {
  const seen = new Set()
  return jobs.filter((j) => {
    if (seen.has(j.id)) return false
    seen.add(j.id)
    return true
  })
}

/**
 * Searches across the given sources in parallel.
 *
 * - Adzuna and Lever support real server-side keyword search, so we run one
 *   call per title term (when multiple are given) and merge/de-dupe results —
 *   this is what actually lets a multi-title search surface jobs matching
 *   any of the chosen titles, not just the first one.
 * - RemoteOK and Arbeitnow have no reliable server-side OR search, so we
 *   always fetch their full board and let the caller's own filtering do the
 *   real narrowing. This also means location filtering for every source
 *   should happen centrally after merging (never trust a source's own
 *   'where' handling alone) — otherwise jobs from unrelated countries leak
 *   through from whichever source doesn't support location filtering.
 */
export async function searchAllJobs({
  titles = [''],
  where = '',
  page = 1,
  sources = ['adzuna', 'lever', 'remoteok', 'arbeitnow'],
} = {}) {
  const titleTerms = titles.length > 0 ? titles : ['']

  const tasks = []
  const taskSources = []

  if (sources.includes('adzuna')) {
    titleTerms.forEach((t) => {
      tasks.push(searchAdzuna({ q: t, where, page }))
      taskSources.push('adzuna')
    })
  }
  if (sources.includes('lever')) {
    titleTerms.forEach((t) => {
      tasks.push(searchLever({ q: t }))
      taskSources.push('lever')
    })
  }
  if (sources.includes('remoteok')) {
    tasks.push(searchRemoteOk({ q: '' }))
    taskSources.push('remoteok')
  }
  if (sources.includes('arbeitnow')) {
    tasks.push(searchArbeitnow({ q: '' }))
    taskSources.push('arbeitnow')
  }

  const settled = await Promise.allSettled(tasks)

  const jobs = []
  const errorsBySource = {}

  settled.forEach((result, i) => {
    const source = taskSources[i]
    if (result.status === 'fulfilled') {
      jobs.push(...result.value.jobs)
    } else if (!errorsBySource[source]) {
      errorsBySource[source] = result.reason?.message ?? 'Unknown error'
    }
  })

  const errors = Object.entries(errorsBySource).map(([source, message]) => ({ source, message }))

  return { jobs: dedupe(jobs), errors, sourcesQueried: sources }
}
