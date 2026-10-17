import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import mammoth from 'mammoth'
import { groupItemsIntoLines } from './resumeBuilder'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// Unlike resumeParser.js (flat text for skill matching), this keeps line
// structure and font sizes so a resume can be rebuilt with its sections.
export async function extractStructuredLines(file) {
  const name = file.name.toLowerCase()
  const buf = await file.arrayBuffer()

  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise
    const lines = []
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p)
      const content = await page.getTextContent()
      lines.push(...groupItemsIntoLines(content.items))
    }
    return lines
  }

  const result = await mammoth.extractRawText({ arrayBuffer: buf })
  return result.value
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((text) => ({ text, size: 0 }))
}
