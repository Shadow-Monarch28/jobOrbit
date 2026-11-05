import assert from 'node:assert/strict'
import { LOCATION_SUGGESTIONS, parseLocation, cityVariants } from '../src/lib/data/locations.js'
import { resolveAdzunaLocation } from '../src/lib/jobSources/adzuna.js'

assert.ok(LOCATION_SUGGESTIONS.length > 5000, 'cities are included')
for (const c of ['Gurgaon, India', 'Bengaluru, India', 'London, United Kingdom', 'New York City, United States', 'Dubai, United Arab Emirates', 'Singapore, Singapore']) {
  assert.ok(LOCATION_SUGGESTIONS.includes(c), `has ${c}`)
}
assert.deepEqual(parseLocation('Gurgaon, India'), { city: 'Gurgaon', country: 'India' })
assert.deepEqual(parseLocation('India'), { country: 'India' })
assert.deepEqual(parseLocation('Haryana'), { text: 'Haryana' })
assert.ok(cityVariants('Bengaluru').includes('bangalore'))

assert.deepEqual(resolveAdzunaLocation('Gurgaon, India'), { country: 'in', where: 'Gurgaon', supported: true })
assert.deepEqual(resolveAdzunaLocation('London, United Kingdom'), { country: 'gb', where: 'London', supported: true })
assert.deepEqual(resolveAdzunaLocation('Germany'), { country: 'de', where: '', supported: true })
assert.equal(resolveAdzunaLocation('Karachi, Pakistan').supported, false)
assert.equal(resolveAdzunaLocation('').supported, true)
assert.equal(resolveAdzunaLocation('Remote / Worldwide').where, '')
console.log('locations tests passed')
