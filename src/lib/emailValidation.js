// Email checks for signup and email changes.
//
// 1. The address must be well formed.
// 2. The domain must be one people really use: a major mail provider, a school
//    or government domain, or a domain that publishes mail servers (MX records)
//    and does not look randomly typed. Throwaway-mail domains are refused.
//
// This runs in the browser, so it guides honest users but cannot stop someone
// calling the API directly. The confirmation email is the real proof of ownership.

export const TRUSTED_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'office365.com',
  'yahoo.com', 'yahoo.in', 'yahoo.co.in', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'yahoo.es', 'yahoo.it', 'yahoo.com.br', 'yahoo.ca', 'yahoo.com.au', 'ymail.com', 'rocketmail.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com', 'pm.me', 'tutanota.com', 'tuta.io', 'fastmail.com', 'fastmail.fm',
  'zoho.com', 'zohomail.com', 'zohomail.in', 'gmx.com', 'gmx.net', 'gmx.de', 'web.de', 'mail.com', 'email.com', 'hey.com', 'hushmail.com',
  'yandex.com', 'yandex.ru', 'mail.ru', 'rambler.ru', 'qq.com', '163.com', '126.com', 'sina.com', 'naver.com', 'daum.net', 'hanmail.net',
  'rediffmail.com', 'rediff.com', 'sify.com', 'in.com',
  'comcast.net', 'verizon.net', 'att.net', 'sbcglobal.net', 'bellsouth.net', 'cox.net', 'charter.net', 'earthlink.net',
  'btinternet.com', 'sky.com', 'virginmedia.com', 'talktalk.net', 'orange.fr', 'free.fr', 'laposte.net', 'wanadoo.fr', 'sfr.fr',
  't-online.de', 'freenet.de', 'libero.it', 'virgilio.it', 'tiscali.it', 'alice.it', 'telenet.be', 'skynet.be', 'ziggo.nl', 'kpnmail.nl',
  'bigpond.com', 'optusnet.com.au', 'shaw.ca', 'rogers.com', 'bell.net', 'sympatico.ca', 'telus.net', 'uol.com.br', 'bol.com.br', 'terra.com.br',
  'wp.pl', 'o2.pl', 'interia.pl', 'seznam.cz', 'centrum.cz', 'abv.bg', 'walla.co.il', 'rakuten.jp', 'docomo.ne.jp', 'ezweb.ne.jp', 'softbank.ne.jp',
])

// Common throwaway-mail providers.
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', '10minutemail.com', '10minutemail.net', 'tempmail.com', 'temp-mail.org', 'temp-mail.io',
  'throwawaymail.com', 'yopmail.com', 'yopmail.net', 'trashmail.com', 'getnada.com', 'nada.email', 'sharklasers.com', 'dispostable.com', 'maildrop.cc',
  'fakeinbox.com', 'mintemail.com', 'mohmal.com', 'emailondeck.com', 'tempail.com', 'burnermail.io', 'spamgourmet.com', 'moakt.com', 'mytemp.email',
  'tempmailo.com', 'minuteinbox.com', 'inboxkitten.com', 'mailnesia.com', 'mail7.io', 'discard.email', 'trbvm.com', 'harakirimail.com',
])

const SYNTAX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@([a-z0-9-]+(?:\.[a-z0-9-]+)+)$/i

// Education and government domains are real by construction (.edu, .ac.in, .gov.uk ...).
const INSTITUTION = /(^|\.)(edu|ac|gov|mil)(\.[a-z]{2})?$|(^|\.)(edu|gov)\.[a-z]{2}$|(^|\.)ac\.[a-z]{2}$/i

export function splitEmail(email) {
  const clean = String(email || '').trim().toLowerCase()
  const m = SYNTAX.exec(clean)
  if (!m || clean.length > 254 || clean.includes('..')) return null
  const domain = m[1]
  const labels = domain.split('.')
  const tld = labels[labels.length - 1]
  if (!/^[a-z]{2,24}$/.test(tld)) return null
  if (labels.some((l) => !l || l.startsWith('-') || l.endsWith('-') || l.length > 63)) return null
  return { email: clean, domain, labels, tld }
}

