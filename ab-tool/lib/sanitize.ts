// Security: Server-seitige HTML-Sanitization für AI-generiertes HTML.
// Schützt vor XSS durch bösartige variant_b_html-Inhalte, die via
// /variant und /resolve an ab.js ausgeliefert und per innerHTML/outerHTML
// in fremde DOMs injiziert werden.
//
// Deckt die OWASP XSS Prevention Cheat Sheet RULE #1 (HTML Escape) und
// RULE #6 (Sanitize HTML Markup) ab — ohne externe Dependency.
// DOMPurify wäre der Goldstandard, aber benötigt jsdom auf dem Server.

const SCRIPT_RE = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
const ON_EVENT_RE = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const JS_URL_HREF_RE = /href\s*=\s*(["'])javascript:[^"']*\1/gi
const JS_URL_SRC_RE = /src\s*=\s*(["'])javascript:[^"']*\1/gi
const DANGEROUS_TAG_RE = /<\/?(?:iframe|object|embed|link|meta|base)\b[^>]*\/?>/gi

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''
  let s = html
  // <script>-Tags komplett entfernen (inkl. Inhalt)
  s = s.replace(SCRIPT_RE, '')
  // on*-Event-Handler-Attribute entfernen
  s = s.replace(ON_EVENT_RE, '')
  // javascript:-URLs in href/src neutralisieren
  s = s.replace(JS_URL_HREF_RE, 'href="#"')
  s = s.replace(JS_URL_SRC_RE, 'src="#"')
  // Gefährliche Tags entfernen
  s = s.replace(DANGEROUS_TAG_RE, '')
  return s
}
