// Run with: npx tsx tests/resumeImport.test.mjs
// Builds a real two-column PDF with letter-spaced headings, reads it back with pdf.js and
// checks every section lands in the right place.
import assert from 'node:assert/strict'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { groupItemsIntoLines, cleanHeading, splitOutsideParens } from '../src/lib/resumeBuilder.js'
import { linesToModel, normalizeModel } from '../src/lib/resumeModel.js'

const pdf = await PDFDocument.create()
const f = await pdf.embedFont(StandardFonts.Helvetica), b = await pdf.embedFont(StandardFonts.HelveticaBold)
const page = pdf.addPage([595, 842])
const txt = (s, x, y, size = 9, font = f) => page.drawText(s, { x, y, size, font, color: rgb(0.1, 0.1, 0.1) })
const spaced = (s, x, y) => { let cx = x; for (const ch of s) { if (ch === ' ') { cx += 9; continue } txt(ch, cx, y, 11, b); cx += b.widthOfTextAtSize(ch, 11) + 3.2 } }
txt('Abishek M', 40, 790, 22, b); txt('Senior HR Operations Specialist', 40, 772, 11)
let y = 730; spaced('CONTACT', 40, y); y -= 18
for (const l of ['Email', 'abishekm0722@gmail.com', 'Phone', '+91 98765 43210', 'Gurgaon, India']) { txt(l, 40, y); y -= 13 }
y -= 10; spaced('SKILLS', 40, y); y -= 18
for (const l of ['SQL', 'Power BI', 'Advanced Excel', 'Python (Pandas, NumPy)', 'Data Modeling', 'ETL Processes', 'Tableau', 'Payroll Processing', 'Reporting', 'Dashboarding']) { txt(l, 40, y); y -= 13 }
y -= 10; spaced('CERTIFICATIONS', 40, y); y -= 18
for (const l of ['Advanced Data Analyst using Python & MS Excel', 'Google Data Analytics Certificate']) { txt(l, 40, y); y -= 13 }
y = 730; const X = 270
spaced('WORK EXPERIENCE', X, y); y -= 17
txt('Customer Service Representative', X, y, 10, b); y -= 12; txt('Wipro HR Services', X, y); y -= 12; txt('Jul 2024 - Present | Haryana, India', X, y); y -= 13
for (const l of ['- Conducted requirements analysis for HR reporting using advanced Excel', '- Improved benefits data for 500+ employees, ensuring accuracy']) { txt(l, X, y); y -= 12 }
y -= 10; spaced('EDUCATION', X, y); y -= 17
txt('Bachelor of Computer Applications', X, y, 10, b); y -= 12; txt('Maharishi Dayanand University, Rohtak', X, y); y -= 12; txt('2021 - 2024', X, y); y -= 12
y -= 10; spaced('PROJECTS', X, y); y -= 17
txt('Sales Performance Dashboard', X, y, 10, b); y -= 12
for (const l of ['- Built a Power BI dashboard tracking 12 KPIs across 5 regions']) { txt(l, X, y); y -= 12 }

const doc = await pdfjs.getDocument({ data: new Uint8Array(await pdf.save()), useSystemFonts: true }).promise
const items = (await (await doc.getPage(1)).getTextContent()).items
const m = linesToModel(groupItemsIntoLines(items))

assert.equal(m.name, 'Abishek M')
assert.equal(m.headline, 'Senior HR Operations Specialist')
assert.equal(m.contact.email, 'abishekm0722@gmail.com')
assert.equal(m.contact.phone, '+91 98765 43210')
assert.equal(m.experience.length, 1)
assert.equal(m.experience[0].title, 'Customer Service Representative')
assert.equal(m.experience[0].org, 'Wipro HR Services')
assert.equal(m.experience[0].location, 'Haryana, India')
assert.equal(m.experience[0].bullets.length, 2)
assert.equal(m.education.length, 1)
assert.match(m.education[0].degree, /Bachelor of Computer Applications/)
assert.deepEqual(m.projects[0].bullets.length, 1)
assert.ok(m.skills.includes('Python (Pandas, NumPy)') && m.skills.includes('SQL'))
assert.ok(m.skills.every((s) => s.split(' ').length <= 4), 'no sentences in skills')
assert.equal(m.certifications.length, 2)
assert.equal(m.extra.length, 0, 'nothing stranded in extra sections')

// headings
assert.equal(cleanHeading('W O R K E X P E R I E N C E'), 'Work Experience')
assert.equal(cleanHeading('WORKEXPERIENCE'), 'Work Experience')
assert.equal(cleanHeading('C E R T I F I C A T I O N S'), 'Certifications')
assert.equal(cleanHeading('SKILLS'), 'Skills')
assert.deepEqual(splitOutsideParens('Python (Pandas, NumPy), SQL'), ['Python (Pandas, NumPy)', ' SQL'])
assert.equal(normalizeModel({ extra: [{ id: 'x', heading: 'W O R K E X P E R I E N C E', lines: [] }] }).extra.length, 0)
assert.equal(normalizeModel({ extra: [{ id: 'x', heading: 'Volunteering', lines: ['a'] }] }).extra[0].heading, 'Volunteering')

