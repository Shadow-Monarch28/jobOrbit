import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import mammoth from 'mammoth'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

async function extractFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let text = ''
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const pageText = content.items.map((item) => item.str).join(' ')
    text += pageText + '\n'
  }
  return text.trim()
}

async function extractFromDocx(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value.trim()
}

/**
 * Extracts plain text from an uploaded resume file. Supports PDF and DOCX
 * (the two formats we tell users to upload). Throws a clear error for
 * anything else rather than silently returning empty text.
 */
export async function extractResumeText(file) {
  const name = file.name.toLowerCase()

  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    return extractFromPdf(file)
  }

  if (
    name.endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return extractFromDocx(file)
  }

  throw new Error('Unsupported file type. Please upload a PDF or DOCX resume.')
}
