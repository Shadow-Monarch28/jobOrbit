import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/logo'


export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="max-w-sm">
          <h1 className="font-heading text-xl font-semibold mb-2">A little reset, coming right up.</h1>
          <p className="text-[var(--color-text-muted)]">
              Check your inbox for the password reset link.
              <span className="block mt-1"> 
                Lost in space? Your spam folder is worth a look.  
                </span>
          </p>
          <Link to="/login" className="inline-block mt-4 text-sm underline" style={{ color: 'var(--color-accent)' }}>
            Back to log in
          </Link>
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
          <div>
            <h1 className="font-heading text-xl font-semibold">Reset your password</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Enter the email on your account and we'll send a reset link.
            </p>
          </div>

          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            {loading ? 'Sending...' : 'Send reset link'}
          </button>

          <p className="text-sm text-[var(--color-text-muted)] text-center">
            <Link to="/login" className="underline">Back to log in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
