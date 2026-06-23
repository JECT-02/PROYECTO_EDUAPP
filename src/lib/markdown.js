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

export function renderLessonContent(markdown) {
  if (!markdown) return ''
  let md = markdown
    .replace(/^```(?:markdown)?\s*\n?/gm, '')
    .replace(/\n?```\s*$/gm, '')

  const blocks = []
  md = md.replace(
    /^:::concept\n([\s\S]*?)^:::/gm,
    (_, content) => { blocks.push({ type: 'key-concept', content }); return `%%BLOCK_${blocks.length - 1}%%` }
  )
  md = md.replace(
    /^:::example\n([\s\S]*?)^:::/gm,
    (_, content) => { blocks.push({ type: 'example-box', content }); return `%%BLOCK_${blocks.length - 1}%%` }
  )

  let html = marked.parse(md)
  blocks.forEach((block, i) => {
    const inner = marked.parse(block.content.trim())
    html = html.replace(`<p>%%BLOCK_${i}%%</p>`, `<div class="${block.type}">${inner}</div>`)
    html = html.replace(`%%BLOCK_${i}%%`, `<div class="${block.type}">${inner}</div>`)
  })

  return html
}
