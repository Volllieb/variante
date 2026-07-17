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

// Security: dieselbe Logik für AI-generiertes CSS (variant_b_css, Hybrid-Preview).
// Das CSS geht denselben Weg wie variant_b_html — über /resolve in fremde DOMs —
// und stammt aus einem LLM, das die analysierte Fremdseite als Input hatte.
// Eine Seite kann also versuchen, per Prompt-Injection CSS unterzuschieben.
const CSS_STYLE_BREAKOUT_RE = /<\/?\s*style\b[^>]*>/gi
const CSS_IMPORT_RE = /@import\b[^;]*;?/gi
const CSS_EXPRESSION_RE = /expression\s*\(/gi
// url() nur mit http(s)/data:image erlauben — javascript:, vbscript: etc. raus.
const CSS_URL_RE = /url\s*\(\s*(['"]?)([^'")]*)\1\s*\)/gi
const CSS_BEHAVIOR_RE = /(?:^|;)\s*(?:-moz-)?behavior\s*:[^;]*/gi

export function sanitizeCss(css: string | null | undefined): string {
  if (!css) return ''
  let s = css
  // Ausbruch aus dem <style>-Kontext verhindern
  s = s.replace(CSS_STYLE_BREAKOUT_RE, '')
  // @import lädt fremde Stylesheets nach → raus
  s = s.replace(CSS_IMPORT_RE, '')
  // IE-Legacy, führt JS aus
  s = s.replace(CSS_EXPRESSION_RE, '(')
  s = s.replace(CSS_BEHAVIOR_RE, '')
  // url(): nur https:, http: und data:image/*
  s = s.replace(CSS_URL_RE, (match, _q, target: string) => {
    const t = target.trim().toLowerCase()
    if (/^(https?:\/\/|data:image\/|\/|\.\/|\.\.\/|#)/.test(t)) return match
    return 'none'
  })
  return s
}
