'use client'

/**
 * StepReview — Step 3: Review & Create.
 *
 * Zeigt alle Test-Details auf einer Summary-Karte.
 * Name wird manuell vom User eingegeben (kein KI-Auto-Name).
 */

import { Globe, MousePointerClick, Sparkles, Edit3, Crosshair, Info, FileText } from 'lucide-react'
import type { ElementSelection, VariantResult, GoalSelection } from '../NewTestDrawer'
import { MIN_VISITORS_PER_ARM, MIN_CONVERSIONS_PER_ARM, MIN_RUNTIME_DAYS } from '@/lib/significance'

interface StepReviewProps {
  url: string
  element: ElementSelection
  variantResult: VariantResult | null
  goal: GoalSelection | null
  testName: string
  onTestNameChange: (name: string) => void
  hasDomain: boolean
}

export function StepReview({
  url, element, variantResult, goal, testName, onTestNameChange, hasDomain,
}: StepReviewProps) {
  // Domain und Pfad getrennt anzeigen. "Site" stand hier fuer die volle URL,
  // waehrend dasselbe Wort im Dashboard die verbundene Domain meint — zwei
  // verschiedene Dinge unter einem Label. Der Test haengt an beidem: die Domain
  // entscheidet, ob /api/resolve ihn ueberhaupt ausliefert (site_host), der Pfad
  // entscheidet, auf welcher Unterseite ab.js ihn anwendet (pathMatches).
  const bare = url.replace(/^https?:\/\//i, '')
  const slashAt = bare.indexOf('/')
  const displayDomain = slashAt === -1 ? bare : bare.slice(0, slashAt)
  // Der Pfad wird als Geltungsbereich gezeigt, nicht roh. Der Wizard erzeugt
  // immer eine konkrete Seite; eine URL ganz ohne Pfad kann nur aus einem
  // Bestandstest stammen und wird als Startseite gelesen.
  const trimmedPath = (slashAt === -1 ? '' : bare.slice(slashAt)).replace(/\/+$/, '')
  const displayPath = trimmedPath === '' ? 'Homepage' : `${trimmedPath} and below`

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] leading-relaxed text-text-2">
          Review your test setup. Give it a name and choose when to start.
        </p>
      </div>

      {/* Summary Card */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] bg-bg-2">
            <Sparkles className="h-3.5 w-3.5 text-text" />
          </div>
          <p className="text-[14px] font-semibold text-text">Test Summary</p>
        </div>

        {/* Details */}
        <div className="space-y-2.5">
          <DetailRow icon={Globe} label="Domain" value={displayDomain} />
          <DetailRow icon={FileText} label="Page" value={displayPath} />
          <DetailRow icon={Crosshair} label="Element" value={element.elementName} />
          <DetailRow
            icon={MousePointerClick}
            label="Goal"
            value={goal?.label ?? 'Not set'}
          />
        </div>

        {/* Variant preview — rendered side-by-side instead of described as text,
            so the user sees exactly what visitors will see for A and B. */}
        {variantResult && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-text-2">
              <Sparkles className="h-3 w-3" />
              Preview
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <ElementPreview label="Original (A)" html={element.originalHtml} />
              <ElementPreview
                label="Variant (B)"
                html={variantResult.variant_html || variantResult.variant}
                css={variantResult.variant_css}
              />
            </div>
            {variantResult.explanation && (
              <p className="mt-1.5 text-[10px] text-text-3 italic">{variantResult.explanation}</p>
            )}
          </div>
        )}

        {/* Test name (manual, no AI) */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-text-2">
            Test Name
          </label>
          <div className="relative">
            <input
              type="text"
              value={testName}
              onChange={(e) => onTestNameChange(e.target.value)}
              placeholder="e.g. Hero-CTA: Ghost to Solid Button"
              className="w-full rounded-[7px] border border-border bg-bg-0 py-2.5 pl-3 pr-8 text-[13px] text-text placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:border-border-strong focus:ring-2 focus:ring-text/10"
            />
            <Edit3 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
          </div>
          <p className="mt-1 text-[10px] text-text-3">
            Give your test a descriptive name
          </p>
        </div>

        {/* CSS preview (collapsed) */}
        {variantResult?.variant_css && (
          <div>
            <p className="mb-1 text-[11px] font-medium text-text-2">CSS Changes</p>
            <code className="block max-h-24 overflow-y-auto rounded-[var(--radius-md)] bg-bg-0 p-2.5 text-[10px] text-text-3 font-mono leading-relaxed whitespace-pre-wrap">
              {variantResult.variant_css}
            </code>
          </div>
        )}
      </div>

      {/* Sample-size expectation — same thresholds the winner-check cron uses
          (lib/significance.ts), shown up front so nobody judges the test on
          day 2 and calls a false result. */}
      <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-border bg-bg-1 p-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-3" />
        <p className="text-[11px] leading-relaxed text-text-2">
          For a trustworthy result, this test needs at least{' '}
          <strong className="text-text">{MIN_VISITORS_PER_ARM.toLocaleString()} visitors</strong> and{' '}
          <strong className="text-text">{MIN_CONVERSIONS_PER_ARM} conversions</strong> per variant,
          running for at least <strong className="text-text">{MIN_RUNTIME_DAYS} days</strong> — whichever
          takes longer. Ending it earlier risks a false result.
        </p>
      </div>

      {/* What happens next */}
      <div className="rounded-[var(--radius-md)] border border-border bg-bg-1 p-3 space-y-2">
        {hasDomain ? (
          <>
            <p className="text-[11px] text-text-2">
              <strong className="text-text">Go Live:</strong> Test starts immediately. Visitors will be split 50/50 between original and variant.
            </p>
            <p className="text-[11px] text-text-2">
              <strong className="text-text">Save Draft:</strong> Test is created but not active yet. Publish it anytime from the dashboard.
            </p>
          </>
        ) : (
          <>
            <div className="rounded-[var(--radius-md)] border border-pro/20 bg-pro/[0.04] px-3 py-2">
              <p className="text-[11px] font-medium text-pro">
                Draft mode — install the snippet to go live
              </p>
              <p className="mt-0.5 text-[10px] text-pro/70">
                Your test will be saved as a draft. Install the snippet on your site, then publish it from the dashboard.
              </p>
            </div>
            <p className="text-[11px] text-text-2">
              <strong className="text-text">Go Live:</strong> Requires the snippet to be installed on your site. Use <strong className="text-text">Save Draft</strong> for now.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Globe; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-3" />
      <div className="min-w-0">
        <p className="text-[10px] text-text-3 uppercase tracking-wider">{label}</p>
        <p className="text-[12px] text-text truncate">{value}</p>
      </div>
    </div>
  )
}

/**
 * Rendert Original/Variante isoliert in einem sandboxed iframe statt die
 * Variant-CSS ins Dashboard zu injecten — die CSS-Regeln zielen auf Selektoren
 * der Zielseite (z. B. `.btn-cta`) und könnten sonst mit Dashboard-Styles
 * kollidieren.
 */
function ElementPreview({ label, html, css }: { label: string; html: string; css?: string }) {
  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    :root { color-scheme: dark; }
    html, body { margin: 0; padding: 14px; min-height: 72px; display: flex; align-items: center; justify-content: center; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    *, *::before, *::after { box-sizing: border-box; }
    ${css ?? ''}
  </style></head><body>${html || ''}</body></html>`

  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-text-3">{label}</p>
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-bg-0">
        <iframe
          srcDoc={srcDoc}
          sandbox=""
          title={`${label} preview`}
          className="h-20 w-full"
        />
      </div>
    </div>
  )
}
