// supabase/functions/_shared/extractors/docx.ts
// Extract text from a DOCX buffer using mammoth
import mammoth from 'npm:mammoth@1.7.2'

export async function extractDocxText(buf: ArrayBuffer): Promise<string> {
  const data = new Uint8Array(buf)
  const result = await mammoth.extractRawText({ buffer: data })
  return result.value ?? ''
}
