// Translates non-English job listings to English so every result in
// Discovery is readable. Uses Google's public translate endpoint (no key,
// CORS-enabled). Entirely best-effort: on any failure the original text is
// kept, so search never breaks because of translation.

const ENDPOINT = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t'
const EN_WORDS = new Set((
  'the and for with you your our are will have has from that this who job work team experience ' +
  'skills role we to of in on a an as be or is at by it their all about able including ' +
  'responsibilities requirements looking join company develop manage support business'
).split(' '))

const cache = new Map()
const attempted = new Set()

function nonLatinShare(text) {
  const letters = text.match(/\p{L}/gu) ?? []
  if (letters.length === 0) return 0
  const nonLatin = letters.filter((c) => !/\p{Script=Latin}/u.test(c)).length
  return nonLatin / letters.length
}

export function looksNonEnglish(job) {
  const sample = `${job.title ?? ''} ${(job.description ?? '').slice(0, 500)}`
  if (nonLatinShare(sample) > 0.3) return true
  const words = sample.toLowerCase().match(/[\p{L}']+/gu) ?? []
  if (words.length < 3) return false
  const hits = words.filter((w) => EN_WORDS.has(w)).length
  const accents = (sample.match(/[àâäçéèêëîïôöùûüñãõßœáíóúşğıłżśćąęøåæ]/gi) ?? []).length
  if (words.length >= 12) return hits / words.length < 0.1 && (accents > 0 || hits < 2)
  return hits === 0 && accents > 0
}

async function translateText(text) {
  if (!text) return text
  if (cache.has(text)) return cache.get(text)
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `q=${encodeURIComponent(text)}`,
  })
  if (!res.ok) throw new Error(`translate ${res.status}`)
  const data = await res.json()
  const out = (data?.[0] ?? []).map((seg) => seg?.[0] ?? '').join('').trim()
  if (!out) throw new Error('empty translation')
  cache.set(text, out)
  return out
}

async function translateJob(job) {
  const [title, description] = await Promise.all([
    translateText(job.title),
    translateText((job.description ?? '').slice(0, 1500)),
  ])
  return { ...job, title, description, originalTitle: job.title, translated: true }
}

// Translates up to `limit` not-yet-translated foreign jobs, a few at a time,
// calling onUpdate(translatedJob) as each one finishes.
export async function translateForeignJobs(jobs, onUpdate, { limit = 60, concurrency = 4 } = {}) {
  const queue = jobs
    .filter((j) => !j.translated && !attempted.has(j.id) && looksNonEnglish(j))
    .slice(0, limit)
  queue.forEach((j) => attempted.add(j.id))
  let i = 0
  const worker = async () => {
    while (i < queue.length) {
      const job = queue[i++]
      try {
        onUpdate(await translateJob(job))
      } catch {
        // keep the original listing
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker))
}
