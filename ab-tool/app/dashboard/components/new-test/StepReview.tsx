'use client'

/**
 * StepReview — Step 3: Review & Create.
 *
 * Zeigt alle Test-Details auf einer Summary-Karte.
 * Name wird manuell vom User eingegeben (kein KI-Auto-Name).
 */

import { Globe, MousePointerClick, Sparkles, Edit3, Crosshair } from 'lucide-react'
import type { ElementSelection, VariantResult, GoalSelection } from '../NewTestDrawer'

interface StepReviewProps {
  url: string
  element: ElementSelection
  variantResult: VariantResult | null
  goal: GoalSelection | null
  testName: string
  onTestNameChange: (name: string) => void
}

export function StepReview({
  url, element, variantResult, goal, testName, onTestNameChange,
}: StepReviewProps) {
  const displayUrl = /^https?:\/\//i.test(url) ? url.replace(/^https?:\/\//, '') : url

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] leading-relaxed text-text-2">
          Review your test setup. Give it a name and choose when to start.
        </p>
      </div>

      {/* Summary Card */}
      <div className="rounded-[10px] border border-border bg-bg-1 p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-bg-2">
            <Sparkles className="h-3.5 w-3.5 text-text" />
          </div>
          <p className="text-[14px] font-semibold text-text">Test Summary</p>
        </div>

        {/* Details */}
        <div className="space-y-2.5">
          <DetailRow icon={Globe} label="Site" value={displayUrl} />
          <DetailRow icon={Crosshair} label="Element" value={element.elementName} />
          <DetailRow
            icon={MousePointerClick}
            label="Goal"
            value={goal?.label ?? 'Not set'}
          />
          {variantResult && (
            <DetailRow
              icon={Sparkles}
              label="Variant"
              value={variantResult.explanation || variantResult.variant}
            />
          )}
        </div>

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
            <code className="block max-h-24 overflow-y-auto rounded-[6px] bg-bg-0 p-2.5 text-[10px] text-text-3 font-mono leading-relaxed whitespace-pre-wrap">
              {variantResult.variant_css}
            </code>
          </div>
        )}
      </div>

      {/* What happens next */}
      <div className="rounded-[8px] border border-border bg-bg-1 p-3">
        <p className="text-[11px] text-text-2">
          <strong className="text-text">Go Live:</strong> Test starts immediately. Visitors will be split 50/50 between original and variant.
        </p>
        <p className="mt-1 text-[11px] text-text-2">
          <strong className="text-text">Save Draft:</strong> Test is created but not active yet. Publish it anytime from the dashboard.
        </p>
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
