// Supabase Edge Function: ai-coach
// Calls Groq's free-tier API server-side only — the API key lives in
// Supabase secrets (GROQ_API_KEY), never in frontend code.
// Switched from Google Gemini: Gemini's free tier capped at 20-500
// requests/day depending on model (confirmed directly from this
// project's own 429 errors and AI Studio dashboard). Groq's free tier
// gives 1,000 requests/day and 30/minute on llama-3.3-70b-versatile — no
// credit card required to sign up. Groq's API is OpenAI-compatible
// (POST /openai/v1/chat/completions), so only this file changed; no
// other part of JobOrbit's AI Prep feature needed touching.
// Handles three actions:
//   - "mock_interview": multi-turn Q&A, ends with strengths/improvements
//     and a 1-5 interview-readiness rating
//   - "resume_review": single-shot rating + missing skills vs a job's JD
//   - "skill_builder": teach + one exercise for an arbitrary skill gap
//     (from a resume_review's missingSkills), then evaluates the answer
//
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  MAX_INTERVIEW_TURNS,
  MAX_ANSWER_CHARS,
  countQuestions,
  buildTranscript,
  runInterviewTurn,
} from '../_shared/mockInterview.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
// Confirmed directly from this account's own GET /v1/models response —
// no llama-3.x models are enabled here at all (account-specific), so both
// earlier guesses 404'd. openai/gpt-oss-20b IS present on this account's
// model list, with json_mode support (required for our structured
// prompts) confirmed in its supported_features. Re-run
// `curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"`
// if you ever need to confirm what's actually available again.
const GROQ_MODEL = 'openai/gpt-oss-20b'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// MAX_INTERVIEW_TURNS (imported above) is the number of real questions per
// interview. Clarifications and "that's not an answer" replies are stored with
// a `kind` and are NOT counted, so asking a doubt never uses up a question.
// Each side reply costs one Groq call, so they are capped per question
// (see MAX_SIDE_TURNS_PER_QUESTION in _shared/mockInterview.ts).

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

async function callLLM(promptText, { asJson = false } = {}) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured on the server.')

  const MAX_ATTEMPTS = 3
  let lastError
  // Starts as the caller's prompt; gets a stricter JSON reminder appended
  // if a json_validate_failed retry happens, so the next attempt is more
  // likely to pass Groq's own structured-output validator.
  let currentPrompt = promptText

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: currentPrompt }],
        temperature: 0.6,
        // Raised from 800: a chunk of the json_validate_failed errors were
        // Groq's validator rejecting output truncated mid-object before it
        // ever reached our own safeParseJson fallbacks.
        max_tokens: 1000,
        ...(asJson ? { response_format: { type: 'json_object' } } : {}),
      }),
    })

    if (res.ok) {
      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content
      if (!text) throw new Error('Groq returned an empty response.')
      return text
    }

    const errText = await res.text()
    lastError = new Error(`Groq API error ${res.status}: ${errText}`)

    // 503 (service unavailable) and 429 (rate limited) are transient —
    // retry with backoff. Groq's own 400 json_validate_failed is also
    // transient in practice: it's the model producing output its strict
    // JSON-mode validator rejects (malformed/truncated), not a request
    // problem, and a reinforced retry usually clears it. Anything else
    // (bad request shape, auth, not found) won't fix itself on retry.
    const isJsonValidateFailure = res.status === 400 && errText.includes('json_validate_failed')
    const isTransient = res.status === 503 || res.status === 429 || isJsonValidateFailure
    if (!isTransient || attempt === MAX_ATTEMPTS) throw lastError

    if (isJsonValidateFailure) {
      currentPrompt = `${promptText}\n\nIMPORTANT: Your last response failed JSON validation. Respond with ONLY a single valid JSON object — no markdown fences, no commentary before or after, no trailing commas, and make sure every opened brace/bracket/quote is closed.`
    }

    const delayMs = attempt * 1000 // 1s, then 2s
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  throw lastError
}

function safeParseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    // fall through to the next attempt
  }

  // Occasionally a model wraps JSON in ```json fences despite instructions.
  const stripped = text.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(stripped)
  } catch {
    // fall through to the next attempt
  }

  // Last resort: a stray sentence before/after the JSON object (more
  // likely on the combined feedback+nextQuestion prompt, since it's
  // asking for both structure and natural language in one response) —
  // slice out just the outermost {...} and try once more.
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(stripped.slice(start, end + 1))
    } catch {
      // fall through to the error below
    }
  }

  // A clear, user-facing message instead of a raw SyntaxError leaking
  // through — this is what the frontend surfaces directly (aiCoach.js
  // reads the real Edge Function error body).
  throw new Error('Orbit Mentor had trouble forming its response. Please try again.')
}

