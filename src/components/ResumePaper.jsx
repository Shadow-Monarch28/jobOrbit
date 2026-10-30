import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { buildResumeDoc, buildCoverDoc, FONT_STACK } from '../lib/resumeDoc'

// A4 sheet drawn from the same document description the PDF uses. It always
// renders as dark-on-white paper (it is a page, not part of the app theme) and
// scales to fit its container.
const PAGE_W = 793.7 // 210mm at 96dpi
const PAGE_H = 1122.5 // 297mm

function Heading({ text, t }) {
  const base = { fontWeight: 700, textTransform: 'uppercase', fontSize: '10.5pt', letterSpacing: '0.04em', marginTop: '12pt', marginBottom: '5pt' }
  if (t.heading === 'rule') return <div style={{ ...base, borderBottom: '0.8pt solid #6b7280', paddingBottom: '2pt' }}>{text}</div>
  if (t.heading === 'accent') return <div style={{ ...base, color: t.accent, borderBottom: `1.4pt solid ${t.accent}`, paddingBottom: '2pt' }}>{text}</div>
  if (t.heading === 'bar') return <div style={{ ...base, color: t.accent, borderLeft: `4pt solid ${t.accent}`, paddingLeft: '6pt' }}>{text}</div>
  if (t.heading === 'small') return <div style={{ ...base, fontSize: '9.5pt', letterSpacing: '0.1em', borderBottom: '0.5pt solid #9ca3af', paddingBottom: '2pt' }}>{text}</div>
  return <div style={{ ...base, color: t.accent }}>{text}</div>
}

function Item({ item, t, inSide }) {
  const gap = t.compact ? '2pt' : '3pt'
  if (item.t === 'para') return <p style={{ margin: 0, lineHeight: 1.4 }}>{item.text}</p>
  if (item.t === 'tags') {
    if (inSide) return <div style={{ display: 'grid', gap: '2pt' }}>{item.list.map((s, i) => <div key={i}>{s}</div>)}</div>
    return <p style={{ margin: 0, lineHeight: 1.45 }}>{item.list.join('  •  ')}</p>
  }
  if (item.t === 'bullets') return <ul style={{ margin: 0, paddingLeft: '13pt' }}>{item.list.map((b, i) => <li key={i} style={{ marginBottom: gap }}>{b}</li>)}</ul>
  return (
    <div style={{ marginBottom: t.compact ? '5pt' : '7pt' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8pt', alignItems: 'baseline' }}>
        <strong style={{ fontSize: '10.5pt' }}>{item.title}</strong>
        {item.meta && <span style={{ fontSize: '9pt', color: '#4b5563', whiteSpace: 'nowrap' }}>{item.meta}</span>}
      </div>
      {item.sub && <div style={{ fontStyle: 'italic', color: '#4b5563', fontSize: '9.5pt' }}>{item.sub}</div>}
      {item.bullets?.length > 0 && <ul style={{ margin: '2pt 0 0', paddingLeft: '13pt' }}>{item.bullets.map((b, i) => <li key={i} style={{ marginBottom: gap, lineHeight: 1.35 }}>{b}</li>)}</ul>}
    </div>
  )
}

function ResumeSheet({ model, template: t }) {
  const doc = buildResumeDoc(model, t)
  const banner = doc.layout === 'banner'
  const sidebar = doc.layout === 'sidebar'
  const center = t.align === 'center'
  const header = (
    <div style={{ textAlign: center ? 'center' : 'left', ...(banner ? { background: t.accent, color: '#fff', margin: '-14mm -14mm 6mm', padding: '10mm 14mm 6mm' } : { marginBottom: '2pt' }) }}>
      <div style={{ fontSize: '22pt', fontWeight: 700, lineHeight: 1.15 }}>{doc.name}</div>
      {doc.headline && <div style={{ fontSize: '11pt', marginTop: '2pt', color: banner ? 'rgba(255,255,255,.9)' : '#4b5563' }}>{doc.headline}</div>}
      {!sidebar && doc.contact.length > 0 && <div style={{ fontSize: '9.5pt', marginTop: '4pt', color: banner ? 'rgba(255,255,255,.9)' : '#4b5563' }}>{doc.contact.join('  |  ')}</div>}
    </div>
  )
  const render = (list, inSide) => list.map((s, i) => (
    <section key={`${s.key}-${i}`}>
      <Heading text={s.heading} t={t} />
      {s.items.map((it, j) => <Item key={j} item={it} t={t} inSide={inSide} />)}
    </section>
  ))
  if (sidebar) {
    return (
      <div style={{ display: 'flex', minHeight: `${PAGE_H}px`, margin: '-14mm', }}>
        <aside style={{ width: '62mm', flexShrink: 0, background: `color-mix(in srgb, ${t.accent} 11%, #ffffff)`, padding: '14mm 6mm', fontSize: '9.5pt' }}>
          <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '10.5pt', color: t.accent, marginBottom: '4pt' }}>Contact</div>
          <div style={{ display: 'grid', gap: '2pt', wordBreak: 'break-word' }}>{doc.contact.map((c, i) => <div key={i}>{c}</div>)}</div>
          {render(doc.side, true)}
        </aside>
        <div style={{ flex: 1, padding: '14mm 10mm 14mm 8mm' }}>{header}{render(doc.main, false)}</div>
      </div>
    )
  }
  return <>{header}{render(doc.main, false)}</>
}

