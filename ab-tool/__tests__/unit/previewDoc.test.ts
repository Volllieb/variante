import { describe, it, expect } from 'vitest'
import { buildPreviewSrcDoc, extractTextFromHtml, PREVIEW_ROOT_CLASS } from '@/lib/previewDoc'

/**
 * buildPreviewSrcDoc baut die Vorschau, die im Dashboard das Element der
 * Kundenseite zeigt. Der Regressionsfall dahinter: die Vorschau rendert Buttons
 * im Browser-Default, weil A gar kein CSS bekam und B nur sein eigenes Delta.
 */
describe('buildPreviewSrcDoc', () => {
  it('haengt das HTML in den Wrapper, auf den ab.js seinen computed-Block zielt', () => {
    const doc = buildPreviewSrcDoc({ html: '<button>Buy</button>' })
    expect(doc).toContain(`<div class="${PREVIEW_ROOT_CLASS}"><button>Buy</button></div>`)
    // Gegenstueck in public/ab.js — Vertrag zwischen Snippet und Dashboard.
    expect(PREVIEW_ROOT_CLASS).toBe('__ab_preview_root')
  })

  // Die Reihenfolge IST die Logik: live erbt B das Stylesheet der Seite und
  // variant_css ist nur das Delta darauf. Steht baseCss hinter variantCss,
  // ueberschreibt die Seite die Variante und B sieht aus wie A.
  it('haengt variantCss NACH baseCss ein', () => {
    const doc = buildPreviewSrcDoc({
      html: '<button>Buy</button>',
      baseCss: '.cta { color: red; }',
      variantCss: '.cta { color: green; }',
    })
    expect(doc.indexOf('color: green')).toBeGreaterThan(doc.indexOf('color: red'))
  })

  it('gibt beiden Seiten dieselbe Basis, wenn kein variantCss gesetzt ist', () => {
    const a = buildPreviewSrcDoc({ html: '<button>A</button>', baseCss: '.cta { color: red; }' })
    const b = buildPreviewSrcDoc({ html: '<button>B</button>', baseCss: '.cta { color: red; }' })
    expect(a).toContain('.cta { color: red; }')
    expect(b).toContain('.cta { color: red; }')
  })

  // Das CSS stammt aus dem Stylesheet einer beliebigen fremden Seite. sandbox=""
  // blockt zwar Scripts, aber ein `</style>` schliesst den Block und der Rest
  // wird als Markup geparst.
  it('neutralisiert einen </style>-Ausbruch im eingesammelten CSS', () => {
    const doc = buildPreviewSrcDoc({
      html: '<button>Buy</button>',
      baseCss: '.cta { color: red; }</style><img src=x onerror=alert(1)>',
    })
    // Entscheidend ist nicht, dass der Rest verschwindet, sondern dass er den
    // <style>-Block nicht verlassen kann: ohne schliessendes Tag bleibt er
    // ungueltiges CSS und wird nie als Markup geparst.
    expect(doc).not.toContain('</style><img')
    expect(doc.match(/<\/style>/g)).toHaveLength(1)
    expect(doc.indexOf('onerror')).toBeLessThan(doc.lastIndexOf('</style>'))
  })

  it('entfernt @import aus baseCss und variantCss', () => {
    const doc = buildPreviewSrcDoc({
      html: '<button>Buy</button>',
      baseCss: '@import url("https://evil.example/x.css"); .cta { color: red; }',
      variantCss: '@import "y.css"; .cta { color: green; }',
    })
    expect(doc).not.toContain('@import')
    expect(doc).toContain('color: red')
    expect(doc).toContain('color: green')
  })

  it('erzeugt ohne CSS ein vollstaendiges Dokument', () => {
    const doc = buildPreviewSrcDoc({ html: '<button>Buy</button>' })
    expect(doc).toContain('<!DOCTYPE html>')
    expect(doc.match(/<style>/g)).toHaveLength(1)
    expect(doc.match(/<\/style>/g)).toHaveLength(1)
    expect(doc).toContain('</html>')
  })

  it('uebernimmt den Hintergrund des Hell/Dunkel-Umschalters', () => {
    expect(buildPreviewSrcDoc({ html: '<b>x</b>', background: '#ffffff' })).toContain('background: #ffffff')
  })

  it('vertraegt leeres HTML', () => {
    expect(buildPreviewSrcDoc({ html: '' })).toContain(`<div class="${PREVIEW_ROOT_CLASS}"></div>`)
  })
})

describe('extractTextFromHtml', () => {
  it('liefert den Text eines Element-Fragments', () => {
    expect(extractTextFromHtml('<button class="cta">Jetzt starten</button>')).toBe('Jetzt starten')
  })

  it('liefert einen leeren String, wenn nur Markup da ist', () => {
    expect(extractTextFromHtml('<img src="x">')).toBe('')
  })
})
