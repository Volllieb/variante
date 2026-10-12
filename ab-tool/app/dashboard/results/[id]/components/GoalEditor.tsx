'use client'

import { parseGoal, describeGoal, type GoalType } from '@/lib/resultsHelpers'
import { Target, Check, Pencil, MousePointerClick, Globe } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import type { ExperimentData } from '@/lib/getExperimentStats'

/** Conversion-Goal anzeigen und bearbeiten. */
export function GoalEditor({
  editingGoal,
  goalType,
  goalValue,
  setGoalType,
  setGoalValue,
  setEditingGoal,
  setGoalSaved,
  data,
  goalSaving,
  goalSaved,
  saveGoal,
}: {
  editingGoal: boolean
  goalType: GoalType
  goalValue: string
  setGoalType: Dispatch<SetStateAction<GoalType>>
  setGoalValue: Dispatch<SetStateAction<string>>
  setEditingGoal: Dispatch<SetStateAction<boolean>>
  setGoalSaved: Dispatch<SetStateAction<boolean>>
  data: ExperimentData
  goalSaving: boolean
  goalSaved: boolean
  saveGoal: () => Promise<void>
}) {
  return (
    <>
      {/* Conversion Goal */} 
      <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
        {!editingGoal ? (
          <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {goalType === 'element' ? (
                <MousePointerClick className="h-3.5 w-3.5 text-text-3" />
              ) : goalType === 'click' ? (
                <MousePointerClick className="h-3.5 w-3.5 text-pro" />
              ) : (
                <Globe className="h-3.5 w-3.5 text-ok" />
              )}
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
                Conversion Goal
              </span>
            </div>
            <button
              onClick={() => {
                const p = parseGoal(data.goal)
                setGoalType(p.type)
                setGoalValue(p.value)
                setEditingGoal(true)
              }}
              className="flex cursor-pointer items-center gap-1.5 text-xs text-text-3 transition-colors hover:text-text"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>
          <p className="mt-2 text-[13px] text-text-2">
            {(() => {
              // Dieselbe Zuordnung wie auf der Testkarte (lib/resultsHelpers).
              const g = describeGoal(goalType, goalValue, data.selector)
              return g.code ? (
                <>{g.label} <code className="text-[11px] font-mono text-text-3 bg-bg-2 px-1.5 py-0.5 rounded">{g.code}</code></>
              ) : (
                g.label
              )
            })()}
          </p>
          </>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-3.5 w-3.5 text-text-3" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
                Conversion Goal
              </span>
            </div>

            <div className="flex gap-1 mb-3">
              {([
                { type: 'element' as const, label: 'Replaced element', icon: MousePointerClick, desc: 'Click on the original element is the conversion' },
                { type: 'click' as const, label: 'Click selector', icon: MousePointerClick, desc: 'Pick a CSS selector users click' },
                // "URL goal" war hier waehlbar, ohne dass ab.js es je
                // implementiert hat: der Wert lief als CSS-Selektor in
                // closest(), der SyntaxError verschwand still, und der Test
                // zaehlte auf beiden Armen dauerhaft null Conversions
                // (Katalog RUN-03). Bestandstests mit url:-Goal zeigen unten
                // eine Warnung, statt die Option weiter anzubieten.
              ]).map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => { setGoalType(opt.type); setGoalSaved(false) }}
                  className={`flex-1 cursor-pointer rounded-[var(--radius-md)] border px-3 py-2 text-left transition-colors ${
                    goalType === opt.type
                      ? 'border-white/20 bg-white/[0.06]'
                      : 'border-border bg-transparent hover:border-white/[0.14]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <opt.icon className={`h-3 w-3 ${goalType === opt.type ? 'text-white' : 'text-text-3'}`} />
                    <span className={`text-[11px] font-semibold ${goalType === opt.type ? 'text-white' : 'text-text-3'}`}>
                      {opt.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-text-3 hidden sm:block">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* Value input for click / url */}
            {goalType === 'click' && (
              <div className="mb-3">
                <label className="text-[10px] font-semibold text-text-3 uppercase tracking-wider">CSS Selector</label>
                <input
                  type="text"
                  placeholder=".cta-button, #signup-link, a.btn-primary"
                  value={goalValue}
                  onChange={e => { setGoalValue(e.target.value); setGoalSaved(false) }}
                  className="mt-1 w-full rounded-[var(--radius-md)] border border-border bg-bg-2 px-3 py-2 text-sm text-text font-mono placeholder:text-text/25 focus:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:ring-1 focus:ring-border-strong"
                />
              </div>
            )}

            {/* Bestandstest mit url:-Goal — die Option wird nicht mehr
                angeboten, der gespeicherte Wert muss aber erklärt werden. */}
            {goalType === 'url' && (
              <div className="mb-3 rounded-[var(--radius-md)] border border-err/30 bg-err/[0.06] px-3 py-2.5">
                <p className="text-[12px] text-text-2">
                  This test uses a URL goal (<code className="text-[11px] font-mono bg-bg-2 px-1 py-0.5 rounded">{goalValue}</code>), which the snippet never supported —
                  <strong className="text-text"> no conversions have been tracked for it</strong>. Pick a click goal above to start measuring.
                </p>
              </div>
            )}

            {goalType === 'element' && data.selector && (
              <p className="mb-3 text-[12px] text-text-3">
                The element <code className="text-[11px] font-mono bg-bg-2 px-1 py-0.5 rounded">{data.selector}</code> is the conversion goal. Users who click it convert.
              </p>
            )}
            {goalType === 'element' && !data.selector && (
              <p className="mb-3 text-[12px] text-pro">
                No element selector stored. Set a click or URL goal instead.
              </p>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={saveGoal}
                // url: ist kein speicherbarer Zustand mehr — der Nutzer muss
                // erst einen unterstützten Zieltyp wählen (Katalog RUN-03).
                disabled={goalSaving || goalType === 'url' || (goalType !== 'element' && !goalValue.trim())}
                className="cursor-pointer rounded-[var(--radius-md)] bg-white px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-40"
              >
                {goalSaving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setEditingGoal(false)}
                className="cursor-pointer rounded-[var(--radius-md)] border border-border px-3 py-2 text-xs text-text-3 transition-colors hover:text-text"
              >
                Cancel
              </button>
              {goalSaved && (
                <span className="flex items-center gap-1 text-xs text-ok">
                  <Check className="h-3.5 w-3.5" /> Saved
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
