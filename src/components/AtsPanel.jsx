import { useMemo, useState } from 'react'
import { evaluateAts, applySuggestion } from '../lib/atsEvaluator'

const STATUS_COLOR = { pass: 'var(--color-success)', warn: 'var(--color-warning)', fail: 'var(--color-danger)' }

function ScoreRing({ score }) {
  const color = score >= 80 ? 'var(--color-success)' : score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'
  const r = 30
  const c = 2 * Math.PI * r
  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg viewBox="0 0 76 76" className="w-20 h-20 -rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="var(--color-border)" strokeWidth="7" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: 'stroke-dashoffset .5s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold font-heading leading-none" style={{ color }} data-testid="ats-score">{score}</span>
        <span className="text-[10px] text-[var(--color-text-muted)]">/ 100</span>
      </div>
    </div>
  )
}

function SkillSuggestion({ s, onApply }) {
  const [picked, setPicked] = useState([])
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-sm font-medium">{s.title}</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.detail}</p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {s.items.map((k) => {
          const on = picked.includes(k)
          return (
            <label key={k} className="text-xs px-2 py-1 rounded-full border cursor-pointer select-none flex items-center gap-1" style={on ? { backgroundColor: 'var(--color-accent)', color: '#fff', borderColor: 'var(--color-accent)' } : { borderColor: 'var(--color-border)' }}>
              <input type="checkbox" className="hidden" checked={on} onChange={() => setPicked((p) => (on ? p.filter((x) => x !== k) : [...p, k]))} />
              {k}
            </label>
          )
        })}
      </div>
      {onApply && (
        <button type="button" disabled={picked.length === 0} onClick={() => { onApply(s, picked); setPicked([]) }} className="mt-2 text-xs px-3 py-1.5 rounded-lg font-medium text-white disabled:opacity-40" style={{ backgroundColor: 'var(--color-accent)' }}>
          Add {picked.length || ''} selected to Skills
        </button>
      )}
    </div>
  )
}

// Score, breakdown and suggestions for one resume against one job. When
// `onChange` is given, suggestions can be applied straight to the resume.
export default function AtsPanel({ model, job, onChange }) {
  const result = useMemo(() => evaluateAts({ model, job }), [model, job])
  const apply = (s, picked = []) => onChange?.(applySuggestion(model, s, picked))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <ScoreRing score={result.score} />
        <div className="min-w-0">
          <p className="font-heading text-lg font-semibold leading-tight">{result.label}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
            ATS score for <span className="font-medium text-[var(--color-text)]">{job?.title}</span>{job?.company ? ` at ${job.company}` : ''}. Based on JobOrbit's own checks; real systems vary.
          </p>
        </div>
      </div>

      {(result.keywords.matched.length > 0 || result.keywords.missing.length > 0) && (
        <div>
          <p className="text-sm font-medium mb-2">Keywords from the job</p>
          <div className="flex flex-wrap gap-1.5">
            {result.keywords.matched.map((k) => (
              <span key={k} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--color-success) 16%, transparent)', color: 'var(--color-success)' }}>✓ {k}</span>
            ))}
            {result.keywords.missing.map((k) => (
              <span key={k} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--color-warning) 16%, transparent)', color: 'var(--color-warning)' }}>+ {k}</span>
            ))}
          </div>
        </div>
      )}

      {result.suggestions.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Suggestions</p>
          {result.suggestions.map((s) =>
            s.type === 'add_skills' ? (
              <SkillSuggestion key={s.id} s={s} onApply={onChange ? apply : null} />
            ) : (
              <div key={s.id} className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{s.detail}</p>
                {s.value && s.type === 'set_summary' && <p className="text-xs mt-2 italic leading-relaxed">“{s.value}”</p>}
                {s.items?.length > 0 && (
                  <ul className="text-xs mt-2 list-disc pl-4 text-[var(--color-text-muted)] flex flex-col gap-1">{s.items.map((t, i) => <li key={i}>{t}</li>)}</ul>
                )}
                {onChange && s.type !== 'advice' && (
                  <button type="button" onClick={() => apply(s)} className="mt-2 text-xs px-3 py-1.5 rounded-lg font-medium text-white" style={{ backgroundColor: 'var(--color-accent)' }}>
                    Apply
                  </button>
                )}
              </div>
            )
          )}
        </div>
      )}

      <div>
        <p className="text-sm font-medium mb-2">How the score adds up</p>
        <div className="flex flex-col gap-2">
          {result.checks.map((c) => (
            <div key={c.id} className="text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLOR[c.status] }} />
                <span className="flex-1">{c.label}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{c.points} / {c.max}</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] ml-4 leading-relaxed">{c.detail}{c.fix ? ` ${c.fix}` : ''}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
