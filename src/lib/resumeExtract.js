import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import mammoth from 'mammoth'
import { groupItemsIntoLines } from './resumeBuilder'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// Hyperlinks in a PDF: the web address plus the words printed over it ("LinkedIn").
export async function pageLinks(page, items) {
  try {
    const annots = await page.getAnnotations()
    return annots
      .filter((a) => a.subtype === 'Link' && a.url && Array.isArray(a.rect))
      .map((a) => {
        const [x1, y1, x2, y2] = a.rect
        const text = items
          .filter((it) => it.transform && it.transform[4] >= x1 - 2 && it.transform[4] <= x2 + 2 && it.transform[5] >= y1 - 3 && it.transform[5] <= y2 + 1)
          .map((it) => it.str).join('').trim()
        return { url: a.url, text }
      })
      .filter((l) => !/^mailto:|^tel:/i.test(l.url))
  } catch { return [] }
}

// Unlike resumeParser.js (flat text for skill matching), this keeps line
// structure and font sizes so a resume can be rebuilt with its sections.
export async function extractStructuredLines(file) {
  const name = file.name.toLowerCase()
  const buf = await file.arrayBuffer()

  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise
    const lines = []
    const links = []
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p)
      const content = await page.getTextContent()
      lines.push(...groupItemsIntoLines(content.items))
      links.push(...(await pageLinks(page, content.items)))
    }
    lines.links = links
    return lines
  }

  const result = await mammoth.extractRawText({ arrayBuffer: buf })
  return result.value
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((text) => ({ text, size: 0 }))
}
