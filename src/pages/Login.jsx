import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GoogleButton from '../components/GoogleButton'
import Logo from '../components/logo'
import ThemeToggle from '../components/ThemeToggle'
import OrbitArt from '../components/OrbitArt'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="jo-split-art hidden md:flex flex-col justify-center gap-4 p-12 text-white relative overflow-hidden">
        <OrbitArt size={220} variant="ocean" float className="mb-2" />
        <h2 className="font-heading text-4xl font-semibold leading-tight">Welcome back</h2>
        <p className="text-white/85 max-w-sm">Pick up where you left off: your matches, applications and interview prep are waiting.</p>
      </div>

      <div
        className="flex items-center justify-center px-4 py-10"
        style={{ background: 'linear-gradient(160deg, var(--jo-grad-a), var(--jo-grad-b))' }}
      >
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
            <h1 className="font-heading text-xl font-semibold">Log in</h1>
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
          <div className="flex flex-col gap-1.5">
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-3 py-2 rounded-lg border bg-transparent w-full"
              style={{ borderColor: 'var(--color-border)' }}
            />
            <Link
              to="/forgot-password"
              className="text-xs self-end"
              style={{ color: 'var(--color-accent)' }}
            >
              Forgot password?
            </Link>
          </div>

          {error && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
            <span className="text-xs text-[var(--color-text-muted)]">or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
          </div>

          <GoogleButton />

          <p className="text-sm text-[var(--color-text-muted)] text-center">
            No account? <Link to="/signup" className="underline">Sign up</Link>
          </p>
        </form>
      </div>
      </div>
    </div>
  )
}
