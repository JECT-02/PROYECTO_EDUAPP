export async function streamFunction({ name, body, accessToken, onChunk, onDone, onError, signal }) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Edge Function ${name} -> ${res.status}: ${text || res.statusText}`)
    }
    if (!res.body) {
      onDone?.()
      return
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() || ''
      for (const evt of events) {
        const line = evt.split('\n').find((l) => l.startsWith('data:'))
        if (!line) continue
        const payload = line.replace(/^data:\s*/, '')
        if (payload === '[DONE]') {
          onDone?.()
          return
        }
        try {
          const parsed = JSON.parse(payload)
          if (parsed.error) {
            onError?.(new Error(parsed.error))
            return
          }
          onChunk?.(parsed)
        } catch {
          onChunk?.({ text: payload })
        }
      }
    }
    onDone?.()
  } catch (err) {
    if (err.name !== 'AbortError') onError?.(err)
  }
}

export async function callFunction({ name, body, accessToken }) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Edge Function ${name} -> ${res.status}: ${text || res.statusText}`)
  }
  return res.json()
}
