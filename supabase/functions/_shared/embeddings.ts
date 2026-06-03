// supabase/functions/_shared/embeddings.ts
// Gemini embeddings wrapper — model: gemini-embedding-001, 768 dims
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const EMBED_MODEL = 'gemini-embedding-001'
const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents`

export async function embedTexts(texts: string[], taskType = 'RETRIEVAL_DOCUMENT'): Promise<number[][]> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set')
  if (texts.length === 0) return []
  const requests = texts.map((t) => ({
    model: `models/${EMBED_MODEL}`,
    content: { parts: [{ text: t.slice(0, 8000) }] },
    taskType,
    outputDimensionality: 768,
  }))
  const res = await fetch(`${EMBED_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini embeddings failed: ${res.status} ${err}`)
  }
  const json = await res.json()
  return (json.embeddings ?? []).map((e: { values: number[] }) => e.values)
}

export async function embedQuery(text: string): Promise<number[]> {
  const [v] = await embedTexts([text], 'RETRIEVAL_QUERY')
  return v ?? []
}
