import { marked } from 'marked'
import { sanitizeHtml } from './sanitize'

marked.setOptions({
  breaks: true,
  gfm: true,
})

export function renderMarkdown(text) {
  if (!text) return ''
  const html = marked.parse(text)
  return sanitizeHtml(html)
}
