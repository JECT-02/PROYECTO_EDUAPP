// supabase/functions/_shared/chunker.ts
// Token-aware chunking by characters (≈ tokens × 4)
export interface ChunkOptions {
  maxChars?: number
  overlap?: number
}

export function chunkText(text: string, opts: ChunkOptions = {}): string[] {
  const max = opts.maxChars ?? 1200
  const overlap = opts.overlap ?? 200
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= max) return [cleaned]
  const chunks: string[] = []
  let start = 0
  while (start < cleaned.length) {
    let end = start + max
    if (end < cleaned.length) {
      const lastPeriod = cleaned.lastIndexOf('.', end)
      if (lastPeriod > start + max / 2) end = lastPeriod + 1
    }
    chunks.push(cleaned.slice(start, end).trim())
    if (end >= cleaned.length) break
    start = Math.max(end - overlap, start + 1)
  }
  return chunks.filter((c) => c.length > 0)
}
