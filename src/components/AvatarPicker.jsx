import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getDisplayName, getAvatarUrl } from './Avatar'

const PRESETS = Array.from({ length: 19 }, (_, i) => `/avatars/avatar-${String(i + 1).padStart(2, '0')}.jpg`)

const MAX_SIDE = 1400 // px, phone photos are shrunk to this before cropping
const boxSize = () => Math.max(220, Math.min(300, (typeof window !== 'undefined' ? window.innerWidth : 360) - 96))

// Shows the chosen photo with a movable, resizable circular frame. Drag the
// frame to move it, drag the corner dot to resize it. Reports the frame in
// the photo's own pixels when "Upload" is pressed.
function CropStep({ src, busy, onCancel, onConfirm }) {
  const imgRef = useRef(null)
  const dragRef = useRef(null)
  const [disp, setDisp] = useState(null) // displayed photo size
  const [frame, setFrame] = useState(null) // {x, y, s} in displayed px

  function onLoad() {
    const img = imgRef.current
    const BOX = boxSize()
    const k = Math.min(BOX / img.naturalWidth, BOX / img.naturalHeight)
    const dw = img.naturalWidth * k
    const dh = img.naturalHeight * k
    const s = Math.min(dw, dh) * 0.8
    setDisp({ w: dw, h: dh, k })
    setFrame({ x: (dw - s) / 2, y: (dh - s) / 2, s })
  }

  function startDrag(mode) {
    return (e) => {
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = { mode, px: e.clientX, py: e.clientY, start: frame }
    }
  }

  function onMove(e) {
    const d = dragRef.current
    if (!d || !disp) return
    const dx = e.clientX - d.px
    const dy = e.clientY - d.py
    const f = d.start
    if (d.mode === 'move') {
      setFrame({
        ...f,
        x: Math.max(0, Math.min(disp.w - f.s, f.x + dx)),
        y: Math.max(0, Math.min(disp.h - f.s, f.y + dy)),
      })
    } else {
      const maxS = Math.min(disp.w - f.x, disp.h - f.y)
      setFrame({ ...f, s: Math.max(48, Math.min(maxS, f.s + Math.max(dx, dy))) })
    }
  }

  const endDrag = () => {
    dragRef.current = null
  }

  function confirm() {
    onConfirm({ x: frame.x / disp.k, y: frame.y / disp.k, s: frame.s / disp.k, img: imgRef.current })
  }

  return (
    <div>
      <h2 className="font-heading text-lg font-semibold">Crop your photo</h2>
      <p className="text-xs text-[var(--color-text-muted)] mt-1">
        Drag the circle to move it. Drag the corner dot to resize it.
      </p>
      <div
        className="relative mx-auto mt-4 select-none"
        style={{ width: disp?.w ?? 220, height: disp?.h ?? 220, touchAction: 'none' }}
      >
        <img
          ref={imgRef}
          src={src}
          alt=""
          onLoad={onLoad}
          draggable={false}
          className="block"
          style={{ width: disp?.w, height: disp?.h }}
        />
        {frame && (
          <div
            onPointerDown={startDrag('move')}
            onPointerMove={onMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="absolute rounded-full cursor-move"
            style={{
              left: frame.x,
              top: frame.y,
              width: frame.s,
              height: frame.s,
              border: '2px solid #fff',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              touchAction: 'none',
            }}
          >
            <span
              onPointerDown={startDrag('resize')}
              onPointerMove={onMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className="absolute w-5 h-5 rounded-full border-2 cursor-nwse-resize"
              style={{
                right: frame.s * 0.146 - 10,
                bottom: frame.s * 0.146 - 10,
                backgroundColor: 'var(--color-accent)',
                borderColor: '#fff',
                touchAction: 'none',
              }}
            />
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={onCancel}
          disabled={busy}
          className="text-sm px-4 py-2 rounded-lg border disabled:opacity-60"
          style={{ borderColor: 'var(--color-border)' }}
        >
          Cancel
        </button>
        <button
          onClick={confirm}
          disabled={busy || !frame}
          className="text-sm px-4 py-2 rounded-lg font-medium text-white disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </div>
  )
}

// Decodes the picked file and redraws it (max MAX_SIDE px) as a JPEG object URL.
async function shrinkImage(file) {
  const src = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('decode'))
      el.src = src
    })
    const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * k)
    canvas.height = Math.round(img.naturalHeight * k)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.92)
    )
    return URL.createObjectURL(blob)
  } finally {
    URL.revokeObjectURL(src)
  }
}

function cropToBlob({ x, y, s, img }, size = 256) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    canvas.getContext('2d').drawImage(img, x, y, s, s, 0, 0, size, size)
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process that image.'))), 'image/jpeg', 0.9)
  })
}

export default function AvatarPicker({ onClose }) {
  const { user, updateProfile } = useAuth()
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cropSrc, setCropSrc] = useState(null)
  const current = getAvatarUrl(user)

  async function save(url) {
    setBusy(true)
    setError('')
    const { error: err } = await updateProfile({ name: getDisplayName(user), avatarUrl: url })
    setBusy(false)
    if (err) setError(err.message)
    else onClose()
  }

  // Phone cameras make big photos (sometimes with an empty MIME type). The file
  // is read into a smaller JPEG first, which also keeps memory use low.
  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const looksLikeImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i.test(file.name || '')
    if (!looksLikeImage) {
      e.target.value = ''
      return setError('Please choose an image file.')
    }
    setError('')
    setBusy(true)
    try {
      const url = await shrinkImage(file)
      setCropSrc(url)
    } catch {
      setError("We couldn't read that photo. Try a JPG or PNG.")
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  function cancelCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    setError('')
  }

  async function uploadCropped(rect) {
    setBusy(true)
    setError('')
    try {
      const blob = await cropToBlob(rect)
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
        {cropSrc ? (
          <>
            <CropStep src={cropSrc} busy={busy} onCancel={cancelCrop} onConfirm={uploadCropped} />
            {error && (
              <p className="text-sm mt-3" style={{ color: 'var(--color-danger)' }}>
                {error}
              </p>
            )}
          </>
        ) : (
          <>
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
            Upload a photo
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
          </>
        )}
      </div>
    </div>
  )
}
