// @ts-nocheck
// Turn logic for the mock interview, kept free of Deno/Supabase APIs so it
// can be unit-tested with a fake LLM (see tests/mockInterview.test.mjs).
//
// A candidate message is one of three things:
//   answer         a genuine, sentence-wise attempt at the current question.
//                  It is approved, gets short feedback, and the interview moves on.
//   clarification  a doubt about the question / role / expectations. The
//                  interviewer answers it and invites them to answer now or ask more.
//   irrelevant     off-topic, gibberish, filler or a bare fragment. The UI
//                  highlights that this is not what we are looking for and asks
//                  for a correct, reasonable answer.
//
// Only real questions count toward MAX_INTERVIEW_TURNS. Clarifications and
// redirects are stored with a `kind` so they never use up a question slot.
// Each side reply costs one LLM call, so the number of side replies per
// question is capped; once capped, the next message is treated as the answer.

export const MAX_INTERVIEW_TURNS = 10
export const MAX_SIDE_TURNS_PER_QUESTION = 4
export const MAX_ANSWER_CHARS = 4000

export const CLOSING_CLARIFY =
  "Whenever you're ready, type your answer, or let me know if you have any follow-up questions."
export const CLOSING_REDIRECT =
  'Please type an answer that is correct and reasonable: a few sentences in your own words.'

const SIDE_KINDS = ['clarification', 'redirect']

// Assistant messages saved before this feature have no `kind`; they are questions.
export function isQuestionMessage(m) {
  return m?.role === 'assistant' && (!m.kind || m.kind === 'question')
}

export function isSideReply(m) {
  return m?.role === 'assistant' && SIDE_KINDS.includes(m.kind)
}

export function countQuestions(messages) {
  return (messages || []).filter(isQuestionMessage).length
}

// How many clarification/redirect replies the CURRENT question has already had.
export function sideTurnsOnCurrentQuestion(messages) {
  let n = 0
  for (let i = (messages || []).length - 1; i >= 0; i--) {
    const m = messages[i]
    if (isQuestionMessage(m)) break
    if (isSideReply(m)) n++
  }
  return n
}

export function currentQuestionText(messages) {
  for (let i = (messages || []).length - 1; i >= 0; i--) {
    if (isQuestionMessage(messages[i])) return messages[i].text
  }
  return ''
}

// finalOnly drops side exchanges (the candidate's off-topic message plus the
// reply to it) so the end-of-interview rating is based on real answers only.
export function buildTranscript(messages, { finalOnly = false } = {}) {
  const list = messages || []
  const lines = []
  for (let i = 0; i < list.length; i++) {
    const m = list[i]
    if (m.role === 'assistant') {
      if (isSideReply(m)) {
        if (!finalOnly) lines.push(`Interviewer (side reply, not a new question): ${m.text}`)
      } else {
        lines.push(`Interviewer: ${m.text}`)
      }
    } else if (m.role === 'user') {
      if (finalOnly && isSideReply(list[i + 1])) continue
      lines.push(`Candidate: ${m.text}`)
    }
  }
  return lines.join('\n')
}

export function buildTurnPrompt({ job, transcript, currentQuestion, forceAnswer, isLastQuestion }) {
  const role = `"${job?.title || 'this role'}"${job?.company ? ' at ' + job.company : ''}`
  return `You are a friendly but realistic interviewer for the role of ${role}.

TRANSCRIPT SO FAR (lines marked "side reply" were clarifications, not new questions):
${transcript}

The CURRENT interview question is: "${currentQuestion}"
The candidate's LATEST message is the last "Candidate:" line above.

First decide the intent of that latest message:
- "answer": a genuine attempt to answer the current question in explanatory, sentence-wise form. Imperfect or short answers still count as long as they are on-topic and explain something.
- "clarification": the candidate is asking a doubt or question about the question, the role, the company or what is expected, or says they do not understand it.
- "irrelevant": not an answer and not a real doubt: off-topic, gibberish, filler ("ok", "yes", "idk", "hello"), a single word or fragment with no explanation, or unrelated to the question.
${
  forceAnswer
    ? '\nIMPORTANT: the candidate has already had several side replies on this question. You MUST use intent "answer" now. If their message does not really address the question, say so honestly in the feedback and move on.\n'
    : ''
}
Respond with ONLY valid JSON, no markdown fences, in exactly this shape:
{
  "intent": "answer" | "clarification" | "irrelevant",
  "feedback": "<ONLY for intent answer: 1-2 sentences reacting to what they said, honest and direct, not falsely enthusiastic. Otherwise an empty string.>",
  "nextQuestion": "<ONLY for intent answer: ${
    isLastQuestion
      ? 'this was the final question, so use an empty string'
      : 'exactly one natural follow-up or new interview question, building on their answer where relevant'
  }. Otherwise an empty string.>",
  "reply": "<ONLY for clarification or irrelevant. For clarification: answer their doubt in 2-4 sentences as the interviewer would, explaining what the question is really asking and what a strong answer could cover, WITHOUT giving a full model answer and WITHOUT asking a new question. For irrelevant: 1-3 sentences saying plainly that their message does not answer the question, and naming what the question is looking for. Do NOT tell them to answer now or to type anything; that closing line is added automatically. Otherwise an empty string.>"
}`
}


