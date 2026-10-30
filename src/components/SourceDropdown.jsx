import { useEffect, useRef, useState } from 'react'
import { SOURCES, buildSourceLink } from '../lib/jobSources/sourceMeta'

// Multi-select dropdown: "All sources", or any combination of specific ones.
// While everything is selected, picking one source narrows to just that one;
// after that each click adds or removes a source (at least one stays on).
export default function SourceDropdown({ selected, onChange, title = '', country = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const apiSources = SOURCES.filter((s) => s.kind === 'api')
  const linkSources = SOURCES.filter((s) => s.kind === 'link')
  const allKeys = apiSources.map((s) => s.key)
  const allSelected = selected.length === allKeys.length

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  function toggle(key) {
    if (allSelected) return onChange([key])
    if (selected.includes(key)) {
      if (selected.length === 1) return
      return onChange(selected.filter((k) => k !== key))
    }
    onChange([...selected, key])
  }

  const names = apiSources.filter((s) => selected.includes(s.key)).map((s) => s.label)
  const summary = allSelected ? 'All sources' : names.length <= 2 ? names.join(', ') : `${names.length} sources selected`

  return (
    <div ref={ref} className="relative min-w-0 w-full sm:w-72">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="jo-field w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border bg-transparent text-sm text-left"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span className="truncate">{summary}</span>
        <span aria-hidden="true" className="text-[var(--color-text-muted)] text-xs">▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="jo-dropdown absolute z-20 mt-1 w-full rounded-lg border shadow-lg max-h-72 overflow-y-auto py-1"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-[var(--color-surface-alt)] font-medium">
            <input type="checkbox" checked={allSelected} onChange={() => onChange(allKeys)} style={{ accentColor: 'var(--color-accent)' }} />
            All sources
          </label>
          <div className="my-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
          {apiSources.map((s) => (
            <label key={s.key} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-[var(--color-surface-alt)]">
              <input
                type="checkbox"
                checked={!allSelected && selected.includes(s.key)}
                onChange={() => toggle(s.key)}
                style={{ accentColor: 'var(--color-accent)' }}
              />
              <span className="flex-1">{s.label}</span>
            </label>
          ))}
          {linkSources.length > 0 && <div className="my-1 border-t" style={{ borderColor: 'var(--color-border)' }} />}
          {linkSources.map((s) => (
            <a
              key={s.key}
              href={buildSourceLink(s.key, { title, country })}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--color-surface-alt)]"
            >
              <span className="flex-1">{s.label}</span>
              <span className="text-[11px] text-[var(--color-text-muted)]">opens site ↗</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
