import { useState } from 'react'
import { getCategoryBySlug, detectInterviewCategory } from '../lib/data/interviewQuestions'

function QuestionItem({ index, question, hint }) {
  const [showHint, setShowHint] = useState(false)

  return (
    <li
      className="rounded-xl border p-3 sm:p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <span className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
        Question {index + 1}
      </span>
      <p className="mt-1 text-sm">{question}</p>

      {hint && (
        <div className="mt-2">
          <button
            onClick={() => setShowHint((v) => !v)}
            className="text-xs underline"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {showHint ? 'Hide hint' : 'Show hint'}
          </button>
          {showHint && (
            <p
              className="text-xs mt-1.5 p-2 rounded-lg"
              style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }}
            >
              {hint}
            </p>
          )}
        </div>
      )}
    </li>
  )
}

// Pass EITHER `job` (detects the category from its title/tags, the usual
// case when launched from a specific application) OR `categorySlug`
// directly (when the caller already knows the exact category — e.g. the
// standalone /interview/:roleId route — since re-deriving a slug from a
// synthetic job object risks a mismatch: a category's own label doesn't
// always contain its own keywords, as "Product Management" doesn't
// contain the keyword "product manager").
export default function QuestionBankPanel({ job, categorySlug }) {
  const slug = categorySlug || detectInterviewCategory(job || {})
  const category = getCategoryBySlug(slug)

  if (!category) {
    return <p className="text-[var(--color-text-muted)]">No question bank available for this role yet.</p>
  }

  return (
    <div>
      <h3 className="font-heading text-lg font-semibold">{category.label} — Question Bank</h3>
      <p className="text-sm text-[var(--color-text-muted)] mt-1">
        General prep questions for this type of role, not from any specific employer. Each one has a
        hint on what a strong answer covers — these are also the style and difficulty of question
        used in the Mock Interview.
      </p>
      <ol className="mt-4 flex flex-col gap-3">
        {category.questions.map((q, i) => (
          <QuestionItem key={i} index={i} question={q.question} hint={q.hint} />
        ))}
      </ol>
    </div>
  )
}
