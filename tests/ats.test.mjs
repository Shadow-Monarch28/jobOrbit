// Run with: npx tsx tests/ats.test.mjs
import assert from 'node:assert/strict'
import { evaluateAts, applySuggestion } from '../src/lib/atsEvaluator.js'
import { linesToModel, emptyResume, resumeToText, tailorModelToJob, applyAiTailor } from '../src/lib/resumeModel.js'
import { filterTemplates, RESUME_TEMPLATES, COVER_TEMPLATES, TEMPLATE_CATEGORIES } from '../src/lib/resumeTemplates.js'

const job = { id: 'x-1', title: 'Data Analyst', company: 'Acme', description: 'We need a Data Analyst with SQL, Power BI, Excel and Tableau. You will build dashboards and report on KPIs.' }

const good = emptyResume({
  name: 'Asha Rao', headline: 'Data Analyst',
  contact: { email: 'asha@example.com', phone: '+91 98765 43210', location: 'Gurgaon', links: [] },
  summary: 'Data Analyst with three years of experience turning messy data into decisions using SQL, Power BI and Excel.',
  experience: [{ id: 'a', title: 'Data Analyst', org: 'Wipro', location: '', start: 'Jan 2022', end: 'Present', bullets: [
    'Built Power BI dashboards that cut weekly reporting time by 40%', 'Automated Excel reports with VBA, saving 12 hours per month',
    'Analyzed 1.2M rows of payroll data in SQL to find 3 recurring errors', 'Presented KPI trends to 5 stakeholders every quarter'] }],
  education: [{ id: 'e', degree: 'BCA', school: 'MDU Rohtak', location: '', year: '2024', detail: '' }],
  skills: ['SQL', 'Power BI', 'Excel', 'Tableau', 'VBA'],
})
const weak = emptyResume({ name: 'X', experience: [{ id: 'b', title: 'Helper', org: 'Y', location: '', start: '', end: '', bullets: ['Responsible for tasks', 'Worked on things'] }], skills: ['Typing'] })

const g = evaluateAts({ model: good, job })
const w = evaluateAts({ model: weak, job })
assert.ok(g.score >= 80, `good resume scored ${g.score}`)
assert.ok(w.score <= 35, `weak resume scored ${w.score}`)
assert.ok(g.score > w.score + 40)
assert.deepEqual(evaluateAts({ model: good, job }), g, 'deterministic')
assert.ok(w.keywords.missing.map((s) => s.toLowerCase()).includes('sql'))
assert.ok(w.suggestions.some((s) => s.type === 'add_skills'))
assert.ok(w.suggestions.some((s) => s.type === 'set_summary'))
assert.ok(g.checks.every((c) => c.points <= c.max))
assert.equal(g.checks.reduce((n, c) => n + c.max, 0), 100)

// applying suggestions raises the score and never adds unticked skills
const addSkills = w.suggestions.find((s) => s.type === 'add_skills')
let m2 = applySuggestion(weak, addSkills, ['SQL', 'Excel'])
assert.ok(m2.skills.includes('SQL') && !m2.skills.includes('Tableau'))
m2 = applySuggestion(m2, w.suggestions.find((s) => s.type === 'set_summary'))
assert.ok(evaluateAts({ model: m2, job }).score > w.score)

// text import
const lines = ['Asha Rao', 'Data Analyst', 'asha@example.com | +91 98765 43210 | linkedin.com/in/asha', 'SUMMARY', 'Analyst who loves SQL.',
  'EXPERIENCE', 'Data Analyst | Wipro | Jan 2022 - Present', '• Built dashboards cutting reporting time by 40%', '• Automated weekly Excel reports', 'Junior Analyst | Infosys | 2020 - 2021', '• Cleaned data in SQL',
  'EDUCATION', 'BCA - Maharishi Dayanand University 2021 - 2024', 'SKILLS', 'SQL, Excel, Power BI', 'HOBBIES', 'Chess']
const im = linesToModel(lines)
assert.equal(im.name, 'Asha Rao'); assert.equal(im.contact.email, 'asha@example.com')
assert.equal(im.experience.length, 2); assert.equal(im.experience[0].org, 'Wipro'); assert.equal(im.experience[0].bullets.length, 2)
assert.equal(im.education.length, 1); assert.ok(im.skills.includes('Power BI'))
assert.ok(im.extra.some((x) => x.heading.toLowerCase() === 'hobbies'), 'unknown sections are kept')
assert.ok(resumeToText(im).includes('Wipro'))

// tailoring never invents skills; AI output is sanitised
const t = tailorModelToJob(im, job)
assert.deepEqual([...t.skills].sort(), [...im.skills].sort())
const ai = applyAiTailor(im, { summary: 'Tailored.', skills: ['SQL', 'Kubernetes'], experience: [{ i: 0, bullets: ['a', 'b', 'c', 'd'] }, { i: 1, bullets: ['Cleaned SQL data'] }] })
assert.ok(!ai.skills.includes('Kubernetes')); assert.equal(ai.experience[0].bullets.length, 2); assert.equal(ai.experience[1].bullets[0], 'Cleaned SQL data')

// templates and filters
assert.ok(RESUME_TEMPLATES.length >= 12 && COVER_TEMPLATES.length >= 4)
for (const t of [...RESUME_TEMPLATES, ...COVER_TEMPLATES]) for (const g of Object.keys(TEMPLATE_CATEGORIES)) {
  assert.ok(t.tags[g]?.length, `${t.id} missing ${g}`)
  for (const v of t.tags[g]) assert.ok(TEMPLATE_CATEGORIES[g].values.includes(v), `${t.id}: ${v}`)
}
for (const g of Object.keys(TEMPLATE_CATEGORIES)) for (const v of TEMPLATE_CATEGORIES[g].values) assert.ok(RESUME_TEMPLATES.some((t) => t.tags[g].includes(v)), `no template for ${v}`)
assert.ok(filterTemplates(RESUME_TEMPLATES, { level: 'Student / Fresher' }).some((t) => t.id === 'fresher'))
assert.equal(filterTemplates(RESUME_TEMPLATES, { vibe: 'Creative', level: 'Student / Fresher' }).length, 0)
console.log('ats + model + template tests passed', g.score, w.score)

// PDFs render for every template without throwing, and include the content
import { renderBuilderPdf, renderCoverPdf } from '../src/lib/resumePdf.js'
import { draftCoverLetter } from '../src/lib/resumeModel.js'
for (const tpl of RESUME_TEMPLATES) {
  const bytes = await renderBuilderPdf(good, tpl)
  assert.ok(bytes.length > 1500 && String.fromCharCode(...bytes.slice(0, 4)) === '%PDF', tpl.id)
}
const big = { ...good, experience: Array.from({ length: 8 }, (_, i) => ({ ...good.experience[0], id: `p${i}`, bullets: Array(6).fill('Built a long bullet about dashboards that spans more than one line of text so it wraps correctly in the page width') })) }
const pdfLib = await import('pdf-lib')
for (const id of ['classic', 'sidebar', 'executive']) {
  const bytes = await renderBuilderPdf(big, RESUME_TEMPLATES.find((t) => t.id === id))
  const doc = await pdfLib.PDFDocument.load(bytes)
  assert.ok(doc.getPageCount() >= 2, `${id} flows onto page 2`)
}
for (const tpl of COVER_TEMPLATES) {
  const bytes = await renderCoverPdf(draftCoverLetter(good, job, 'Asha Rao'), tpl)
  assert.ok(bytes.length > 1500, tpl.id)
}
console.log('pdf tests passed')
