import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { statusLabel, STATUS_COLOR } from '../lib/applicationStatus'

const STATUS_ORDER = ['not_applied', 'applied_pending', 'applied', 'under_review', 'shortlisted', 'not_selected']
const MASTERY_THRESHOLD = 4

function getDisplayName(user) {
  const meta = user?.user_metadata || {}
  return meta.full_name || meta.name || (user?.email ? user.email.split('@')[0] : 'Account')
}

function getAvatarUrl(user) {
  return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
}

function StatTile({ value, label, accent }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <p className="text-2xl font-semibold font-heading" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{label}</p>
    </div>
  )
}

export default function Account() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [mockInterviews, setMockInterviews] = useState(0)
  const [skillsBuilt, setSkillsBuilt] = useState(0)
  const [totalApps, setTotalApps] = useState(0)
  const [statusCounts, setStatusCounts] = useState({})
  const [activeApplied, setActiveApplied] = useState(0)

  useEffect(() => {
    let active = true
    async function load() {
      if (!user) return
      setLoading(true)

      const [{ data: apps, error: appsErr }, { data: sessions, error: sessErr }] = await Promise.all([
        supabase.from('applications').select('status').eq('user_id', user.id),
        supabase.from('ai_sessions').select('mode, status, skill_name, result').eq('user_id', user.id),
      ])

      if (!active) return
      if (appsErr) console.error('Account applications fetch failed:', appsErr)
      if (sessErr) console.error('Account ai_sessions fetch failed:', sessErr)

      const counts = {}
      for (const row of apps || []) {
        counts[row.status] = (counts[row.status] || 0) + 1
      }
      setStatusCounts(counts)
      setTotalApps((apps || []).length)
      // "Active Job Status" = applications sitting in 'applied' awaiting the
      // person's own next update (interview scheduled, rejected, etc.) —
      // not yet moved on in the tracker.
      setActiveApplied(counts.applied || 0)

      let mockCount = 0
      const skillBest = new Map() // skill name (normalized) -> best rating
      for (const row of sessions || []) {
        if (row.mode === 'mock_interview' && row.status === 'completed') mockCount += 1
        if (row.mode === 'skill_builder' && row.skill_name) {
          const key = row.skill_name.trim().toLowerCase()
          const rating = row.result?.readyRating
          if (typeof rating === 'number') {
            const prev = skillBest.get(key) ?? -1
            if (rating > prev) skillBest.set(key, rating)
          }
        }
      }
      setMockInterviews(mockCount)
      setSkillsBuilt(Array.from(skillBest.values()).filter((r) => r >= MASTERY_THRESHOLD).length)

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

  const displayName = getDisplayName(user)
  const avatarUrl = getAvatarUrl(user)
  const initial = displayName.trim()[0]?.toUpperCase() || '?'

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <span
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold text-white shrink-0"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold font-heading truncate">{displayName}</h1>
          {user?.email && <p className="text-sm text-[var(--color-text-muted)] truncate">{user.email}</p>}
        </div>
      </div>

      <h2 className="font-heading text-lg font-semibold mt-8">Account Details</h2>
      <p className="text-sm text-[var(--color-text-muted)] mt-1">
        A quick summary of where you stand across JobOrbit — built from your own tracked data.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <StatTile value={mockInterviews} label="Mock interviews completed" />
        <StatTile value={skillsBuilt} label="Skills built (4+/5)" accent="var(--color-success)" />
        <StatTile value={totalApps} label="Applications tracked" />
        <StatTile value={activeApplied} label="Active — awaiting update" accent="var(--color-warning)" />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-semibold">Job Application Insights</h2>
        {totalApps === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] mt-2">No applications tracked yet.</p>
        ) : (
          <div className="flex flex-col gap-2 mt-3">
            {STATUS_ORDER.map((status) => {
              const count = statusCounts[status] || 0
              if (count === 0) return null
              return (
                <div
                  key={status}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLOR[status] }} />
                    <span className="text-sm">{statusLabel(status)}</span>
                  </div>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              )
            })}
          </div>
        )}
        <Link
          to="/insights"
          className="inline-flex items-center gap-1 text-sm font-medium mt-3"
          style={{ color: 'var(--color-accent)' }}
        >
          See the full breakdown in Career Insights →
        </Link>
      </div>
    </div>
  )
}
