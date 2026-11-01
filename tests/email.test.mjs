// Run with: npx tsx tests/email.test.mjs
import assert from 'node:assert/strict'
import { validateEmail, splitEmail, looksRandom } from '../src/lib/emailValidation.js'

// fake DNS: only these domains have mail servers
const MX = new Set(['wipro.com', 'bmo.com', 'acme-corp.io', 'hdfcbank.com'])
const fakeFetch = async (url) => {
  const name = new URL(url).searchParams.get('name')
  const has = MX.has(name)
  return { ok: true, json: async () => (has ? { Status: 0, Answer: [{ type: 15, data: '10 mx.' + name }] } : { Status: 3 }) }
}
const down = async () => { throw new Error('offline') }
const run = (e, f = fakeFetch) => validateEmail(e, { fetchImpl: f })

for (const e of ['user@gmail.com', 'USER@Outlook.com', 'a.b+tag@yahoo.co.in', 'me@icloud.com', 'x@proton.me', 'stu@iitb.ac.in', 'a@mit.edu', 'a@cs.ox.ac.uk', 'a@nic.gov.in', 'a@wipro.com', 'a@bmo.com', 'a@hdfcbank.com', 'a@acme-corp.io'])
  assert.equal((await run(e)).ok, true, e)
for (const e of ['a@hdjs.com', 'a@gsh3u3.co', 'x@qwrtz.com', 'a@asdf.com', 'a@nonexistentdomain.org', 'a@123456.com'])
  assert.equal((await run(e)).ok, false, e)
assert.equal((await run('a@mailinator.com')).reason, 'disposable')
for (const e of ['', 'abc', 'a@b', 'a@@b.com', 'a b@gmail.com', 'a@gmail', 'a@-x.com', 'a..b@gmail.com', 'a@gmail.c'])
  assert.equal((await run(e)).reason, 'syntax', e)
// lookup service unreachable: real-looking unknown domains are let through, random ones still blocked
assert.equal((await run('a@acme-corp.io', down)).ok, true)
assert.equal((await run('a@hdjs.com', down)).ok, false)
assert.equal(splitEmail(' A@Gmail.com ').email, 'a@gmail.com')
assert.equal(looksRandom('tcs.com'), false)
console.log('email tests passed')
