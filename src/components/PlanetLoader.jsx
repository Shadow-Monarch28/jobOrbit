// JobOrbit's loading animation: a little planet with a tilted ring and a moon
// circling it. Uses the accent colour, so it follows the theme.
export default function PlanetLoader({ label = 'Loading...', size = 64, full = false, className = '' }) {
  const box = (
    <div className={`flex flex-col items-center justify-center gap-3 text-sm text-[var(--color-text-muted)] ${className}`} role="status" aria-live="polite">
      <div className="jo-planet" style={{ width: size, height: size }} aria-hidden="true">
        <svg viewBox="0 0 100 100" width={size} height={size}>
          <defs>
            <radialGradient id="jo-pl-body" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="color-mix(in srgb, var(--color-accent) 55%, #ffffff)" />
              <stop offset="60%" stopColor="var(--color-accent)" />
              <stop offset="100%" stopColor="color-mix(in srgb, var(--color-accent) 45%, #000000)" />
            </radialGradient>
          </defs>
          <ellipse cx="50" cy="52" rx="46" ry="12" fill="none" stroke="var(--color-accent)" strokeOpacity=".35" strokeWidth="2" transform="rotate(-20 50 52)" />
          <circle cx="50" cy="50" r="22" fill="url(#jo-pl-body)" />
          <path d="M 4 58 Q 50 72 96 46" fill="none" stroke="var(--color-accent)" strokeOpacity=".75" strokeWidth="3" strokeLinecap="round" transform="rotate(-20 50 52)" clipPath="none" />
        </svg>
        <span className="jo-planet-moon" />
      </div>
      {label && <span>{label}</span>}
    </div>
  )
  return full ? <div className="min-h-[60vh] flex items-center justify-center p-8">{box}</div> : box
}
