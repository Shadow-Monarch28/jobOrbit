import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SkillBuilderSession from '../components/SkillBuilderSession'

// A skill at or above this best-rating is considered interview-ready and
// moves out of the practice list into Newly Learned Skills.
const MASTERY_THRESHOLD = 4

function normalize(skill) {
  return skill.trim().toLowerCase()
}

function SkillCard({ skill, onClick, mastered, actions }) {
  return (
    <div
      className="rounded-xl border p-4 sm:p-5 flex items-center justify-between gap-3 flex-wrap"
      style={{
        borderColor: mastered ? 'var(--color-success)' : 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <button onClick={onClick} className="text-left flex-1 min-w-0">
        <h3 className="font-heading font-semibold">{skill.name}</h3>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          {skill.attempts === 0
            ? 'Not started'
            : `Practiced ${skill.attempts} time${skill.attempts === 1 ? '' : 's'}`}
        </p>
      </button>
      <div className="flex items-center gap-2 shrink-0">
        {skill.bestRating !== null && (
          <span
            className="text-xs px-2 py-1 rounded-full font-medium"
            style={{
              backgroundColor: mastered
                ? 'color-mix(in srgb, var(--color-success) 18%, transparent)'
                : 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
              color: mastered ? 'var(--color-success)' : 'var(--color-accent)',
            }}
          >
            Best: {skill.bestRating} / 5
          </span>
        )}
        {actions}
      </div>
    </div>
  )
}

export default function SkillBuilder() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [skills, setSkills] = useState([]) // [{ name, bestRating, attempts }]
  const [selected, setSelected] = useState(null) // skill name string

  // silent = refresh the data in the background without swapping the page
  // for "Loading...". Needed when a practice session is on screen: blanking
  // the page unmounted it, which threw away the rating screen and restarted
  // the session with a brand-new exercise.
  async function load({ silent = false } = {}) {
    if (!user) return
    if (!silent) setLoading(true)

    const [
      { data: reviews, error: reviewsErr },
      { data: builderSessions, error: builderErr },
    ] = await Promise.all([
      supabase
        .from('ai_sessions')
        .select('result')
        .eq('user_id', user.id)
        .eq('mode', 'resume_review'),
      supabase
        .from('ai_sessions')
        .select('skill_name, status, result')
        .eq('user_id', user.id)
        .eq('mode', 'skill_builder'),
    ])

    if (reviewsErr) console.error('SkillBuilder resume_review fetch failed:', reviewsErr)
    if (builderErr) console.error('SkillBuilder skill_builder fetch failed:', builderErr)

    // Gather every missing skill ever flagged across all resume reviews,
    // de-duped case-insensitively but keeping the first-seen casing for
    // display.
    const skillMap = new Map() // normalized -> display name
    for (const row of reviews || []) {
      const missing = row.result?.missingSkills
      if (Array.isArray(missing)) {
        for (const s of missing) {
          if (typeof s === 'string' && s.trim()) {
            const key = normalize(s)
            if (!skillMap.has(key)) skillMap.set(key, s.trim())
          }
        }
      }
    }

    // Fold in progress from past skill_builder sessions (completed ones
    // carry a readyRating in result).
    const progress = new Map() // normalized -> { bestRating, attempts }
    for (const row of builderSessions || []) {
      if (!row.skill_name) continue
      const key = normalize(row.skill_name)
      const entry = progress.get(key) || { bestRating: null, attempts: 0 }
      entry.attempts += 1
      const rating = row.result?.readyRating
      if (typeof rating === 'number' && (entry.bestRating === null || rating > entry.bestRating)) {
        entry.bestRating = rating
      }
      progress.set(key, entry)
      // A skill gap might show up in skill_builder history even if the
      // resume review that surfaced it isn't in the current list for
      // some reason — still worth showing.
      if (!skillMap.has(key)) skillMap.set(key, row.skill_name.trim())
    }

    const combined = Array.from(skillMap.entries()).map(([key, name]) => ({
      name,
      bestRating: progress.get(key)?.bestRating ?? null,
      attempts: progress.get(key)?.attempts ?? 0,
    }))
    combined.sort((a, b) => a.name.localeCompare(b.name))

    setSkills(combined)
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    load().catch((err) => {
      if (active) console.error('SkillBuilder load failed:', err)
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <p className="text-[var(--color-text-muted)]">Loading...</p>
      </div>
    )
  }

  if (selected) {
    return (
      <div className="p-4 sm:p-8 max-w-2xl mx-auto">
        <button
          onClick={() => {
            setSelected(null)
            load({ silent: true })
          }}
          className="text-sm mb-4"
          style={{ color: 'var(--color-accent)' }}
        >
          ← Back to Skill Builder
        </button>
        <div
          className="rounded-xl border p-4 sm:p-5"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <SkillBuilderSession skillName={selected} onCompleted={() => {}} onMastered={() => load({ silent: true })} />
        </div>
      </div>
    )
  }

  const toPractice = skills.filter((s) => (s.bestRating ?? 0) < MASTERY_THRESHOLD)
  const newlyLearned = skills.filter((s) => (s.bestRating ?? 0) >= MASTERY_THRESHOLD)

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold font-heading">Skill Builder</h1>
      <p className="font-heading text-lg font-medium mt-3">Your Weak Spots. Your Next Superpower.</p>
      <p className="text-[var(--color-text-muted)] mt-2 leading-relaxed">
        Turn the skills you're missing into the skills that get you hired. Learn, practice, and level up
        with Orbit Mentor.
      </p>

      {skills.length === 0 && (
        <div
          className="rounded-xl border p-4 mt-6"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <p className="font-heading font-semibold">No skills to conquer. Yet.</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-2 leading-relaxed">
            Run a Resume Review on a Not Selected application in Interview Lab to uncover your hidden
            growth opportunities.
          </p>
          <Link
            to="/interview-lab"
            className="inline-block text-sm font-medium px-4 py-2 rounded-lg text-white mt-4"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            Go to Interview Lab
          </Link>
        </div>
      )}

      {newlyLearned.length > 0 && (
        <div className="mt-6">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
            <span style={{ color: 'var(--color-success)' }}>✓</span> Newly Learned Skills
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Rated {MASTERY_THRESHOLD}+/5 — ready to bring up in interviews and applications.
          </p>
          <div className="flex flex-col gap-3 mt-3">
            {newlyLearned.map((skill) => (
              <SkillCard key={skill.name} skill={skill} mastered onClick={() => setSelected(skill.name)} />
            ))}
          </div>
        </div>
      )}

      {toPractice.length > 0 && (
        <div className="mt-8">
          <h2 className="font-heading text-lg font-semibold">To Practice</h2>
          <div className="flex flex-col gap-3 mt-3">
            {toPractice.map((skill) => (
              <SkillCard key={skill.name} skill={skill} onClick={() => setSelected(skill.name)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}