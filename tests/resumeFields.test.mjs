import assert from 'node:assert/strict'
import { despaceText, classifyHeading } from '../src/lib/resumeBuilder.js'
import { linesToModel, normalizeModel } from '../src/lib/resumeModel.js'
import { normalizeLinks, linkLabel } from '../src/lib/resumeLinks.js'
import { toMonthInput, fromMonthInput, experiencePeriod, educationPeriod } from '../src/lib/resumeDates.js'
import { contactLines } from '../src/lib/resumeDoc.js'
import { buildSourceLink, SOURCE_LABEL } from '../src/lib/jobSources/sourceMeta.js'

assert.equal(despaceText('J O H N   D O E'), 'JOHN DOE')
assert.equal(despaceText('Data Analyst'), 'Data Analyst')
assert.equal(classifyHeading('Work History'), 'experience')
assert.equal(classifyHeading('Academic Projects'), 'projects')
assert.equal(classifyHeading('Educational Qualification'), 'education')
assert.equal(classifyHeading('Tools & Technologies'), 'skills')
assert.equal(classifyHeading('Licenses & Certifications'), 'certs')

assert.equal(linkLabel('https://www.linkedin.com/in/x'), 'LinkedIn')
const links = normalizeLinks(['github.com/me', { label: 'My site', url: 'me.dev' }])
assert.deepEqual(links.map((l) => l.label), ['GitHub', 'My site'])
assert.deepEqual(contactLines({ contact: { email: 'a@b.co', links } }), ['a@b.co', 'GitHub', 'My site'])

assert.equal(fromMonthInput('2024-07'), 'Jul 2024')
assert.equal(toMonthInput('Jul 2024'), '2024-07')
assert.equal(experiencePeriod({ start: 'Jul 2024', end: '', current: true }), 'Jul 2024 – Present')
assert.equal(educationPeriod({ start: 'Jul 2021', end: 'Jun 2024' }), 'Jul 2021 – Jun 2024')

const m = normalizeModel({ name: 'J O H N D O E', headline: '', contact: { email: '', phone: '', location: '', links: ['github.com/me'] }, experience: [{ id: '1', end: 'Present', start: 'Jan 2022', bullets: [] }], education: [{ id: '2', year: '2021 - 2024' }], projects: [], skills: [], certifications: [], extra: [{ heading: 'Work History', lines: ['Analyst | Acme  Jan 2020 - Dec 2021', '- Built dashboards'] }, { heading: 'Academic Projects', lines: ['Churn model', '- Predicted churn'] }] })
assert.ok(m.experience.find((e) => e.current), 'present -> current')
assert.ok(m.experience.length >= 2, 'work history moved to experience')
assert.ok(m.projects.length >= 1, 'academic projects moved to projects')
assert.equal(m.education[0].start, '2021')
assert.equal(m.extra.length, 0)

assert.ok(!SOURCE_LABEL.himalayas && !SOURCE_LABEL.ashby && !SOURCE_LABEL.workingnomads)
assert.ok(buildSourceLink('naukri', { title: 'Data Analyst' }).includes('data-analyst'))
console.log('resume field tests passed')

// ---- round: scrubbed leftovers, unfamiliar headings, month-dash dates ----
import { scrubText, guessKind } from '../src/lib/resumeModel.js'
assert.equal(scrubText('May ( )'), '')
assert.equal(scrubText('June'), '')
assert.equal(scrubText('Rohtak'), 'Rohtak')
assert.equal(classifyHeading('W ORK  EXPERIENCE'), 'experience')
assert.equal(classifyHeading('Positions Held'), 'experience')
const fixed = normalizeModel({ name: 'A B', contact: { email: '', phone: '', location: '', links: [] }, experience: [], education: [
  { id: 'e1', degree: 'BCA', school: 'MDU', location: 'June', start: '', end: '', year: '', detail: 'May ( )', grade: '67%' }], projects: [], skills: [], certifications: [],
  extra: [{ id: 'x', heading: 'Where I Have Worked', lines: ['Analyst | Acme  Jan 2020 - Dec 2021', '- Built dashboards for the sales team every week', '- Automated monthly reports using Excel and SQL'] }] })
assert.equal(fixed.education[0].location, '')
assert.equal(fixed.education[0].detail, '')
assert.equal(fixed.experience.length >= 1, true, 'unfamiliar heading reclassified by content')
assert.equal(fixed.extra.length, 0)
const mm = linesToModel([{ text: 'Abishek M', size: 20 }, { text: 'EDUCATION', size: 12 }, { text: 'BCA | Maharishi Dayanand University, Rohtak | May-2021 – May-2024 | 67%', size: 9 }, { text: 'SKILLS', size: 12 }, { text: 'SQL, Python', size: 9 }])
assert.equal(mm.education[0].start, 'May 2021')
assert.equal(mm.education[0].location, 'Rohtak')
assert.equal(mm.education[0].grade, '67%')
console.log('round-2 field tests passed')
