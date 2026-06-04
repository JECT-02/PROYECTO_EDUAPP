// supabase/functions/_shared/extractors/youtube.ts
// Try to fetch captions using youtube-transcript npm package
import { fetchTranscript } from 'npm:youtube-transcript@1.2.1'

export async function extractYoutubeText(url: string): Promise<string> {
  const items = await fetchTranscript(url)
  return items.map((i: { text: string }) => i.text).join(' ')
}
