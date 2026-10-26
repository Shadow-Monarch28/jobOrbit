import Logo from '../components/logo'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import OrbitArt from '../components/OrbitArt'
import SocialFooter from '../components/SocialFooter'

const FEATURES = [
  {
    title: 'Discover',
    body: 'Search real listings and see your match score against each one, based on your actual resume.',
  },
  {
    title: 'Track',
    body: 'Every application in one place, with statuses that update as you move through each pipeline.',
  },
  {
    title: 'Orbit Mentor',
    body: 'AI-powered mock interviews, question banks, and resume reviews — matched to each application.',
  },
]

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-9 h-9 shrink-0 rounded-full border flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
      style={{ borderColor: 'var(--color-border)' }}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.742 13.045a8.088 8.088 0 0 1-2.077.27c-4.49 0-8.13-3.639-8.13-8.13 0-1.108.223-2.163.627-3.123A1 1 0 0 0 9.9 .752 10.088 10.088 0 1 0 23.248 14.1a1 1 0 0 0-2.506-1.055z" />
        </svg>
      )}
    </button>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col jo-bg-rings" style={{ '--jo-rx': '76%', '--jo-ry': '38%' }}>
      <header className="flex items-center justify-between px-4 sm:px-8 py-5 max-w-6xl mx-auto w-full">
        <Link to="/" className="flex items-center">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggleButton />
          <Link
            to="/login"
            className="text-sm font-medium px-3 py-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="jo-glow-pill text-sm px-4 py-2 rounded-full font-medium text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-12">
        <div className="w-full max-w-6xl flex items-center justify-between gap-8 px-0 sm:px-4">
          <div className="flex flex-col items-center md:items-start gap-5 max-w-xl text-center md:text-left mx-auto md:mx-0">
            <OrbitArt size={150} variant="violet" float className="md:hidden -mb-2" />
            <h1 className="font-heading text-4xl sm:text-5xl font-semibold leading-tight">
              Find your fit. Make your move.
            </h1>
            <p className="text-[var(--color-text-muted)] max-w-md">
              Upload your resume, match with roles that fit, manage every application, and walk into
              interviews ready with AI-powered prep.
            </p>
            <div className="flex gap-3">
              <Link
                to="/signup"
                className="px-5 py-2.5 rounded-lg font-medium text-white"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
               Find your fit
              </Link>
              <Link
                to="/login"
                className="px-5 py-2.5 rounded-lg font-medium border"
                style={{ borderColor: 'var(--color-border)' }}
              >
                Log in
              </Link>
            </div>
          </div>
          <OrbitArt size={300} variant="violet" float className="hidden md:block mr-6" />
        </div>

        <div className="grid sm:grid-cols-3 gap-4 max-w-4xl w-full mt-6">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="jo-glow-card rounded-xl border p-5 text-left"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                '--jo-glow-delay': `${i * 0.35}s`,
              }}
            >
              <h3 className="font-heading font-semibold">{f.title}</h3>
              <p className="text-sm text-[var(--color-text-muted)] mt-1.5 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-6">
        <SocialFooter />
      </footer>
    </div>
  )
}
