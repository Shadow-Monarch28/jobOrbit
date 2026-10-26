import { Link } from 'react-router-dom'

// Inline link shown as a soft pill with an arrow (styles: .jo-pill-link in index.css).
export default function PillLink({ to, children }) {
  return (
    <Link to={to} className="jo-pill-link">
      {children}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    </Link>
  )
}