// True when the main part of the domain reads like keyboard mashing:
// letters mixed with digits ("gsh3u3"), or four or more letters with no vowel ("hdjs").
// Well-known short acronyms are allowed.
const KNOWN_ACRONYMS = new Set(['tcs', 'ibm', 'hcl', 'hdfc', 'icici', 'sbi', 'bmo', 'rbc', 'td', 'hp', 'nttdata', 'dxc', 'cgi', 'sap', 'bt', 'nhs', 'bbc', 'cnn', 'ey', 'kpmg', 'pwc', 'cts', 'lnt', 'ltts', 'bcg', 'cvs', 'ups', 'fedex', 'lg', 'jpmc', 'hsbc', 'bnp', 'ubs', 'ing', 'abb', 'bhel', 'ongc', 'ntpc', 'isro', 'drdo', 'wns', 'xl', 'ge', 'rws', 'tpg', 'gsk', 'sky'])

export function looksRandom(domain) {
  const labels = String(domain).split('.')
  const main = labels.length > 1 ? labels[labels.length - 2] : labels[0]
  if (KNOWN_ACRONYMS.has(main)) return false
  if (/[a-z]\d+[a-z]/.test(main) && /\d/.test(main) && !/^[a-z]+\d{1,2}$/.test(main)) return true
  if (/^\d+$/.test(main)) return true
  if (main.length >= 4 && !/[aeiouy]/.test(main)) return true
  if (/[bcdfghjklmnpqrstvwxz]{6,}/.test(main)) return true
  return false
}

// DNS-over-HTTPS lookup. Resolves 'yes' / 'no' / 'unknown' (network trouble).
async function hasRecords(domain, type, fetchImpl) {
  const urls = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`,
    `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`,
  ]
  for (const url of urls) {
    try {
      const res = await fetchImpl(url, { headers: { accept: 'application/dns-json' } })
      if (!res.ok) continue
      const data = await res.json()
      if (data.Status === 3) return 'no' // NXDOMAIN: the domain does not exist
      return Array.isArray(data.Answer) && data.Answer.some((a) => a.type === (type === 'MX' ? 15 : 1)) ? 'yes' : 'no'
    } catch (_) { /* try the next resolver */ }
  }
  return 'unknown'
}

export const EMAIL_MESSAGES = {
  syntax: 'Please enter a valid email address.',
  disposable: "Temporary email addresses aren't accepted. Use your regular email.",
  unknown: "That email domain doesn't look real. Use an address from a provider like Gmail, Outlook or Yahoo, or your school or work email.",
}

// Returns { ok: true, email } or { ok: false, reason, message }.
export async function validateEmail(input, { fetchImpl = (typeof fetch === 'function' ? fetch : null) } = {}) {
  const parts = splitEmail(input)
  if (!parts) return { ok: false, reason: 'syntax', message: EMAIL_MESSAGES.syntax }
  const { email, domain } = parts

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return { ok: false, reason: 'disposable', message: EMAIL_MESSAGES.disposable }
  if (TRUSTED_EMAIL_DOMAINS.has(domain) || INSTITUTION.test(domain)) return { ok: true, email }
  if (looksRandom(domain)) return { ok: false, reason: 'unknown', message: EMAIL_MESSAGES.unknown }

  // Any other domain must publish mail servers. If the lookup itself cannot be
  // reached we let the address through; the confirmation email still protects us.
  if (!fetchImpl) return { ok: true, email }
  const mx = await hasRecords(domain, 'MX', fetchImpl)
  if (mx === 'no') return { ok: false, reason: 'unknown', message: EMAIL_MESSAGES.unknown }
  return { ok: true, email }
}
