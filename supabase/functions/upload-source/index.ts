import { corsHeaders } from '../_shared/cors.ts'
import { getAccessToken, getUserClient, getAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  let reqBody: Record<string, unknown> = {}
  try {
    reqBody = JSON.parse(await req.text())
  } catch {
    return jsonError(400, 'Invalid JSON body')
  }

  try {
    const token = getAccessToken(req)
    if (!token) return jsonError(401, 'No auth')

    const userClient = getUserClient(req)
    const { data: { user } } = await userClient.auth.getUser(token)
    if (!user) return jsonError(401, 'Invalid session')

    const { courseId, filename, content } = reqBody as { courseId?: string; filename?: string; content?: string }
    if (!courseId || !filename || !content) return jsonError(400, 'courseId, filename, and content (base64) required')

    const raw = Uint8Array.from(atob(content), (c) => c.charCodeAt(0))
    const ext = filename.split('.').pop()?.toLowerCase() || 'txt'
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${courseId}/${Date.now()}_${safe}`

    const admin = getAdminClient()

    const { error: uploadErr } = await admin.storage
      .from('course-source')
      .upload(storagePath, raw, { contentType: ext === 'pdf' ? 'application/pdf' : ext === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'text/plain', upsert: false })
    if (uploadErr) return jsonError(500, 'Storage upload error: ' + uploadErr.message)

    const { data: sourceRow, error: insErr } = await admin
      .from('source_files')
      .insert({
        course_id: courseId,
        uploaded_by: user.id,
        filename: filename,
        storage_path: storagePath,
        file_type: ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : 'txt',
        status: 'pending',
        file_name: filename,
      })
      .select()
      .single()
    if (insErr) return jsonError(500, 'DB insert error: ' + insErr.message)

    return jsonOk({ id: sourceRow.id, storage_path: storagePath, filename })
  } catch (e) {
    console.error('[upload-source] error:', e)
    return jsonError(500, e?.message || 'internal error')
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
