import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Public client ID — safe to expose in frontend code/env, it's not a
// secret (the Client Secret never goes anywhere near the browser).
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// Google's script is loaded once and reused if more than one GoogleButton
// ever mounts at the same time (shouldn't normally happen, but harmless).
let scriptPromise = null
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = () => reject(new Error('Could not load Google Sign-In.'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

// Renders Google's own Sign-In button, which runs entirely on this page —
// unlike a redirect-based OAuth flow, the browser never leaves your site,
// so Google's own screens show your domain instead of Supabase's.
export default function GoogleButton({ mode = 'continue' }) {
  const wrapperRef = useRef(null)
  const buttonRef = useRef(null)
  const navigate = useNavigate()
  const { signInWithIdToken } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    let resizeObserver

    async function handleCredentialResponse(response) {
      setError('')
      const { error } = await signInWithIdToken(response.credential)
      if (cancelled) return
      if (error) {
        setError(error.message)
        return
      }
      navigate('/dashboard')
    }

    if (!GOOGLE_CLIENT_ID) {
      setError('Google sign-in is not configured yet (missing VITE_GOOGLE_CLIENT_ID).')
      return
    }

    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !wrapperRef.current) return
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        })

        // Google's button takes a fixed pixel width, not a percentage — a
        // hardcoded 320px overflows the narrowest phones (an iPhone SE's
        // 375px viewport leaves well under 320px once the card's own
        // padding is subtracted). Measure the actual space available and
        // re-render whenever it changes, e.g. on rotation.
        function renderButton() {
          if (!buttonRef.current || !wrapperRef.current) return
          buttonRef.current.innerHTML = ''
          const width = Math.max(200, Math.min(320, Math.floor(wrapperRef.current.offsetWidth)))
          window.google.accounts.id.renderButton(buttonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            width,
            text: mode === 'signup' ? 'signup_with' : 'continue_with',
          })
        }

        renderButton()

        if (window.ResizeObserver) {
          resizeObserver = new ResizeObserver(renderButton)
          resizeObserver.observe(wrapperRef.current)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  return (
    <div ref={wrapperRef} className="w-full flex flex-col items-center gap-1.5">
      <div ref={buttonRef} className="w-full flex justify-center" />
      {error && (
        <p className="text-xs text-center" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