async function getAuthedUser(req, supabase) {
  const authHeader = req.headers.get('Authorization') || ''
  const jwt = authHeader.replace('Bearer ', '')
  const { data, error } = await supabase.auth.getUser(jwt)
  if (error || !data?.user) return null
  return data.user
}

async function handleResumeReview(supabase, userId, body) {
  const { applicationId, resumeId } = body
  if (!applicationId || !resumeId) {
    return jsonResponse({ error: 'applicationId and resumeId are required.' }, 400)
  }

  const [{ data: application, error: appErr }, { data: resume, error: resumeErr }] = await Promise.all([
    supabase.from('applications').select('*').eq('id', applicationId).eq('user_id', userId).single(),
    supabase.from('resumes').select('*').eq('id', resumeId).eq('user_id', userId).single(),
  ])

  if (appErr || !application) return jsonResponse({ error: 'Application not found.' }, 404)
  if (resumeErr || !resume) return jsonResponse({ error: 'Resume not found.' }, 404)
  if (!resume.parsed_text) return jsonResponse({ error: 'That resume has no extracted text to review.' }, 400)

  const job = application.job_data || {}

  const prompt = `You are a careful, honest resume reviewer. Compare the RESUME below against the JOB DESCRIPTION. The candidate was NOT selected for this role, so focus on real, specific gaps.

Respond with ONLY valid JSON, no markdown fences, in exactly this shape:
{
  "rating": <integer 0-100, how well this resume matches this specific job>,
  "strengths": [<2-4 short strings, real things the resume already has going for it for this role>],
  "missingSkills": [<2-6 short skill/keyword strings genuinely required by the job but not evidenced in the resume>],
  "summary": "<2-3 sentence honest explanation of the rating, in plain language>"
}

JOB TITLE: ${job.title || 'Unknown'}
COMPANY: ${job.company || 'Unknown'}
JOB DESCRIPTION:
${job.description || '(no description available)'}

RESUME TEXT:
${resume.parsed_text}`

  const raw = await callLLM(prompt, { asJson: true })
  const parsed = safeParseJson(raw)

  const missingSkills = Array.isArray(parsed.missingSkills) ? parsed.missingSkills : []
  const result = {
    rating: typeof parsed.rating === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.rating))) : null,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    missingSkills,
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
  }

  const { data: session, error: insertErr } = await supabase
    .from('ai_sessions')
    .insert({
      user_id: userId,
      application_id: applicationId,
      mode: 'resume_review',
      messages: [],
      result,
      status: 'completed',
    })
    .select()
    .single()

  if (insertErr) {
    console.error('ai_sessions insert (resume_review) failed:', insertErr)
  }

  return jsonResponse({ sessionId: session?.id ?? null, result })
}

