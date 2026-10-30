import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import Logo from '../components/logo'
import Avatar, { getDisplayName } from '../components/Avatar'
import SocialFooter from '../components/SocialFooter'

const CAREER_LINKS = [
  { to: '/search', label: 'Discover' },
  { to: '/saved-jobs', label: 'Saved Jobs' },
  { to: '/tracker', label: 'Applications' },
]

const PREPARATION_LINKS = [
  { to: '/interview-lab', label: 'Interview Lab' },
  { to: '/skill-builder', label: 'Skill Builder' },
  { to: '/resume-builder', label: 'Resume Builder' },
]

const PROFILE_LINKS = [
  { to: '/skill-builder', label: 'Skill Builder' },
  { to: '/tracker', label: 'Applied Jobs' },
  { to: '/saved-jobs', label: 'Saved Jobs' },
  { to: '/account', label: 'Account Details' },
]

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
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
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

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border transition-colors hover:bg-[var(--color-surface-alt)]"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <Avatar user={user} size={28} />
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

// ---- Mobile / tablet menu -------------------------------------------------
// Drops down from the header (full width, big touch-friendly rows with icons,
// expandable groups) instead of sliding in from the side. The theme toggle is
// not repeated here: it already lives in the header.
const ICON_PROPS = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
const MENU_ICONS = {
  home: <svg {...ICON_PROPS}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></svg>,
  career: <svg {...ICON_PROPS}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" /></svg>,
  prep: <svg {...ICON_PROPS}><path d="M2 9l10-5 10 5-10 5-10-5z" /><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" /></svg>,
  insights: <svg {...ICON_PROPS}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  how: <svg {...ICON_PROPS}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" /></svg>,
  logout: <svg {...ICON_PROPS}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>,
}

function menuRowClass(isActive) {
  return `flex items-center gap-3 w-full px-3 py-3 rounded-xl text-base font-medium transition-colors ${
    isActive ? 'bg-[var(--color-surface-alt)]' : 'text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'
  }`
}

function MenuGroup({ label, icon, links, open, onToggle, pathname, onClose }) {
  const active = links.some((l) => pathname.startsWith(l.to))
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`${menuRowClass(false)} justify-between`}
        style={active ? { color: 'var(--color-accent)' } : undefined}
      >
        <span className="flex items-center gap-3">
          {icon}
          {label}
        </span>
        <ChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="ml-6 pl-4 border-l flex flex-col gap-0.5 my-1" style={{ borderColor: 'var(--color-border)' }}>
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => `${menuRowClass(isActive)} !py-2.5 !text-[15px]`}
              style={({ isActive }) => (isActive ? { color: 'var(--color-accent)' } : {})}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

function MobileMenu({ user, pathname, onClose, onSignOut }) {
  const displayName = getDisplayName(user)
  const [openGroup, setOpenGroup] = useState(() =>
    CAREER_LINKS.some((l) => pathname.startsWith(l.to))
      ? 'career'
      : PREPARATION_LINKS.some((l) => pathname.startsWith(l.to))
        ? 'prep'
        : null,
  )

  const rowStyle = ({ isActive }) => (isActive ? { color: 'var(--color-accent)' } : {})

  return (
    <nav
      id="mobile-menu"
      aria-label="Main menu"
      className="lg:hidden absolute left-0 right-0 top-full border-b shadow-xl max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain px-3 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <NavLink to="/dashboard" end onClick={onClose} className={({ isActive }) => menuRowClass(isActive)} style={rowStyle}>
        {MENU_ICONS.home}
        Home
      </NavLink>
      <MenuGroup
        label="Career"
        icon={MENU_ICONS.career}
        links={CAREER_LINKS}
        open={openGroup === 'career'}
        onToggle={() => setOpenGroup(openGroup === 'career' ? null : 'career')}
        pathname={pathname}
        onClose={onClose}
      />
      <MenuGroup
        label="Preparation"
        icon={MENU_ICONS.prep}
        links={PREPARATION_LINKS}
        open={openGroup === 'prep'}
        onToggle={() => setOpenGroup(openGroup === 'prep' ? null : 'prep')}
        pathname={pathname}
        onClose={onClose}
      />
      <NavLink to="/insights" onClick={onClose} className={({ isActive }) => menuRowClass(isActive)} style={rowStyle}>
        {MENU_ICONS.insights}
        Career Insights
      </NavLink>
      <NavLink to="/how-it-works" onClick={onClose} className={({ isActive }) => menuRowClass(isActive)} style={rowStyle}>
        {MENU_ICONS.how}
        How it Works
      </NavLink>

      <div className="mt-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar user={user} size={40} />
          <div className="min-w-0">
            <p className="font-semibold truncate">{displayName}</p>
            {user?.email && <p className="text-sm text-[var(--color-text-muted)] truncate">{user.email}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className={`${menuRowClass(false)} mt-1`}
          style={{ color: 'var(--color-danger)' }}
        >
          {MENU_ICONS.logout}
          Sign out
        </button>
      </div>
    </nav>
  )
}

export default function DashboardLayout() {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  // The menu counts as open only on the page it was opened from, so any
  // navigation (a tap, the back button) closes it without an effect.
  const [menuPath, setMenuPath] = useState(null)
  const navOpen = menuPath === pathname
  const setNavOpen = (v) => setMenuPath(v ? pathname : null)

  function closeNav() {
    setNavOpen(false)
  }

  // Close on Escape and when the screen grows to desktop.
  useEffect(() => {
    if (!navOpen) return undefined
    function onKey(e) {
      if (e.key === 'Escape') setMenuPath(null)
    }
    const mq = window.matchMedia('(min-width: 1024px)')
    function onMq(e) {
      if (e.matches) setMenuPath(null)
    }
    window.addEventListener('keydown', onKey)
    mq.addEventListener('change', onMq)
    return () => {
      window.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onMq)
    }
  }, [navOpen])

  return (
    <div className="relative isolate min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div aria-hidden="true" className="jo-bg-rings jo-fixed-bg" style={{ '--jo-rx': '84%', '--jo-ry': '22%' }} />
      <header
        className="sticky top-0 z-30 border-b"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <div className="h-14 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 min-w-0">
            <Link to="/dashboard" className="mr-2 flex items-center">
              <Logo />
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
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
            <button
              type="button"
              onClick={() => setNavOpen(!navOpen)}
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={navOpen}
              aria-controls="mobile-menu"
              className="lg:hidden p-2 -mr-2 text-[var(--color-text)]"
            >
              {navOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {navOpen && <MobileMenu user={user} pathname={pathname} onClose={closeNav} onSignOut={signOut} />}
      </header>

      {navOpen && (
        <div
          aria-hidden="true"
          className="lg:hidden fixed inset-0 top-14 z-20"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={closeNav}
        />
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1">
          <Outlet />
        </div>
        <SocialFooter className="py-5 px-4" />
      </main>
    </div>
  )
}
