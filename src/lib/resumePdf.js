import { PDFDocument, PDFString, StandardFonts, rgb } from 'pdf-lib'
import { buildResumeDoc, buildCoverDoc } from './resumeDoc'

const hex = (h) => {
  const n = parseInt(h.replace('#', ''), 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}
const tint = (h, amt) => {
  const n = parseInt(h.replace('#', ''), 16)
  const mix = (c) => (c * amt + 255 * (1 - amt)) / 255
  return rgb(mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255))
}

const FONTS = {
  sans: [StandardFonts.Helvetica, StandardFonts.HelveticaBold, StandardFonts.HelveticaOblique],
  serif: [StandardFonts.TimesRoman, StandardFonts.TimesRomanBold, StandardFonts.TimesRomanItalic],
  mono: [StandardFonts.Courier, StandardFonts.CourierBold, StandardFonts.CourierOblique],
}

const REPLACE = { '₹': 'Rs.', '→': '->', '…': '...', '“': '"', '”': '"', '‘': "'", '’': "'", ' ': ' ', '–': '-', '—': '-', '•': '-', '·': '|' }

async function setup(template) {
  const pdf = await PDFDocument.create()
  const [reg, bold, ital] = await Promise.all(FONTS[template.font || 'sans'].map((f) => pdf.embedFont(f)))
  const cache = new Map()
  const safe = (str) =>
    [...String(str || '')].map((ch) => {
      const r = REPLACE[ch] ?? ch
      if (cache.has(r)) return cache.get(r)
      let out = r
      try { reg.encodeText(r) } catch { out = '?' }
      cache.set(r, out)
      return out
    }).join('')
  const wrap = (text, f, size, width) => {
    const rows = []
    let cur = ''
    for (const w of safe(text).split(/\s+/)) {
      const test = cur ? `${cur} ${w}` : w
      if (f.widthOfTextAtSize(test, size) <= width || !cur) cur = test
      else { rows.push(cur); cur = w }
    }
    if (cur) rows.push(cur)
    return rows
  }
  // A real, clickable web link over the given box.
  const addLink = (pg, x, yBase, w, size, url) => {
    if (!url) return
    try {
      const ref = pdf.context.register(pdf.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [x, yBase - 2, x + w, yBase + size], Border: [0, 0, 0], A: { Type: 'Action', S: 'URI', URI: PDFString.of(encodeURI(url)) } }))
      pg.node.addAnnot(ref)
    } catch { /* a bad address just stays plain text */ }
  }
  return { pdf, reg, bold, ital, safe, wrap, addLink }
}

// ---------- resume ----------

