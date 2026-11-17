import { supabase } from '@/lib/supabase'
import { getPlanForUser } from '@/lib/auth'
import { getDomainLimit } from '@/lib/planLimits'
import { LEVER_LABELS, type LeverId } from '@/lib/copyLevers'

/**
 * Verbindet die auf der Landingpage eingegebene Demo-URL direkt mit dem Account.
 *
 * Wird aufgerufen:
 *   1. Im Auth-Callback — direkt beim Signup/Login (Website ↔ Account-Verbindung).
 *   2. Im Dashboard — Fallback für den Direct-Session-Signup-Pfad (ohne Callback).
 *
 * Legt zwei Dinge an:
 *   - `domains`-Row (unverified) → die eigentliche Verbindung Website ↔ Account,
 *     nur innerhalb des Domain-Limits des Plans (vorher ohne Prüfung: ein
 *     Free-Account mit eigener Domain landete bei „2/1", Audit 16.11.2026).
 *   - Draft-Test → nur für brandneue Accounts (erster Test). Seit dem Try-Flow
 *     mit KI-Varianten (17.11.2026) trägt er Element, Original und die im Try
 *     gewählte Variante — vorher war er leer („first draft variant ready" war
 *     ein leerer Datensatz).
 *
 * Idempotent: domains hat unique(user_id, url), Dupes fängt der Constraint.
 * Rückgabe: `true`, wenn ein Draft-Test angelegt wurde (fürs New-Highlight).
 */

/** Ein Element aus dem Try-Flow, kompakt fürs Cookie. */
export interface DemoPickElement {
  /** CSS-Selektor */
  s: string
  /** Originaltext */
  o: string
  /** Tag (h1, a, button …) */
  t: string
  /** outerHTML, nur wenn kurz genug fürs Cookie */
  x?: string
  /** Varianten als [Text, Hebel] */
  v: [string, string][]
}

export interface DemoPick {
  u: string
  h?: DemoPickElement
  c?: DemoPickElement
}

export function encodeDemoPick(p: DemoPick): string {
  return Buffer.from(JSON.stringify(p), 'utf8').toString('base64url')
}

function isElement(x: unknown): x is DemoPickElement {
  const e = x as DemoPickElement
  return !!e && typeof e.s === 'string' && typeof e.o === 'string' && typeof e.t === 'string'
    && Array.isArray(e.v) && e.v.every((v) => Array.isArray(v) && typeof v[0] === 'string' && typeof v[1] === 'string')
    && e.s.length <= 600 && e.o.length <= 300 && (e.x === undefined || (typeof e.x === 'string' && e.x.length <= 700))
}

/** Cookie-Wert sicher lesen — der Inhalt kommt vom Client und ist nicht vertrauenswürdig. */
export function decodeDemoPick(raw: string | undefined | null): DemoPick | null {
  if (!raw) return null
  try {
    const p = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as DemoPick
    if (!p || typeof p.u !== 'string') return null
    return {
      u: p.u,
      ...(isElement(p.h) ? { h: p.h } : {}),
      ...(isElement(p.c) ? { c: p.c } : {}),
    }
  } catch {
    return null
  }
}

/** Auswahl aus dem Try-Flow: „h:1" = Headline, zweite Variante. */
export function parseDemoChoice(raw: string | undefined | null): { kind: 'h' | 'c'; index: number } | null {
  const m = /^([hc]):(\d)$/.exec(raw ?? '')
  return m ? { kind: m[1] as 'h' | 'c', index: Number(m[2]) } : null
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Entwurfs-Felder aus der Try-Auswahl. Headline bevorzugt; Ziel = Klick auf den Button. */
function draftFromPick(pick: DemoPick, choice: ReturnType<typeof parseDemoChoice>) {
  const kind: 'h' | 'c' = choice && pick[choice.kind] ? choice.kind : pick.h ? 'h' : 'c'
  const el = pick[kind]
  if (!el || !el.v.length) return null
  const [text, lever] = el.v[Math.min(choice?.kind === kind ? choice.index : 0, el.v.length - 1)]
  const isLink = el.t === 'a'
  const elementType = kind === 'h' ? 'headline' : el.t === 'button' ? 'button' : isLink ? 'link' : 'element'
  const changes = {
    mode: 'inherit',
    entries: [{
      id: `demo-${Date.now()}`,
      property: 'text',
      before: el.o,
      after: text,
      source: 'ai',
      status: 'applied',
      explanation: LEVER_LABELS[lever as LeverId] ?? lever,
      lever,
    }],
    baseline: null,
  }
  return {
    selector: el.s,
    original_html: el.x ?? `<${el.t}>${escapeHtml(el.o)}</${el.t}>`,
    element_type: elementType,
    // jsonb-Spalte: als Objekt schreiben wie /api/test-wizard/create (kein JSON-String)
    variant_b_changes: changes,
    goal: pick.c ? `click:${pick.c.s}` : 'click',
    name: kind === 'h' ? 'Headline test' : 'Button test',
  }
}

export async function claimDemoUrlForUser(
  userId: string,
  demoUrl: string,
  pickRaw?: string | null,
  choiceRaw?: string | null,
): Promise<boolean> {
  const normalized = demoUrl.startsWith('http') ? demoUrl : `https://${demoUrl}`

  let hostOnly: string
  try {
    hostOnly = new URL(normalized).hostname
  } catch {
    return false
  }

  // ─── Domain verbinden, nur innerhalb des Plan-Limits ───
  const { data: domains } = await supabase.from('domains').select('url').eq('user_id', userId)
  const known = (domains ?? []).some((d) => d.url === hostOnly)
  const plan = await getPlanForUser(userId)
  const domainOk = known || (domains ?? []).length < getDomainLimit(plan)
  if (!known && domainOk) {
    try {
      await supabase.from('domains').insert({ user_id: userId, url: hostOnly, verified: false })
    } catch { /* best-effort; Unique-Constraint fängt Dupes */ }
  }
  // Ohne verbundene Domain kann der Entwurf nie live gehen — dann keinen anlegen.
  if (!domainOk) return false

  // ─── Draft-Test nur für Accounts ohne bestehende Tests („erster Test"-Moment) ───
  const { count } = await supabase
    .from('tests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if ((count ?? 0) > 0) return false

  const pick = decodeDemoPick(pickRaw)
  const fromPick = pick && pick.u.split('/')[0].toLowerCase() === hostOnly.toLowerCase()
    ? draftFromPick(pick, parseDemoChoice(choiceRaw))
    : null

  const { error } = await supabase.from('tests').insert({
    user_id: userId,
    name: fromPick ? `${fromPick.name} on ${hostOnly}` : `Demo test on ${hostOnly}`,
    site_url: `https://${hostOnly}/`,
    goal: fromPick?.goal ?? 'click',
    status: 'draft',
    traffic_split: 50,
    ...(fromPick ? {
      selector: fromPick.selector,
      original_html: fromPick.original_html,
      element_type: fromPick.element_type,
      variant_b_changes: fromPick.variant_b_changes,
    } : {}),
  })
  return !error
}
