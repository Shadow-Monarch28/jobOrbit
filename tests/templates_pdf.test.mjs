// Every template must render a real PDF. Run: npx tsx tests/templates_pdf.test.mjs
import assert from 'node:assert/strict'
import { RESUME_TEMPLATES, COVER_TEMPLATES } from '../src/lib/resumeTemplates.js'
import { renderBuilderPdf, renderCoverPdf } from '../src/lib/resumePdf.js'
import { emptyResume, emptyCoverLetter } from '../src/lib/resumeModel.js'

const m = emptyResume({ name: 'Alex Morgan', title: 'Analyst', summary: 'Analyst who likes data.', skills: ['SQL', 'Excel'],
  experience: [{ id: 'a', title: 'Analyst', org: 'Acme', location: 'Delhi', start: '2022', end: 'Present', bullets: ['Cut reporting time by 40%'] }] })
for (const t of RESUME_TEMPLATES) {
  const b = await renderBuilderPdf(m, t)
  assert.ok(b.length > 1000 && String.fromCharCode(...b.slice(0, 4)) === '%PDF', t.id)
}
const l = emptyCoverLetter({ name: 'Alex Morgan', body: 'Dear team,\n\nI would love to join.\n\nThanks' })
for (const t of COVER_TEMPLATES) {
  const b = await renderCoverPdf(l, t)
  assert.ok(b.length > 1000 && String.fromCharCode(...b.slice(0, 4)) === '%PDF', t.id)
}
console.log('all', RESUME_TEMPLATES.length, 'resume and', COVER_TEMPLATES.length, 'cover templates render')
