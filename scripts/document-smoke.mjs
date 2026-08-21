import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import mammoth from 'mammoth'

const baseUrl = process.env.MERE_API_URL || 'http://127.0.0.1:8787'
const marker = 'MEREDOCPIPELINE271'
const content = `# Quarterly brief\n\nქართული დოკუმენტის ტესტი · ${marker}\n\n| Metric | Result |\n| --- | --- |\n| Quality | Ready |\n| Marker | ${marker} |`
const formats = ['docx', 'xlsx', 'pptx', 'pdf', 'md']
const files = new Map()

for (const format of formats) {
  const response = await fetch(`${baseUrl}/api/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, title: `Mere X ${format.toUpperCase()} test`, content }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(`${format} export failed: ${result.error || response.status}`)
  const buffer = Buffer.from(result.data, 'base64')
  if (buffer.length < 100) throw new Error(`${format} export is unexpectedly small`)
  files.set(format, { ...result, buffer })
}

const docxText = (await mammoth.extractRawText({ buffer: files.get('docx').buffer })).value
if (!docxText.includes(marker)) throw new Error('DOCX content verification failed')

const workbook = new ExcelJS.Workbook()
await workbook.xlsx.load(files.get('xlsx').buffer)
const sheetText = workbook.worksheets.flatMap(sheet => sheet.getSheetValues()).flat(3).join(' ')
if (!sheetText.includes('Quality') || !sheetText.includes('Ready')) throw new Error('XLSX content verification failed')

const presentation = await JSZip.loadAsync(files.get('pptx').buffer)
if (!presentation.file('ppt/presentation.xml') || !Object.keys(presentation.files).some(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))) throw new Error('PPTX structure verification failed')

if (!files.get('pdf').buffer.subarray(0, 4).equals(Buffer.from('%PDF'))) throw new Error('PDF header verification failed')
if (!files.get('md').buffer.toString('utf8').includes(marker)) throw new Error('Markdown content verification failed')

let attachmentAnalysis = 'skipped'
if (process.env.MERE_SMOKE_AI === '1') {
  const attachments = ['docx', 'xlsx', 'pptx'].map(format => {
    const file = files.get(format)
    return { name: file.name, mimeType: file.mimeType, data: file.data }
  })
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: `Read the attached Word, Excel and PowerPoint files. If all three contain ${marker}, reply with exactly OFFICE_ATTACHMENTS_OK.` }],
      attachments,
      reasoning: false,
    }),
  })
  const body = await response.text()
  if (!response.ok || !body.includes('OFFICE_ATTACHMENTS_OK')) throw new Error(`Attachment analysis failed: ${body.slice(0, 500)}`)
  attachmentAnalysis = 'passed'
}

console.log(JSON.stringify({ ok: true, exports: Object.fromEntries([...files].map(([format, file]) => [format, { name: file.name, size: file.buffer.length }])), attachmentAnalysis }, null, 2))
