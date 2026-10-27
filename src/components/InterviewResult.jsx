const METRICS = [
  { key: 'fluency', label: 'Fluency', color: '#8b5cf6' },
  { key: 'grammar', label: 'Grammar', color: '#3b82f6' },
  { key: 'confidence', label: 'Confidence', color: '#10b981' },
  { key: 'relevance', label: 'Relevance', color: '#f59e0b' },
  { key: 'vocabulary', label: 'Vocabulary', color: '#ec4899' },
]

const cardStyle = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }

function Bullets({ items, dot }) {
  return (
    <ul className="mt-3 flex flex-col gap-2 text-sm">
      {(items || []).map((t, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

// End-of-interview report. Older results (saved before the extra scores
// existed) simply skip the sections they have no data for.
export default function InterviewResult({ summary }) {
  const rating = summary.readinessRating
  const score =
    typeof summary.overallScore === 'number' ? summary.overallScore : rating != null ? rating * 20 : null
  const metrics = summary.metrics || null
  const filler = summary.fillerWords || null

  return (
    <div className="p-4 sm:p-5">
      <h3 className="font-heading text-2xl font-semibold text-center">Session Complete!</h3>
      {summary.overallImpression && (
        <p className="text-sm text-[var(--color-text-muted)] text-center mt-2 leading-relaxed max-w-xl mx-auto">
          {summary.overallImpression}
        </p>
      )}

      {score != null && (
        <div className="rounded-xl border p-5 mt-5 text-center" style={cardStyle}>
          <p className="text-sm text-[var(--color-text-muted)]">Overall Score</p>
          <p className="font-heading text-5xl font-bold mt-1" style={{ color: 'var(--color-accent)' }}>
            {score}%
          </p>
          {rating != null && (
            <div className="flex items-center justify-center gap-1 mt-2" aria-label={`${rating} out of 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className="text-xl leading-none"
                  style={{ color: n <= rating ? '#f5b301' : 'var(--color-border)' }}
                >
                  ★
                </span>
              ))}
            </div>
          )}
          {summary.ratingReason && (
            <p className="text-xs text-[var(--color-text-muted)] mt-2 max-w-md mx-auto">{summary.ratingReason}</p>
          )}
        </div>
      )}

      {(metrics || filler) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
          {metrics &&
            METRICS.filter((m) => typeof metrics[m.key] === 'number').map((m) => (
              <div key={m.key} className="rounded-xl border p-4" style={cardStyle}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-[var(--color-text-muted)]">{m.label}</span>
                  <span className="font-heading font-semibold">{metrics[m.key]}%</span>
                </div>
                <div className="h-1.5 rounded-full mt-3 overflow-hidden" style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                  <div className="h-full rounded-full" style={{ width: `${metrics[m.key]}%`, backgroundColor: m.color }} />
                </div>
              </div>
            ))}
          {filler && (
            <div className="rounded-xl border p-4" style={cardStyle}>
              <span className="text-sm text-[var(--color-text-muted)]">Filler Words</span>
              <p className="font-heading text-2xl font-semibold mt-1">{filler.count}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {filler.examples?.length ? filler.examples.join(', ') : 'None spotted'}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3 mt-3">
        <div className="rounded-xl border p-4" style={cardStyle}>
          <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-success)' }}>
            <span aria-hidden="true">✓</span> Strengths
          </h4>
          <Bullets items={summary.strengths} dot="var(--color-success)" />
        </div>
        <div className="rounded-xl border p-4" style={cardStyle}>
          <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
            <span aria-hidden="true">◎</span> Areas to Improve
          </h4>
          <Bullets items={summary.improvements} dot="var(--color-warning)" />
        </div>
      </div>
    </div>
  )
}