export async function renderBuilderPdf(model, template) {
  const { pdf, reg, bold, ital, safe, wrap, addLink } = await setup(template)
  const doc = buildResumeDoc(model, template)
  const W = 595.28, H = 841.89
  const M = template.compact ? 38 : 46
  const accent = hex(template.accent)
  const ink = rgb(0.07, 0.09, 0.15), muted = rgb(0.29, 0.33, 0.39)
  const sidebar = doc.layout === 'sidebar'
  const split = doc.layout === 'split'
  const banner = doc.layout === 'banner'
  const SIDE_W = split ? 150 : 170
  const colX = sidebar ? SIDE_W + 22 : split ? M + SIDE_W + 22 : M
  const colW = W - colX - M
  const linkBlue = rgb(0.11, 0.31, 0.85)
  const lead = template.compact ? 12.2 : 13.2

  let page = pdf.addPage([W, H])
  let y = H - M

  const drawSideBg = (pg) => pg.drawRectangle({ x: 0, y: 0, width: SIDE_W, height: H, color: tint(template.accent, 0.11) })
  if (sidebar) drawSideBg(page)
  const newPage = () => {
    page = pdf.addPage([W, H])
    if (sidebar) drawSideBg(page)
    y = H - M
  }
  const ensure = (need) => { if (y - need < M) newPage() }
  const text = (s, x, size, font, color) => page.drawText(s, { x, y, size, font, color })

  // contact details laid out in rows; items with an address are underlined and clickable
  const layoutContact = (items, size, font, width) => {
    const sepW = font.widthOfTextAtSize('   |   ', size)
    const rows = []
    let row = [], w = 0
    for (const it of items) {
      const t = safe(it.text), iw = font.widthOfTextAtSize(t, size)
      if (row.length && w + sepW + iw > width) { rows.push({ row, w }); row = []; w = 0 }
      w += (row.length ? sepW : 0) + iw
      row.push({ ...it, t, iw })
    }
    if (row.length) rows.push({ row, w })
    return { rows, sepW }
  }
  const drawContact = (items, x0, width, align, size, font, color, linkColor) => {
    const { rows, sepW } = layoutContact(items, size, font, width)
    for (const { row, w } of rows) {
      let x = align === 'center' ? x0 + (width - w) / 2 : x0
      row.forEach((it, i) => {
        if (i > 0) { text('|', x + sepW / 2 - 2, size, font, color); x += sepW }
        text(it.t, x, size, font, color)
        if (it.href) addLink(page, x, y, it.iw, size, it.href) // clickable, but styled like the rest of the line
        x += it.iw
      })
      y -= size + 3.5
    }
  }
  const drawName = (name, size, font, color, align, x0, width, track) => {
    if (!track) { text(name, align === 'center' ? x0 + (width - font.widthOfTextAtSize(name, size)) / 2 : x0, size, font, color); return }
    const chars = [...name.toUpperCase()]
    const total = chars.reduce((a, c) => a + font.widthOfTextAtSize(c, size), 0) + track * (chars.length - 1)
    let x = align === 'center' ? x0 + (width - total) / 2 : x0
    for (const c of chars) { text(c, x, size, font, color); x += font.widthOfTextAtSize(c, size) + track }
  }

  // header
  const centered = template.align === 'center'
  const centerX = (s, size, font, width, x0) => x0 + (width - font.widthOfTextAtSize(s, size)) / 2
  if (banner) {
    const bandH = 30 + (doc.headline ? 16 : 0) + (doc.contact.length ? 16 : 0) + 18
    page.drawRectangle({ x: 0, y: H - bandH, width: W, height: bandH, color: accent })
    y = H - 40
    text(safe(doc.name), M, 23, bold, rgb(1, 1, 1))
    if (doc.headline) { y -= 17; text(safe(doc.headline), M, 11, reg, rgb(1, 1, 1)) }
    if (doc.contactItems.length) { y -= 15; drawContact(doc.contactItems, M, W - M * 2, 'left', 9.2, reg, rgb(1, 1, 1), rgb(1, 1, 1)) }
    y = H - bandH - 10
  } else if (sidebar) {
    y -= 14
    for (const r of wrap(doc.name, bold, 21, colW)) { text(r, colX, 21, bold, ink); y -= 24 }
    if (doc.headline) { text(safe(doc.headline), colX, 11, reg, muted); y -= 14 }
    y -= 2
  } else if (split) {
    const fullW = W - M * 2
    y -= 16
    if (template.rules) { page.drawLine({ start: { x: M, y: y + 12 }, end: { x: W - M, y: y + 12 }, thickness: 0.8, color: ink }) }
    drawName(safe(doc.name), 24, reg, ink, 'center', M, fullW, template.trackName ? 6 : 0)
    y -= 12
    if (doc.headline) {
      if (template.rules) page.drawLine({ start: { x: M, y: y + 3 }, end: { x: W - M, y: y + 3 }, thickness: 0.8, color: ink })
      y -= 12
      drawName(safe(doc.headline).toUpperCase(), 11, reg, muted, 'center', M, fullW, 1.2)
      y -= 8
      if (template.rules) page.drawLine({ start: { x: M, y: y + 3 }, end: { x: W - M, y: y + 3 }, thickness: 0.8, color: ink })
    }
    y -= 6
  } else {
    y -= 14
    const rows = wrap(doc.name, bold, 22, W - M * 2)
    for (const r of rows) { drawName(r, 22, bold, ink, centered ? 'center' : 'left', M, W - M * 2, template.trackName ? 3 : 0); y -= 25 }
    if (doc.headline) { const h = safe(doc.headline); text(h, centered ? centerX(h, 11, reg, W - M * 2, M) : M, 11, reg, muted); y -= 15 }
    if (doc.contactItems.length) drawContact(doc.contactItems, M, W - M * 2, centered ? 'center' : 'left', 9.5, reg, muted, linkBlue)
  }
  const mainTop = y

  const heading = (label, x, width) => {
    ensure(40)
    y -= 17
    const t = safe(label).toUpperCase()
    const hs = template.heading
    if (hs === 'bar') { page.drawRectangle({ x, y: y - 2, width: 3, height: 12, color: accent }); text(t, x + 8, 10.5, bold, accent); y -= 6 }
    else if (hs === 'accent') { text(t, x, 10.5, bold, accent); y -= 4; page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 1.3, color: accent }) }
    else if (hs === 'rule') { text(t, x, 10.5, bold, ink); y -= 4; page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 0.7, color: muted }) }
    else if (hs === 'small') { text(t, x, 9.5, bold, muted); y -= 4; page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 0.5, color: rgb(0.6, 0.64, 0.7) }) }
    else { text(t, x, 10.5, bold, accent); y -= 2 }
    y -= 3
  }

  const rowsOut = (rows, f, size, x, color, ld) => { for (const r of rows) { ensure(ld); y -= ld; text(r, x, size, f, color) } }

  const drawItem = (it, x, width, inSide) => {
    if (it.t === 'para') rowsOut(wrap(it.text, reg, 10, width), reg, 10, x, ink, lead)
    else if (it.t === 'tags') {
      if (inSide) rowsOut(it.list.flatMap((s) => wrap(s, reg, 9.5, width)), reg, 9.5, x, ink, 12.5)
      else rowsOut(wrap(it.list.join('  |  '), reg, 10, width), reg, 10, x, ink, lead)
    } else if (it.t === 'bullets') {
      for (const b of it.list) {
        const rows = wrap(b, reg, 10, width - 12)
        ensure(lead); y -= lead
        text('-', x + 2, 10, reg, ink); text(rows[0] || '', x + 12, 10, reg, ink)
        rowsOut(rows.slice(1), reg, 10, x + 12, ink, lead)
      }
    } else {
      const metaW = it.meta ? reg.widthOfTextAtSize(safe(it.meta), 9) + 6 : 0
      const titleRows = wrap(it.title, bold, 10.5, width - metaW - 4)
      ensure(lead + 4); y -= lead
      text(titleRows[0] || '', x, 10.5, bold, ink)
      if (it.link && titleRows.length === 1) {
        const tw = bold.widthOfTextAtSize(titleRows[0], 10.5)
        const lt = ` - ${safe(it.link.text)}`
        const lw = ital.widthOfTextAtSize(lt, 9.5)
        if (tw + lw < width - metaW) {
          text(lt, x + tw, 9.5, ital, muted)
          addLink(page, x + tw, y, lw, 9.5, it.link.href)
        }
      }
      if (it.meta) text(safe(it.meta), x + width - metaW + 6, 9, reg, muted)
      rowsOut(titleRows.slice(1), bold, 10.5, x, ink, lead)
      if (it.sub) rowsOut(wrap(it.sub, ital, 9.5, width), ital, 9.5, x, muted, 12)
      for (const b of it.bullets || []) {
        const rows = wrap(b, reg, 10, width - 12)
        ensure(lead); y -= lead
        text('-', x + 2, 10, reg, ink); text(rows[0] || '', x + 12, 10, reg, ink)
        rowsOut(rows.slice(1), reg, 10, x + 12, ink, lead)
      }
      y -= template.compact ? 3 : 5
    }
  }

  if (sidebar || split) {
    // sidebar column lives on the first page only
    const mainPage = page
    let sy = split ? mainTop - 8 : H - 46
    const sideX = split ? M : 16, sideWd = split ? SIDE_W : SIDE_W - 28
    const sideText = (s, size, f, color) => { mainPage.drawText(s, { x: sideX, y: sy, size, font: f, color }); }
    sideText('CONTACT', 10, bold, accent); sy -= 14
    for (const c of doc.contactItems) {
      for (const r of wrap(c.text, reg, 9, sideWd)) {
        mainPage.drawText(r, { x: sideX, y: sy, size: 9, font: reg, color: ink })
        if (c.href) { const rw = reg.widthOfTextAtSize(r, 9); addLink(mainPage, sideX, sy, rw, 9, c.href) }
        sy -= 12
      }
    }
    for (const s of doc.side) {
      sy -= 10; sideText(safe(s.heading).toUpperCase(), 10, bold, accent); sy -= 14
      for (const it of s.items) {
        if (it.t === 'tags') for (const sk of it.list) for (const r of wrap(sk, reg, 9, sideWd)) { sideText(r, 9, reg, ink); sy -= 12 }
        else if (it.t === 'bullets') for (const b of it.list) for (const r of wrap(b, reg, 9, sideWd)) { sideText(r, 9, reg, ink); sy -= 12 }
        else {
          for (const r of wrap(it.title, bold, 9.5, sideWd)) { sideText(r, 9.5, bold, ink); sy -= 12 }
          if (it.sub) for (const r of wrap(it.sub, ital, 9, sideWd)) { sideText(r, 9, ital, muted); sy -= 11 }
          if (it.meta) { sideText(safe(it.meta), 9, reg, muted); sy -= 11 }
          sy -= 4
        }
      }
    }
  }

  for (const s of doc.main) {
    heading(s.heading, colX, colW)
    for (const it of s.items) drawItem(it, colX, colW, false)
  }
  void mainTop
  return pdf.save()
}

