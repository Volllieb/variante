/**
 * Onboarding-Illustrationen — Inline-SVGs für den Connect-Website-Flow.
 * Monochrom, sachlich, technisch. ~1-2KB pro SVG.
 */

export function ConnectPlug({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 120"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Browser-Fenster */}
      <rect x="12" y="8" width="110" height="80" rx="6" stroke="#ededed" strokeWidth="1.5" strokeOpacity="0.25" />
      {/* Browser-Toolbar */}
      <rect x="12" y="8" width="110" height="18" rx="6" fill="white" fillOpacity="0.04" />
      <circle cx="22" cy="17" r="2.5" fill="#ededed" fillOpacity="0.2" />
      <circle cx="30" cy="17" r="2.5" fill="#ededed" fillOpacity="0.2" />
      <circle cx="38" cy="17" r="2.5" fill="#ededed" fillOpacity="0.2" />
      {/* Address bar */}
      <rect x="48" y="13" width="64" height="8" rx="3" fill="white" fillOpacity="0.06" />
      {/* Content lines */}
      <rect x="22" y="34" width="90" height="4" rx="2" fill="#ededed" fillOpacity="0.1" />
      <rect x="22" y="44" width="70" height="4" rx="2" fill="#ededed" fillOpacity="0.08" />
      <rect x="22" y="54" width="80" height="4" rx="2" fill="#ededed" fillOpacity="0.08" />
      <rect x="22" y="64" width="50" height="4" rx="2" fill="#ededed" fillOpacity="0.06" />

      {/* Gestrichelte Verbindungslinie */}
      <line x1="122" y1="48" x2="178" y2="48" stroke="#ededed" strokeWidth="1.2" strokeOpacity="0.2" strokeDasharray="4 3" />

      {/* Stecker (rechts am Kabelende) */}
      <rect x="170" y="38" width="16" height="20" rx="3" stroke="#ededed" strokeWidth="1.2" strokeOpacity="0.3" />
      <rect x="174" y="42" width="8" height="4" rx="1.5" fill="#ededed" fillOpacity="0.15" />
      <rect x="174" y="50" width="8" height="4" rx="1.5" fill="#ededed" fillOpacity="0.15" />

      {/* variante-Logo (rechts) */}
      <rect x="198" y="34" width="50" height="28" rx="8" stroke="#ededed" strokeWidth="1.5" strokeOpacity="0.4" />
      <text x="223" y="53" textAnchor="middle" fontSize="13" fontWeight="700" fill="#ededed" fillOpacity="0.5" fontFamily="system-ui, sans-serif">V</text>
    </svg>
  )
}

export function ConnectChecking({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 120"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Browser-Fenster */}
      <rect x="12" y="8" width="110" height="80" rx="6" stroke="#ededed" strokeWidth="1.5" strokeOpacity="0.25" />
      <rect x="12" y="8" width="110" height="18" rx="6" fill="white" fillOpacity="0.04" />
      <circle cx="22" cy="17" r="2.5" fill="#ededed" fillOpacity="0.2" />
      <circle cx="30" cy="17" r="2.5" fill="#ededed" fillOpacity="0.2" />
      <circle cx="38" cy="17" r="2.5" fill="#ededed" fillOpacity="0.2" />
      <rect x="48" y="13" width="64" height="8" rx="3" fill="white" fillOpacity="0.06" />
      <rect x="22" y="34" width="90" height="4" rx="2" fill="#ededed" fillOpacity="0.1" />
      <rect x="22" y="44" width="70" height="4" rx="2" fill="#ededed" fillOpacity="0.08" />
      <rect x="22" y="54" width="80" height="4" rx="2" fill="#ededed" fillOpacity="0.08" />
      <rect x="22" y="64" width="50" height="4" rx="2" fill="#ededed" fillOpacity="0.06" />

      {/* Gestrichelte Linie mit Puls (CSS-Animation via stroke-dashoffset) */}
      <line
        x1="122" y1="48" x2="178" y2="48"
        stroke="#ededed" strokeWidth="1.2" strokeOpacity="0.35"
        strokeDasharray="4 3"
      >
        <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="0.8s" repeatCount="indefinite" />
      </line>

      {/* Stecker */}
      <rect x="170" y="38" width="16" height="20" rx="3" stroke="#ededed" strokeWidth="1.2" strokeOpacity="0.35" />
      <rect x="174" y="42" width="8" height="4" rx="1.5" fill="#ededed" fillOpacity="0.2" />
      <rect x="174" y="50" width="8" height="4" rx="1.5" fill="#ededed" fillOpacity="0.2" />

      {/* variante-Logo */}
      <rect x="198" y="34" width="50" height="28" rx="8" stroke="#ededed" strokeWidth="1.5" strokeOpacity="0.4" />
      <text x="223" y="53" textAnchor="middle" fontSize="13" fontWeight="700" fill="#ededed" fillOpacity="0.5" fontFamily="system-ui, sans-serif">V</text>
    </svg>
  )
}

