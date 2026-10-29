import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// A grey circle with a question mark. The short explanation appears on hover
// or keyboard focus, and toggles on tap so it also works on phones.
export default function HelpTip({ text, label = 'What does this do?' }) {
  const [open, setOpen] = useState(false)
  const [shift, setShift] = useState(0)
  const ref = useRef(null)
  const tipRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  // Keep the bubble inside the screen: centred on the icon, nudged sideways if it would overflow.
  useLayoutEffect(() => {
    if (!open || !tipRef.current) return
    const el = tipRef.current
    const r = el.getBoundingClientRect()
    const left = r.left - shift // where it sits when centred
    const right = r.right - shift
    const margin = 8
    let dx = 0
    if (right > window.innerWidth - margin) dx = window.innerWidth - margin - right
    else if (left < margin) dx = margin - left
    if (dx !== shift) setShift(dx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, text])

  return (
    <span
      ref={ref}
      className="relative inline-flex shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
        className="w-[18px] h-[18px] rounded-full inline-flex items-center justify-center text-[11px] font-bold leading-none"
        style={{ backgroundColor: 'var(--color-text-muted)', color: 'var(--color-surface)' }}
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          ref={tipRef}
          style={{ transform: `translateX(calc(-50% + ${shift}px))`, backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          className="absolute z-30 left-1/2 bottom-full mb-2 w-56 rounded-lg border px-3 py-2 text-xs leading-snug shadow-lg text-left font-normal"
        >
          {text}
        </span>
      )}
    </span>
  )
}