// ---- Deterministic pre-checks (no LLM call, so they cost no usage) --------
// The model alone is unreliable at spotting gibberish and short doubts, so
// obvious cases are decided here first.

const GREETING_RE = /^(hi+|hello+|hey+|yo|sup|hola|howdy|good\s+(morning|afternoon|evening)|how\s+(are|r)\s+(you|u)|how\s+you|what'?s\s+up|wassup)\b/i
const FILLER_RE = /^(ok(ay)?|yes|yeah|yep|no|nope|idk|i\s+don'?t\s+know|hmm+|huh|lol|haha+|test(ing)?|asdf\w*|qwerty\w*|thanks?|thank\s+you|sure|cool|nice|fine|good|k)\W*$/i
const DOUBT_START_RE = /^(what|whats|what's|why|how|which|who|when|where|can|could|would|do|does|is|are|please|pls|explain|clarify|meaning|define)\b/i
const DOUBT_PHRASE_RE = /(what\s+(does|do|is|are)\b.*\bmean|\bmeaning\s+of\b|don'?t\s+understand|do\s+not\s+understand|not\s+sure\s+what|didn'?t\s+get|confus|can\s+you\s+(explain|clarify|rephrase)|could\s+you\s+(explain|clarify|rephrase)|what\s+do\s+you\s+mean|what\s+are\s+you\s+asking|\bexplain\b|\bclarify\b|\brephrase\b)/i

function wordsOf(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean)
}

export function looksLikeDoubt(text) {
  const t = (text || '').trim()
  if (!t) return false
  const n = wordsOf(t).length
  if (DOUBT_PHRASE_RE.test(t)) return n <= 30
  if (t.includes('?') && n <= 30) return true
  return n <= 12 && DOUBT_START_RE.test(t) && /^(what|whats|what's|why|how|which|who|explain|clarify|meaning|define|can|could)\b/i.test(t)
}

// Greetings, filler, keyboard-mashing or fragments that cannot be an answer.
export function looksLikeNonAnswer(text) {
  const t = (text || '').trim()
  if (!t) return true
  if (looksLikeDoubt(t)) return false
  const words = wordsOf(t)
  if (FILLER_RE.test(t)) return true
  if (GREETING_RE.test(t) && words.length <= 8) return true
  if (words.length <= 2) return true
  const letters = t.replace(/[^a-z]/gi, '')
  if (letters.length < 4) return true
  // Words of 4+ letters with no vowel, or one character repeated, read as mashing.
  const mashed = words.filter((w) => {
    const l = w.replace(/[^a-z]/gi, '')
    return l.length >= 4 && (!/[aeiouy]/i.test(l) || /^(.)\1+$/.test(l))
  })
  return words.length <= 6 && mashed.length >= Math.ceil(words.length / 2)
}

export function buildRedirectReply(question) {
  const q = (question || '').trim()
  const head = q
    ? `That doesn't answer the question. The question was: "${q}"`
    : "That doesn't answer the question."
  return `${head}\n\n${CLOSING_REDIRECT}`
}

export function buildClarifyPrompt({ job, transcript, currentQuestion }) {
  const role = `"${job?.title || 'this role'}"${job?.company ? ' at ' + job.company : ''}`
  return `You are a friendly interviewer for the role of ${role}.

TRANSCRIPT SO FAR:
${transcript}

The CURRENT interview question is: "${currentQuestion}"
The candidate's latest message is a doubt about the question or a term in it. Answer the doubt directly in 2-4 sentences: if they ask what a word means, define it simply in the context of this role; explain what the question is really asking and what a strong answer could cover. Do NOT give a full model answer and do NOT ask a new question. Do not tell them to answer now; that line is added automatically.

Respond with ONLY valid JSON, no markdown fences: {"reply": "<your explanation>"}`
}

// Turns the model's JSON into a decision. Throws a user-facing message when the
// model's output cannot be used.
export function interpretTurn(parsed, { forceAnswer, isLastQuestion }) {
  const bad = () => new Error('Orbit Mentor had trouble forming its response. Please try again.')
  if (!parsed || typeof parsed !== 'object') throw bad()

  const str = (v) => (typeof v === 'string' ? v.trim() : '')
  let intent = str(parsed.intent).toLowerCase()
  const feedback = str(parsed.feedback)
  const nextQuestion = str(parsed.nextQuestion)
  const reply = str(parsed.reply)

  if (!['answer', 'clarification', 'irrelevant'].includes(intent)) {
    // Model skipped the intent field: infer it from what it did send.
    intent = nextQuestion || feedback ? 'answer' : reply ? 'clarification' : ''
  }
  if (forceAnswer) intent = 'answer'
  if (!intent) throw bad()

  if (intent === 'answer') {
    if (!isLastQuestion && !nextQuestion) throw bad()
    return { kind: 'question', feedback, question: nextQuestion }
  }
  if (!reply) throw bad()
  if (intent === 'clarification') {
    return { kind: 'clarification', reply: `${reply}\n\n${CLOSING_CLARIFY}` }
  }
  return { kind: 'redirect', reply: `${reply}\n\n${CLOSING_REDIRECT}` }
}

// Decides what to do with the candidate's latest message.
//   { type: 'side', kind, reply, message }   stay on the same question
//   { type: 'advance', feedback, question }  next question
//   { type: 'finish', feedback }             that was the last question
// `messages` already includes the candidate's latest message.
export async function runInterviewTurn({ messages, job, callLLM, safeParseJson }) {
  const questionsAsked = countQuestions(messages)
  const isLastQuestion = questionsAsked >= MAX_INTERVIEW_TURNS
  const forceAnswer = sideTurnsOnCurrentQuestion(messages) >= MAX_SIDE_TURNS_PER_QUESTION

  const sideMessage = (kind, reply) => ({
    type: 'side',
    kind,
    reply,
    message: { role: 'assistant', kind, text: reply },
  })
  const latest = [...messages].reverse().find((m) => m.role === 'user')?.text || ''
  const currentQ = currentQuestionText(messages)

  if (!forceAnswer) {
    // Greetings, filler and gibberish: no LLM call at all.
    if (looksLikeNonAnswer(latest)) return sideMessage('redirect', buildRedirectReply(currentQ))

    // A short doubt: a focused clarification-only prompt.
    if (looksLikeDoubt(latest)) {
      try {
        const parsed = safeParseJson(
          await callLLM(buildClarifyPrompt({ job, transcript: buildTranscript(messages), currentQuestion: currentQ }))
        )
        const reply = typeof parsed?.reply === 'string' ? parsed.reply.trim() : ''
        if (reply) return sideMessage('clarification', `${reply}\n\n${CLOSING_CLARIFY}`)
      } catch (_) {
        // fall through to the general prompt below
      }
    }
  }

  const prompt = buildTurnPrompt({
    job,
    transcript: buildTranscript(messages),
    currentQuestion: currentQuestionText(messages),
    forceAnswer,
    isLastQuestion,
  })
  const parsed = safeParseJson(await callLLM(prompt))
  const decision = interpretTurn(parsed, { forceAnswer, isLastQuestion })

  if (decision.kind === 'clarification' || decision.kind === 'redirect') {
    return {
      type: 'side',
      kind: decision.kind,
      reply: decision.reply,
      message: { role: 'assistant', kind: decision.kind, text: decision.reply },
    }
  }
  if (isLastQuestion) return { type: 'finish', feedback: decision.feedback }
  return { type: 'advance', feedback: decision.feedback, question: decision.question }
}
