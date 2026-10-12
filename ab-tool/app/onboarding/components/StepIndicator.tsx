import { Check } from 'lucide-react'
import type { Step } from '../types'

export function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8" role="list" aria-label="Onboarding progress">
      {([1, 2, 3] as const).map((s) => (
        <div key={s} className="flex items-center gap-2" role="listitem">
          <div
            aria-current={s === step ? 'step' : undefined}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
              s === step
                ? 'bg-white text-black'
                : s < step
                ? 'bg-ok/20 text-ok'
                : 'bg-bg-2 text-text-3'
            }`}
          >
            {s < step ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : s}
          </div>
          {s < 3 && <div className={`h-px w-8 sm:w-12 ${s < step ? 'bg-ok/40' : 'bg-border'}`} aria-hidden="true" />}
        </div>
      ))}
    </div>
  )
}
