
/**
 * Textspalte des Vorschau-Fallbacks. Bewusst keine gemeinsame Komponente mit
 * StepReview: dort gilt die kompakte Wizard-Typo, hier die der Results-Seite.
 */
export function TextPane({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[#ededed]/40">{label}</p>
      <div className="flex min-h-[120px] items-center rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <p className="text-sm leading-relaxed text-[#ededed] break-words">{value || '—'}</p>
      </div>
    </div>
  )
}
