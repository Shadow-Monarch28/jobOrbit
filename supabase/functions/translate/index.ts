// Supabase Edge Function: translate
// Translates a batch of texts to English with Groq (same GROQ_API_KEY secret and
// model as ai-coach). Replaces the Google gtx endpoint, which rejects Vercel's
// shared IPs with 429. Returns { translations: [string | null, ...] } in input
// order; null means "keep the original".
// @ts-nocheck
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'openai/gpt-oss-20b'
const MAX_TEXTS = 24
const MAX_CHARS = 1200

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// Remembered for a while so reopening a search never spends Groq quota twice.
const CACHE = new Map<string, string>()

async function callGroq(items: { i: number; t: string }[]) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('GROQ_API_KEY')}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(25000),
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You translate job listing text to English. Input is a JSON object {"items":[{"i":number,"t":string}]}. ' +
            'Reply with ONLY JSON: {"items":[{"i":number,"t":string}]} with the same i values and t translated to natural English. ' +
            'Keep names, brands and technology terms. If a text is already English, return it unchanged. Never add commentary.',
        },
        { role: 'user', content: JSON.stringify({ items }) },
      ],
    }),
  })
  if (!res.ok) throw new Error(`groq ${res.status}`)
  const data = await res.json()
  const parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? '{}')
  return Array.isArray(parsed.items) ? parsed.items : []
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!Deno.env.get('GROQ_API_KEY')) return json({ error: 'not configured', code: 'not_configured' }, 500)

  let texts: unknown
  try { texts = (await req.json())?.texts } catch { return json({ error: 'bad json' }, 400) }
  if (!Array.isArray(texts)) return json({ error: 'texts[] required' }, 400)

  const input = texts.slice(0, MAX_TEXTS).map((t) => (typeof t === 'string' ? t.slice(0, MAX_CHARS) : ''))
  const out: (string | null)[] = input.map((t) => (t.trim() ? null : t))
  const todo: { i: number; t: string }[] = []
  input.forEach((t, i) => {
    if (!t.trim()) return
    const hit = CACHE.get(t)
    if (hit) out[i] = hit
    else todo.push({ i, t })
  })

  if (todo.length) {
    try {
      const got = await callGroq(todo)
      for (const row of got) {
        const src = todo.find((x) => x.i === row?.i)
        if (src && typeof row.t === 'string' && row.t.trim()) {
          out[src.i] = row.t.trim()
          if (CACHE.size > 2000) CACHE.clear()
          CACHE.set(src.t, row.t.trim())
        }
      }
    } catch (err) {
      console.error('translate failed', String(err))
      return json({ error: 'translate failed', code: 'upstream' }, 502)
    }
  }
  return json({ translations: out })
})
