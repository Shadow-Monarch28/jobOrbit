import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { statusLabel, STATUS_COLOR } from '../lib/applicationStatus'

const STATUS_ORDER = ['not_applied', 'applied_pending', 'applied', 'under_review', 'shortlisted', 'not_selected']

function StatusLineChart({ statusCounts, statusOrder }) {
  const width = 600
  const height = 220
  const padding = { top: 28, right: 16, bottom: 34, left: 16 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const counts = statusOrder.map((s) => statusCounts[s] || 0)
  const maxCount = Math.max(1, ...counts)
  const stepX = statusOrder.length > 1 ? innerW / (statusOrder.length - 1) : 0

  const points = counts.map((count, i) => ({
    x: padding.left + stepX * i,
    y: padding.top + innerH - (count / maxCount) * innerH,
    count,
    status: statusOrder[i],
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const baseY = padding.top + innerH
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`

  return (
    <div className="mt-4 overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ minWidth: 480, color: 'var(--color-text-muted)' }}
        role="img"
        aria-label="Applications by status, plotted as a line chart"
      >
        <defs>
          <linearGradient id="ci-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={padding.left} y1={baseY} x2={width - padding.right} y2={baseY} stroke="var(--color-border)" strokeWidth="1" />
        <path d={areaPath} fill="url(#ci-area-fill)" />
        <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p) => (
          <g key={p.status}>
            <circle cx={p.x} cy={p.y} r="4.5" fill={STATUS_COLOR[p.status] || 'var(--color-accent)'} stroke="var(--color-bg)" strokeWidth="1.5" />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor" opacity="0.9">
              {p.count}
            </text>
            <text x={p.x} y={height - 10} textAnchor="middle" fontSize="10" fill="currentColor">
              {statusLabel(p.status)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function StatTile({ value, label }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <p className="text-2xl font-semibold font-heading">{value}</p>
      <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{label}</p>
    </div>
  )
}

export default function CareerInsights() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [statusCounts, setStatusCounts] = useState({})
  const [totalApps, setTotalApps] = useState(0)
  const [mockInterviews, setMockInterviews] = useState(0)
  const [resumeReviews, setResumeReviews] = useState(0)
  const [skills, setSkills] = useState([]) // [{ name, bestRating, attempts }]

  useEffect(() => {
    let active = true
    async function load() {
      if (!user) return
      setLoading(true)

      const [{ data: apps, error: appsErr }, { data: sessions, error: sessErr }] = await Promise.all([
        supabase.from('applications').select('status').eq('user_id', user.id),
        supabase
          .from('ai_sessions')
          .select('mode, status, skill_name, result')
          .eq('user_id', user.id),
      ])

      if (!active) return
      if (appsErr) console.error('CareerInsights applications fetch failed:', appsErr)
      if (sessErr) console.error('CareerInsights ai_sessions fetch failed:', sessErr)

      const counts = {}
      for (const row of apps || []) {
        counts[row.status] = (counts[row.status] || 0) + 1
      }
      setStatusCounts(counts)
      setTotalApps((apps || []).length)

      let mockCount = 0
      let reviewCount = 0
      const skillProgress = new Map() // name -> { bestRating, attempts }
      for (const row of sessions || []) {
        if (row.mode === 'mock_interview' && row.status === 'completed') mockCount += 1
        if (row.mode === 'resume_review' && row.status === 'completed') reviewCount += 1
        if (row.mode === 'skill_builder' && row.skill_name) {
          const key = row.skill_name.trim()
          const entry = skillProgress.get(key) || { bestRating: null, attempts: 0 }
          entry.attempts += 1
          const rating = row.result?.readyRating
          if (typeof rating === 'number' && (entry.bestRating === null || rating > entry.bestRating)) {
            entry.bestRating = rating
          }
          skillProgress.set(key, entry)
        }
      }
      setMockInterviews(mockCount)
      setResumeReviews(reviewCount)

      const skillList = Array.from(skillProgress.entries()).map(([name, v]) => ({ name, ...v }))
      skillList.sort((a, b) => (b.bestRating ?? -1) - (a.bestRating ?? -1))
      setSkills(skillList)

      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [user?.id])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <p className="text-[var(--color-text-muted)]">Loading...</p>
      </div>
    )
  }

  const readySkills = skills.filter((s) => (s.bestRating ?? 0) >= 4).length

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold font-heading">Career Insights</h1>
      <p className="text-[var(--color-text-muted)] mt-1">
        A snapshot of your job search and Orbit Mentor prep, built from your tracked data.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        <StatTile value={totalApps} label="Applications tracked" />
        <StatTile value={mockInterviews} label="Mock interviews completed" />
        <StatTile value={resumeReviews} label="Resume reviews completed" />
        <StatTile value={readySkills} label="Skills interview-ready (4+/5)" />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-semibold">Applications by Status</h2>
        {totalApps === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] mt-2">
            No applications tracked yet.
          </p>
        ) : (
          <div
            className="rounded-xl border p-4 pb-2 mt-4"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <StatusLineChart statusCounts={statusCounts} statusOrder={STATUS_ORDER} />
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-semibold">Skill Progress</h2>
        {skills.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] mt-2">
            No skills practiced yet. Skill gaps found in Resume Review show up in{' '}
            <Link to="/skill-builder" style={{ color: 'var(--color-accent)' }}>
              Skill Builder
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-col gap-2.5 mt-4">
            {skills.map((skill) => (
              <div
                key={skill.name}
                className="rounded-xl border p-3 flex items-center justify-between gap-3 flex-wrap"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
              >
                <div>
                  <p className="text-sm font-medium">{skill.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Practiced {skill.attempts} time{skill.attempts === 1 ? '' : 's'}
                  </p>
                </div>
                {skill.bestRating !== null && (
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{
                      backgroundColor:
                        skill.bestRating >= 4
                          ? 'color-mix(in srgb, var(--color-success) 18%, transparent)'
                          : 'color-mix(in srgb, var(--color-warning) 18%, transparent)',
                      color: skill.bestRating >= 4 ? 'var(--color-success)' : 'var(--color-warning)',
                    }}
                  >
                    Best: {skill.bestRating} / 5
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
