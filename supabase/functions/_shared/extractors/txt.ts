// supabase/functions/_shared/extractors/txt.ts
export function extractTxtText(buf: ArrayBuffer): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(buf)
}
