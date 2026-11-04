// Dev helper: npx tsx dev/dump-resume.mjs <file.pdf> [lines|links]
// Prints how the resume reader sees a PDF, to debug import problems.
import fs from 'node:fs'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { groupItemsIntoLines } from '../src/lib/resumeBuilder.js'
import { linesToModel } from '../src/lib/resumeModel.js'
const f = process.argv[2]
const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(f)) }).promise
const lines = []
const links = []
for (let p = 1; p <= doc.numPages; p++) {
  const pg = await doc.getPage(p); const c = await pg.getTextContent()
  lines.push(...groupItemsIntoLines(c.items))
  for (const a of await pg.getAnnotations()) {
    if (a.subtype === 'Link' && a.url && !/^(mailto|tel):/i.test(a.url)) {
      const [x1, y1, x2, y2] = a.rect
      links.push({ url: a.url, text: c.items.filter((it) => it.transform[4] >= x1 - 2 && it.transform[4] <= x2 + 2 && it.transform[5] >= y1 - 3 && it.transform[5] <= y2 + 1).map((i) => i.str).join('').trim() })
    }
  }
}
lines.links = links
if (process.argv[3] === 'links') console.log(links)
else if (process.argv[3] === 'lines') for (const l of lines) console.log(String(l.size).slice(0, 4).padEnd(5), l.text)
else console.log(JSON.stringify(linesToModel(lines), (k, v) => (k === 'id' ? undefined : v), 1))
