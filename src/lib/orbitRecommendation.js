// Deterministic, explainable recommendation logic for Interview Lab —
// no AI involved in deciding WHAT to recommend, only in the chat/review
// content itself. Mirrors the status flow we locked for JobOrbit.
export function getRecommendation(application) {
  switch (application.status) {
    case 'shortlisted':
      return {
        primary: 'mock_interview',
        primaryLabel: 'Start Mock Interview',
        secondary: 'question_bank',
        secondaryLabel: 'Question Bank',
        note: "You're shortlisted — Orbit Mentor recommends a mock interview to see where you stand.",
      }
    case 'under_review':
      return {
        primary: 'question_bank',
        primaryLabel: 'Start Question Bank',
        secondary: 'mock_interview',
        secondaryLabel: 'Mock Interview',
        note: 'Your application is under review — practice with the question bank for this role first.',
      }
    case 'applied':
    case 'applied_pending':
      return {
        primary: 'mock_interview',
        primaryLabel: 'Start Mock Interview',
        secondary: 'question_bank',
        secondaryLabel: 'Question Bank',
        note: 'Get ahead of the process — practice now in case you hear back soon.',
      }
    case 'not_selected':
      return {
        primary: 'skill_gaps',
        primaryLabel: 'View Skill Gaps',
        secondary: null,
        secondaryLabel: null,
        note: "This one didn't work out — Orbit Mentor can compare your resume against this job's requirements to find real, evidence-based gaps.",
      }
    default:
      return { primary: 'none', primaryLabel: null, secondary: null, secondaryLabel: null, note: null }
  }
}
