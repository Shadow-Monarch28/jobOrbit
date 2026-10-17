import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getCategoryBySlug } from '../lib/data/interviewQuestions'
import { detectInterviewCategory } from '../lib/data/interviewQuestions'
import QuestionBankPanel from '../components/QuestionBankPanel'

export default function Interview() {
  const { roleId } = useParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [unlocked, setUnlocked] = useState(false)

  const category = getCategoryBySlug(roleId)

  useEffect(() => {
    let active = true
    async function checkAccess() {
      if (!user) return
      setLoading(true)
      const { data, error } = await supabase
        .from('applications')
        .select('job_data')
        .eq('user_id', user.id)
        .eq('status', 'shortlisted')

      if (!active) return
      if (error) {
        console.error('Interview access check failed:', error)
        setUnlocked(false)
        setLoading(false)
        return
      }

      const hasMatch = (data || []).some(
        (row) => detectInterviewCategory(row.job_data || {}) === roleId
      )
      setUnlocked(hasMatch)
      setLoading(false)
    }
    checkAccess()
    return () => {
      active = false
    }
    // Depend on user?.id, not the user object itself — Supabase hands
    // back a new (but same-content) user object on every auth token
    // refresh, which was re-running this check (and flashing the loading
    // state) on every tab focus. Same fix as InterviewLab/Dashboard.
  }, [user?.id, roleId])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <p className="text-[var(--color-text-muted)]">Loading...</p>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="p-4 sm:p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold font-heading">Category not found</h1>
        <p className="text-[var(--color-text-muted)] mt-2">
          That interview prep category doesn't exist.
        </p>
        <Link to="/tracker" className="inline-block mt-4 text-sm" style={{ color: 'var(--color-accent)' }}>
          ← Back to Applications
        </Link>
      </div>
    )
  }

  if (!unlocked) {
    return (
      <div className="p-4 sm:p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold font-heading">{category.label} — Locked</h1>
        <p className="text-[var(--color-text-muted)] mt-3 leading-relaxed">
          Interview prep for {category.label} unlocks once you have an application marked{' '}
          <strong>Shortlisted</strong> for a matching role. Update a tracked application's status
          in your Applications view, and this page will unlock automatically.
        </p>
        <Link
          to="/tracker"
          className="inline-block mt-5 text-sm px-4 py-2 rounded-lg font-medium text-white"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          Go to Applications
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <QuestionBankPanel categorySlug={roleId} />

      <Link to="/tracker" className="inline-block mt-6 text-sm" style={{ color: 'var(--color-accent)' }}>
        ← Back to Applications
      </Link>
    </div>
  )
}