function CoverSheet({ letter, template: t }) {
  const d = buildCoverDoc(letter)
  const banner = t.layout === 'banner'
  return (
    <>
      <div style={banner ? { background: t.accent, color: '#fff', margin: '-14mm -14mm 8mm', padding: '10mm 14mm 6mm' } : { borderBottom: `1.2pt solid ${t.accent}`, paddingBottom: '6pt', marginBottom: '14pt' }}>
        <div style={{ fontSize: '20pt', fontWeight: 700 }}>{d.name}</div>
        {d.contact.length > 0 && <div style={{ fontSize: '9.5pt', marginTop: '3pt', color: banner ? 'rgba(255,255,255,.9)' : '#4b5563' }}>{d.contact.join('  |  ')}</div>}
      </div>
      {d.date && <div style={{ marginBottom: '10pt' }}>{d.date}</div>}
      {d.recipientLines.length > 0 && <div style={{ marginBottom: '10pt' }}>{d.recipientLines.map((l, i) => <div key={i}>{l}</div>)}</div>}
      {d.subject && <div style={{ fontWeight: 700, marginBottom: '10pt' }}>{d.subject}</div>}
      <div style={{ marginBottom: '8pt' }}>{d.salutation}</div>
      {d.paragraphs.map((p, i) => <p key={i} style={{ margin: '0 0 8pt', lineHeight: 1.5 }}>{p}</p>)}
      <div style={{ marginTop: '12pt' }}>{d.closing}</div>
      <div style={{ marginTop: '18pt', fontWeight: 700 }}>{d.name}</div>
    </>
  )
}

export default function ResumePaper({ model, template, kind = 'resume', onPages }) {
  const wrapRef = useRef(null)
  const paperRef = useRef(null)
  const [scale, setScale] = useState(0.7)
  const [height, setHeight] = useState(PAGE_H)

  useLayoutEffect(() => {
    const fit = () => {
      if (!wrapRef.current) return
      setScale(Math.min(1, wrapRef.current.clientWidth / PAGE_W))
    }
    fit()
    const ro = new ResizeObserver(fit)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!paperRef.current) return
    const h = paperRef.current.scrollHeight
    setHeight(h)
    onPages?.(Math.max(1, Math.ceil((h - 4) / PAGE_H)))
  })

  return (
    <div ref={wrapRef} style={{ width: '100%', height: height * scale }}>
      <div
        ref={paperRef}
        data-testid="paper"
        style={{
          width: PAGE_W, minHeight: PAGE_H, boxSizing: 'border-box', padding: '14mm', background: '#fff', color: '#111827',
          fontFamily: FONT_STACK[template.font] || FONT_STACK.sans, fontSize: '10pt', lineHeight: 1.35,
          transform: `scale(${scale})`, transformOrigin: 'top left', boxShadow: '0 4px 24px rgba(0,0,0,.25)', overflow: 'hidden',
        }}
      >
        {kind === 'cover' ? <CoverSheet letter={model} template={template} /> : <ResumeSheet model={model} template={template} />}
      </div>
    </div>
  )
}
