import { useTheme } from '../context/ThemeContext'

// Both files share the exact same canvas size so the logo never jumps when
// the theme changes. logo-dark.png has the "Job" wordmark in white.
export default function Logo({ className = 'h-8 w-auto' }) {
  const { theme } = useTheme()
  const src = theme === 'dark' ? '/logo-dark.png' : '/logo.png'
  return <img src={src} alt="JobOrbit" className={className} />
}
