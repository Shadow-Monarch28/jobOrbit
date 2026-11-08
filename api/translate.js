// Vercel serverless function: translates texts to English server-side.
// The browser can't call Google's translate endpoint directly (CORS + rate
// limits), so the app posts here instead. No API key needed.
const ENDPOINT = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t'
const MAX_TEXTS = 40
const MAX_CHARS = 1500

async function translateOne(text, attempt = 0) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `q=${encodeURIComponent(text)}`,
  })
  if (res.status === 429 && attempt < 2) {
    await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
    return translateOne(text, attempt + 1)
  }
  if (!res.ok) throw new Error(`translate ${res.status}`)
  const data = await res.json()
  const out = (data?.[0] ?? []).map((seg) => seg?.[0] ?? '').join('').trim()
  if (!out) throw new Error('empty')
  return out
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const texts = Array.isArray(req.body?.texts) ? req.body.texts.slice(0, MAX_TEXTS) : null
  if (!texts) return res.status(400).json({ error: 'texts[] required' })

  const out = new Array(texts.length).fill(null)
  let next = 0
  const worker = async () => {
    while (next < texts.length) {
      const i = next++
      const t = typeof texts[i] === 'string' ? texts[i].slice(0, MAX_CHARS) : ''
      if (!t.trim()) { out[i] = t; continue }
      try { out[i] = await translateOne(t) } catch { out[i] = null }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ translations: out })
}
