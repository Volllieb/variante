import { describe, it, expect } from 'vitest'
import { buildPreviewSrcDoc, extractTextFromHtml, PREVIEW_ROOT_CLASS } from '@/lib/previewDoc'

/**
 * buildPreviewSrcDoc baut die Vorschau, die im Dashboard das Element der
 * Kundenseite zeigt. Der Regressionsfall dahinter: die Vorschau rendert Buttons
 * im Browser-Default, weil A gar kein CSS bekam und B nur sein eigenes Delta.
 *
 * Wizard und Results teilen sich diesen einen Builder — die Signatur ist die
 * Block-Form des Wizards, Results übergibt genau einen Block.
 */
describe('buildPreviewSrcDoc', () => {
  it('haengt jedes HTML in den Wrapper, auf den der computed-Block zielt', () => {
    const doc = buildPreviewSrcDoc([{ html: '<button>Buy</button>' }])
    expect(doc).toContain(`<div class="${PREVIEW_ROOT_CLASS}"><button>Buy</button></div>`)
    // Gegenstueck in public/ab.js — Vertrag zwischen Snippet und Dashboard.
    expect(PREVIEW_ROOT_CLASS).toBe('__ab_preview_root')
  })

  // Die Reihenfolge IST die Logik: live erbt B das Stylesheet der Seite und
  // das Block-css ist nur das Delta darauf. Steht siteCss hinter dem Delta,
  // ueberschreibt die Seite die Variante und B sieht aus wie A.
  it('haengt das Block-css NACH dem siteCss ein', () => {
    const doc = buildPreviewSrcDoc(
      [{ html: '<button>Buy</button>', css: '.cta { color: green; }' }],
      { siteCss: '.cta { color: red; }' }
    )
    expect(doc.indexOf('color: green')).toBeGreaterThan(doc.indexOf('color: red'))
  })

  it('mit gesetztem Delta unterscheidet sich B sichtbar von A', () => {
    const doc = buildPreviewSrcDoc(
      [
        { html: '<button class="cta">A</button>' },
        { html: '<button class="cta">B</button>', css: '.cta { color: green; }' },
      ],
      { siteCss: '.cta { color: red; }' }
    )
    expect(doc).toContain(`<div class="${PREVIEW_ROOT_CLASS}"><button class="cta">A</button></div>`)
    expect(doc).toContain(`<div class="${PREVIEW_ROOT_CLASS}"><button class="cta">B</button></div>`)
    // Beide teilen die Basis, aber nur B traegt das Delta — und zwar zuletzt.
    expect(doc.indexOf('color: green')).toBeGreaterThan(doc.indexOf('color: red'))
  })

  // Das CSS stammt aus dem Stylesheet einer beliebigen fremden Seite. sandbox=""
  // blockt zwar Scripts, aber ein `</style>` schliesst den Block und der Rest
  // wird als Markup geparst.
  it('neutralisiert einen </style>-Ausbruch im eingesammelten CSS', () => {
    const doc = buildPreviewSrcDoc(
      [{ html: '<button>Buy</button>' }],
      { siteCss: '.cta { color: red; }</style><img src=x onerror=alert(1)>' }
    )
    // Entscheidend ist nicht, dass der Rest verschwindet, sondern dass er den
    // <style>-Block nicht verlassen kann: ohne schliessendes Tag bleibt er
    // ungueltiges CSS und wird nie als Markup geparst.
    expect(doc).not.toContain('</style><img')
    expect(doc.match(/<\/style>/g)).toHaveLength(1)
    expect(doc.indexOf('onerror')).toBeLessThan(doc.lastIndexOf('</style>'))
  })

  it('entfernt @import aus siteCss und Block-css', () => {
    const doc = buildPreviewSrcDoc(
      [{ html: '<button>Buy</button>', css: '@import "y.css"; .cta { color: green; }' }],
      { siteCss: '@import url("https://evil.example/x.css"); .cta { color: red; }' }
    )
    expect(doc).not.toContain('@import')
    expect(doc).toContain('color: red')
    expect(doc).toContain('color: green')
  })

  it('erzeugt ohne CSS ein vollstaendiges Dokument', () => {
    const doc = buildPreviewSrcDoc([{ html: '<button>Buy</button>' }])
    expect(doc).toContain('<!DOCTYPE html>')
    expect(doc.match(/<style>/g)).toHaveLength(1)
    expect(doc.match(/<\/style>/g)).toHaveLength(1)
    expect(doc).toContain('</html>')
  })

  it('uebernimmt den Hintergrund des Hell/Dunkel-Umschalters', () => {
    expect(buildPreviewSrcDoc([{ html: '<b>x</b>' }], { background: '#ffffff' })).toContain('background: #ffffff')
  })

  it('vertraegt leeres HTML', () => {
    expect(buildPreviewSrcDoc([{ html: '' }])).toContain(`<div class="${PREVIEW_ROOT_CLASS}"></div>`)
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
    const doc = buildPreviewSrcDoc(
      [{ html: '<a class="cta">Los</a>' }],
      { siteCss: 'body { background-color: #f7f5f2; min-height: 100vh; }\n.cta { border: 1px solid #fff; }' }
    )
    expect(doc).not.toContain('#f7f5f2')
    expect(doc).toContain('.cta { border: 1px solid #fff; }')
  })

  it('kippt den Rahmen auch dann nicht, wenn die body-Regel var(--bg) benutzt', () => {
    const doc = buildPreviewSrcDoc(
      [{ html: '<a class="cta">Los</a>' }],
      { siteCss: 'body { background-color: var(--bg); min-height: 100vh; }\n.cta { color: red; }' }
    )
    expect(doc).not.toContain('var(--bg)')
    expect(doc).toContain('.cta { color: red; }')
  })

  it('behaelt :root, sonst greift jedes var() in den Element-Regeln ins Leere', () => {
    const doc = buildPreviewSrcDoc(
      [{ html: '<a class="cta">Los</a>' }],
      { siteCss: ':root { --accent: #F84A28; }\n.cta { color: var(--accent); }' }
    )
    expect(doc).toContain('--accent: #F84A28')
  })

  it('kuerzt eine Selektorliste, statt die ganze Regel zu verlieren', () => {
    const doc = buildPreviewSrcDoc(
      [{ html: '<a class="cta">Los</a>' }],
      { siteCss: 'body, .cta { color: red; }' }
    )
    expect(doc).toContain('.cta { color: red; }')
    expect(doc).not.toMatch(/(^|\n)\s*body\s*,/)
  })

  it('laesst body .foo stehen — das zielt auf einen Nachfahren, nicht auf den Rahmen', () => {
    const doc = buildPreviewSrcDoc(
      [{ html: '<a class="cta">Los</a>' }],
      { siteCss: 'body .cta { color: red; }' }
    )
    expect(doc).toContain('body .cta { color: red; }')
  })

  it('kapert auch ueber das Block-css nicht — B soll das Element zeigen, nicht die Flaeche', () => {
    const doc = buildPreviewSrcDoc(
      [{ html: '<a class="cta">Los</a>', css: 'body { background: #ff0000; }\n.cta { color: #fff; }' }]
    )
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
    const doc = buildPreviewSrcDoc(
      [
        {
          html: '<a class="cta">Los</a>',
          css: '.cta { background: #F84A28; }',
        },
      ],
      { siteCss: '.cta { border: 1px solid #fff; }\n.abgeschnitten { font-size: 1re' }
    )
    expect(doc).not.toContain('.abgeschnitten')
    expect(doc).toContain('.cta { border: 1px solid #fff; }')
    // Der entscheidende Punkt: das Delta ueberlebt die kaputte Basis.
    expect(doc).toContain('.cta { background: #F84A28; }')
  })

  it('laesst intaktes CSS unangetastet — auch mehrzeilige Regeln', () => {
    const base = `.${PREVIEW_ROOT_CLASS} > * {\n  border-radius: 3px;\n  padding: 14px;\n}`
    expect(buildPreviewSrcDoc([{ html: '<b>x</b>' }], { siteCss: base })).toContain(base)
  })

  it('vertraegt eine ueberzaehlige schliessende Klammer, ohne davor abzuschneiden', () => {
    const doc = buildPreviewSrcDoc(
      [{ html: '<b>x</b>' }],
      { siteCss: '.a { color: red; } }\n.b { color: blue; }' }
    )
    expect(doc).toContain('.b { color: blue; }')
  })
})

