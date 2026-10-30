// Run with: npx tsx tests/catalog.test.mjs
import assert from 'node:assert/strict'
import { JOB_CATALOG, INDUSTRY_OPTIONS, JOB_TITLE_LIST, categorizeJob } from '../src/lib/data/jobCatalog.js'
import { LOCATION_SUGGESTIONS } from '../src/lib/data/locations.js'
import { SKILL_SUGGESTIONS } from '../src/lib/data/skills.js'
import { extractSkillsFromText, computeMatchScore } from '../src/lib/matchingEngine.js'
import { buildSourceLink, SOURCES } from '../src/lib/jobSources/sourceMeta.js'

const banned = ['security & safety', 'housekeeping', 'food service', 'canteen', 'facilities', 'maintenance', 'labour', 'warehouse', 'education', 'construction', 'skilled trades']
for (const i of INDUSTRY_OPTIONS) assert.ok(!banned.some((b) => i.toLowerCase().includes(b)), `banned industry ${i}`)
for (const t of JOB_TITLE_LIST) assert.ok(!/\b(teacher|security guard|housekeeper|cleaner|cook|chef|warehouse (associate|worker|helper|executive|supervisor)|carpenter|electrician|plumber|mason|welder|janitor|professor|tutor)\b/i.test(t), `banned title ${t}`)
assert.ok(JOB_TITLE_LIST.length > 350, `titles: ${JOB_TITLE_LIST.length}`)
assert.ok(LOCATION_SUGGESTIONS.length > 195)
assert.equal(new Set(LOCATION_SUGGESTIONS).size, LOCATION_SUGGESTIONS.length)
for (const c of ['India', 'Japan', 'Brazil', 'Nigeria', 'Iceland', 'New Zealand', 'Vietnam']) assert.ok(LOCATION_SUGGESTIONS.includes(c), c)
for (const s of ['SQL', 'Figma', 'Terraform', 'GAAP', 'Zendesk', 'PLC Programming']) assert.ok(SKILL_SUGGESTIONS.includes(s), s)
assert.equal(categorizeJob({ title: 'Senior React Developer' }), 'Software Engineering')
assert.equal(categorizeJob({ title: 'Account Follow-Up Representative I', tags: [] }), null)
assert.equal(categorizeJob({ title: 'Staff Nurse' }), 'Healthcare & Life Sciences')
assert.equal(categorizeJob({ title: 'Payroll Specialist' }), 'Finance & Accounting')
assert.equal(categorizeJob({ title: 'Digital Marketing Manager' }), 'Marketing & Communications')
assert.ok(extractSkillsFromText('We use React, SQL and Terraform').includes('Terraform'))
const t0 = Date.now()
const job = { id: 'a-1', title: 'Data Analyst', description: 'SQL Power BI Excel '.repeat(200) }
for (let i = 0; i < 500; i++) computeMatchScore(['SQL'], { ...job, id: `a-${i}` })
assert.ok(Date.now() - t0 < 4000, `slow: ${Date.now() - t0}ms`)
assert.ok(buildSourceLink('wellfound', { title: 'Data Analyst' }).includes('data-analyst'))
assert.ok(buildSourceLink('foundit', { title: 'Data Analyst', country: 'India' }).includes('Data%20Analyst'))
assert.ok(SOURCES.some((s) => s.key === 'cutshort'))
console.log('catalog tests passed', JOB_TITLE_LIST.length, 'titles', SKILL_SUGGESTIONS.length, 'skills', LOCATION_SUGGESTIONS.length, 'places', Date.now() - t0, 'ms')

// link-only sources must never be fetched or selectable
import { API_SOURCE_KEYS, LINK_SOURCES } from '../src/lib/jobSources/sourceMeta.js'
assert.ok(LINK_SOURCES.length === 3 && LINK_SOURCES.every((s) => !API_SOURCE_KEYS.includes(s.key)))
console.log('source tests passed')
