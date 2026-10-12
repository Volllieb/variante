/**
 * Schalter im Monochrom-Stil. role="switch" + aria-checked, damit Screenreader
 * den Zustand ansagen (Plan A11Y-01), sichtbarer focus-visible-Ring statt
 * outline-none ohne Ersatz (Plan A11Y-03).
 */
export function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (next: boolean) => void; label: string; id: string }) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-[38px] shrink-0 cursor-pointer rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 ${
        checked ? 'border-transparent bg-fill-invert' : 'border-border bg-bg-2'
      }`}
    >
      <span
        className={`absolute top-1/2 h-[16px] w-[16px] -translate-y-1/2 rounded-full transition-[left,background-color] ${
          checked ? 'left-[19px] bg-text-on-invert' : 'left-[2px] bg-text-3'
        }`}
      />
    </button>
  )
}
