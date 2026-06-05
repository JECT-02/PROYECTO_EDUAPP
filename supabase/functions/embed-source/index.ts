// supabase/functions/embed-source/index.ts
// ETL: download file from Storage -> extract text -> chunk -> embed -> insert into documents
import { corsHeaders } from '../_shared/cors.ts'
import { getAdminClient, getUserClient, getAccessToken } from '../_shared/supabase-admin.ts'
import { embedTexts } from '../_shared/embeddings.ts'
import { chunkText } from '../_shared/chunker.ts'
import { extractPdfText } from '../_shared/extractors/pdf.ts'
import { extractDocxText } from '../_shared/extractors/docx.ts'
import { extractTxtText } from '../_shared/extractors/txt.ts'
import { extractYoutubeText } from '../_shared/extractors/youtube.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // read body FIRST
  let body: Record<string, unknown> = {}
  try {
    body = JSON.parse(await req.text())
  } catch {
    return jsonError(400, 'Invalid JSON body')
  }

  try {
    const token = getAccessToken(req)
    if (!token) return jsonError(401, 'No auth')

    const userClient = getUserClient(req)
    const { data: { user }, error: uErr } = await userClient.auth.getUser(token)
    if (uErr || !user) return jsonError(401, 'Invalid session')

    const sourceFileId = (body.sourceFileId || body.sourceId || '') as string
    if (!sourceFileId) return jsonError(400, 'sourceFileId required')

    const admin = getAdminClient()
    const { data: sf, error: sfErr } = await admin
      .from('source_files')
      .select('*')
      .eq('id', sourceFileId)
      .single()
    if (sfErr || !sf) return jsonError(404, 'source_file not found')

    await admin.from('source_files').update({ status: 'processing' }).eq('id', sourceFileId)

    let text = ''
    const kind = (sf.kind || sf.file_type || '').toLowerCase()
    if (kind === 'youtube' || (sf.storage_path || '').startsWith('youtube:')) {
      const url = (sf.storage_path || '').replace(/^youtube:/, '')
      text = await extractYoutubeText(url)
    } else {
      const { data: blob, error: dlErr } = await admin.storage
        .from('course-source')
        .download(sf.storage_path)
      if (dlErr || !blob) throw new Error(dlErr?.message || 'download failed')
      const buf = await blob.arrayBuffer()
      const ext = (sf.storage_path.split('.').pop() || '').toLowerCase()
      if (ext === 'pdf') text = await extractPdfText(buf)
      else if (ext === 'docx') text = await extractDocxText(buf)
      else text = extractTxtText(buf)
    }

    if (!text || text.trim().length < 10) {
      await admin.from('source_files').update({ status: 'failed', error: 'No text extracted' }).eq('id', sourceFileId)
      return jsonError(400, 'No text extracted from file')
    }

    const chunks = chunkText(text)
    const embeddings = await embedTexts(chunks)

    const rows = chunks.map((c, i) => ({
      course_id: sf.course_id,
      source_file_id: sf.id,
      chunk_index: i,
      content: c,
      embedding: embeddings[i] ?? null,
      metadata: { kind, original_name: sf.file_name },
    }))
    const { error: insErr } = await admin.from('documents').insert(rows)
    if (insErr) throw insErr

    await admin.from('source_files').update({ status: 'embedded', chunks_count: chunks.length }).eq('id', sourceFileId)
    return jsonOk({ chunks: chunks.length })
  } catch (e) {
    console.error(e)
    return jsonError(500, e?.message || 'internal error')
  }
})

function jsonOk(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
