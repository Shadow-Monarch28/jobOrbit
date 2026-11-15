import { useState } from 'react'
import PillLink from './PillLink'
import { docTitle } from '../lib/builderApi'

// Step before a mock interview starts: choose which resume the interviewer should work from.
export default function MockInterviewSetup({ resumes, onStart }) {
  const list = resumes ?? []
  const [choice, setChoice] = useState(() => (list.find((r) => r.is_default) ?? list[0])?.id ?? '')
  const border = { borderColor: 'var(--color-border)' }

  return (
    <div>
      <h2 className="font-heading font-semibold">Pick the resume for this interview</h2>
      <p className="text-sm text-[var(--color-text-muted)] mt-1 leading-relaxed">
        The interviewer reads it to ask about your real experience. Nothing on the resume is changed.
      </p>

      {list.length > 0 ? (
        <fieldset className="mt-4 flex flex-col gap-2">
          <legend className="sr-only">Resume</legend>
          {list.map((r) => (
            <label key={r.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm cursor-pointer hover:bg-[var(--color-surface-alt)]" style={border}>
              <input type="radio" name="mock-resume" value={r.id} checked={choice === r.id} onChange={() => setChoice(r.id)} style={{ accentColor: 'var(--color-accent)' }} />
              <span className="flex-1 truncate">{docTitle(r)}</span>
              {r.is_default && <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-accent)' }}>Default</span>}
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="text-sm mt-4" style={{ color: 'var(--color-warning)' }}>You don't have a resume yet.</p>
      )}

      <p className="text-sm mt-3">
        <PillLink to="/resume-builder">+ Add a resume</PillLink>
        <span className="text-[var(--color-text-muted)]"> in Resume Forge, then come back.</span>
      </p>

      <div className="flex items-center gap-3 mt-5 flex-wrap">
        <button type="button" disabled={!choice} onClick={() => onStart(choice)} className="text-sm px-5 py-2 rounded-lg font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--color-accent)' }}>
          Start Mock Interview
        </button>
        <button type="button" onClick={() => onStart(null)} className="text-sm px-4 py-2 rounded-lg border" style={border}>
          Continue without a resume
        </button>
      </div>
    </div>
  )
}
