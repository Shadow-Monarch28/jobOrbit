import assert from 'node:assert/strict'
import { resilient, fetchJson } from '../src/lib/jobSources/resilient.js'

let calls = 0
// 1. results are cached and shared
const a = await resilient({ key: 't1', label: 'X', load: async () => { calls++; return { jobs: [1] } } })
const b = await resilient({ key: 't1', label: 'X', load: async () => { calls++; return { jobs: [2] } } })
assert.equal(calls, 1); assert.deepEqual(a, b)

// 2. identical calls at the same time make one request
let n = 0
const load = async () => { n++; await new Promise((r) => setTimeout(r, 30)); return { ok: 1 } }
await Promise.all([resilient({ key: 't2', label: 'X', load }), resilient({ key: 't2', label: 'X', load })])
assert.equal(n, 1)

// 3. one retry on a hiccup
let tries = 0
const r = await resilient({ key: 't3', label: 'X', load: async () => { if (++tries === 1) throw new Error('boom'); return { ok: true } } })
assert.equal(tries, 2); assert.deepEqual(r, { ok: true })

// 4. rate limits are not retried
let rl = 0
await assert.rejects(resilient({ key: 't4', label: 'X', load: async () => { rl++; throw Object.assign(new Error('limit'), { final: true }) } }), /limit/)
assert.equal(rl, 1)

// 5. an old good answer is used when a refresh fails
await resilient({ key: 't5', label: 'X', ttl: 0, load: async () => ({ jobs: ['old'] }) })
const stale = await resilient({ key: 't5', label: 'X', ttl: 0, load: async () => { throw Object.assign(new Error('down'), { final: true }) } })
assert.deepEqual(stale, { jobs: ['old'] })

// 6. friendly messages from the proxy codes
globalThis.fetch = async () => new Response(JSON.stringify({ error: 'x', code: 'rate_limit' }), { status: 429 })
await assert.rejects(fetchJson('http://x', 'Adzuna'), /free limit has been used up/)
globalThis.fetch = async () => new Response('<html>', { status: 502 })
await assert.rejects(fetchJson('http://x', 'Lever'), /Lever did not answer properly/)
console.log('resilient tests passed')
