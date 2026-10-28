// Skill Builder answer evaluation: deterministic guards around the LLM rating
// so gibberish, off-topic or one-liner answers can never score highly.
import { looksLikeNonAnswer } from './mockInterview.ts'

export const NON_ANSWER_FEEDBACK =
  "That doesn't answer the exercise. Read the question again and explain what you would do, and why, in a few sentences."

const STOP = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'what', 'how', 'you', 'your', 'are', 'can', 'would', 'when', 'from', 'into', 'about', 'which', 'have', 'does', 'a', 'an', 'of', 'to', 'in', 'is', 'it', 'on', 'or', 'as', 'be', 'by'])

function contentWords(text) {
  return (String(text || '').toLowerCase().match(/[a-z][a-z0-9+#.\-]{2,}/g) || []).filter((w) => !STOP.has(w))
}

// Share of the exercise's key terms that the answer touches on (0..1).
export function topicOverlap(exercise, answer, skillName = '') {
  const targets = new Set([...contentWords(exercise), ...contentWords(skillName)])
  if (targets.size === 0) return 1
  const got = new Set(contentWords(answer))
  let hit = 0
  for (const w of targets) if (got.has(w)) hit++
  return hit / targets.size
}

// Maximum rating an answer can earn regardless of what the model says.
export function ratingCap(exercise, answer, skillName = '') {
  const a = String(answer || '').trim()
  if (looksLikeNonAnswer(a)) return 1
  const words = a.split(/\s+/).filter(Boolean).length
  let cap = 5
  if (words < 8) cap = 2
  else if (words < 15) cap = 3
  else if (words < 25) cap = 4
  // An answer sharing nothing with the exercise or skill is off-topic.
  if (topicOverlap(exercise, a, skillName) < 0.05) cap = Math.min(cap, 2)
  return cap
}

export function buildEvalPrompt({ skillName, exercise, answer }) {
  return `You are a strict but fair skills coach grading a learner's answer to a practice exercise on "${skillName}".

EXERCISE:
${exercise}

LEARNER'S ANSWER:
${answer}

Grade ONLY how well the answer addresses THIS exercise, using this scale:
1 = off-topic, empty of substance, or wrong
2 = touches the topic but mostly vague or with major errors
3 = partly correct, important points missing
4 = correct and mostly complete, minor gaps
5 = correct, complete, specific, shows real understanding
Do not reward length, confidence or buzzwords. If the answer ignores the exercise, give 1.

Respond with ONLY valid JSON, no markdown fences:
{"readyRating": <integer 1-5>, "feedback": "<2-3 sentences: what was right, what was missing or wrong, specific to this answer>"}`
}

export function finalizeEvaluation(parsed, { exercise, answer, skillName }) {
  const cap = ratingCap(exercise, answer, skillName)
  const raw = typeof parsed?.readyRating === 'number' && Number.isFinite(parsed.readyRating)
    ? Math.round(parsed.readyRating)
    : null
  // No usable model rating: fall back to the conservative cap, never inflate.
  const rating = Math.max(1, Math.min(raw ?? Math.min(cap, 2), cap))
  let feedback = typeof parsed?.feedback === 'string' ? parsed.feedback.trim() : ''
  if (!feedback) feedback = rating <= 2 ? NON_ANSWER_FEEDBACK : 'Your answer was received. Review the concept again and try to be more specific.'
  return { readyRating: rating, feedback }
}

// Full evaluation. callLLM/parse are injected so this is testable offline.
export async function evaluateSkillAnswer({ skillName, exercise, answer, callLLM, safeParseJson }) {
  if (looksLikeNonAnswer(answer)) return { readyRating: 1, feedback: NON_ANSWER_FEEDBACK }
  const raw = await callLLM(buildEvalPrompt({ skillName, exercise, answer }), { asJson: true })
  return finalizeEvaluation(safeParseJson(raw), { exercise, answer, skillName })
}
