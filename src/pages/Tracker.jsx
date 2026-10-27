import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { STATUS_OPTIONS } from '../lib/applicationStatus'
import ApplicationCard from '../components/ApplicationCard'

const FILTER_OPTIONS = [{ key: 'all', label: 'All' }, ...STATUS_OPTIONS]

const skipRemoveKey = (userId) => `skipRemoveJobsConfirm:${userId}`

// Same look and behaviour as the "Delete resume?" dialog.
function RemoveJobsModal({ jobs, removing, onCancel, onConfirm }) {
  const [dontAskAgain, setDontAskAgain] = useState(false)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !removing) onCancel()
      }}
    >
      <div
        className="w-full max-w-sm rounded-xl border p-5"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', minWidth: 0 }}
      >
        <h2 className="font-heading font-semibold mb-2">
          {jobs.length === 1 ? 'Remove job?' : `Remove ${jobs.length} jobs?`}
        </h2>
        <p
          className="text-sm text-[var(--color-text-muted)] mb-4"
          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {jobs.length === 1 ? '1 job' : `${jobs.length} jobs`} will be permanently removed from your list. This
          can't be undone.
        </p>

        <label className="flex items-center gap-2 text-sm cursor-pointer mb-5">
          <input type="checkbox" checked={dontAskAgain} onChange={(e) => setDontAskAgain(e.target.checked)} />
          Don't ask me again
        </label>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={removing}
            className="px-4 py-2 rounded-lg border text-sm disabled:opacity-60"
            style={{ borderColor: 'var(--color-border)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(dontAskAgain)}
            disabled={removing}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-danger)' }}
          >
            {removing ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Tracker() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState([])
  const [updatingId, setUpdatingId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState(() => new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [skipConfirm, setSkipConfirm] = useState(false)

  useEffect(() => {
    if (!user) return
    setSkipConfirm(window.localStorage.getItem(skipRemoveKey(user.id)) === 'true')
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

  // Asks first (same dialog style as deleting a resume) unless turned off.
  function requestRemove() {
    if (!selected.size) return
    if (skipConfirm) performRemove()
    else setConfirmingRemove(true)
  }

  async function performRemove() {
    const ids = [...selected]
    setBulkBusy(true)
    const { error } = await supabase.from('applications').delete().in('id', ids).eq('user_id', user.id)
    if (error) console.error('Bulk delete failed:', error.message)
    else setApplications((prev) => prev.filter((a) => !selected.has(a.id)))
    setSelected(new Set())
    setBulkBusy(false)
    setConfirmingRemove(false)
  }

  function handleConfirmRemove(dontAskAgain) {
    if (dontAskAgain) {
      window.localStorage.setItem(skipRemoveKey(user.id), 'true')
      setSkipConfirm(true)
    }
    performRemove()
  }

  function restoreConfirm() {
    window.localStorage.removeItem(skipRemoveKey(user.id))
    setSkipConfirm(false)
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
                onClick={requestRemove}
                disabled={!selected.size || bulkBusy}
                className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-danger)' }}
              >
                Remove selected
              </button>
              <span className="text-[var(--color-text-muted)]">{selected.size} selected</span>
            </div>
          )}
          {statusFilter === 'not_applied' && skipConfirm && (
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-3">
              <span>Remove confirmations are turned off for your account.</span>
              <button onClick={restoreConfirm} className="underline hover:text-[var(--color-text)]">
                Restore default (ask before removing)
              </button>
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

      {confirmingRemove && (
        <RemoveJobsModal
          jobs={applications.filter((a) => selected.has(a.id))}
          removing={bulkBusy}
          onCancel={() => setConfirmingRemove(false)}
          onConfirm={handleConfirmRemove}
        />
      )}
    </div>
  )
}
