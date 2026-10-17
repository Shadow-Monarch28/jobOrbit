import { Link } from 'react-router-dom'

const STEPS = [
  {
    number: '01',
    title: 'Discover',
    blurb:
      'Search real job postings in one place. Save the ones worth a closer look instead of losing them in a dozen browser tabs.',
    to: '/search',
    cta: 'Search jobs',
  },
  {
    number: '02',
    title: 'Career Profile',
    blurb:
      'Upload your resume and JobOrbit reads the skills straight out of it — no manual tagging. Your saved jobs are automatically scored against it, so you see your best-fit matches first.',
    to: '/resume',
    cta: 'Upload your resume',
  },
  {
    number: '03',
    title: 'Applications',
    blurb:
      'Track every application from "applied" to "shortlisted" to "not selected" in one board, instead of a scattered spreadsheet or a dozen email threads.',
    to: '/tracker',
    cta: 'View your applications',
  },
  {
    number: '04',
    title: 'Orbit Mentor — Interview Lab',
    blurb:
      'Practice with a Mock Interview that asks real follow-up questions, browse a hint-backed Question Bank, or run a Resume Review against a specific job description to see exactly what it’s missing.',
    to: '/interview-lab',
    cta: 'Open Interview Lab',
  },
  {
    number: '05',
    title: 'Skill Builder',
    blurb:
      'Every skill gap a Resume Review finds becomes a practice loop here: a quick refresher, a real exercise, and an honest rating. Score 4/5 or better and it moves to Newly Learned Skills, ready to add to your resume.',
    to: '/skill-builder',
    cta: 'Practice a skill',
  },
  {
    number: '06',
    title: 'Career Insights',
    blurb:
      'Zoom out: how your applications are trending by status, how many mock interviews and resume reviews you’ve logged, and which skills are closing.',
    to: '/insights',
    cta: 'See your insights',
  },
]

export default function HowItWorks() {
  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-semibold font-heading">How JobOrbit works</h1>
      <p className="text-[var(--color-text-muted)] mt-2 leading-relaxed">
        One orbit, six stages. Each one feeds the next — a resume upload sharpens your job matches, a
        resume review surfaces skill gaps, closing those gaps shows up in your insights. Nothing here is
        a placeholder: every number and every AI response comes from your own data.
      </p>

      <div className="flex flex-col gap-4 mt-8">
        {STEPS.map((step, i) => (
          <div key={step.number} className="relative pl-14 sm:pl-16">
            {i < STEPS.length - 1 && (
              <div
                className="absolute left-[19px] sm:left-[23px] top-10 bottom-[-16px] w-px"
                style={{ backgroundColor: 'var(--color-border)' }}
              />
            )}
            <div
              className="absolute left-0 top-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-heading font-semibold text-sm"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-accent) 16%, transparent)',
                color: 'var(--color-accent)',
              }}
            >
              {step.number}
            </div>
            <div
              className="rounded-xl border p-4 sm:p-5"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
            >
              <h2 className="font-heading text-lg font-semibold">{step.title}</h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-1.5 leading-relaxed">{step.blurb}</p>
              <Link
                to={step.to}
                className="inline-flex items-center gap-1 text-sm font-medium mt-3"
                style={{ color: 'var(--color-accent)' }}
              >
                {step.cta} →
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl border p-4 sm:p-5 mt-8"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-alt)' }}
      >
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
          Orbit Mentor, the AI behind Mock Interview, Resume Review and Skill Builder, reads your actual
          resume and job data — it never invents a question, a score, or a learning resource link out of
          thin air.
        </p>
      </div>
    </div>
  )
}
