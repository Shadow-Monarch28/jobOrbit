import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { extractResumeText } from '../lib/resumeParser'
import { extractSkillsFromText } from '../lib/matchingEngine'
import SavedJobsMatchSection from '../components/SavedJobsMatchSection'

function skipDeleteConfirmKey(userId) {
  return `skipDeleteConfirm:${userId}`
}

// Turns a raw Supabase storage error into something a person can act on.
// "Object not found" (or a 404-shaped error) means the file really is
// gone from storage — the record in the resumes table outlived its file,
// most likely from an interrupted upload/replace at some point — so the
// fix is to re-upload, not to keep retrying View/Download. Anything else
// is surfaced as-is since it's usually a storage permissions problem.
function describeStorageError(error, action) {
  const message = error?.message || ''
  const notFound = /not.?found|404/i.test(message)
  if (notFound) {
    return `Couldn't find this file in storage — it may have been lost in an earlier upload. Use "Replace file" below to re-upload it.`
  }
  return message
    ? `Couldn't ${action} this file: ${message}`
    : `Couldn't ${action} this file. Please try again.`
}

function ResumeFileCard({ resume, isDefault, onRequestDelete, onReplaced, onSetDefault, user }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('')
  const [error, setError] = useState('')
  const menuRef = useRef(null)
  const replaceInputRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleView() {
    setBusy(true)
    setMenuOpen(false)
    setError('')
    const { data, error: viewError } = await supabase.storage
      .from('resumes')
      .createSignedUrl(resume.file_path, 60)
    setBusy(false)
    // This used to fail silently — clicking "View" on a resume whose file
    // was missing from storage (or blocked by a storage policy) just did
    // nothing, with no way to tell those two cases apart. Surfacing the
    // real Supabase error is what actually diagnoses "can't find the PDF":
    // "Object not found" means the file is genuinely gone (try Replace
    // file below), anything else usually points at storage permissions.
    if (viewError || !data?.signedUrl) {
      setError(describeStorageError(viewError, 'open'))
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function handleDownload() {
    setBusy(true)
    setMenuOpen(false)
    setError('')
    const { data, error: downloadError } = await supabase.storage.from('resumes').download(resume.file_path)
    setBusy(false)
    if (downloadError || !data) {
      setError(describeStorageError(downloadError, 'download'))
      return
    }

    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = resume.file_name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function handleReplaceClick() {
    setMenuOpen(false)
    replaceInputRef.current?.click()
  }

  async function handleReplaceFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError('')
    setBusy(true)

    try {
      setBusyLabel('Reading file...')
      const parsedText = await extractResumeText(file)

      if (!parsedText || parsedText.length < 20) {
        throw new Error(
          "Couldn't extract readable text from this file. It might be a scanned image rather than selectable text."
        )
      }

      setBusyLabel('Extracting skills...')
      const parsedSkills = extractSkillsFromText(parsedText)

      setBusyLabel('Uploading new file...')
      const newFilePath = `${user.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(newFilePath, file, { upsert: false })
      if (uploadError) throw uploadError

      setBusyLabel('Updating record...')
      const { error: updateError } = await supabase
        .from('resumes')
        .update({
          file_path: newFilePath,
          file_name: file.name,
          parsed_text: parsedText,
          parsed_skills: parsedSkills,
          uploaded_at: new Date().toISOString(),
        })
        .eq('id', resume.id)

      if (updateError) {
        await supabase.storage.from('resumes').remove([newFilePath])
        throw updateError
      }

      await supabase.storage.from('resumes').remove([resume.file_path])

      setBusy(false)
      setBusyLabel('')
      onReplaced()
    } catch (err) {
      setBusy(false)
      setBusyLabel('')
      setError(err.message ?? 'Something went wrong while replacing this file.')
    }
  }

  async function handleSetDefaultClick() {
    setMenuOpen(false)
    setBusy(true)
    await onSetDefault(resume.id)
    setBusy(false)
  }

  return (
    <div
      className="rounded-xl border p-4 flex items-center justify-between gap-3"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <input
        type="file"
        accept=".pdf,.docx"
        ref={replaceInputRef}
        onChange={handleReplaceFileChange}
        className="hidden"
      />

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{resume.file_name}</p>
          {isDefault && (
            <span
              className="text-xs px-2 py-0.5 rounded-full shrink-0"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-success) 18%, transparent)', color: 'var(--color-success)' }}
            >
              Default
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          {busy && busyLabel ? busyLabel : `Uploaded ${new Date(resume.uploaded_at).toLocaleDateString()}`}
        </p>
        {resume.parsed_skills?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {resume.parsed_skills.slice(0, 12).map((skill) => (
              <span
                key={skill}
                className="text-xs px-2 py-0.5 rounded-md"
                style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }}
              >
                {skill}
              </span>
            ))}
            {resume.parsed_skills.length > 12 && (
              <span className="text-xs text-[var(--color-text-muted)]">
                +{resume.parsed_skills.length - 12} more
              </span>
            )}
          </div>
        )}
        {resume.parsed_skills?.length === 0 && (
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            No recognized skills found in this resume's text.
          </p>
        )}
        {error && (
          <p className="text-xs mt-2" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        )}
      </div>

      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          disabled={busy}
          className="w-8 h-8 flex items-center justify-center rounded-lg border disabled:opacity-50"
          style={{ borderColor: 'var(--color-border)' }}
          aria-label="Resume actions"
        >
          ⋮
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 mt-1 w-40 rounded-lg border shadow-lg z-10 overflow-hidden"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <button
              onClick={handleView}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-surface-alt)]"
            >
              View
            </button>
            <button
              onClick={handleDownload}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-surface-alt)]"
            >
              Download
            </button>
            <button
              onClick={handleReplaceClick}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-surface-alt)]"
            >
              Replace file
            </button>
            {!isDefault && (
              <button
                onClick={handleSetDefaultClick}
                className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-surface-alt)]"
              >
                Set as default
              </button>
            )}
            <button
              onClick={() => {
                setMenuOpen(false)
                onRequestDelete(resume)
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-surface-alt)]"
              style={{ color: 'var(--color-danger)' }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function DeleteConfirmModal({ resume, onCancel, onConfirm, deleting }) {
  const [dontAskAgain, setDontAskAgain] = useState(false)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        className="w-full max-w-sm rounded-xl border p-5"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', minWidth: 0 }}
      >
        <h2 className="font-heading font-semibold mb-2">Delete resume?</h2>
        <p
          className="text-sm text-[var(--color-text-muted)] mb-4"
          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          "{resume.file_name}" will be permanently deleted. This can't be undone.
        </p>

        <label className="flex items-center gap-2 text-sm cursor-pointer mb-5">
          <input
            type="checkbox"
            checked={dontAskAgain}
            onChange={(e) => setDontAskAgain(e.target.checked)}
          />
          Don't ask me again
        </label>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 rounded-lg border text-sm disabled:opacity-60"
            style={{ borderColor: 'var(--color-border)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(dontAskAgain)}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-danger)' }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// mode 'resume'  : upload + manage resumes (embedded in Account Details)
// mode 'saved'   : the Saved Jobs match list (its own page)
export default function Resume({ mode = 'resume' }) {
  const { user } = useAuth()
  const [resumes, setResumes] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [skipConfirmEnabled, setSkipConfirmEnabled] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const dragCounter = useRef(0)
  const defaultResume = resumes.find((r) => r.is_default) ?? null
  const { hash } = useLocation()

  useEffect(() => {
    if (!user) return
    fetchResumes()
    setSkipConfirmEnabled(window.localStorage.getItem(skipDeleteConfirmKey(user.id)) === 'true')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Lets the nav's "Saved Jobs" link (which points at /account#resume)
  // actually land on that section — React Router doesn't auto-scroll to a
  // hash on navigation the way a full page load would.
  useEffect(() => {
    if (mode !== 'resume' || hash !== '#resume' || loadingList) return
    const el = document.getElementById('resume')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash, loadingList, mode])

  function handleRestoreDeleteConfirm() {
    window.localStorage.removeItem(skipDeleteConfirmKey(user.id))
    setSkipConfirmEnabled(false)
  }

  async function fetchResumes() {
    setLoadingList(true)
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })

    if (!error) setResumes(data ?? [])
    setLoadingList(false)
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    processFile(file)
    e.target.value = ''
  }

  // Counter-based (rather than a plain boolean) because dragging over a
  // child element of the drop zone fires dragleave on the parent before
  // dragenter on the child — a naive "set false on dragleave" flickers
  // the highlight on/off as the cursor crosses the label's own children.
  function handleDragEnter(e) {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    if (e.dataTransfer?.types?.includes('Files')) setDragActive(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setDragActive(false)
    }
  }

  function handleDragOver(e) {
    // Required for onDrop to fire at all — the browser's default is to
    // reject the drop.
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setDragActive(false)
    if (uploading) return
    const file = e.dataTransfer?.files?.[0]
    processFile(file)
  }

  // Shared by the file-picker input and the drop zone below — a dropped
  // file and a clicked-and-chosen file go through the exact same read →
  // parse → upload → save pipeline, so drag-and-drop isn't a second,
  // separately-maintained upload path that can drift out of sync.
  async function processFile(file) {
    if (!file || !user) return

    const acceptedExt = /\.(pdf|docx)$/i
    if (!acceptedExt.test(file.name)) {
      setError('Only PDF or DOCX resumes are supported.')
      return
    }

    setError('')
    setUploading(true)

    try {
      setStatus('Reading file...')
      const parsedText = await extractResumeText(file)

      if (!parsedText || parsedText.length < 20) {
        throw new Error(
          "Couldn't extract readable text from this file. It might be a scanned image rather than selectable text — try a PDF exported directly from Word/Google Docs."
        )
      }

      setStatus('Extracting skills...')
      const parsedSkills = extractSkillsFromText(parsedText)

      setStatus('Uploading to storage...')
      const filePath = `${user.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, { upsert: false })

      if (uploadError) throw uploadError

      setStatus('Saving record...')
      // The very first resume a user uploads becomes their default
      // automatically — later ones don't, so uploading a second resume
      // never silently swaps out what's being used for match scoring.
      const { error: insertError } = await supabase.from('resumes').insert({
        user_id: user.id,
        file_path: filePath,
        file_name: file.name,
        parsed_text: parsedText,
        parsed_skills: parsedSkills,
        is_default: resumes.length === 0,
      })

      if (insertError) throw insertError

      setStatus('')
      await fetchResumes()
    } catch (err) {
      setError(err.message ?? 'Something went wrong while processing that file.')
      setStatus('')
    } finally {
      setUploading(false)
    }
  }

  async function handleSetDefault(resumeId) {
    setError('')
    // No client-side multi-table transaction in Supabase JS, so this is two
    // sequential updates: clear the flag on every resume for this user, then
    // set it on the chosen one. Both are simple single-column updates.
    const { error: clearError } = await supabase
      .from('resumes')
      .update({ is_default: false })
      .eq('user_id', user.id)
    if (clearError) {
      setError(`Couldn't update default resume: ${clearError.message}`)
      return
    }

    const { error: setErr } = await supabase
      .from('resumes')
      .update({ is_default: true })
      .eq('id', resumeId)
    if (setErr) {
      setError(`Couldn't update default resume: ${setErr.message}`)
      return
    }

    await fetchResumes()
  }

  function handleRequestDelete(resume) {
    if (window.localStorage.getItem(skipDeleteConfirmKey(user.id)) === 'true') {
      performDelete(resume)
    } else {
      setPendingDelete(resume)
    }
  }

  async function performDelete(resume) {
    setDeleting(true)
    setError('')

    const { error: storageError } = await supabase.storage.from('resumes').remove([resume.file_path])
    if (storageError) {
      setDeleting(false)
      setError(`Couldn't delete the file from storage: ${storageError.message}`)
      return
    }

    const { error: dbError } = await supabase.from('resumes').delete().eq('id', resume.id)
    if (dbError) {
      setDeleting(false)
      setError(`File was removed, but the database record couldn't be deleted: ${dbError.message}`)
      return
    }

    // If the deleted resume was the default and others remain, promote the
    // most recently uploaded remaining one — otherwise nothing would be
    // marked default at all, silently breaking match scoring elsewhere.
    const remaining = resumes.filter((r) => r.id !== resume.id)
    if (resume.is_default && remaining.length > 0) {
      await supabase.from('resumes').update({ is_default: true }).eq('id', remaining[0].id)
    }

    setDeleting(false)
    await fetchResumes()
    setPendingDelete(null)
  }

  function handleConfirmDelete(dontAskAgain) {
    if (dontAskAgain) {
      window.localStorage.setItem(skipDeleteConfirmKey(user.id), 'true')
      setSkipConfirmEnabled(true)
    }
    performDelete(pendingDelete)
  }

  if (mode === 'saved') {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
        <h1 className="font-heading text-2xl font-semibold mb-1">Saved Jobs</h1>
        <p className="font-heading text-lg font-medium mt-3">Saved the Job. Now Find Your Match.</p>
        <p className="text-sm text-[var(--color-text-muted)] mt-2 mb-8 leading-relaxed">
          Your saved opportunities, your skills, your next big move. JobOrbit compares your default
          resume against saved jobs to show you which roles fit you best.
        </p>
        {!loadingList && !defaultResume && (
          <div
            className="rounded-xl border p-5 mb-6"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
              Your saved jobs are ready to go. Head to{' '}
              <Link to="/tracker" className="underline" style={{ color: 'var(--color-accent)' }}>
                Applications
              </Link>{' '}
              to review your matches and take the next step toward landing the role.
            </p>
            <p className="font-heading font-semibold mt-5">Ready to make your move?</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
              Explore your saved jobs and start applying to the opportunities that fit you best.
            </p>
          </div>
        )}
        <SavedJobsMatchSection user={user} defaultResume={defaultResume} />
      </div>
    )
  }

  return (
    <div id="resume" style={{ scrollMarginTop: '5rem' }}>
      <h2 className="font-heading text-xl font-semibold">Resume Dock</h2>
      <p className="font-medium mt-3">Your Resume Does the Talking. We Find the Match.</p>
      <p className="text-sm text-[var(--color-text-muted)] mt-2 mb-5 leading-relaxed">
        Drop in your PDF or DOCX and let JobOrbit uncover the skills hiding in plain sight. Your
        default resume powers personalized job matches across the app.
      </p>

      <div
        className="rounded-xl border p-5 mb-6"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <label
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-10 text-center transition-colors ${
            uploading ? 'cursor-default' : 'cursor-pointer'
          }`}
          style={{
            borderColor: dragActive ? 'var(--color-accent)' : 'var(--color-border)',
            backgroundColor: dragActive ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'transparent',
          }}
        >
          <span className="font-medium">
            {uploading
              ? status || 'Processing...'
              : dragActive
                ? 'Drop to upload'
                : 'Click to choose, or drag and drop a PDF or DOCX resume'}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">
            Text-based files only — scanned images won't extract readable text
          </span>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>

        {error && (
          <p className="text-sm mt-3" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        )}
      </div>

      {skipConfirmEnabled && (
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-3">
          <span>Delete confirmations are turned off for your account.</span>
          <button
            onClick={handleRestoreDeleteConfirm}
            className="underline hover:text-[var(--color-text)]"
          >
            Restore default (ask before deleting)
          </button>
        </div>
      )}

      {loadingList && (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-6">Loading your resumes...</p>
      )}
      
      {!loadingList && resumes.length > 0 && (
        <div className="flex flex-col gap-3">
          {resumes.map((r) => (
            <ResumeFileCard
              key={r.id}
              resume={r}
              user={user}
              isDefault={r.is_default}
              onRequestDelete={handleRequestDelete}
              onReplaced={fetchResumes}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}

      {!loadingList && resumes.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
          Pro tip: Set your uploaded resume as your default to unlock personalized match scores for your
          saved jobs.
        </p>
      )}

      {pendingDelete && (
        <DeleteConfirmModal
          resume={pendingDelete}
          deleting={deleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

    </div>
  )
}