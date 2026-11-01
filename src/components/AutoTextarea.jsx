import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

// A textarea the person can drag larger, but never smaller than its own text:
// the minimum height always equals the height the content needs, so it also
// grows by itself as they type. Use it wherever text must stay fully visible.
export default function AutoTextarea({ value, onChange, className = '', style, rows: _rows = 1, ...rest }) {
  const ref = useRef(null)
  const manual = useRef(false) // true once the person has dragged it taller themselves

  const fit = useCallback(() => {
    const el = ref.current
    if (!el) return
    const keep = el.style.height
    el.style.minHeight = '0px'
    el.style.height = '0px'
    const needed = el.scrollHeight + (el.offsetHeight - el.clientHeight)
    el.style.minHeight = `${needed}px`
    // Fit to the text unless it was dragged taller on purpose.
    el.style.height = manual.current && parseFloat(keep) > needed ? keep : `${needed}px`
  }, [])

  useLayoutEffect(() => { fit() }, [value, fit])
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    let lastW = el.offsetWidth
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth !== lastW) { lastW = el.offsetWidth; fit() } // width changed: text wraps differently
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [fit])

  return <textarea ref={ref} value={value ?? ''} onChange={onChange} rows={1} className={`${className} resize-y`} style={{ ...style, overflow: 'hidden' }}
    onPointerUp={(e) => { const el = e.currentTarget; manual.current = el.offsetHeight > parseFloat(el.style.minHeight || '0') + 3; if (!manual.current) fit() }} {...rest} />
}
