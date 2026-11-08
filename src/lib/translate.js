// Translates non-English job listings to English so every result in
// Discovery is readable. Calls our own /api/translate serverless function
// (the browser can't call Google directly: CORS + rate limits). Entirely
// best-effort: on any failure the original text is kept.

const ENDPOINT = '/api/translate'
const CHUNK = 6
const EN_WORDS = new Set((
  'the and for with you your our are will have has from that this who job work team experience ' +
  'skills role we to of in on a an as be or is at by it their all about able including ' +
  'responsibilities requirements looking join company develop manage support business'
).split(' '))

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

async function translateChunk(jobs) {
  const texts = jobs.flatMap((j) => [j.title ?? '', (j.description ?? '').slice(0, 1200)])
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts }),
  })
  if (!res.ok) throw new Error(`translate ${res.status}`)
  const { translations } = await res.json()
  return jobs.map((job, i) => {
    const title = translations?.[i * 2] || job.title
    const description = translations?.[i * 2 + 1] || job.description
    if (title === job.title && description === job.description) return null
    return { ...job, title, description, originalTitle: job.title, translated: true }
  })
}

// Translates up to `limit` not-yet-translated foreign jobs in small batches,
// calling onUpdate(translatedJob) as each finishes. Stops at the first
// request failure so a broken endpoint is never hammered.
export async function translateForeignJobs(jobs, onUpdate, { limit = 60 } = {}) {
  const queue = jobs
    .filter((j) => !j.translated && !attempted.has(j.id) && looksNonEnglish(j))
    .slice(0, limit)
  queue.forEach((j) => attempted.add(j.id))
  for (let i = 0; i < queue.length; i += CHUNK) {
    try {
      const done = await translateChunk(queue.slice(i, i + CHUNK))
      done.forEach((j) => j && onUpdate(j))
    } catch {
      return
    }
  }
}
