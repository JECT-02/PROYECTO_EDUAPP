// supabase/functions/youtube-transcript/index.ts
// Fetch transcript of a YouTube URL
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getUserClient, getAccessToken } from '../_shared/supabase-admin.ts'
import { extractYoutubeText } from '../_shared/extractors/youtube.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const token = getAccessToken(req)
    if (!token) return jsonError(401, 'No auth')

    const userClient = getUserClient(req)
    const { data: { user } } = await userClient.auth.getUser(token)
    if (!user) return jsonError(401, 'Invalid session')

    const { url } = await req.json()
    if (!url) return jsonError(400, 'url required')

    const text = await extractYoutubeText(url)
    return jsonOk({ text: text.slice(0, 20000), length: text.length })
  } catch (e) {
    console.error(e)
    return jsonError(500, e?.message || 'transcript failed')
  }
})

function jsonOk(data: unknown) {
  return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
