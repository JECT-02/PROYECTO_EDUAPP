// supabase/functions/_shared/extractors/pdf.ts
// Extract text from a PDF buffer using pdf-parse (npm specifier)
import { parse as parsePdf } from 'npm:pdf-parse@1.1.1'

export async function extractPdfText(buf: ArrayBuffer): Promise<string> {
  const data = new Uint8Array(buf)
  const result = await parsePdf(data)
  return result.text ?? ''
}
