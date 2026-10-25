import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const lastUserId = useRef(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      lastUserId.current = data.session?.user?.id ?? null
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const newUserId = newSession?.user?.id ?? null
      // Supabase fires this on every token refresh (including a tab
      // regaining focus), handing back a new session/user object each
      // time even when the signed-in user hasn't changed. Updating state
      // on every one of those re-rendered every page using useAuth() and
      // retriggered any data-fetch effect depending on the user object —
      // this is what caused every page to "reload" on a background
      // refresh. Only update state when the user actually changed (sign
      // in, sign out, or switched accounts).
      if (newUserId === lastUserId.current) return
      lastUserId.current = newUserId
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signUp: (email, password) => supabase.auth.signUp({ email, password }),
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
    // Sends a reset link to the given email. The link lands the person back
    // on /reset-password with a recovery session already established by
    // supabase-js (it parses the token out of the URL automatically).
    resetPassword: (email) =>
      supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${import.meta.env.VITE_SITE_URL || window.location.origin}/reset-password`,
      }),
    // Only works when a recovery (or normal) session is already active —
    // i.e. called from the /reset-password page after following the email
    // link, or from a signed-in settings page.
    updatePassword: (newPassword) => supabase.auth.updateUser({ password: newPassword }),
    // Updates the display name and/or email. The auth listener above ignores
    // updates for the same user id, so the new user object is pushed into
    // state here — that is what refreshes the name everywhere (header, Account).
    // A changed email stays pending until the person confirms it from the
    // link Supabase sends to the new address.
    updateProfile: async ({ name, email }) => {
      const attrs = { data: { full_name: name } }
      if (email) attrs.email = email
      const res = await supabase.auth.updateUser(attrs)
      if (!res.error && res.data?.user) {
        setSession((prev) => (prev ? { ...prev, user: res.data.user } : prev))
      }
      return res
    },
    // Redirect-based Google sign-in. Works, but the browser is sent away to
    // Supabase's own domain to do the Google exchange, so Google's consent
    // screen shows "continue to <project-ref>.supabase.co" instead of your
    // own domain. Kept here in case it's ever needed, but GoogleButton.jsx
    // uses signInWithIdToken below instead, which keeps the user on your
    // own domain throughout.
    signInWithGoogle: () =>
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      }),
    // ID-token sign-in: Google's button runs on your own page, your
    // browser talks to Google directly, and the resulting token is handed
    // to Supabase only to create the session — no redirect to Supabase's
    // domain, so Google's screens show your own site the whole time.
    signInWithIdToken: (googleCredential) =>
      supabase.auth.signInWithIdToken({ provider: 'google', token: googleCredential }),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
