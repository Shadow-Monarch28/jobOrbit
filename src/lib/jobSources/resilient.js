// One shared safety net for every job source, so a source having a bad moment never
// shows up as a broken search:
//  - answers are kept for a few minutes (memory, plus this tab's session storage when small),
//    so changing a filter or coming back never spends a limited free call twice;
//  - identical calls running at the same time share one request;
//  - a failed call is retried once, except rate limits and bad keys (retrying cannot help);
//  - if it still fails, the last good answer (up to 6 hours old) is used instead of an error;
//  - when there is nothing to fall back on, the error says what actually went wrong.
const FRESH_MS = 10 * 60 * 1000
const STALE_MS = 6 * 60 * 60 * 1000
const SESSION_MAX = 300 * 1024
const mem = new Map()
const inflight = new Map()

const FRIENDLY = {
  rate_limit: (l) => `${l}'s free limit has been used up for now, so its jobs will be back soon.`,
  auth: (l) => `${l} is not connected properly on our side. We are on it.`,
  not_configured: (l) => `${l} is not connected on our side yet.`,
  unreachable: (l) => `${l} did not answer in time.`,
}

const stamp = (key, data) => {
  const entry = { at: Date.now(), data }
  mem.set(key, entry)
  try {
    const raw = JSON.stringify(entry)
    if (raw.length <= SESSION_MAX) sessionStorage.setItem(`src:${key}`, raw)
  } catch { /* storage full or blocked: memory still has it */ }
}
const recall = (key) => {
  const hit = mem.get(key)
  if (hit) return hit
  try {
    const raw = sessionStorage.getItem(`src:${key}`)
    if (raw) { const entry = JSON.parse(raw); mem.set(key, entry); return entry }
  } catch { /* ignore */ }
  return null
}

/** GET a URL as JSON with a timeout. Errors carry a friendly message; `final` means do not retry. */
export async function fetchJson(url, label) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    const body = await res.json().catch(() => null)
    if (res.ok && body && !body.error) return body
    const code = body?.code
    if (res.status === 429 && !code) throw Object.assign(new Error(FRIENDLY.rate_limit(label)), { final: true })
    if (FRIENDLY[code]) throw Object.assign(new Error(FRIENDLY[code](label)), { final: code !== 'unreachable' })
    throw new Error(`${label} did not answer properly just now.`)
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`${label} did not answer in time.`)
    if (err instanceof TypeError) throw new Error(`Could not reach ${label}. Check your connection.`)
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Runs `load()` with caching, de-duplication, one retry and a stale fallback.
 * Returns the loaded data (never throws when an older answer exists).
 */
export async function resilient({ key, label, load, ttl = FRESH_MS }) {
  const cached = recall(key)
  if (cached && Date.now() - cached.at < ttl) return cached.data
  if (inflight.has(key)) return inflight.get(key)

  const run = (async () => {
    let lastErr
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const data = await load()
        stamp(key, data)
        return data
      } catch (err) {
        lastErr = err
        if (err.final) break
        if (attempt === 0) await new Promise((r) => setTimeout(r, 900))
      }
    }
    if (cached && Date.now() - cached.at < STALE_MS) return cached.data
    throw lastErr ?? new Error(`${label} is unavailable right now.`)
  })().finally(() => inflight.delete(key))

  inflight.set(key, run)
  return run
}
