import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import Logo from '../components/logo'

const CAREER_LINKS = [
  { to: '/search', label: 'Discover' },
  { to: '/resume', label: 'Career Profile' },
  { to: '/tracker', label: 'Applications' },
]

const PREPARATION_LINKS = [
  { to: '/interview-lab', label: 'Interview Lab' },
  { to: '/skill-builder', label: 'Skill Builder' },
]

const PROFILE_LINKS = [
  { to: '/skill-builder', label: 'Skill Builder' },
  { to: '/tracker', label: 'Applied Jobs' },
  { to: '/resume#saved-jobs', label: 'Saved Jobs' },
  { to: '/account', label: 'Account Details' },
]

function getDisplayName(user) {
  const meta = user?.user_metadata || {}
  return meta.full_name || meta.name || (user?.email ? user.email.split('@')[0] : 'Account')
}

function getAvatarUrl(user) {
  return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
}

function navLinkClass({ isActive }) {
  return `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive ? '' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
  }`
}

function navLinkStyle({ isActive }) {
  return isActive ? { color: 'var(--color-accent)' } : {}
}

function ChevronDown({ className = '' }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  )
}

// Swaps the logo image based on theme. Both files are plain static assets
// in /public, and preloaded via index.html, so this is just a src swap —
// no fetch-on-demand flash on toggle.
// function Logo({ className = 'h-8 w-auto' }) {
//   const { theme } = useTheme()
//   const src = theme === 'dark' ? '/logo-dark.png' : '/logo.png'
//   return <img src={src} alt="JobOrbit" className={className} />
// }

// Controlled (not pure CSS-hover) so it can close itself the moment a link
// inside is clicked — a hover-only dropdown stays visually open as long as
// the cursor sits over the trigger, even after the click already navigated.
function NavDropdown({ label, links, pathname }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const isAnyActive = links.some((l) => pathname.startsWith(l.to))

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div
      className="relative"
      ref={rootRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isAnyActive ? '' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
        }`}
        style={isAnyActive ? { color: 'var(--color-accent)' } : {}}
      >
        {label}
        <ChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full pt-2 z-40">
          <div
            className="min-w-[180px] rounded-xl border p-1.5 shadow-lg"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? ''
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'
                  }`
                }
                style={({ isActive }) => (isActive ? { color: 'var(--color-accent)' } : {})}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

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

function ProfileMenu({ user, onSignOut, onNavigate }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const displayName = getDisplayName(user)
  const avatarUrl = getAvatarUrl(user)
  const initial = displayName.trim()[0]?.toUpperCase() || '?'

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border transition-colors hover:bg-[var(--color-surface-alt)]"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {initial}
          </span>
        )}
        <span className="text-sm font-medium max-w-[120px] truncate hidden sm:inline">{displayName}</span>
        <ChevronDown className={`text-[var(--color-text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 min-w-[200px] rounded-xl border p-1.5 shadow-lg z-40"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <div className="px-3 py-2 border-b mb-1" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-sm font-medium truncate">{displayName}</p>
            {user?.email && <p className="text-xs text-[var(--color-text-muted)] truncate">{user.email}</p>}
          </div>
          {PROFILE_LINKS.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              onClick={() => {
                setOpen(false)
                onNavigate?.()
              }}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <div className="my-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
          <button
            onClick={() => {
              setOpen(false)
              onSignOut()
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ color: 'var(--color-danger)' }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function DashboardLayout() {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const [navOpen, setNavOpen] = useState(false)

  function closeNav() {
    setNavOpen(false)
  }

  const displayName = getDisplayName(user)
  const avatarUrl = getAvatarUrl(user)
  const initial = displayName.trim()[0]?.toUpperCase() || '?'

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      <header
        className="sticky top-0 z-30 border-b"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <div className="h-14 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setNavOpen(true)}
              aria-label="Open menu"
              className="md:hidden p-2 -ml-2 text-[var(--color-text)]"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <Link to="/dashboard" className="mr-2 flex items-center">
              <Logo />
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/dashboard" end className={navLinkClass} style={navLinkStyle}>
                Home
              </NavLink>
              <NavDropdown label="Career" links={CAREER_LINKS} pathname={pathname} />
              <NavDropdown label="Preparation" links={PREPARATION_LINKS} pathname={pathname} />
              <NavLink to="/insights" className={navLinkClass} style={navLinkStyle}>
                Career Insights
              </NavLink>
              <NavLink to="/how-it-works" className={navLinkClass} style={navLinkStyle}>
                How it Works
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <ProfileMenu user={user} onSignOut={signOut} />
          </div>
        </div>
      </header>

      {navOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={closeNav}
        />
      )}

      <aside
        className={`md:hidden w-72 shrink-0 border-r p-4 flex flex-col gap-1 overflow-y-auto
          fixed top-0 left-0 h-screen z-50
          transition-transform duration-200 ease-in-out
          ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex items-center justify-between px-2 py-3">
          <Link to="/dashboard" onClick={closeNav} className="flex items-center">
            <Logo />
          </Link>
          <button
            onClick={closeNav}
            aria-label="Close menu"
            className="p-1 -mr-1 text-[var(--color-text-muted)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 px-2 py-2 mt-1">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {initial}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
            {user?.email && <p className="text-xs text-[var(--color-text-muted)] truncate">{user.email}</p>}
          </div>
        </div>

        <NavLink to="/dashboard" end onClick={closeNav} className={navLinkClass} style={navLinkStyle}>
          Home
        </NavLink>

        <div className="mt-2">
          <div className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-[var(--color-text-muted)]">
            CAREER
          </div>
          {CAREER_LINKS.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={closeNav} className={navLinkClass} style={navLinkStyle}>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="mt-2">
          <div className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-[var(--color-text-muted)]">
            PREPARATION
          </div>
          {PREPARATION_LINKS.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={closeNav} className={navLinkClass} style={navLinkStyle}>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="mt-2">
          <div className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-[var(--color-text-muted)]">
            MORE
          </div>
          <NavLink to="/insights" onClick={closeNav} className={navLinkClass} style={navLinkStyle}>
            Career Insights
          </NavLink>
          <NavLink to="/how-it-works" onClick={closeNav} className={navLinkClass} style={navLinkStyle}>
            How it Works
          </NavLink>
          <NavLink to="/account" onClick={closeNav} className={navLinkClass} style={navLinkStyle}>
            Account Details
          </NavLink>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <ThemeToggleButtonInline />
          <button
            onClick={signOut}
            className="text-sm text-left px-3 py-2 rounded-lg font-medium"
            style={{ color: 'var(--color-danger)' }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}

function ThemeToggleButtonInline() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      className="text-sm text-left px-3 py-2 rounded-lg font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
    >
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  )
}