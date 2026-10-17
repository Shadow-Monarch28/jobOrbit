import { useTheme } from '../context/ThemeContext'

export default function Logo({ className = 'h-8 w-auto' }) {
  const { theme } = useTheme()
  const src = theme === 'dark' ? '/logo-dark.png' : '/logo.png'
  return <img src={src} alt="JobOrbit" className={className} />
}