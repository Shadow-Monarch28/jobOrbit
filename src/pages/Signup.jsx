import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GoogleButton from '../components/GoogleButton'
import Logo from '../components/logo'
import ThemeToggle from '../components/ThemeToggle'
import OrbitArt from '../components/OrbitArt'


export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.')
      return
    }
    setError('')
    setLoading(true)
    const { data, error } = await signUp(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    // If email confirmation is on (Supabase default), there's no session yet.
    if (!data.session) {
      setConfirmSent(true)
      return
    }
    navigate('/dashboard')
  }

  if (confirmSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center jo-bg-rings">
        <div>
          <h1 className="font-heading text-xl font-semibold mb-2">Check your email</h1>
          <p className="text-[var(--color-text-muted)]">
            We sent a confirmation link to {email}. Confirm it, then log in.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center gap-10 px-4 py-10 jo-bg-rings"
      style={{ '--jo-rx': '28%', '--jo-ry': '50%' }}
    >
      <OrbitArt size={260} float className="hidden lg:block" />
      <div className="w-full max-w-sm flex flex-col gap-5">
        <Link to="/" className="flex justify-center">
          <Logo />
        </Link>

        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-xl border flex flex-col gap-4"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <div className="flex items-center justify-between">
            <h1 className="font-heading text-xl font-semibold">Create account</h1>
            <ThemeToggle />
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
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-transparent"
            style={{ borderColor: 'var(--color-border)' }}
          />

          <label className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5"
            />
            <span>I agree to the Terms of Service and Privacy Policy.</span>
          </label>

          {error && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
            <span className="text-xs text-[var(--color-text-muted)]">or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
          </div>

          <GoogleButton mode="signup" />

          <p className="text-sm text-[var(--color-text-muted)] text-center">
            Already have an account? <Link to="/login" className="underline">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
