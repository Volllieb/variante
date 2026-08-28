/**
 * Einheitliche Zahlenformatierung fürs Dashboard.
 *
 * Vorher formatierte jede Oberfläche inline und anders: die Hero-Card zeigte
 * `3%`, die Rohdaten-Tabelle zwei Blöcke darunter `3.0%` — für denselben Wert.
 * Die Test-Card zeigte `12k`, die Results-Seite `12,431` für denselben Test.
 * In `ResultsClient` bekam die erste Zahl einer Zeile Tausendertrenner, die
 * zweite in derselben Zeile nicht.
 *
 * Die Locale ist bewusst auf 'en-US' festgenagelt statt `undefined`. Ein
 * `toLocaleString()` ohne Locale nimmt die Runtime-Default-Locale — auf dem
 * Server die der Vercel-Function, im Browser die des Nutzers. Bei einem
 * deutschen Browser liefert der Server `1,234` und der Client `1.234`, was
 * React als Hydration-Mismatch meldet. Die UI ist durchgängig englisch, also
 * ist en-US auch inhaltlich die richtige Wahl.
 */

const LOCALE = 'en-US'

/** Endlicher, darstellbarer Wert? Sonst gibt es nichts sinnvoll zu formatieren. */
function isFinite_(n: number): boolean {
  return typeof n === 'number' && Number.isFinite(n)
}

/** Ganzzahl mit Tausendertrennern: 1234 → "1,234". */
export function formatCount(n: number): string {
  if (!isFinite_(n)) return n === Infinity ? '∞' : '–'
  return n.toLocaleString(LOCALE, { maximumFractionDigits: 0 })
}

/**
 * Prozentwert mit fixer Nachkommastelle: 3 → "3.0%".
 *
 * Fix statt `maximumFractionDigits`, weil sonst genau der Effekt zurückkommt,
 * den diese Funktion beseitigen soll: 3.0 fiele auf "3%" zurück, 3.4 bliebe
 * "3.4%" — und in einer Spalte untereinander springt das Komma.
 */
export function formatPercent(n: number, digits = 1): string {
  if (!isFinite_(n)) return '–'
  return `${n.toFixed(digits)}%`
}

/**
 * Vorzeichenbehaftete Differenz: "+2.4%", "-1.2%", "0.0%".
 *
 * Die bisherige Inline-Variante `${x > 0 ? '+' : ''}${x.toFixed(1)}%` erzeugte
 * bei kleinen negativen Werten ein vorzeichenbehaftetes Null: -0.04 wurde zu
 * "-0.0%". Hier wird nach dem Runden entschieden, nicht davor.
 */
export function formatDelta(n: number, digits = 1): string {
  if (!isFinite_(n)) return '–'
  const rounded = Number(n.toFixed(digits))
  const sign = rounded > 0 ? '+' : ''
  // Number('-0') ist -0; `|| 0` normalisiert das auf +0, sonst bliebe "-0.0%".
  return `${sign}${(rounded || 0).toFixed(digits)}%`
}

/**
 * Kompakte Darstellung für enge Flächen (Chart-Achsen, Donut-Mitte):
 * 1500 → "1.5k", 1500000 → "1.5M".
 *
 * Abgeschnitten statt gerundet. Die alte Variante in TestCard nutzte
 * `(visitors / 1000).toFixed(0)` und machte aus 1500 Besuchern "2k" — eine
 * Zahl, die der Nutzer so nie erreicht hat. Ein Zähler darf nie mehr
 * behaupten, als tatsächlich gemessen wurde.
 */
export function formatCompact(n: number): string {
  if (!isFinite_(n)) return n === Infinity ? '∞' : '–'

  const abs = Math.abs(n)
  if (abs < 1000) return formatCount(n)

  const sign = n < 0 ? '-' : ''
  const [divisor, suffix] = abs >= 1_000_000 ? [1_000_000, 'M'] : [1000, 'k']
  const scaled = Math.floor((abs / divisor) * 10) / 10

  // "1.0k" liest sich als falsche Präzision — bei glatten Werten entfällt die Null.
  const body = Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(1)
  return `${sign}${body}${suffix}`
}
