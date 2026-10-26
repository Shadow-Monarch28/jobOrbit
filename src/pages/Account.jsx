import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { statusLabel, STATUS_COLOR } from '../lib/applicationStatus'
import OrbitArt from '../components/OrbitArt'
import Avatar, { getDisplayName } from '../components/Avatar'
import AvatarPicker from '../components/AvatarPicker'
import Resume from './Resume'

const STATUS_ORDER = ['not_applied', 'applied_pending', 'applied', 'under_review', 'shortlisted', 'not_selected']
const MASTERY_THRESHOLD = 4

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

function EditProfileModal({ user, isGoogle, onClose }) {
  const { updateProfile } = useAuth()
  const [name, setName] = useState(getDisplayName(user))
  const [email, setEmail] = useState(user?.email || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const nameRef = useRef(null)

  useEffect(() => {
    nameRef.current?.focus()
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    const cleanName = name.trim()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanName) return setError('Please enter your name.')
    if (cleanName.length > 60) return setError('Name must be 60 characters or fewer.')
    const emailChanged = !isGoogle && cleanEmail !== (user?.email || '').toLowerCase()
    if (emailChanged && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return setError('Please enter a valid email address.')
    }
    setSaving(true)
    const { error: err } = await updateProfile({ name: cleanName, email: emailChanged ? cleanEmail : null })
    setSaving(false)
    if (err) return setError(err.message || 'Could not save your changes.')
    if (emailChanged) {
      setNotice(`We sent a confirmation link to ${cleanEmail}. Your email changes after you confirm it.`)
    } else {
      onClose()
    }
  }

  const inputClass = 'px-3 py-2 rounded-lg border bg-transparent w-full'
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        onSubmit={handleSave}
        className="w-full max-w-sm rounded-xl border p-6 flex flex-col gap-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <h2 id="edit-profile-title" className="font-heading text-lg font-semibold">
          Edit account details
        </h2>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--color-text-muted)]">Name</span>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className={inputClass}
            style={{ borderColor: 'var(--color-border)' }}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--color-text-muted)]">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isGoogle}
            className={`${inputClass} disabled:opacity-60`}
            style={{ borderColor: 'var(--color-border)' }}
          />
          {isGoogle ? (
            <span className="text-xs text-[var(--color-text-muted)]">
              Your email comes from your Google account, so it can't be changed here.
            </span>
          ) : (
            <span className="text-xs text-[var(--color-text-muted)]">
              Changing it sends a confirmation link to the new address.
            </span>
          )}
        </label>

        {error && (
          <p role="alert" className="text-sm" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm" style={{ color: 'var(--color-success)' }}>
            {notice}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border text-sm font-medium"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {notice ? 'Close' : 'Cancel'}
          </button>
          {!notice && (
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default function Account() {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [pickingAvatar, setPickingAvatar] = useState(false)
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

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null
  const provider = user?.app_metadata?.provider === 'google' ? 'Google' : 'Email & password'

  return (
    <div className="min-h-full">
      <div className="p-4 sm:p-8 max-w-4xl mx-auto">
        <div className="relative flex items-center gap-4 pr-0 sm:pr-40 sm:min-h-[100px]">
          <div className="relative group shrink-0">
            <Avatar user={user} size={56} />
            <button
              type="button"
              onClick={() => setPickingAvatar(true)}
              aria-label="Change profile picture"
              title="Change profile picture"
              className="absolute inset-0 rounded-full flex items-center justify-center text-white bg-black/55 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 [@media(hover:none)]:bg-black/30 transition-opacity"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
            </button>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold font-heading truncate">Hi, {displayName}</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Your orbit so far</p>
          </div>
          <OrbitArt size={116} variant="emerald" float className="absolute right-0 -top-3 hidden sm:block" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <StatTile value={mockInterviews} label="Mock interviews completed" />
          <StatTile value={skillsBuilt} label="Skills built (4+/5)" accent="var(--color-success)" />
          <StatTile value={totalApps} label="Applications tracked" />
          <StatTile value={activeApplied} label="Active — awaiting update" accent="var(--color-warning)" />
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <section
            className="rounded-xl border p-5"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-base font-semibold">Account Details</h2>
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Edit account details"
                title="Edit name and email"
                className="w-8 h-8 rounded-lg border flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
                  <path d="M18.4 2.6a2 2 0 0 1 2.8 2.8L12 14.6 8 15.6l1-4z" />
                </svg>
              </button>
            </div>
            <dl className="mt-3 text-sm">
              {[
                ['Name', displayName],
                ['Email', user?.email || '—'],
                ['Sign-in method', provider],
                ...(memberSince ? [['Member since', memberSince]] : []),
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-4 py-2 border-b last:border-b-0"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <dt className="text-[var(--color-text-muted)]">{k}</dt>
                  <dd className="font-medium truncate">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section
            className="rounded-xl border p-5"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <h2 className="font-heading text-base font-semibold">Job Application Insights</h2>
            {totalApps === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] mt-3">No applications tracked yet.</p>
            ) : (
              <div className="flex flex-col gap-2 mt-3">
                {STATUS_ORDER.map((status) => {
                  const count = statusCounts[status] || 0
                  if (count === 0) return null
                  return (
                    <div
                      key={status}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                      style={{ borderColor: 'var(--color-border)' }}
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
              className="inline-flex items-center gap-1 text-sm font-medium mt-4"
              style={{ color: 'var(--color-accent)' }}
            >
              See the full breakdown in Career Insights →
            </Link>
          </section>
        </div>

        <section
          className="rounded-xl border p-5 mt-4"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <Resume mode="resume" />
        </section>
      </div>
      {pickingAvatar && <AvatarPicker onClose={() => setPickingAvatar(false)} />}
      {editing && <EditProfileModal user={user} isGoogle={provider === 'Google'} onClose={() => setEditing(false)} />}
    </div>
  )
}
