import DOMPurify from 'dompurify'

export function sanitizeHtml(html) {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'span', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id'],
  })
}

export function sanitizeText(text) {
  if (!text) return ''
  return DOMPurify.sanitize(String(text), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}
