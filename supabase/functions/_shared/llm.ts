// supabase/functions/_shared/llm.ts
// Gemini 2.5 Flash wrapper with optional streaming SSE
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const LLM_MODEL = 'gemini-2.5-flash'
const LLM_URL = `https://generativelanguage.googleapis.com/v1beta/models/${LLM_MODEL}:streamGenerateContent`
const LLM_URL_NOSTREAM = `https://generativelanguage.googleapis.com/v1beta/models/${LLM_MODEL}:generateContent`

export type LlmMessage = { role: 'user' | 'model'; parts: { text: string }[] }

export interface LlmOptions {
  system?: string
  messages: LlmMessage[]
  temperature?: number
  maxOutputTokens?: number
  json?: boolean
  stream?: boolean
}

export async function callLlm(opts: LlmOptions): Promise<Response> {
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const url = opts.stream ? `${LLM_URL}?key=${GEMINI_API_KEY}&alt=sse` : `${LLM_URL_NOSTREAM}?key=${GEMINI_API_KEY}`
  const body: Record<string, unknown> = {
    contents: opts.messages,
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxOutputTokens ?? 2048,
    },
  }
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] }
  if (opts.json) {
    (body.generationConfig as Record<string, unknown>).responseMimeType = 'application/json'
  }
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/**
 * SSE parser for Gemini streamGenerateContent. Yields text deltas.
 */
export async function* streamGemini(res: Response): AsyncGenerator<string, void, void> {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload)
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) yield text
      } catch { /* ignore */ }
    }
  }
}
