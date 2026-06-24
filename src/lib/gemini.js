// src/lib/gemini.js
// Client-side PDF text extraction using pdf.js.
// NOTE: AI calls (NVIDIA) are NOT made from the browser due to CORS.
// All AI calls go through the ai-backend (Express) server.

/**
 * Extract text from a PDF file using pdf.js (client-side).
 * Returns the full extracted text or throws on error.
 */
export async function extractPdfText(file) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item) => item.str).join(' ') + '\n'
  }
  return text.trim()
}

/**
 * Extract text content from any supported file type.
 * For PDFs uses pdf.js; for others uses FileReader.readAsText.
 */
export async function extractFileContent(file) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') {
    return await extractPdfText(file)
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result || '')
    reader.onerror = () => reject(new Error('Error reading file'))
    reader.readAsText(file)
  })
}
