import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// Stops accidental exits from an editor with unsaved work. Clicking any in-app
// link, or pressing the browser's back button, opens a friendly in-page prompt
// (Save, Discard or keep editing) instead of the browser's plain pop-up.
// `onSave` must save and resolve true on success. Closing the tab can only use
// the browser's own warning, which pages are not allowed to restyle.
export default function UnsavedGuard({ dirty, onSave, saving, copy = {} }) {
  const c = { icon: '✨', title: "Hold up, your masterpiece isn't saved!", body: 'These edits only live in this tab right now. Save them, or let them drift off into the void?', save: '💾 Save & leave', discard: 'Discard changes', keep: 'Keep editing', ...copy }
  const navigate = useNavigate()
  const location = useLocation()
  const [pending, setPending] = useState(null) // { to } | { back: true }
  const [err, setErr] = useState('')
  const dirtyRef = useRef(dirty)
  const pushed = useRef(false)
  const allow = useRef(false)
  const hereRef = useRef(location.pathname + location.search)
  hereRef.current = location.pathname + location.search
  useEffect(() => { dirtyRef.current = dirty }, [dirty])

  // closing or reloading the tab
  useEffect(() => {
    const warn = (e) => { if (dirtyRef.current && !allow.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  // any link inside the app
  useEffect(() => {
    const onClick = (e) => {
      if (!dirtyRef.current || allow.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target.closest?.('a[href]')
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin) return
      const to = url.pathname + url.search + url.hash
      if (url.pathname + url.search === hereRef.current) return
      e.preventDefault()
      e.stopPropagation()
      setErr('')
      setPending({ to })
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  // the browser's back button: park one extra history entry so the first press stays on the page
  useEffect(() => {
    if (dirty && !pushed.current) { window.history.pushState({ unsavedGuard: true }, ''); pushed.current = true }
  }, [dirty])
  useEffect(() => {
    const onPop = () => {
      if (!pushed.current) return
      pushed.current = false
      if (dirtyRef.current && !allow.current) { setErr(''); setPending({ back: true }) }
      else if (!allow.current) window.history.back()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const go = useCallback((p) => {
    allow.current = true
    setPending(null)
    if (p.back) window.history.back()
    else navigate(p.to)
  }, [navigate])

  async function saveAndLeave() {
    setErr('')
    const ok = await onSave()
    if (ok) go(pending)
    else setErr("We couldn't save it just now. Try again, or keep editing.")
  }

  if (!pending) return null
  const btn = 'px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60'
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,.6)' }} role="presentation">
      <div role="alertdialog" aria-modal="true" aria-labelledby="ug-title" className="w-full max-w-md rounded-2xl border p-6 shadow-2xl" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="text-3xl mb-2" aria-hidden="true">{c.icon}</div>
        <h2 id="ug-title" className="font-heading text-xl font-semibold">{c.title}</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-2 leading-relaxed">
          {c.body}
        </p>
        {err && <p className="text-sm mt-3" style={{ color: 'var(--color-danger)' }}>{err}</p>}
        <div className="flex flex-col gap-2 mt-5">
          <button onClick={saveAndLeave} disabled={saving} className={`${btn} text-white`} style={{ backgroundColor: 'var(--color-accent)' }}>{saving ? 'Saving...' : c.save}</button>
          <button onClick={() => go(pending)} disabled={saving} className={`${btn} border`} style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>🗑 {c.discard}</button>
          <button onClick={() => setPending(null)} disabled={saving} className={`${btn} text-[var(--color-text-muted)]`}>{c.keep}</button>
        </div>
      </div>
    </div>
  )
}