export function ConnectNotFound({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 120"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Browser-Fenster */}
      <rect x="12" y="8" width="110" height="80" rx="6" stroke="#ededed" strokeWidth="1.5" strokeOpacity="0.2" />
      <rect x="12" y="8" width="110" height="18" rx="6" fill="white" fillOpacity="0.03" />
      <circle cx="22" cy="17" r="2.5" fill="#ededed" fillOpacity="0.15" />
      <circle cx="30" cy="17" r="2.5" fill="#ededed" fillOpacity="0.15" />
      <circle cx="38" cy="17" r="2.5" fill="#ededed" fillOpacity="0.15" />
      <rect x="48" y="13" width="64" height="8" rx="3" fill="white" fillOpacity="0.04" />

      {/* "?" im Viewport */}
      <text x="67" y="62" textAnchor="middle" fontSize="28" fontWeight="300" fill="#ededed" fillOpacity="0.12" fontFamily="system-ui, sans-serif">?</text>

      {/* Gestrichelte Linie */}
      <line x1="122" y1="48" x2="170" y2="48" stroke="#ededed" strokeWidth="1.2" strokeOpacity="0.15" strokeDasharray="4 3" />

      {/* Stecker hängt lose (nach unten geneigt) */}
      <rect x="164" y="46" width="16" height="20" rx="3" stroke="#ededed" strokeWidth="1.2" strokeOpacity="0.2" transform="rotate(20 172 56)" />
      <rect x="168" y="50" width="8" height="4" rx="1.5" fill="#ededed" fillOpacity="0.1" transform="rotate(20 172 56)" />
      <rect x="168" y="58" width="8" height="4" rx="1.5" fill="#ededed" fillOpacity="0.1" transform="rotate(20 172 56)" />

      {/* variante-Logo (gedimmt) */}
      <rect x="198" y="34" width="50" height="28" rx="8" stroke="#ededed" strokeWidth="1.5" strokeOpacity="0.3" />
      <text x="223" y="53" textAnchor="middle" fontSize="13" fontWeight="700" fill="#ededed" fillOpacity="0.4" fontFamily="system-ui, sans-serif">V</text>
    </svg>
  )
}

export function ConnectVerified({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 120"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Browser-Fenster */}
      <rect x="12" y="8" width="110" height="80" rx="6" stroke="#2fd76c" strokeWidth="1.5" strokeOpacity="0.3" />
      <rect x="12" y="8" width="110" height="18" rx="6" fill="#2fd76c" fillOpacity="0.04" />
      <circle cx="22" cy="17" r="2.5" fill="#ededed" fillOpacity="0.2" />
      <circle cx="30" cy="17" r="2.5" fill="#ededed" fillOpacity="0.2" />
      <circle cx="38" cy="17" r="2.5" fill="#ededed" fillOpacity="0.2" />
      <rect x="48" y="13" width="64" height="8" rx="3" fill="white" fillOpacity="0.06" />
      <rect x="22" y="34" width="90" height="4" rx="2" fill="#ededed" fillOpacity="0.1" />
      <rect x="22" y="44" width="70" height="4" rx="2" fill="#ededed" fillOpacity="0.08" />
      <rect x="22" y="54" width="80" height="4" rx="2" fill="#ededed" fillOpacity="0.08" />
      <rect x="22" y="64" width="50" height="4" rx="2" fill="#ededed" fillOpacity="0.06" />

      {/* Durchgezogene grüne Linie */}
      <line x1="122" y1="48" x2="178" y2="48" stroke="#2fd76c" strokeWidth="1.5" strokeOpacity="0.5" />

      {/* Stecker mit grünem Check */}
      <rect x="170" y="38" width="16" height="20" rx="3" stroke="#2fd76c" strokeWidth="1.2" strokeOpacity="0.4" />
      <rect x="174" y="42" width="8" height="4" rx="1.5" fill="#2fd76c" fillOpacity="0.2" />
      <rect x="174" y="50" width="8" height="4" rx="1.5" fill="#2fd76c" fillOpacity="0.2" />

      {/* Grüner Check-Kreis am Stecker */}
      <circle cx="186" cy="36" r="6" fill="#2fd76c" fillOpacity="0.15" stroke="#2fd76c" strokeWidth="1" strokeOpacity="0.5" />
      <path d="M183 36l2 2 3.5-3.5" stroke="#2fd76c" strokeWidth="1.2" strokeOpacity="0.8" strokeLinecap="round" strokeLinejoin="round" />

      {/* variante-Logo */}
      <rect x="198" y="34" width="50" height="28" rx="8" stroke="#ededed" strokeWidth="1.5" strokeOpacity="0.4" />
      <text x="223" y="53" textAnchor="middle" fontSize="13" fontWeight="700" fill="#ededed" fillOpacity="0.5" fontFamily="system-ui, sans-serif">V</text>
    </svg>
  )
}
