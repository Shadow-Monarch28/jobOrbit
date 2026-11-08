import assert from 'node:assert/strict'
import { looksNonEnglish, translateForeignJobs } from '../src/lib/translate.js'
const en = { id: 'a', title: 'Senior Payroll Analyst', description: 'We are looking for an analyst to join our team and support the business with reporting.' }
const de = { id: 'b', title: 'Softwareentwickler (m/w/d)', description: 'Wir suchen einen erfahrenen Entwickler für unser Team in München. Sie arbeiten mit modernen Technologien und übernehmen Verantwortung.' }
const fr = { id: 'c', title: 'Ingénieur développement', description: 'Nous recherchons un ingénieur pour rejoindre notre équipe à Paris et développer nos produits.' }
const ja = { id: 'd', title: 'フロントエンドエンジニア', description: '' }
assert.equal(looksNonEnglish(en), false)
assert.equal(looksNonEnglish(de), true)
assert.equal(looksNonEnglish(fr), true)
assert.equal(looksNonEnglish(ja), true)
globalThis.fetch = async (_u, o) => ({ ok: true, json: async () => ({ translations: JSON.parse(o.body).texts.map((t) => (t ? 'EN:' + t.slice(0, 12) : t)) }) })
const out = []
await translateForeignJobs([en, de, ja], (j) => out.push(j))
assert.equal(out.length, 2)
assert.ok(out.every((j) => j.translated && j.title.startsWith('EN:') && j.originalTitle))
console.log('translate ok')
