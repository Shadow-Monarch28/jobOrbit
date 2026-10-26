import { Link } from 'react-router-dom'

const STEPS = [
  {
    number: '01',
    title: 'Discover',
    headline: 'Less Scrolling. More Dream Jobs.',
    blurb: 'Find real job postings, save the good ones, and leave the endless browser tabs behind.',
    to: '/search',
    cta: 'Find Your Next Move',
  },
  {
    number: '02',
    title: 'Resume & Saved Jobs',
    headline: 'Your Resume. Their Requirements. Your Match.',
    blurb:
      'Upload your resume, let JobOrbit extract your skills, and see which saved jobs fit you best — no manual tagging, no guesswork.',
    to: '/account#resume',
    cta: 'Find Your Match',
  },
  {
    number: '03',
    title: 'Applications',
    headline: 'Keep the Hustle. Lose the Chaos.',
    blurb:
      'Track every application from Applied to Shortlisted to Not Selected. Your entire job hunt, minus the spreadsheet drama.',
    to: '/tracker',
    cta: 'Track Your Journey',
  },
  {
    number: '04',
    title: 'Orbit Mentor: Interview Lab',
    headline: 'Less Interview Panic. More Main-Character Energy.',
    blurb:
      'Take on AI mock interviews, explore hint-backed questions, and uncover what your resume is missing for the roles you want.',
    to: '/interview-lab',
    cta: 'Put Yourself to the Test',
  },
  {
    number: '05',
    title: 'Skill Builder',
    headline: 'Skill Gaps Today. Career Flex Tomorrow.',
    blurb:
      'Learn it. Practice it. Prove it. Score 4/5 or higher, and your newly learned skill is ready to show off on your resume.',
    to: '/skill-builder',
    cta: 'Level Up',
  },
  {
    number: '06',
    title: 'Career Insights',
    headline: 'Your Progress Has Receipts.',
    blurb:
      'Track application outcomes, count your interview and resume reviews, and see those skill gaps getting smaller.',
    to: '/insights',
    cta: 'Show Me the Growth',
  },
]

export default function HowItWorks() {
  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-semibold font-heading">How it Works</h1>
      <p className="font-heading text-xl font-medium mt-3">One Orbit. Every Step Counts.</p>
      <p className="font-medium mt-3" style={{ color: 'var(--color-accent)' }}>
        Upload. Discover. Apply. Review. Improve. Grow.
      </p>
      <p className="text-[var(--color-text-muted)] mt-5 leading-relaxed">
        Six connected stages turn your career goals into actionable steps. Your resume powers your
        matches, your reviews reveal opportunities to improve, and your progress comes to life through
        personalized insights.
      </p>
      <p className="text-sm font-medium mt-4">Your journey. Your data. Your momentum.</p>

      <div className="flex flex-col gap-5 mt-10">
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
              <p className="text-xs font-medium text-[var(--color-text-muted)]">
                {step.number} — {step.title}
              </p>
              <h2 className="font-heading text-lg font-semibold mt-2">{step.headline}</h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-2.5 leading-relaxed">{step.blurb}</p>
              <Link
                to={step.to}
                className="inline-flex items-center gap-1 text-sm font-medium mt-4"
                style={{ color: 'var(--color-accent)' }}
              >
                {step.cta} →
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl border p-4 sm:p-5 mt-10"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-alt)' }}
      >
        <h2 className="font-heading text-lg font-semibold">Meet Orbit Mentor</h2>
        <p className="font-medium mt-2">Your AI wingmate. No crystal ball required.</p>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mt-3">
          From mock interviews to resume reviews and skill-building, Orbit Mentor uses your actual resume
          and job data to deliver relevant questions, grounded evaluations, and useful learning resources.
        </p>
        <p className="text-sm font-medium mt-4">No made-up wins. Just real progress toward your next big break.</p>
      </div>
    </div>
  )
}
