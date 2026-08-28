// Security: CSS-Sanitizing ohne DOM-Abhängigkeit.
//
// Warum eine eigene Datei und nicht einfach in lib/sanitize.ts:
// sanitize.ts importiert top-level `isomorphic-dompurify` und zieht damit jsdom
// nach. Die Preview-Komponenten im Dashboard laufen im Client ('use client') und
// brauchen genau diese CSS-Prüfung — über sanitize.ts importiert landete jsdom
// im Browser-Bundle. Der HTML-Teil bleibt deshalb dort, der reine Regex-Teil
// liegt hier und wird von sanitize.ts re-exportiert.
//
// Zwei Aufrufer, zwei Bedrohungsmodelle, dieselben Regeln:
//   1. lib/sanitize.ts  -> variant_b_css geht über /resolve in fremde DOMs.
//      Quelle ist ein LLM, das die Kundenseite als Input hatte (Prompt-Injection).
//   2. lib/previewDoc.ts -> site_css/variant_css gehen in ein srcDoc-iframe im
//      Dashboard. Quelle ist das Stylesheet einer beliebigen fremden Seite.
//      sandbox="" blockt dort zwar Scripts, aber ein `</style>` im eingesammelten
//      CSS schliesst den Block und der Rest wird als Markup geparst.

const CSS_STYLE_BREAKOUT_RE = /<\/?\s*style\b[^>]*>/gi
const CSS_IMPORT_RE = /@import\b[^;]*;?/gi
const CSS_EXPRESSION_RE = /expression\s*\(/gi
const CSS_URL_RE = /url\s*\(\s*(['"]?)([^'")]*)\1\s*\)/gi
const CSS_BEHAVIOR_RE = /(^|[;{])\s*(?:-moz-)?behavior\s*:[^;]*/gi
// Ein Vollbild-Overlay auf einer fremden Seite ist Clickjacking, kein A/B-Test.
const CSS_POSITION_FIXED_RE = /(^|[;{])(\s*)position\s*:\s*fixed\b/gi

export function sanitizeCssText(css: string | null | undefined): string {
  if (!css) return ''
  let s = css
  // Ausbruch aus dem <style>-Kontext verhindern
  s = s.replace(CSS_STYLE_BREAKOUT_RE, '')
  // @import lädt fremde Stylesheets nach → raus
  s = s.replace(CSS_IMPORT_RE, '')
  // IE-Legacy, führt JS aus
  s = s.replace(CSS_EXPRESSION_RE, '(')
  s = s.replace(CSS_BEHAVIOR_RE, '$1')
  // position:fixed → static. Verhindert seitenweite Overlays über fremdem Content.
  s = s.replace(CSS_POSITION_FIXED_RE, '$1$2position:static')
  // url(): nur https:, http:, relative Pfade und data:image/*
  s = s.replace(CSS_URL_RE, (match, _q, target: string) => {
    const t = target.trim().toLowerCase()
    if (/^(https?:\/\/|data:image\/|\/|\.\/|\.\.\/|#)/.test(t)) return match
    return 'none'
  })
  return s
}
