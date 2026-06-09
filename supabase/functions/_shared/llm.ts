// supabase/functions/_shared/llm.ts
// NVIDIA AI (kimi-k2.6) wrapper — OpenAI-compatible chat completions API
// Docs: https://build.nvidia.com/docs

const NVIDIA_API_KEY = Deno.env.get('NVIDIA_API_KEY') ?? ''
const LLM_MODEL = 'moonshotai/kimi-k2.6'
const LLM_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'

export type LlmMessage = { role: 'user' | 'model' | 'system' | 'assistant'; parts: { text: string }[] }

export interface LlmOptions {
  system?: string
  messages: LlmMessage[]
  temperature?: number
  maxOutputTokens?: number
  json?: boolean
  stream?: boolean
}

/**
 * Convert internal message format to OpenAI-format messages array.
 */
function toOpenAiMessages(opts: LlmOptions): { role: string; content: string }[] {
  const msgs: { role: string; content: string }[] = []
  if (opts.system) {
    msgs.push({ role: 'system', content: opts.system })
  }
  for (const m of opts.messages) {
    const role = m.role === 'model' ? 'assistant' : m.role === 'user' ? 'user' : 'user'
    const text = m.parts?.map(p => p.text).join('\n') || ''
    msgs.push({ role, content: text })
  }
  return msgs
}

export async function callLlm(opts: LlmOptions): Promise<Response> {
  if (!NVIDIA_API_KEY) {
    console.error('[llm] NVIDIA_API_KEY no está configurada')
    return new Response(JSON.stringify({ error: 'NVIDIA_API_KEY is not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const isStreaming = opts.stream ?? false
  const messages = toOpenAiMessages(opts)
  const body: Record<string, unknown> = {
    model: LLM_MODEL,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxOutputTokens ?? 2048,
  }
  if (isStreaming) body.stream = true
  if (opts.json) {
    body.response_format = { type: 'json_object' }
  }
  console.log(`[llm] llamando a NVIDIA ${LLM_MODEL} stream=${isStreaming} tokens_max=${opts.maxOutputTokens ?? 2048}`)
  const start = Date.now()
  const res = await fetch(LLM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
    },
    body: JSON.stringify(body),
  })
  const elapsed = Date.now() - start
  console.log(`[llm] respuesta NVIDIA: status=${res.status} elapsed=${elapsed}ms`)
  if (!res.ok) {
    console.error(`[llm] error NVIDIA: ${res.status}`)
  }
  return res
}

/**
 * Extract text content from an LLM response JSON (works with OpenAI / NVIDIA format).
 */
export function extractLlmText(llmJson: Record<string, unknown>): string {
  try {
    // OpenAI / NVIDIA format: choices[0].message.content
    const choices = llmJson?.choices as Array<{ message?: { content?: string }; delta?: { content?: string } }> | undefined
    if (choices && choices.length > 0) {
      const msg = choices[0].message?.content ?? choices[0].delta?.content ?? ''
      return msg
    }
  } catch { /* fall through */ }
  return ''
}

/**
 * SSE parser for NVIDIA streaming. Yields text deltas.
 * NVIDIA uses standard SSE with choices[0].delta.content
 */
export async function* streamNvidia(res: Response): AsyncGenerator<string, void, void> {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let eventCount = 0
  let textCount = 0
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
      eventCount++
      try {
        const json = JSON.parse(payload)
        const text = json?.choices?.[0]?.delta?.content || json?.choices?.[0]?.message?.content
        if (text) {
          textCount++
          yield text
        }
      } catch { /* ignore */ }
    }
  }
  console.log(`[llm] streamNvidia: ${eventCount} eventos SSE, ${textCount} con texto`)
}
