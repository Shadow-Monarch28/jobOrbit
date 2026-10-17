import { useState } from 'react'

// Shows a plain "An error occurred" to the user by default, with a toggle
// to reveal the full technical message (API error text, quota details,
// etc.) on demand — keeps the UI calm for everyday use while still
// letting the person see exactly what went wrong if they want to.
export default function ErrorNotice({ message, onRetry, retryLabel = 'Retry', retryDisabled = false }) {
  const [showDetail, setShowDetail] = useState(false)

  if (!message) return null

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
          An error occurred.
        </p>
        <button
          onClick={() => setShowDetail((v) => !v)}
          className="text-xs underline"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {showDetail ? 'Hide error' : 'Show error'}
        </button>
      </div>

      {showDetail && (
        <pre
          className="text-xs mt-1.5 p-2 rounded-lg border text-left whitespace-pre-wrap break-words max-h-32 overflow-y-auto"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface-alt)',
            color: 'var(--color-text-muted)',
          }}
        >
          {message}
        </pre>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          disabled={retryDisabled}
          className="text-xs px-3 py-1 rounded-lg border mt-2 disabled:opacity-60"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}