async function handleMockInterview(supabase, userId, body) {
  const { sessionId, applicationId, userAnswer } = body

  if (!sessionId) {
    if (!applicationId) return jsonResponse({ error: 'applicationId is required to start a session.' }, 400)

    const { data: application, error: appErr } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('user_id', userId)
      .single()
    if (appErr || !application) return jsonResponse({ error: 'Application not found.' }, 404)

    const job = application.job_data || {}
    const prompt = `You are a friendly but realistic interviewer conducting a mock interview for the role of "${job.title || 'this role'}"${job.company ? ' at ' + job.company : ''}.
Job context: ${job.description ? job.description.slice(0, 600) : '(no description available)'}

Ask exactly ONE opening interview question (behavioral or role-relevant). Respond with ONLY the question text, no preamble, no numbering.`

    const question = (await callLLM(prompt)).trim()

    const { data: session, error: insertErr } = await supabase
      .from('ai_sessions')
      .insert({
        user_id: userId,
        application_id: applicationId,
        mode: 'mock_interview',
        messages: [{ role: 'assistant', kind: 'question', text: question }],
        status: 'in_progress',
      })
      .select()
      .single()

    if (insertErr || !session) {
      console.error('ai_sessions insert (mock_interview start) failed:', insertErr)
      return jsonResponse({ error: 'Could not start the interview session.' }, 500)
    }

    return jsonResponse({ sessionId: session.id, question, turnNumber: 1, maxTurns: MAX_INTERVIEW_TURNS, completed: false })
  }

  // Continuing an existing session
  const { data: session, error: sessErr } = await supabase
    .from('ai_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()

  if (sessErr || !session) return jsonResponse({ error: 'Session not found.' }, 404)
  if (session.status === 'completed') return jsonResponse({ error: 'This interview session already finished.' }, 400)
  if (!userAnswer || !userAnswer.trim()) return jsonResponse({ error: 'An answer is required to continue.' }, 400)

  const messages = [
    ...(session.messages || []),
    { role: 'user', text: userAnswer.trim().slice(0, MAX_ANSWER_CHARS) },
  ]
  const turnsSoFar = countQuestions(messages)

  const { data: application } = await supabase
    .from('applications')
    .select('job_data')
    .eq('id', session.application_id)
    .eq('user_id', userId)
    .single()
  const job = application?.job_data || {}

  // One call decides what the candidate's message is (an answer, a doubt, or
  // not an answer at all) and produces the matching reply.
  const outcome = await runInterviewTurn({
    messages,
    job,
    callLLM: (prompt) => callLLM(prompt, { asJson: true }),
    safeParseJson,
  })

  // A doubt or an off-topic message: reply, stay on the same question, and
  // leave the question count untouched.
  if (outcome.type === 'side') {
    const { error: sideErr } = await supabase
      .from('ai_sessions')
      .update({ messages: [...messages, outcome.message] })
      .eq('id', sessionId)
      .eq('user_id', userId)
    if (sideErr) console.error('ai_sessions update (mock_interview side reply) failed:', sideErr)

    return jsonResponse({
      sessionId,
      kind: outcome.kind,
      reply: outcome.reply,
      turnNumber: turnsSoFar,
      maxTurns: MAX_INTERVIEW_TURNS,
      completed: false,
    })
  }

  if (outcome.type === 'finish') {
    // The ratings use real answers only (side exchanges are left out).
    const transcript = buildTranscript(messages, { finalOnly: true })
    const summaryPrompt = `You are reviewing a completed mock interview for the role of "${job.title || 'this role'}"${job.company ? ' at ' + job.company : ''}.

TRANSCRIPT:
${transcript}

Respond with ONLY valid JSON, no markdown fences, in exactly this shape:
{
  "readinessRating": <integer 1-5, how ready this candidate currently seems for the REAL interview for this role — 1 means significant preparation still needed, 5 means strongly ready. Base this ONLY on the substance of their actual answers in the transcript above, not on politeness or length.>,
  "ratingReason": "<1 sentence explaining specifically why that rating, grounded in the transcript>",
  "strengths": [<2-4 short strings, specific things the candidate did well, grounded in what they actually said>],
  "improvements": [<2-4 short strings, specific areas to work on, grounded in what they actually said>],
  "overallImpression": "<2-3 sentence honest summary>"
}`

    const raw = await callLLM(summaryPrompt, { asJson: true })
    const parsed = safeParseJson(raw)
    const result = {
      readinessRating:
        typeof parsed.readinessRating === 'number' ? Math.max(1, Math.min(5, Math.round(parsed.readinessRating))) : null,
      ratingReason: typeof parsed.ratingReason === 'string' ? parsed.ratingReason : '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      overallImpression: typeof parsed.overallImpression === 'string' ? parsed.overallImpression : '',
    }

    const { error: updateErr } = await supabase
      .from('ai_sessions')
      .update({ messages, result, status: 'completed' })
      .eq('id', sessionId)
      .eq('user_id', userId)

    if (updateErr) console.error('ai_sessions update (mock_interview complete) failed:', updateErr)

    return jsonResponse({ sessionId, completed: true, summary: result })
  }

  // A real answer: brief feedback plus the next question.
  const { feedback, question } = outcome
  const updatedMessages = [...messages, { role: 'assistant', kind: 'question', text: question, feedback }]

  const { error: updateErr } = await supabase
    .from('ai_sessions')
    .update({ messages: updatedMessages })
    .eq('id', sessionId)
    .eq('user_id', userId)

  if (updateErr) console.error('ai_sessions update (mock_interview turn) failed:', updateErr)

  return jsonResponse({
    sessionId,
    kind: 'question',
    question,
    feedback,
    turnNumber: turnsSoFar + 1,
    maxTurns: MAX_INTERVIEW_TURNS,
    completed: false,
  })
}

async function handleSkillBuilder(supabase, userId, body) {
  const { sessionId, skillName, userAnswer } = body

  if (!sessionId) {
    if (!skillName || !skillName.trim()) {
      return jsonResponse({ error: 'skillName is required to start a session.' }, 400)
    }

    // One call does two jobs — a short teach blurb AND one practice
    // exercise — same cost-saving pattern as mock_interview's combined
    // feedback+nextQuestion call.
    const prompt = `You are a practical skills coach. The learner has a gap in "${skillName.trim()}" — this was identified as missing from their resume for a real job they applied to.

Respond with ONLY valid JSON, no markdown fences, in exactly this shape:
{
  "teach": "<3-5 sentences explaining the core concept of this skill in plain, practical language — what it is and why it matters on the job, not a dictionary definition>",
  "exercise": "<one concrete, specific practice exercise or scenario question that tests real understanding of this skill, something they can answer in a few sentences or a short code/example>"
}`

    const raw = await callLLM(prompt, { asJson: true })
    const parsed = safeParseJson(raw)
    const teach = typeof parsed.teach === 'string' ? parsed.teach : ''
    const exercise = typeof parsed.exercise === 'string' ? parsed.exercise : ''

    const { data: session, error: insertErr } = await supabase
      .from('ai_sessions')
      .insert({
        user_id: userId,
        mode: 'skill_builder',
        skill_name: skillName.trim(),
        messages: [{ role: 'assistant', text: exercise, teach }],
        status: 'in_progress',
      })
      .select()
      .single()

    if (insertErr || !session) {
      console.error('ai_sessions insert (skill_builder start) failed:', insertErr)
      return jsonResponse({ error: 'Could not start the skill builder session.' }, 500)
    }

    return jsonResponse({ sessionId: session.id, skillName: skillName.trim(), teach, exercise, completed: false })
  }

  // Continuing an existing session — evaluate the learner's answer.
  const { data: session, error: sessErr } = await supabase
    .from('ai_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()

  if (sessErr || !session) return jsonResponse({ error: 'Session not found.' }, 404)
  if (session.status === 'completed') return jsonResponse({ error: 'This skill session already finished.' }, 400)
  if (!userAnswer || !userAnswer.trim()) return jsonResponse({ error: 'An answer is required to continue.' }, 400)

  const exerciseMessage = session.messages?.[0]
  const exercise = exerciseMessage?.text || ''

  const evalPrompt = `You are a practical skills coach evaluating a learner's attempt at a practice exercise for the skill "${session.skill_name}".

EXERCISE GIVEN:
${exercise}

LEARNER'S ANSWER:
${userAnswer.trim()}

Respond with ONLY valid JSON, no markdown fences, in exactly this shape:
{
  "readyRating": <integer 1-5, how solid their understanding of this skill now appears from this one answer — 1 means still a real gap, 5 means solid grasp. Base this ONLY on the substance of their answer, not length or confidence.>,
  "feedback": "<2-3 sentences of specific, honest feedback on their answer — what was right, what was missing or wrong>"
}`

  const raw = await callLLM(evalPrompt, { asJson: true })
  const parsed = safeParseJson(raw)
  const result = {
    readyRating: typeof parsed.readyRating === 'number' ? Math.max(1, Math.min(5, Math.round(parsed.readyRating))) : null,
    feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
  }

  const updatedMessages = [...session.messages, { role: 'user', text: userAnswer.trim() }]

  const { error: updateErr } = await supabase
    .from('ai_sessions')
    .update({ messages: updatedMessages, result, status: 'completed' })
    .eq('id', sessionId)
    .eq('user_id', userId)

  if (updateErr) console.error('ai_sessions update (skill_builder complete) failed:', updateErr)

  return jsonResponse({ sessionId, completed: true, result })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const user = await getAuthedUser(req, supabase)
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    if (body.action === 'resume_review') return await handleResumeReview(supabase, user.id, body)
    if (body.action === 'mock_interview') return await handleMockInterview(supabase, user.id, body)
    if (body.action === 'skill_builder') return await handleSkillBuilder(supabase, user.id, body)
    return jsonResponse({ error: 'Unknown action. Use "mock_interview", "resume_review", or "skill_builder".' }, 400)
  } catch (err) {
    console.error('ai-coach function error:', err)
    return jsonResponse({ error: err.message || 'Internal error' }, 500)
  }
})
