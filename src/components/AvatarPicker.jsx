import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getDisplayName, getAvatarUrl } from './Avatar'

const PRESETS = Array.from({ length: 19 }, (_, i) => `/avatars/avatar-${String(i + 1).padStart(2, '0')}.jpg`)

// Center-crops to a square and shrinks to 256px, so uploads stay tiny.
function resizeToSquare(file, size = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const side = Math.min(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      canvas
        .getContext('2d')
        .drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size)
      URL.revokeObjectURL(url)
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process that image.'))), 'image/jpeg', 0.88)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file is not a readable image.'))
    }
    img.src = url
  })
}

export default function AvatarPicker({ onClose }) {
  const { user, updateProfile } = useAuth()
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const current = getAvatarUrl(user)

  async function save(url) {
    setBusy(true)
    setError('')
    const { error: err } = await updateProfile({ name: getDisplayName(user), avatarUrl: url })
    setBusy(false)
    if (err) setError(err.message)
    else onClose()
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Please choose an image file.')
    if (file.size > 10 * 1024 * 1024) return setError('Please choose an image under 10 MB.')
    setBusy(true)
    setError('')
    try {
      const blob = await resizeToSquare(file)
      const path = `${user.id}/avatar.jpg`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      await save(`${data.publicUrl}?v=${Date.now()}`)
    } catch (err) {
      setBusy(false)
      setError(err.message || 'Upload failed. Please try again.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-5 max-h-[90vh] overflow-y-auto"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Profile picture</h2>
          <button onClick={onClose} aria-label="Close" className="text-[var(--color-text-muted)] text-xl leading-none">
            ×
          </button>
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="text-sm px-4 py-2 rounded-lg font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {busy ? 'Saving…' : 'Upload a photo'}
          </button>
          {current && (
            <button
              onClick={() => save('')}
              disabled={busy}
              className="text-sm px-4 py-2 rounded-lg border disabled:opacity-60"
              style={{ borderColor: 'var(--color-border)' }}
            >
              Use my initial
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        <p className="text-xs text-[var(--color-text-muted)] mt-5 mb-2">Or pick one</p>
        <div className="grid grid-cols-5 gap-2.5">
          {PRESETS.map((src) => (
            <button
              key={src}
              onClick={() => save(src)}
              disabled={busy}
              aria-label="Choose this picture"
              className="rounded-full overflow-hidden aspect-square border-2 disabled:opacity-60"
              style={{ borderColor: current === src ? 'var(--color-accent)' : 'transparent' }}
            >
              <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>

        {error && (
          <p className="text-sm mt-3" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
