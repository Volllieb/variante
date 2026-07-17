 um die Live-Production und den Launch. figma.showUI(__html__, { width: 360, height: 560, title: 'variante' })

// Persistenten API-Token (Login) laden und an die UI schicken.
figma.clientStorage.getAsync('ab_token').then((token) => {
  figma.ui.postMessage({ type: 'TOKEN', token: typeof token === 'string' ? token : '' })
})

// Temp-Session-Token laden (Onboarding ohne Account) und an die UI schicken.
figma.clientStorage.getAsync('ab_temp_token').then((token) => {
  if (typeof token === 'string' && token) {
    figma.ui.postMessage({ type: 'TEMP_TOKEN_LOADED', token })
  }
})

// Gespeicherten Wizard-Draft laden (testId + Screen), damit der User nach
// Schließen/Wiederöffnen des Plugins nicht von vorne anfangen muss.
figma.clientStorage.getAsync('ab_draft').then((draft) => {
  if (draft && typeof draft === 'object') {
    figma.ui.postMessage({ type: 'DRAFT_LOADED', draft })
  }
})

// Zusammenfassung der aktuellen Leinwand-Auswahl für die UI.
// Variante B wird per Klick in Figma gewählt (analog zum Element-Picker im Snippet),
// damit auch Unter-Elemente wie ein einzelner Button exportiert werden können.
function selectionSummary() {
  const sel = figma.currentPage.selection
  if (sel.length === 0) return { count: 0 }
  if (sel.length > 1) return { count: sel.length }
  const n = sel[0] as unknown as { name: string; type: string; exportAsync?: unknown }
  return {
    count: 1,
    name: n.name,
    nodeType: n.type,
    exportable: typeof n.exportAsync === 'function',
  }
}

function postSelection() {
  figma.ui.postMessage({ type: 'SELECTION', selection: selectionSummary() })
}

// Auswahländerungen live an die UI pushen.
figma.on('selectionchange', postSelection)

// Figma-Farbe (0–1 RGB) → Hex.
function rgbToHex(c: { r: number; g: number; b: number }): string {
  const to = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return '#' + to(c.r) + to(c.g) + to(c.b)
}

