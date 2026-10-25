import { useState } from 'react'

export function getDisplayName(user) {
  const meta = user?.user_metadata || {}
  return meta.full_name || meta.name || (user?.email ? user.email.split('@')[0] : 'Account')
}

export function getAvatarUrl(user) {
  return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
}

// The person's chosen picture, or their initial on a gradient when they have
// none (or the image fails to load).
export default function Avatar({ user, size = 40, className = '' }) {
  const url = getAvatarUrl(user)
  const [failedUrl, setFailedUrl] = useState(null)
  const initial = getDisplayName(user).trim()[0]?.toUpperCase() || '?'
  const dim = { width: size, height: size }

  if (url && failedUrl !== url) {
    return (
      <img
        src={url}
        alt=""
        onError={() => setFailedUrl(url)}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={dim}
      />
    )
  }
  return (
    <span
      className={`rounded-full flex items-center justify-center font-semibold text-white shrink-0 ${className}`}
      style={{ ...dim, fontSize: size * 0.42, background: 'linear-gradient(135deg, #6c5ce7, #38bdf8)' }}
    >
      {initial}
    </span>
  )
}
