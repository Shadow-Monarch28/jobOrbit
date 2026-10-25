// Run with: node tests/mockInterview.test.mjs
import assert from 'node:assert/strict'
import {
  MAX_INTERVIEW_TURNS, MAX_SIDE_TURNS_PER_QUESTION, CLOSING_CLARIFY, CLOSING_REDIRECT,
  countQuestions, sideTurnsOnCurrentQuestion, buildTranscript, runInterviewTurn,
} from '../supabase/functions/_shared/mockInterview.ts'

const job = { title: 'Business Analyst', company: 'Acme' }
const parse = (t) => JSON.parse(t)
// fake LLM: returns whatever JSON the test queues next, and records prompts
function fakeLLM(queue) {
  const prompts = []
  const fn = async (p) => { prompts.push(p); return JSON.stringify(queue.shift()) }
  fn.prompts = prompts
  return fn
}
// drives one candidate message through the same steps the edge function does
async function send(messages, text, llmReply) {
  const next = [...messages, { role: 'user', text }]
  const llm = fakeLLM([llmReply])
  const out = await runInterviewTurn({ messages: next, job, callLLM: llm, safeParseJson: parse })
  let stored = next
  if (out.type === 'side') stored = [...next, out.message]
  if (out.type === 'advance') stored = [...next, { role: 'assistant', kind: 'question', text: out.question, feedback: out.feedback }]
  return { out, messages: stored, prompt: llm.prompts[0] }
}

let msgs = [{ role: 'assistant', kind: 'question', text: 'Tell me about a time you used SQL.' }]
let r

// 1. irrelevant message: highlighted redirect, same question, count unchanged
r = await send(msgs, 'asdf lol', { intent: 'irrelevant', reply: "That isn't an answer to the question about SQL." })
assert.equal(r.out.type, 'side'); assert.equal(r.out.kind, 'redirect')
assert.ok(r.out.reply.endsWith(CLOSING_REDIRECT), 'redirect asks for a correct, reasonable answer')
assert.equal(countQuestions(r.messages), 1, 'redirect must not use a question slot')
msgs = r.messages

// 2. a doubt: answered, then "answer now or ask more"
r = await send(msgs, 'Do you mean at my current job?', { intent: 'clarification', reply: 'Any job or project works.' })
assert.equal(r.out.kind, 'clarification')
assert.ok(r.out.reply.endsWith(CLOSING_CLARIFY))
assert.equal(countQuestions(r.messages), 1, 'clarification must not use a question slot')
assert.equal(sideTurnsOnCurrentQuestion(r.messages), 2)
msgs = r.messages

// 3. a follow-up doubt is still allowed
r = await send(msgs, 'How long should it be?', { intent: 'clarification', reply: 'A minute or so.' })
assert.equal(r.out.kind, 'clarification'); msgs = r.messages

// 4. a real, sentence-wise answer is approved and the interview moves on
r = await send(msgs, 'I wrote SQL joins to reconcile payroll data and cut errors by 30%.',
  { intent: 'answer', feedback: 'Good, concrete result.', nextQuestion: 'How do you prioritise requests?' })
assert.equal(r.out.type, 'advance'); assert.equal(r.out.question, 'How do you prioritise requests?')
assert.equal(countQuestions(r.messages), 2)
assert.equal(sideTurnsOnCurrentQuestion(r.messages), 0, 'side counter resets for the new question')
msgs = r.messages

// 5. cap: after MAX side replies the next message is forced to be treated as the answer
for (let i = 0; i < MAX_SIDE_TURNS_PER_QUESTION; i++) {
  r = await send(msgs, `huh ${i}`, { intent: 'clarification', reply: 'Let me rephrase.' })
  assert.equal(r.out.type, 'side'); msgs = r.messages
}
assert.equal(sideTurnsOnCurrentQuestion(msgs), MAX_SIDE_TURNS_PER_QUESTION)
r = await send(msgs, 'still unsure', { intent: 'irrelevant', reply: 'x', feedback: 'That did not address the question.', nextQuestion: 'Describe a conflict with a stakeholder.' })
assert.equal(r.out.type, 'advance', 'over the cap, the model cannot keep us stuck on one question')
assert.match(r.prompt, /You MUST use intent "answer"/)
assert.equal(countQuestions(r.messages), 3); msgs = r.messages

// 6. the question limit is still exactly MAX_INTERVIEW_TURNS, with side chatter in between
msgs = [{ role: 'assistant', kind: 'question', text: 'Q1' }]
for (let q = 1; q <= MAX_INTERVIEW_TURNS; q++) {
  r = await send(msgs, 'what?', { intent: 'clarification', reply: 'It asks about X.' }); msgs = r.messages
  r = await send(msgs, 'blah', { intent: 'irrelevant', reply: 'Not an answer.' }); msgs = r.messages
  assert.equal(countQuestions(msgs), q, `side replies never advance the count (q${q})`)
  r = await send(msgs, `A real answer ${q}`, { intent: 'answer', feedback: 'ok', nextQuestion: q < MAX_INTERVIEW_TURNS ? `Q${q + 1}` : '' })
  if (q < MAX_INTERVIEW_TURNS) { assert.equal(r.out.type, 'advance'); msgs = r.messages }
  else assert.equal(r.out.type, 'finish', 'answering question 10 ends the interview')
}
assert.equal(countQuestions(msgs), MAX_INTERVIEW_TURNS)

// 7. a doubt on the LAST question does not end the interview
r = await send(msgs, 'Can you repeat that?', { intent: 'clarification', reply: 'Sure.' })
assert.equal(r.out.type, 'side', 'asking a doubt on question 10 must not trigger the summary')

// 8. old sessions (no `kind` on assistant messages) still count as questions
assert.equal(countQuestions([{ role: 'assistant', text: 'old q' }, { role: 'user', text: 'a' }, { role: 'assistant', text: 'old q2' }]), 2)

// 9. the final rating ignores the off-topic exchanges
const t = buildTranscript([
  { role: 'assistant', kind: 'question', text: 'Q' }, { role: 'user', text: 'asdf' },
  { role: 'assistant', kind: 'redirect', text: 'Not an answer.' }, { role: 'user', text: 'Real answer' },
], { finalOnly: true })
assert.equal(t, 'Interviewer: Q\nCandidate: Real answer')

// 10. unusable model output gives the friendly retry message, not a crash
await assert.rejects(
  runInterviewTurn({ messages: [{ role: 'assistant', text: 'Q' }, { role: 'user', text: 'a' }], job, callLLM: async () => '{}', safeParseJson: parse }),
  /had trouble forming its response/,
)
console.log('all mock interview tests passed')
