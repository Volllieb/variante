/**
 * Validates and repairs CSS selectors typed into the wizard's "Manual
 * Selector" fields (StepUrlAndElement, StepGoal).
 *
 * Users on Tailwind-based sites routinely copy a class straight out of
 * devtools' class="..." attribute — e.g. `hover:bg-blue-700`, `w-[320px]`,
 * `w-1/2`, `text-white/80`. Those are valid Tailwind class *names* but
 * invalid CSS *identifiers*: `:`, `[`, `]`, `/`, `%` need to be
 * backslash-escaped inside a `.class` token or the browser's CSS parser
 * misreads them as a pseudo-class / attribute selector and throws,
 * silently blocking the wizard (the Visual Picker doesn't hit this because
 * it builds selectors via CSS.escape() already — see public/ab.js).
 *
 * Strategy: try the selector as typed first (preserves deliberate syntax
 * like `.card:hover .icon`); only if that fails to parse, retry with every
 * `.class` / `#id` token's identifier run auto-escaped and use that version
 * if it now parses — that's the selector actually saved, since it's the
 * one that has to keep working at runtime in ab.js.
 */

function autoEscapeIdentifiers(sel: string): string {
  return sel.replace(/([.#])([^\s.#>+~,()]+)/g, (_match, prefix: string, ident: string) => {
    try {
      return prefix + CSS.escape(ident)
    } catch {
      return prefix + ident
    }
  })
}

function isParsable(sel: string): boolean {
  try {
    document.querySelector(sel)
    return true
  } catch {
    return false
  }
}

export interface ManualSelectorResult {
  ok: boolean
  selector: string
  error?: string
}

export function validateManualSelector(raw: string): ManualSelectorResult {
  const sel = raw.trim()
  if (!sel || sel.length < 2) {
    return { ok: false, selector: sel, error: 'Please enter a CSS selector.' }
  }
  if (sel.length > 512) {
    return { ok: false, selector: sel, error: 'Selector is too long (max 512 characters).' }
  }
  if (/[<>{};]/.test(sel)) {
    return { ok: false, selector: sel, error: 'Invalid CSS selector. Try something like: .my-class, #my-id, button.cta' }
  }
  if (!/^[.#[a-zA-Z_*]/.test(sel)) {
    return { ok: false, selector: sel, error: 'Invalid CSS selector. Try something like: .my-class, #my-id, button.cta' }
  }

  if (isParsable(sel)) return { ok: true, selector: sel }

  const escaped = autoEscapeIdentifiers(sel)
  if (escaped !== sel && isParsable(escaped)) return { ok: true, selector: escaped }

  return { ok: false, selector: sel, error: 'Invalid CSS selector. Try something like: .my-class, #my-id, button.cta' }
}
