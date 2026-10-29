import { useMemo, useRef, useState } from 'react'

const MAX_SUGGESTIONS = 400

export default function MultiSelectInput({ values, onChange, suggestions = [], placeholder }) {
  const [inputText, setInputText] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const blurTimeout = useRef(null)

  const filteredSuggestions = useMemo(() => {
    const remaining = suggestions.filter((s) => !values.includes(s))
    if (!inputText.trim()) return remaining.slice(0, MAX_SUGGESTIONS)
    const needle = inputText.toLowerCase()
    return remaining.filter((s) => s.toLowerCase().includes(needle)).slice(0, MAX_SUGGESTIONS)
  }, [suggestions, values, inputText])

  function addChip(value) {
    const trimmed = value.trim()
    if (!trimmed || values.includes(trimmed)) return
    onChange([...values, trimmed])
    setInputText('')
  }

  function removeChip(value) {
    onChange(values.filter((v) => v !== value))
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addChip(inputText)
    } else if (e.key === 'Backspace' && inputText === '' && values.length > 0) {
      removeChip(values[values.length - 1])
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  function handleBlur() {
    // Delay so a suggestion's onMouseDown fires before the dropdown unmounts.
    blurTimeout.current = setTimeout(() => setOpen(false), 120)
  }

  return (
    <div className="relative flex-1 min-w-0">
      <div
        className="jo-field flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-lg border bg-transparent min-h-[38px] cursor-text"
        style={{ borderColor: 'var(--color-border)' }}
        onClick={() => inputRef.current?.focus()}
      >
        {values.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          >
            {v}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeChip(v)
              }}
              className="hover:opacity-70 leading-none"
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={values.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-sm py-0.5"
        />
      </div>

      {open && filteredSuggestions.length > 0 && (
        <div
          className="jo-dropdown absolute z-20 mt-1 w-full rounded-lg border shadow-lg max-h-56 overflow-y-auto"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          {filteredSuggestions.map((s) => (
            <button
              type="button"
              key={s}
              onMouseDown={(e) => {
                e.preventDefault() // keep focus on input, fires before blur
                addChip(s)
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-surface-alt)]"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