// Ein Figma-Paint (Solid/Gradient) in ein kompaktes Objekt für die KI.
function paintToObj(p: any): Record<string, unknown> | null {
  if (!p || p.visible === false) return null
  if (p.type === 'SOLID') {
    return { type: 'solid', hex: rgbToHex(p.color), opacity: typeof p.opacity === 'number' ? p.opacity : 1 }
  }
  if (typeof p.type === 'string' && p.type.startsWith('GRADIENT')) {
    const stops = Array.isArray(p.gradientStops)
      ? p.gradientStops.map((s: any) => ({ hex: rgbToHex(s.color), pos: Math.round(s.position * 100) / 100 }))
      : []
    return { type: p.type.toLowerCase(), stops }
  }
  return null
}
function paintsToArr(paints: unknown): Record<string, unknown>[] {
  if (!Array.isArray(paints)) return []
  return paints.map(paintToObj).filter(Boolean) as Record<string, unknown>[]
}
// Schatten/Effekte.
function effectsToArr(effects: unknown): Record<string, unknown>[] {
  if (!Array.isArray(effects)) return []
  return effects
    .filter((e: any) => e && e.visible !== false && (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW'))
    .map((e: any) => ({
      type: e.type.toLowerCase(),
      hex: e.color ? rgbToHex(e.color) : undefined,
      x: e.offset ? Math.round(e.offset.x) : 0,
      y: e.offset ? Math.round(e.offset.y) : 0,
      blur: Math.round(e.radius || 0),
      spread: Math.round(e.spread || 0),
    }))
}
// lineHeight/letterSpacing → "16px" | "120%" | "auto".
function dim(v: any): string | undefined {
  if (!v || typeof v !== 'object') return undefined
  if (v.unit === 'AUTO') return 'auto'
  if (typeof v.value === 'number') return v.unit === 'PERCENT' ? v.value + '%' : Math.round(v.value) + 'px'
  return undefined
}

// Extrahiert die für Code relevanten Eigenschaften eines Nodes (rekursiv,
// gedeckelt). Liefert der KI exakte Texte/Farben/Typo/Geometrie statt nur Pixel.
function extractNode(node: any, depth: number): Record<string, unknown> {
  const item: Record<string, unknown> = { type: node.type, name: node.name }

  // Text & Typografie
  if (typeof node.characters === 'string') item.text = node.characters.slice(0, 200)
  if (typeof node.fontSize === 'number') item.fontSize = node.fontSize
  if (node.fontName && node.fontName !== figma.mixed) {
    item.fontFamily = node.fontName.family
    item.fontStyle = node.fontName.style
  }
  const lh = dim(node.lineHeight); if (lh) item.lineHeight = lh
  const ls = dim(node.letterSpacing); if (ls) item.letterSpacing = ls
  if (node.textAlignHorizontal) item.textAlign = node.textAlignHorizontal
  if (node.textCase && node.textCase !== 'ORIGINAL') item.textCase = node.textCase

  // Farben, Rahmen, Effekte
  const fills = paintsToArr(node.fills); if (fills.length) item.fills = fills
  const strokes = paintsToArr(node.strokes)
  if (strokes.length) {
    item.strokes = strokes
    if (typeof node.strokeWeight === 'number') item.strokeWeight = node.strokeWeight
  }
  const effects = effectsToArr(node.effects); if (effects.length) item.effects = effects

  // Radius (einheitlich oder pro Ecke), Deckkraft
  if (typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
    item.cornerRadius = node.cornerRadius
  } else if (node.cornerRadius === figma.mixed) {
    item.cornerRadius = {
      tl: node.topLeftRadius, tr: node.topRightRadius, br: node.bottomRightRadius, bl: node.bottomLeftRadius,
    }
  }
  if (typeof node.opacity === 'number' && node.opacity < 1) item.opacity = node.opacity

  // Auto-Layout
  if (node.layoutMode && node.layoutMode !== 'NONE') {
    item.layoutMode = node.layoutMode
    item.itemSpacing = node.itemSpacing
    item.padding = {
      top: node.paddingTop,
      right: node.paddingRight,
      bottom: node.paddingBottom,
      left: node.paddingLeft,
    }
    if (node.primaryAxisAlignItems) item.justify = node.primaryAxisAlignItems
    if (node.counterAxisAlignItems) item.align = node.counterAxisAlignItems
  }

  // Geometrie (Größe + Position relativ zum Parent → Layout-Hinweis)
  if (typeof node.width === 'number') {
    item.width = Math.round(node.width)
    item.height = Math.round(node.height)
  }
  if (typeof node.x === 'number') {
    item.x = Math.round(node.x)
    item.y = Math.round(node.y)
  }

  if (depth < 5 && Array.isArray(node.children) && node.children.length) {
    item.children = node.children.slice(0, 20).map((c: any) => extractNode(c, depth + 1))
  }
  return item
}

figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case 'GET_SELECTION': {
      postSelection()
      break
    }

    case 'EXPORT_SELECTION': {
      // Exportiert das aktuell in Figma angeklickte Element (Variante B) —
      // beliebige Ebene, also auch ein einzelner Button, nicht nur Top-Frames.
      const sel = figma.currentPage.selection
      if (sel.length !== 1) {
        figma.ui.postMessage({ type: 'ERROR', message: 'Bitte genau ein Element in Figma auswählen.' })
        return
      }
      const node = sel[0] as unknown as {
        exportAsync?: (s: unknown) => Promise<Uint8Array>
      }
      if (typeof node.exportAsync !== 'function') {
        figma.ui.postMessage({ type: 'ERROR', message: 'Dieses Element kann nicht exportiert werden.' })
        return
      }
      try {
        const bytes = await node.exportAsync({
          format: 'PNG',
          constraint: { type: 'SCALE', value: 2 },
        })
        const base64 = figma.base64Encode(bytes)
        const content = extractNode(sel[0], 0)
        figma.ui.postMessage({ type: 'FRAME_PNG', base64, content })
      } catch (e) {
        figma.ui.postMessage({ type: 'ERROR', message: 'Export fehlgeschlagen' })
      }
      break
    }

    case 'OPEN_URL': {
      // Öffnet die Ziel-Seite im Standard-Browser (mit #ab_pick=<testId>),
      // damit der Built-in-Picker im Snippet direkt aktiviert wird.
      if (msg.url) {
        try {
          figma.openExternal(msg.url)
        } catch (e) {
          /* z.B. fehlende Geste — UI bietet einen manuellen Button an */
        }
      }
      break
    }

    case 'TOKEN_SAVE': {
      await figma.clientStorage.setAsync('ab_token', typeof msg.token === 'string' ? msg.token : '')
      break
    }

    case 'TEMP_TOKEN_SAVE': {
      await figma.clientStorage.setAsync('ab_temp_token', typeof msg.token === 'string' ? msg.token : '')
      break
    }

    case 'TEMP_TOKEN_CLEAR': {
      await figma.clientStorage.deleteAsync('ab_temp_token')
      break
    }

    case 'SAVE_DRAFT': {
      // Sichert den aktuellen Wizard-Stand (testId + Screen), damit der User
      // nach Schließen/Wiederöffnen weitermachen kann.
      if (msg.draft && typeof msg.draft === 'object') {
        await figma.clientStorage.setAsync('ab_draft', msg.draft)
      }
      break
    }

    case 'CLEAR_DRAFT': {
      await figma.clientStorage.deleteAsync('ab_draft')
      break
    }

    case 'CLOSE':
      figma.closePlugin()
      break
  }
}