// a resume saved by the old reader: real sections stranded under "Other sections" with contact lines inside
const old = normalizeModel({
  name: 'Abishek M', contact: { email: '', phone: '', location: '', links: [] }, experience: [], education: [], projects: [], skills: [], certifications: [],
  extra: [
    { id: 'a', heading: 'W O R K E X P E R I E N C E', lines: ['Email', 'abishekm0722@gmail.com Customer Service Representative', 'Wipro HR Services', 'Jul 2024 - Present | Haryana , India', '- Reconciled payroll data for 500+ employees'] },
    { id: 'b', heading: 'S K I L L S', lines: ['SQL, Power BI', 'Conducted requirements analysis for HR reporting by leveraging advanced Excel functions to reconcile payroll and benefits data'] },
    { id: 'c', heading: 'IBM', lines: ['Python (Pandas, NumPy, Matplotlib)'] },
  ],
})
assert.equal(old.contact.email, 'abishekm0722@gmail.com')
assert.equal(old.experience[0].title, 'Customer Service Representative')
assert.equal(old.experience[0].org, 'Wipro HR Services')
assert.ok(old.experience.some((e) => e.bullets.some((b) => /Conducted requirements analysis/.test(b))), 'work sentence left Skills')
assert.ok(old.skills.includes('SQL') && !old.skills.some((x) => x.length > 40))
assert.equal(old.extra.length, 0)
assert.ok(old.certifications.includes('IBM: Python (Pandas, NumPy, Matplotlib)'))

// strays: work sentences under Skills, tool lists under Education, contact block in the header
const lines = [
  { text: 'Jane Doe', size: 20 }, { text: 'jane@gmail.com', size: 9 },
  { text: 'WORK EXPERIENCE', size: 11 }, { text: 'Analyst', size: 10 }, { text: 'Acme Corp', size: 10 }, { text: 'Jan 2022 - Present', size: 10 },
  { text: '- Built dashboards that cut weekly reporting time by 40% for the finance team', size: 9 },
  { text: 'SKILLS', size: 11 }, { text: 'SQL, Excel', size: 9 },
  { text: 'Conducted requirements analysis for HR reporting by leveraging advanced Excel functions', size: 9 },
  { text: 'EDUCATION', size: 11 }, { text: 'BCA, Maharishi Dayanand University', size: 9 }, { text: '2021 - 2024', size: 9 },
  { text: 'Python, Tableau, SQL', size: 9 },
]
const m2 = linesToModel(lines)
assert.ok(m2.skills.includes('Python') && m2.skills.includes('Tableau'), 'tools moved from Education to Skills')
assert.ok(!m2.skills.some((s) => s.length > 40), 'no work sentence in skills')
assert.ok(m2.experience[0].bullets.some((x) => /Conducted requirements analysis/.test(x)), 'work sentence moved to experience')
assert.ok(!m2.education[0].detail.includes('Tableau'))

// narrow sidebar: wrapped certificate, issuer headings, wrapped job title under the name
{
  const pdf2 = await PDFDocument.create()
  const r = await pdf2.embedFont(StandardFonts.Helvetica), bd = await pdf2.embedFont(StandardFonts.HelveticaBold)
  const pg = pdf2.addPage([595, 842])
  const t = (s, x, y, size = 9, font = r) => pg.drawText(s, { x, y, size, font })
  t('Abishek M', 40, 790, 20, bd); t('Senior HR Operations', 40, 772, 10.5); t('Specialist', 40, 760, 10.5)
  let y = 720; t('CERTIFICATIONS', 40, y, 11, bd); y -= 18
  for (const l of ['Data Modeling', 'Advanced Data Analyst using', 'Python & MS Excel']) { t(l, 40, y); y -= 12 }
  t('IBM', 40, y, 9.5, bd); y -= 12
  for (const l of ['Python (Pandas, NumPy,', 'Matplotlib)']) { t(l, 40, y); y -= 12 }
  y = 720; t('WORK EXPERIENCE', 270, y, 11, bd); y -= 18
  t('Customer Service Representative', 270, y, 10, bd); y -= 12; t('Wipro HR Services', 270, y); y -= 12; t('Jul 2024 - Present | Haryana, India', 270, y); y -= 12; t('- Reconciled payroll data for 500+ employees', 270, y)
  y -= 30; t('SKILLS', 270, y, 11, bd); y -= 18; t('SQL, Power BI, Excel', 270, y)
  const d2 = await pdfjs.getDocument({ data: new Uint8Array(await pdf2.save()), useSystemFonts: true }).promise
  const m3 = linesToModel(groupItemsIntoLines((await (await d2.getPage(1)).getTextContent()).items))
  assert.equal(m3.headline, 'Senior HR Operations Specialist')
  assert.deepEqual(m3.certifications, ['Data Modeling', 'Advanced Data Analyst using Python & MS Excel', 'IBM: Python (Pandas, NumPy, Matplotlib)'])
  assert.equal(m3.experience[0].title, 'Customer Service Representative')
  assert.equal(m3.extra.length, 0)
}
console.log('resume import tests passed')
