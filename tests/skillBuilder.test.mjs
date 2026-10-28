// Run with: node tests/skillBuilder.test.mjs
import assert from 'node:assert/strict'
import { ratingCap, finalizeEvaluation, evaluateSkillAnswer, topicOverlap } from '../supabase/functions/_shared/skillBuilder.ts'

const ex = 'Explain how you would use a SQL JOIN to combine orders and customers tables, and when you would pick a LEFT JOIN.'
const skill = 'SQL'
const good = 'I would use an INNER JOIN on customer_id to combine orders and customers, returning only matching rows. A LEFT JOIN is better when I need every customer even without orders, since unmatched order columns come back NULL.'
const parse = (t) => JSON.parse(t)
const llm = (obj) => async () => JSON.stringify(obj)
let calls = 0
const counting = (obj) => async () => { calls++; return JSON.stringify(obj) }

// gibberish: rating 1, no LLM call
let r = await evaluateSkillAnswer({ skillName: skill, exercise: ex, answer: 'bcdfg hjklm', callLLM: counting({ readyRating: 5, feedback: 'great' }), safeParseJson: parse })
assert.equal(r.readyRating, 1); assert.equal(calls, 0)
// keyboard mash with vowels still can't score high
r = await evaluateSkillAnswer({ skillName: skill, exercise: ex, answer: 'asdf jkl qwrty', callLLM: llm({ readyRating: 5, feedback: 'great' }), safeParseJson: parse })
assert.ok(r.readyRating <= 2)

// model inflates a short answer: capped
r = await evaluateSkillAnswer({ skillName: skill, exercise: ex, answer: 'Use a join to combine them okay', callLLM: llm({ readyRating: 5, feedback: 'Perfect.' }), safeParseJson: parse })
assert.ok(r.readyRating <= 2, `got ${r.readyRating}`)

// off-topic long answer: capped at 2
const off = 'My favourite holiday destination is the mountains because the weather is cool and the food is wonderful there.'
r = await evaluateSkillAnswer({ skillName: skill, exercise: ex, answer: off, callLLM: llm({ readyRating: 5, feedback: 'ok' }), safeParseJson: parse })
assert.ok(r.readyRating <= 2)

// good answer keeps model rating
r = await evaluateSkillAnswer({ skillName: skill, exercise: ex, answer: good, callLLM: llm({ readyRating: 5, feedback: 'Solid.' }), safeParseJson: parse })
assert.equal(r.readyRating, 5)
r = await evaluateSkillAnswer({ skillName: skill, exercise: ex, answer: good, callLLM: llm({ readyRating: 3, feedback: 'Partial.' }), safeParseJson: parse })
assert.equal(r.readyRating, 3)

// bad model output: clamped, never inflated
assert.equal(finalizeEvaluation({ readyRating: 9, feedback: 'x' }, { exercise: ex, answer: good, skillName: skill }).readyRating, 5)
assert.equal(finalizeEvaluation({ readyRating: -3 }, { exercise: ex, answer: good, skillName: skill }).readyRating, 1)
assert.ok(finalizeEvaluation({}, { exercise: ex, answer: good, skillName: skill }).readyRating <= 2)
assert.ok(topicOverlap(ex, good, skill) > topicOverlap(ex, off, skill))
assert.equal(ratingCap(ex, '', skill), 1)
console.log('skillBuilder tests passed')
