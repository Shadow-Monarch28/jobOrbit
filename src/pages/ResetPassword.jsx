import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/logo'


// Reached by following the link in the reset-password email. supabase-js
// reads the recovery token out of the URL automatically on load and
// establishes a session for it — that's what AuthContext's `user` reflects
// here. No token handling needed in this component itself.
export default function ResetPassword() {
  const { user, loading: authLoading, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
    setTimeout(() => navigate('/dashboard'), 1500)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
        <p className="text-[var(--color-text-muted)]">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="max-w-sm">
          <h1 className="font-heading text-xl font-semibold mb-2">Link expired</h1>
          <p className="text-[var(--color-text-muted)]">
            This password reset link is invalid or has expired. Request a new one to continue.
          </p>
          <Link to="/forgot-password" className="inline-block mt-4 text-sm underline" style={{ color: 'var(--color-accent)' }}>
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div>
          <h1 className="font-heading text-xl font-semibold mb-2">Password updated</h1>
          <p className="text-[var(--color-text-muted)]">Taking you to your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm flex flex-col gap-5">
        <Link to="/" className="font-heading text-lg font-semibold text-center">
          <Logo />
        </Link>

        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-xl border flex flex-col gap-4"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <h1 className="font-heading text-xl font-semibold">Set a new password</h1>

          <input
            type="password"
            required
            minLength={6}
            placeholder="New password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-transparent"
            style={{ borderColor: 'var(--color-border)' }}
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-transparent"
            style={{ borderColor: 'var(--color-border)' }}
          />

          {error && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
