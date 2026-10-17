import { Link } from 'react-router-dom'

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

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      <header className="flex items-center justify-between px-4 sm:px-8 py-5 max-w-6xl mx-auto w-full">
        <Link to="/" className="font-heading text-lg font-semibold">
          JobOrbit
        </Link>
        <div className="flex items-center gap-3">
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

      <main className="flex-1 flex flex-col items-center justify-center gap-8 px-4 text-center py-12">
        <div className="flex flex-col items-center gap-5 max-w-xl">
          <h1 className="font-heading text-4xl sm:text-5xl font-semibold leading-tight">
            Find the roles you're actually a fit for
          </h1>
          <p className="text-[var(--color-text-muted)] max-w-md">
            Upload your resume, get matched against real listings, and track every application —
            plus AI interview prep built for the roles you've applied to.
          </p>
          <div className="flex gap-3">
            <Link
              to="/signup"
              className="px-5 py-2.5 rounded-lg font-medium text-white"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              Get started — it's free
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

      <footer className="text-center text-xs text-[var(--color-text-muted)] py-6">
        JobOrbit — free to use, no paid tiers.
      </footer>
    </div>
  )
}
