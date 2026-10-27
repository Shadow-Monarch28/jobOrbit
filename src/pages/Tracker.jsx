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
  const [selected, setSelected] = useState(() => new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

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

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function changeFilter(key) {
    setStatusFilter(key)
    setSelected(new Set())
  }

  // Bulk actions for the "Not Applied" list.
  async function markSelectedApplied() {
    const ids = [...selected]
    if (!ids.length) return
    setBulkBusy(true)
    const { error } = await supabase
      .from('applications')
      .update({ status: 'applied_pending', updated_at: new Date().toISOString() })
      .in('id', ids)
      .eq('user_id', user.id)
    if (error) console.error('Bulk update failed:', error.message)
    else setApplications((prev) => prev.map((a) => (selected.has(a.id) ? { ...a, status: 'applied_pending' } : a)))
    setSelected(new Set())
    setBulkBusy(false)
  }

  async function removeSelected() {
    const ids = [...selected]
    if (!ids.length) return
    if (!window.confirm(`Remove ${ids.length} job${ids.length === 1 ? '' : 's'} from your list?`)) return
    setBulkBusy(true)
    const { error } = await supabase.from('applications').delete().in('id', ids).eq('user_id', user.id)
    if (error) console.error('Bulk delete failed:', error.message)
    else setApplications((prev) => prev.filter((a) => !selected.has(a.id)))
    setSelected(new Set())
    setBulkBusy(false)
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
              onClick={() => changeFilter(f.key)}
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
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
          No career launches yet! Mark a job as applied and let JobOrbit keep your journey to the stars on
          track.
        </p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No applications with this status.</p>
      ) : (
        <>
          {statusFilter === 'not_applied' && (
            <div className="flex items-center gap-2 flex-wrap mb-3 text-sm">
              <button
                onClick={() => setSelected(selected.size === visible.length ? new Set() : new Set(visible.map((a) => a.id)))}
                className="px-3 py-1.5 rounded-lg border"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {selected.size === visible.length ? 'Clear selection' : 'Select all'}
              </button>
              <button
                onClick={markSelectedApplied}
                disabled={!selected.size || bulkBusy}
                className="px-3 py-1.5 rounded-lg font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                Mark selected as applied
              </button>
              <button
                onClick={removeSelected}
                disabled={!selected.size || bulkBusy}
                className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-danger)' }}
              >
                Remove selected
              </button>
              <span className="text-[var(--color-text-muted)]">{selected.size} selected</span>
            </div>
          )}
          <div className="flex flex-col gap-3">
            {visible.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                onStatusChange={handleStatusChange}
                updating={updatingId === app.id}
                selection={
                  statusFilter === 'not_applied'
                    ? { checked: selected.has(app.id), onToggle: () => toggleSelected(app.id) }
                    : undefined
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
