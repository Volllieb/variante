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

/**
 * Regression vom 01.09.2026, gefunden im echten Picker-Lauf auf vallisride.com:
 * die Vorschau war zwar gestylt, aber hell — und der weisse Button darauf
 * unsichtbar. Ursache war `body { background-color: var(--bg) }` aus dem
 * site_css, das im srcDoc nach dem Reset steht und dessen Hintergrund kippt.
 */
describe('buildPreviewSrcDoc — Seiten-Selektoren', () => {
  it('wirft die body-Regel der Kundenseite raus, statt den Rahmen kapern zu lassen', () => {
    const doc = buildPreviewSrcDoc({
      html: '<a class="cta">Los</a>',
      baseCss: 'body { background-color: #f7f5f2; min-height: 100vh; }\n.cta { border: 1px solid #fff; }',
    })
    expect(doc).not.toContain('#f7f5f2')
    expect(doc).toContain('.cta { border: 1px solid #fff; }')
  })

  it('behaelt :root, sonst greift jedes var() in den Element-Regeln ins Leere', () => {
    const doc = buildPreviewSrcDoc({
      html: '<a class="cta">Los</a>',
      baseCss: ':root { --accent: #F84A28; }\n.cta { color: var(--accent); }',
    })
    expect(doc).toContain('--accent: #F84A28')
  })

  it('kuerzt eine Selektorliste, statt die ganze Regel zu verlieren', () => {
    const doc = buildPreviewSrcDoc({
      html: '<a class="cta">Los</a>',
      baseCss: 'body, .cta { color: red; }',
    })
    expect(doc).toContain('.cta { color: red; }')
    expect(doc).not.toMatch(/(^|\n)\s*body\s*,/)
  })

  it('laesst body .foo stehen — das zielt auf einen Nachfahren, nicht auf den Rahmen', () => {
    const doc = buildPreviewSrcDoc({
      html: '<a class="cta">Los</a>',
      baseCss: 'body .cta { color: red; }',
    })
    expect(doc).toContain('body .cta { color: red; }')
  })

  it('laesst den computed-Block von ab.js unangetastet', () => {
    const doc = buildPreviewSrcDoc({
      html: '<a class="cta">Los</a>',
      baseCss: `.${PREVIEW_ROOT_CLASS} > * {\n  border-radius: 3px;\n}`,
    })
    expect(doc).toContain(`.${PREVIEW_ROOT_CLASS} > *`)
    expect(doc).toContain('border-radius: 3px')
  })

  it('kapert auch ueber variantCss nicht — B soll das Element zeigen, nicht die Flaeche', () => {
    const doc = buildPreviewSrcDoc({
      html: '<a class="cta">Los</a>',
      variantCss: 'body { background: #ff0000; }\n.cta { color: #fff; }',
    })
    expect(doc).not.toContain('#ff0000')
    expect(doc).toContain('.cta { color: #fff; }')
  })
})

/**
 * Zweite Regression aus dem Lauf auf vallisride.com: der Regelteil war exakt
 * 18 000 Zeichen lang, die letzte Regel mittendrin gekappt. Eine offene Regel
 * verschluckt beim CSS-Parser alles Nachfolgende — computed-Block und Delta.
 */
describe('buildPreviewSrcDoc — abgeschnittenes CSS aus Bestandsdaten', () => {
  it('wirft die offene Regel am Ende weg, damit das Delta danach noch greift', () => {
    const doc = buildPreviewSrcDoc({
      html: '<a class="cta">Los</a>',
      baseCss: '.cta { border: 1px solid #fff; }\n.abgeschnitten { font-size: 1re',
      variantCss: '.cta { background: #F84A28; }',
    })
    expect(doc).not.toContain('.abgeschnitten')
    expect(doc).toContain('.cta { border: 1px solid #fff; }')
    // Der entscheidende Punkt: das Delta ueberlebt die kaputte Basis.
    expect(doc).toContain('.cta { background: #F84A28; }')
  })

  it('laesst intaktes CSS unangetastet — auch mehrzeilige Regeln', () => {
    const base = `.${PREVIEW_ROOT_CLASS} > * {\n  border-radius: 3px;\n  padding: 14px;\n}`
    expect(buildPreviewSrcDoc({ html: '<b>x</b>', baseCss: base })).toContain(base)
  })

  it('vertraegt eine ueberzaehlige schliessende Klammer, ohne davor abzuschneiden', () => {
    const doc = buildPreviewSrcDoc({ html: '<b>x</b>', baseCss: '.a { color: red; } }\n.b { color: blue; }' })
    expect(doc).toContain('.b { color: blue; }')
  })
})
