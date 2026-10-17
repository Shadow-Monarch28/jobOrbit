import { SKILL_SUGGESTIONS } from './data/skills'

// A job is considered "shortlisted" by this platform's own scoring engine
// once it clears this threshold. Used here and later by the application
// tracker / mock-interview gating — kept in one place so both stay in sync.
export const SHORTLIST_THRESHOLD = 70

/**
 * Extracts which known skills appear in a block of text (resume or job
 * description). Matches whole skill phrases with word-boundary checks so
 * "R" doesn't match inside "Marketing", etc. This is deterministic keyword
 * matching, not an ML/AI model — genuinely computed, not a black box.
 */
export function extractSkillsFromText(text, vocabulary = SKILL_SUGGESTIONS) {
  if (!text) return []
  const lower = text.toLowerCase()

  return vocabulary.filter((skill) => {
    const escaped = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, 'i')
    return pattern.test(lower)
  })
}

/**
 * Determines the set of skills a job listing is actually looking for, by
 * combining its own tags (when they're recognized skill names) with skills
 * extracted from its description text.
 */
export function getJobRequiredSkills(job) {
  const fromTags = (job.tags ?? []).filter((tag) =>
    SKILL_SUGGESTIONS.some((s) => s.toLowerCase() === tag.toLowerCase())
  )
  // Adzuna's free-tier search API — our main job source — only ever
  // returns a short description snippet (there's no separate full-listing
  // endpoint to pull more from), and its "tags" field is really a generic
  // category label like "IT Jobs", not actual skills. For a lot of real
  // postings neither one carried any extractable skill keyword at all,
  // which silently produced score: null for most saved jobs — that's what
  // showed up as Dashboard's "Avg Match Score: N/A" / "Strong Matches: 0"
  // even with saved jobs and a parsed resume on file. The job title costs
  // nothing extra to read, is always present, and is very often the most
  // skill-bearing text on the whole listing ("Senior React Developer",
  // "SQL Data Analyst"), so it's folded in here too.
  const fromTitle = extractSkillsFromText(job.title ?? '')
  const fromDescription = extractSkillsFromText(job.description ?? '')
  return [...new Set([...fromTags, ...fromTitle, ...fromDescription])]
}

/**
 * Computes a real match score between a resume's extracted skills and a
 * job's required skills. Returns null (not 0, not 100) when the job listing
 * has no extractable skill data at all — that's a data-quality limitation,
 * not "you're a 0% match," and the UI should say so rather than implying a
 * real assessment happened.
 */
export function computeMatchScore(resumeSkills, job) {
  const jobSkills = getJobRequiredSkills(job)

  if (jobSkills.length === 0) {
    return { score: null, matchedSkills: [], missingSkills: [], jobSkills: [] }
  }

  const resumeSet = new Set(resumeSkills.map((s) => s.toLowerCase()))
  const matchedSkills = jobSkills.filter((s) => resumeSet.has(s.toLowerCase()))
  const missingSkills = jobSkills.filter((s) => !resumeSet.has(s.toLowerCase()))
  const score = Math.round((matchedSkills.length / jobSkills.length) * 100)

  return { score, matchedSkills, missingSkills, jobSkills }
}

/**
 * Produces concrete, rule-based improvement guidance from a scoring result.
 * No AI-generated text — just a direct readout of what's missing and how
 * close the resume already is.
 */
export function generateImprovementGuidance({ score, missingSkills }) {
  if (score === null) {
    return "This listing doesn't have enough extractable skill information to give reliable guidance — try checking the full job description on the employer's site."
  }

  if (score >= SHORTLIST_THRESHOLD) {
    return missingSkills.length === 0
      ? "Strong match — your resume covers every skill this listing mentions."
      : `Strong match. A few skills weren't found on your resume: ${missingSkills.join(', ')}. Adding them (if you have the experience) could push this even higher.`
  }

  if (missingSkills.length === 0) {
    return "No specific missing skills were detected, but the overall overlap with this listing is still low — the role may be looking for different experience than what's emphasized on your resume."
  }

  return `To improve your match for this role, consider highlighting or gaining experience in: ${missingSkills.join(', ')}.`
}
