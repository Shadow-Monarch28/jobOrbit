import { useEffect, useState } from 'react'
import { useJobSearch } from '../hooks/useJobSearch'
import JobCard from '../components/JobCard'
import MultiSelectInput from '../components/MultiSelectInput'
import { JOB_TITLE_SUGGESTIONS } from '../lib/data/jobTitles'
import { LOCATION_SUGGESTIONS } from '../lib/data/locations'
import { SKILL_SUGGESTIONS } from '../lib/data/skills'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const SOURCE_LABEL = { adzuna: 'Adzuna', lever: 'Lever', remoteok: 'RemoteOK', arbeitnow: 'Arbeitnow' }

const WORKPLACE_OPTIONS = [
  { value: 'any', label: 'Any' }, { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' }, { value: 'onsite', label: 'On-site' },
]
const JOB_TYPE_OPTIONS = [
  { value: 'any', label: 'Any' }, { value: 'Full-time', label: 'Full-time' },
  { value: 'Part-time', label: 'Part-time' }, { value: 'Contract', label: 'Contract' },
  { value: 'Internship', label: 'Internship' }, { value: 'Temporary', label: 'Temporary' },
]
const EXPERIENCE_OPTIONS = [
  { value: 'any', label: 'Any' }, { value: 'Entry-level', label: 'Entry-level' },
  { value: 'Mid-level', label: 'Mid-level' }, { value: 'Senior', label: 'Senior' },
]
const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' }, { value: 'newest', label: 'Newest' },
  { value: 'salary_high', label: 'Salary: High → Low' }, { value: 'salary_low', label: 'Salary: Low → High' },
  { value: 'best_match', label: 'Best match' },
]
const DATE_POSTED_OPTIONS = [
  { value: 'any', label: 'Any time' }, { value: '24h', label: 'Past 24 hours' },
  { value: '7d', label: 'Past week' }, { value: '30d', label: 'Past month' },
]

function FilterField({ label, children }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-[var(--color-text-muted)] w-28 shrink-0">{label}</label>
      {children}
    </div>
  )
}

const selectClass = 'flex-1 px-2.5 py-1.5 rounded-lg border bg-transparent text-sm min-w-0'
const inputClass = 'flex-1 px-2.5 py-1.5 rounded-lg border bg-transparent text-sm min-w-0'

