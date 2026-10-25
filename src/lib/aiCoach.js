import { supabase } from './supabase'

// A UX safety net, not a true network cancel — if ai-coach genuinely
// hangs, the user sees a clear message and a Retry button instead of a
// frozen screen, rather than waiting indefinitely. The real request may
// still finish server-side; this only stops the UI from blocking on it.
const REQUEST_TIMEOUT_MS = 40000

async function invokeAiCoach(payload) {
  const timeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error('Orbit Mentor is taking longer than expected. Please try again.')),
      REQUEST_TIMEOUT_MS
    )
  )

  const { data, error } = await Promise.race([
    supabase.functions.invoke('ai-coach', { body: payload }),
    timeout,
  ])

  if (error) {
    // supabase-js only puts a generic "Edge Function returned a non-2xx
    // status code" in error.message — the real reason ai-coach sent back
    // lives in the response body, reachable via error.context (a Response
    // object) on FunctionsHttpError. Without reading it, every specific
    // error (quota exceeded, malformed AI response, etc.) was invisible
    // in the browser and only showed up by checking Supabase Dashboard
    // logs by hand.
    let detail = null
    try {
      if (error.context && typeof error.context.json === 'function') {
        const body = await error.context.clone().json()
        detail = body?.error || null
      }
    } catch {
      // Response body wasn't JSON, or was already consumed — fall back
      // to the generic message below.
    }
    console.error('ai-coach invoke failed:', detail || error)
    throw new Error(detail || error.message || 'AI Coach request failed.')
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data
}

// Resume review (used for "Not Selected" applications).
export function requestResumeReview({ applicationId, resumeId }) {
  return invokeAiCoach({ action: 'resume_review', applicationId, resumeId })
}

// Mock interview — call with no sessionId to start, then pass the
// returned sessionId + the user's typed answer to continue.
export function startMockInterview({ applicationId }) {
  return invokeAiCoach({ action: 'mock_interview', applicationId })
}

export function continueMockInterview({ sessionId, userAnswer }) {
  return invokeAiCoach({ action: 'mock_interview', sessionId, userAnswer })
}

// Skill Builder — call with no sessionId to start a teach+exercise for a
// given skill, then pass the returned sessionId + the user's answer to
// get the evaluation.
export function startSkillBuilder({ skillName }) {
  return invokeAiCoach({ action: 'skill_builder', skillName })
}

export function continueSkillBuilder({ sessionId, userAnswer }) {
  return invokeAiCoach({ action: 'skill_builder', sessionId, userAnswer })
}
