import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { STATUS_OPTIONS } from '../lib/applicationStatus'
import ApplicationCard from '../components/ApplicationCard'

const FILTER_OPTIONS = [{ key: 'all', label: 'All' }, ...STATUS_OPTIONS]

export default function Tracker() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState([])
  const [updatingId, setUpdatingId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (!user) return
    fetchApplications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function fetchApplications() {
    setLoading(true)
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      .order('applied_at', { ascending: false })

    if (!error) setApplications(data ?? [])
    setLoading(false)
  }

  async function handleStatusChange(applicationId, newStatus) {
    setUpdatingId(applicationId)

    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', applicationId)

    if (error) {
      console.error('Status update failed:', error.message)
    } else {
      setApplications((prev) => prev.map((a) => (a.id === applicationId ? { ...a, status: newStatus } : a)))
    }
    setUpdatingId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[var(--color-text-muted)]">Loading your applications...</p>
      </div>
    )
  }

  const visible =
    statusFilter === 'all' ? applications : applications.filter((a) => a.status === statusFilter)

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s.key] = applications.filter((a) => a.status === s.key).length
    return acc
  }, {})

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <h1 className="font-heading text-2xl font-semibold mb-1">Your Applications, Under Control.</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        One tracker, zero loose ends. Follow every opportunity and update its status as your journey unfolds.
      </p>

      <div className="flex items-center gap-2 flex-wrap mb-6">
        {FILTER_OPTIONS.map((f) => {
          const active = statusFilter === f.key
          const count = f.key === 'all' ? applications.length : counts[f.key]
          return (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className="text-sm px-3 py-1.5 rounded-full border transition-colors"
              style={
                active
                  ? { backgroundColor: 'var(--color-accent)', color: 'white', borderColor: 'var(--color-accent)' }
                  : { borderColor: 'var(--color-border)' }
              }
            >
              {f.label} ({count})
            </button>
          )
        })}
      </div>

      {applications.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          No applications yet — apply to a job from Search Jobs, My Resume, or the Dashboard to start
          tracking it here.
        </p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No applications with this status.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onStatusChange={handleStatusChange}
              updating={updatingId === app.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
