import { Link } from 'react-router-dom'

// Ordinary inline link, styled like the other links in the app.
export default function PillLink({ to, children }) {
  return (
    <Link to={to} className="underline" style={{ color: 'var(--color-accent)' }}>
      {children}
    </Link>
  )
}
