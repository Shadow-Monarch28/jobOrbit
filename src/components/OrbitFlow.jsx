const STEPS = [
  {
    label: 'Upload',
    color: '#7c6cf0',
    icon: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M12 18v-6" />
        <path d="m9 15 3-3 3 3" />
      </>
    ),
  },
  {
    label: 'Discover',
    color: '#3b82f6',
    icon: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </>
    ),
  },
  {
    label: 'Apply',
    color: '#14b8a6',
    icon: (
      <>
        <path d="m22 2-7 20-4-9-9-4z" />
        <path d="M22 2 11 13" />
      </>
    ),
  },
  {
    label: 'Review',
    color: '#f5b301',
    icon: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
        <path d="M10 9H8" />
      </>
    ),
  },
  {
    label: 'Improve',
    color: '#ec4899',
    icon: (
      <>
        <path d="M12 20V10" />
        <path d="M18 20V4" />
        <path d="M6 20v-4" />
      </>
    ),
  },
  {
    label: 'Grow',
    color: '#8b5cf6',
    icon: (
      <>
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </>
    ),
  },
]

// Six glowing steps joined by a gradient line: Upload → Grow.
export default function OrbitFlow() {
  return (
    <ol className="flex items-start mt-6" aria-label="Upload, Discover, Apply, Review, Improve, Grow">
      {STEPS.map((s, i) => (
        <li key={s.label} className="contents">
          <div className="flex flex-col items-center gap-2 shrink-0 w-11 sm:w-16">
            <span
              className="w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2"
              style={{
                borderColor: s.color,
                backgroundColor: `color-mix(in srgb, ${s.color} 18%, var(--color-surface))`,
                boxShadow: `0 0 14px 0 color-mix(in srgb, ${s.color} 45%, transparent)`,
                color: s.color,
              }}
            >
              <svg
                className="w-[18px] h-[18px] sm:w-6 sm:h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {s.icon}
              </svg>
            </span>
            <span className="text-[10px] sm:text-sm font-medium text-center">{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="flex-1 relative h-0.5 mt-5 sm:mt-7 min-w-2">
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: `linear-gradient(90deg, ${s.color}, ${STEPS[i + 1].color})` }}
              />
              <span
                className="absolute top-1/2 left-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ backgroundColor: STEPS[i + 1].color }}
              />
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}
