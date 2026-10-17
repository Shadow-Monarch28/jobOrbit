import { useCallback, useEffect, useState } from 'react'
import { searchAllJobs } from '../lib/jobSources'
import { searchAdzuna } from '../lib/jobSources/adzuna'

const ALL_SOURCES = ['adzuna', 'lever', 'remoteok', 'arbeitnow']
const PAGE_SIZE = 20
const DAY_MS = 1000 * 60 * 60 * 24

function matchScore(job, titles) {
  if (titles.length === 0) return 0
  const title = job.title.toLowerCase()
  const desc = job.description.toLowerCase()
  return titles.reduce((score, t) => {
    const q = t.toLowerCase()
    const titleHits = title.split(q).length - 1
    const descHits = desc.split(q).length - 1
    const tagHits = job.tags.filter((tag) => tag.toLowerCase().includes(q)).length
    return score + titleHits * 3 + tagHits * 2 + descHits
  }, 0)
}

function matchesAny(haystack, chips) {
  if (chips.length === 0) return true
  const text = haystack.toLowerCase()
  return chips.some((c) => text.includes(c.toLowerCase()))
}

export function useJobSearch() {
  const [titleChips, setTitleChips] = useState([])
  const [locationChips, setLocationChips] = useState([])
  const [skillChips, setSkillChips] = useState([])

  const [workplaceFilter, setWorkplaceFilter] = useState('any')
  const [jobTypeFilter, setJobTypeFilter] = useState('any')
  const [experienceFilter, setExperienceFilter] = useState('any')
  const [industryFilter, setIndustryFilter] = useState('')
  const [salaryMinInput, setSalaryMinInput] = useState('')
  const [salaryMaxInput, setSalaryMaxInput] = useState('')
  const [includeUnknownSalary, setIncludeUnknownSalary] = useState(true)
  const [datePostedFilter, setDatePostedFilter] = useState('any')
  const [sortBy, setSortBy] = useState('relevance')
  const [activeSources, setActiveSources] = useState(ALL_SOURCES)

  const [jobs, setJobs] = useState([])
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [adzunaPage, setAdzunaPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const runSearch = useCallback(async () => {
    setLoading(true)
    setHasSearched(true)
    setAdzunaPage(1)
    setVisibleCount(PAGE_SIZE)

    const { jobs: results, errors: searchErrors } = await searchAllJobs({
      titles: titleChips.length > 0 ? titleChips : [''],
      where: locationChips[0] ?? '',
      page: 1,
      sources: activeSources,
    })

    setJobs(results)
    setErrors(searchErrors)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleChips, locationChips, activeSources])

  useEffect(() => {
    runSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleChips, locationChips, activeSources])

  const loadMoreAdzuna = useCallback(async () => {
    if (!activeSources.includes('adzuna')) return
    setLoadingMore(true)
    const nextPage = adzunaPage + 1
    try {
      const { jobs: moreJobs } = await searchAdzuna({
        q: titleChips[0] ?? '',
        where: locationChips[0] ?? '',
        page: nextPage,
      })
      setJobs((prev) => [...prev, ...moreJobs])
      setAdzunaPage(nextPage)
    } catch (err) {
      setErrors((prev) => [...prev, { source: 'adzuna', message: err.message }])
    } finally {
      setLoadingMore(false)
    }
  }, [titleChips, locationChips, adzunaPage, activeSources])

  function clearFilters() {
    setWorkplaceFilter('any')
    setJobTypeFilter('any')
    setExperienceFilter('any')
    setIndustryFilter('')
    setSalaryMinInput('')
    setSalaryMaxInput('')
    setIncludeUnknownSalary(true)
    setDatePostedFilter('any')
    setSortBy('relevance')
    setActiveSources(ALL_SOURCES)
    setSkillChips([])
  }

  const hasSalaryRange = salaryMinInput !== '' || salaryMaxInput !== ''

  // This is the authoritative filter pass — every source's raw results go
  // through it, regardless of what (if anything) that source's own API
  // already narrowed down. That's deliberate: RemoteOK/Arbeitnow/Lever don't
  // reliably filter by location server-side, so relying on their own
  // filtering alone lets unrelated-country jobs leak through. Filtering here
  // against each job's own location/country field is what actually fixes that.
  let filteredJobs = jobs.filter((job) => {
    if (!matchesAny(job.title, titleChips)) return false
    if (!matchesAny(`${job.location} ${job.country ?? ''}`, locationChips)) return false
    if (skillChips.length > 0) {
      const haystack = [job.title, job.description, ...job.tags].join(' ')
      if (!matchesAny(haystack, skillChips)) return false
    }

    if (workplaceFilter !== 'any' && job.workplace !== workplaceFilter) return false
    if (jobTypeFilter !== 'any' && job.jobType !== jobTypeFilter) return false
    if (experienceFilter !== 'any' && job.experienceLevel !== experienceFilter) return false
    if (industryFilter && (job.industry ?? '').toLowerCase() !== industryFilter.toLowerCase()) return false

    if (hasSalaryRange) {
      const hasSalaryData = job.salaryMin != null || job.salaryMax != null
      if (!hasSalaryData) return includeUnknownSalary
      const jobLow = job.salaryMin ?? job.salaryMax
      const jobHigh = job.salaryMax ?? job.salaryMin
      if (salaryMinInput !== '' && jobHigh < Number(salaryMinInput)) return false
      if (salaryMaxInput !== '' && jobLow > Number(salaryMaxInput)) return false
    }

    if (datePostedFilter !== 'any') {
      if (!job.postedAt) return false
      const days = { '24h': 1, '7d': 7, '30d': 30 }[datePostedFilter]
      if (new Date(job.postedAt).getTime() < Date.now() - days * DAY_MS) return false
    }

    return true
  })

  filteredJobs = [...filteredJobs]
  if (sortBy === 'newest') {
    filteredJobs.sort((a, b) => {
      if (!a.postedAt && !b.postedAt) return 0
      if (!a.postedAt) return 1
      if (!b.postedAt) return -1
      return new Date(b.postedAt) - new Date(a.postedAt)
    })
  } else if (sortBy === 'salary_high' || sortBy === 'salary_low') {
    filteredJobs.sort((a, b) => {
      const aVal = a.salaryMax ?? a.salaryMin
      const bVal = b.salaryMax ?? b.salaryMin
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      return sortBy === 'salary_high' ? bVal - aVal : aVal - bVal
    })
  } else if (sortBy === 'best_match') {
    filteredJobs.sort((a, b) => matchScore(b, titleChips) - matchScore(a, titleChips))
  }

  const visibleJobs = filteredJobs.slice(0, visibleCount)
  const availableIndustries = [...new Set(jobs.map((j) => j.industry).filter(Boolean))].sort()

  return {
    titleChips,
    setTitleChips,
    locationChips,
    setLocationChips,
    skillChips,
    setSkillChips,
    workplaceFilter,
    setWorkplaceFilter,
    jobTypeFilter,
    setJobTypeFilter,
    experienceFilter,
    setExperienceFilter,
    industryFilter,
    setIndustryFilter,
    salaryMinInput,
    setSalaryMinInput,
    salaryMaxInput,
    setSalaryMaxInput,
    includeUnknownSalary,
    setIncludeUnknownSalary,
    datePostedFilter,
    setDatePostedFilter,
    sortBy,
    setSortBy,
    activeSources,
    setActiveSources,
    allSources: ALL_SOURCES,
    availableIndustries,
    jobs: visibleJobs,
    totalMatching: filteredJobs.length,
    totalFetched: jobs.length,
    errors,
    loading,
    loadingMore,
    hasSearched,
    runSearch,
    clearFilters,
    loadMoreAdzuna,
    canLoadMore: activeSources.includes('adzuna'),
    canShowMoreLocally: visibleCount < filteredJobs.length,
    showMoreLocally: () => setVisibleCount((c) => c + PAGE_SIZE),
  }
}