export default function Search() {
  const { user } = useAuth()
  const [applicationStatusMap, setApplicationStatusMap] = useState({})
  const [defaultResume, setDefaultResume] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('applications')
      .select('job_source, job_source_id, status')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const map = {}
        for (const row of data ?? []) {
          map[`${row.job_source}:${row.job_source_id}`] = row.status
        }
        setApplicationStatusMap(map)
      })

    supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setDefaultResume((data ?? []).find((r) => r.is_default) ?? null)
      })
  }, [user?.id])

  function handleApplied(key, status) {
    setApplicationStatusMap((prev) => ({ ...prev, [key]: status }))
  }

  const {
    titleChips, setTitleChips,
    locationChips, setLocationChips,
    skillChips, setSkillChips,
    workplaceFilter, setWorkplaceFilter,
    jobTypeFilter, setJobTypeFilter,
    experienceFilter, setExperienceFilter,
    industryFilter, setIndustryFilter,
    salaryMinInput, setSalaryMinInput,
    salaryMaxInput, setSalaryMaxInput,
    includeUnknownSalary, setIncludeUnknownSalary,
    datePostedFilter, setDatePostedFilter,
    sortBy, setSortBy,
    activeSources, setActiveSources,
    allSources,
    availableIndustries,
    jobs,
    totalMatching,
    errors,
    loading,
    loadingMore,
    hasSearched,
    runSearch,
    clearFilters,
    loadMoreAdzuna,
    canLoadMore,
    canShowMoreLocally,
    showMoreLocally,
  } = useJobSearch()

  const allSelected = activeSources.length === allSources.length
  const borderStyle = { borderColor: 'var(--color-border)' }

  function toggleSource(source) {
    setActiveSources((prev) => (prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]))
  }

  return (
    <div className="jo-discover">
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      <h1 className="font-heading text-2xl font-semibold mb-1">Search Jobs</h1>
      <p className="font-heading text-lg font-medium mt-3">Jobs Worth Catching Feelings For.</p>
      <p className="text-sm text-[var(--color-text-muted)] mt-2 mb-8 leading-relaxed">
        Explore real opportunities, find your kind of role, and give your career plot a plot twist.
      </p>

      <div
        className="jo-outer rounded-xl border p-4 mb-6 flex flex-col gap-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <MultiSelectInput
            values={titleChips}
            onChange={setTitleChips}
            suggestions={JOB_TITLE_SUGGESTIONS}
            placeholder="Job title(s) — e.g. Frontend Developer"
          />
          <MultiSelectInput
            values={locationChips}
            onChange={setLocationChips}
            suggestions={LOCATION_SUGGESTIONS}
            placeholder="Country — e.g. India"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FilterField label="Workplace">
            <select value={workplaceFilter} onChange={(e) => setWorkplaceFilter(e.target.value)} className={selectClass} style={borderStyle}>
              {WORKPLACE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FilterField>
          <FilterField label="Job Type">
            <select value={jobTypeFilter} onChange={(e) => setJobTypeFilter(e.target.value)} className={selectClass} style={borderStyle}>
              {JOB_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FilterField>
          <FilterField label="Experience">
            <select value={experienceFilter} onChange={(e) => setExperienceFilter(e.target.value)} className={selectClass} style={borderStyle}>
              {EXPERIENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FilterField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FilterField label="Industry">
            <select value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)} className={selectClass} style={borderStyle}>
              <option value="">Any</option>
              {availableIndustries.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
            </select>
          </FilterField>
          <FilterField label="Sort by">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectClass} style={borderStyle}>
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FilterField>
          <FilterField label="Skills">
            <MultiSelectInput
              values={skillChips}
              onChange={setSkillChips}
              suggestions={SKILL_SUGGESTIONS}
              placeholder="e.g. React, SQL"
            />
          </FilterField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FilterField label="Salary range">
            <div className="flex-1 flex items-center gap-1.5 min-w-0">
              <input type="number" placeholder="Min" value={salaryMinInput} onChange={(e) => setSalaryMinInput(e.target.value)} className={`${inputClass} w-full`} style={borderStyle} />
              <span className="text-[var(--color-text-muted)]">–</span>
              <input type="number" placeholder="Max" value={salaryMaxInput} onChange={(e) => setSalaryMaxInput(e.target.value)} className={`${inputClass} w-full`} style={borderStyle} />
            </div>
          </FilterField>
          <FilterField label="Date posted">
            <select value={datePostedFilter} onChange={(e) => setDatePostedFilter(e.target.value)} className={selectClass} style={borderStyle}>
              {DATE_POSTED_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FilterField>
          <div />
        </div>

        {(salaryMinInput || salaryMaxInput) && (
          <label className="flex items-center gap-1.5 text-sm cursor-pointer text-[var(--color-text-muted)]">
            <input type="checkbox" checked={includeUnknownSalary} onChange={(e) => setIncludeUnknownSalary(e.target.checked)} />
            Include jobs without salary data
          </label>
        )}

        <button
          type="button"
          onClick={clearFilters}
          className="self-start text-sm px-3 py-1.5 rounded-lg border transition-colors hover:text-white"
          style={borderStyle}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          Clear Selection
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-[var(--color-text-muted)] w-28 shrink-0">Sources</span>
          <button
            type="button"
            onClick={() => setActiveSources(allSources)}
            className={`text-sm px-3 py-1 rounded-full border transition-colors ${allSelected ? 'jo-chip-on' : 'jo-chip-off'}`}
            style={allSelected ? { backgroundColor: 'var(--color-accent)', color: 'white', borderColor: 'var(--color-accent)' } : borderStyle}
          >
            All
          </button>
          {allSources.map((key) => {
            const active = activeSources.includes(key)
            return (
              <button
                type="button"
                key={key}
                onClick={() => toggleSource(key)}
                className={`text-sm px-3 py-1 rounded-full border transition-colors ${active ? 'jo-chip-on' : 'jo-chip-off'}`}
                style={active ? { backgroundColor: 'var(--color-accent)', color: 'white', borderColor: 'var(--color-accent)' } : borderStyle}
              >
                {SOURCE_LABEL[key]}
              </button>
            )
          })}
        </div>

      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border px-4 py-3 mb-4 text-sm" style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}>
          {errors.map((e, i) => (
            <div key={i}>{SOURCE_LABEL[e.source] ?? e.source} is unavailable right now ({e.message}). Showing results from the other sources.</div>
          ))}
        </div>
      )}

      {loading && (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl border animate-pulse" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-alt)' }} />
          ))}
        </div>
      )}

      {!loading && hasSearched && jobs.length === 0 && (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          No jobs matched your filters. Try loosening the salary range, job type, or date-posted filter, or enable more sources.
        </div>
      )}

      {!loading && jobs.length > 0 && (() => {
        // Jobs you've already applied to move to the Applications view
        // instead of staying in Search results.
        // A job parked as "Not Applied" still counts as not applied, so it stays visible.
        const trackedStatus = (job) => {
          const st = applicationStatusMap[`${job.source}:${job.sourceId}`]
          return st === 'not_applied' ? undefined : st
        }
        const visibleJobs = jobs.filter((job) => !trackedStatus(job))
        return (
          <>
            <p className="text-sm text-[var(--color-text-muted)] mb-3">
              {visibleJobs.length} job{visibleJobs.length === 1 ? '' : 's'} shown
            </p>
            <div className="grid gap-4">
              {visibleJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  applicationStatus={trackedStatus(job)}
                  defaultResume={defaultResume}
                  onApplied={handleApplied}
                />
              ))}
            </div>
            <div className="flex justify-center gap-3 mt-6">
              {canShowMoreLocally && (
                <button onClick={showMoreLocally} className="px-5 py-2 rounded-lg border text-sm" style={borderStyle}>Show more</button>
              )}
              {!canShowMoreLocally && canLoadMore && (
                <button onClick={loadMoreAdzuna} disabled={loadingMore} className="px-5 py-2 rounded-lg border text-sm disabled:opacity-60" style={borderStyle}>
                  {loadingMore ? 'Loading...' : 'Load more from Adzuna'}
                </button>
              )}
            </div>
          </>
        )
      })()}
    </div>
    </div>
  )
}