/**
 * Beide in Produktion vorkommenden Formate des computed-Blocks: ab.js
 * speichert seit dem Delta-Modell `.__original { … }` (Daten für delta.ts /
 * Draft-Resume), Bestandszeilen tragen `.__ab_preview_root > * { … }`. Beide
 * muessen in der Vorschau auf den Wrapper wirken — das ist der CDN-CSS-Fall
 * (Webflow/Framer/Tailwind-CDN), wo collectCss cross-origin nichts sammeln
 * konnte und der Block die Vorschau allein trägt.
 */
describe('buildPreviewSrcDoc — computed-Block-Formate', () => {
  it('normalisiert .__original auf den Wrapper-Selektor, ohne den gespeicherten Text zu aendern', () => {
    const stored = '/* computed styles of original element (reference) */\n.__original {\n  color: rgb(17, 17, 17);\n  width: 142px;\n  height: 44px;\n  transform-origin: 0px 0px;\n  padding: 12px 24px;\n}'
    const doc = buildPreviewSrcDoc([{ html: '<button class="cta">Buy</button>' }], { siteCss: stored })
    // Der tote Daten-Selektor verschwindet aus dem srcDoc, der Wrapper-Selektor greift.
    expect(doc).toContain(`.${PREVIEW_ROOT_CLASS} > *`)
    expect(doc).not.toContain('.__original')
    // Box-Freeze-Snapshots kommen beim Anwenden raus (B darf wachsen) …
    expect(doc).not.toContain('width: 142px')
    expect(doc).not.toContain('height: 44px')
    expect(doc).not.toContain('transform-origin')
    // … die uebrigen gemessenen Styles bleiben.
    expect(doc).toContain('color: rgb(17, 17, 17)')
    expect(doc).toContain('padding: 12px 24px')
  })

  it('akzeptiert die Altform .__ab_preview_root > * unveraendert', () => {
    const doc = buildPreviewSrcDoc(
      [{ html: '<button class="cta">Buy</button>' }],
      { siteCss: '.__ab_preview_root > * {\n  color: rgb(17, 17, 17);\n  height: 40px;\n  border-radius: 8px;\n}' }
    )
    expect(doc).toContain(`.${PREVIEW_ROOT_CLASS} > *`)
    expect(doc).toContain('border-radius: 8px')
    expect(doc).not.toContain('height: 40px')
  })

  it('steht NACH den gematchten Site-Regeln — er beschreibt das Original treffender', () => {
    const doc = buildPreviewSrcDoc(
      [{ html: '<button class="cta">Buy</button>' }],
      { siteCss: '.cta { color: rgb(255, 0, 0); }\n.__original {\n  color: rgb(17, 17, 17);\n}' }
    )
    const computedAt = doc.indexOf(`${PREVIEW_ROOT_CLASS} > *`)
    const siteAt = doc.indexOf('.cta { color: rgb(255, 0, 0)')
    expect(computedAt).toBeGreaterThan(siteAt)
  })
})

describe('buildPreviewSrcDoc — Paritaet Wizard/Results', () => {
  // Beide Seiten rufen jetzt DIESELBE Funktion. Die Metrik des letzten Fixes
  // (114 Regeln → 7, 18.785 → 3.006 Zeichen) haengt an dieser Identitaet:
  // was der Wizard misst, zeigt die Results-Seite.
  it('Wizard-Aufrufform und Results-Aufrufform erzeugen identische srcDocs', () => {
    const wizardCall = buildPreviewSrcDoc(
      [{ html: '<button class="cta">A</button>' }],
      { siteCss: '.cta { color: red; }' }
    )
    const resultsCall = buildPreviewSrcDoc(
      [{ html: '<button class="cta">A</button>', css: null }],
      { siteCss: '.cta { color: red; }' }
    )
    expect(wizardCall).toBe(resultsCall)
  })
})