// ---------- cover letter ----------

export async function renderCoverPdf(letter, template) {
  const { pdf, reg, bold, safe, wrap, addLink } = await setup(template)
  const d = buildCoverDoc(letter)
  const W = 595.28, H = 841.89, M = 62
  const accent = hex(template.accent)
  const ink = rgb(0.07, 0.09, 0.15), muted = rgb(0.29, 0.33, 0.39)
  let page = pdf.addPage([W, H])
  let y = H - M
  const ensure = (n) => { if (y - n < M) { page = pdf.addPage([W, H]); y = H - M } }
  const put = (s, size, f, color, x = M) => { ensure(size + 6); page.drawText(s, { x, y, size, font: f, color }) }

  if (template.layout === 'banner') {
    const bandH = 28 + (d.contact.length ? 18 : 0) + 22
    page.drawRectangle({ x: 0, y: H - bandH, width: W, height: bandH, color: accent })
    y = H - 42
    page.drawText(safe(d.name), { x: M, y, size: 21, font: bold, color: rgb(1, 1, 1) })
    if (d.contact.length) { y -= 18; page.drawText(safe(d.contact.join('   |   ')), { x: M, y, size: 9.5, font: reg, color: rgb(1, 1, 1) }) }
    y = H - bandH - 28
  } else {
    page.drawText(safe(d.name), { x: M, y, size: 20, font: bold, color: ink }); y -= 16
    if (d.contact.length) { page.drawText(safe(d.contact.join('   |   ')), { x: M, y, size: 9.5, font: reg, color: muted }); y -= 8 }
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1.2, color: accent })
    y -= 24
  }
  const para = (s, f = reg, gap = 10, color = ink) => {
    for (const r of wrap(s, f, 11, W - M * 2)) { ensure(16); put(r, 11, f, color); y -= 16 }
    y -= gap - 2
  }
  if (d.date) para(d.date)
  for (const l of d.recipientLines) { put(safe(l), 11, reg, ink); y -= 15 }
  if (d.recipientLines.length) y -= 8
  if (d.subject) para(d.subject, bold)
  para(d.salutation, reg, 6)
  for (const p of d.paragraphs) para(p, reg, 10)
  y -= 4
  para(d.closing, reg, 22)
  put(safe(d.name), 11, bold, ink)
  return pdf.save()
}

export function downloadPdfBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function openPdfBytes(bytes) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
