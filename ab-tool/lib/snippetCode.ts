// Shared snippet code — used by DomainGate, SetupClient, and copy-prompt flows.

// BEWUSST OHNE `integrity` (SRI). Das Snippet wird einmal in den <head> der
// Kundenseite kopiert und bleibt dort. Ein fester Hash wuerde ab.js auf JEDER
// bereits installierten Seite blockieren, sobald wir ab.js ausliefern — still,
// nur mit einer Console-Meldung: kein Tracking, keine Variante, kein Picker.
// Genau das ist zweimal passiert (zuletzt auf vallisride.com: Snippet-Hash aus
// einer alten Version -> "Failed to find a valid digest in the 'integrity'
// attribute ... The resource has been blocked").
// ab.js kommt von unserer eigenen Origin ueber HTTPS/HSTS; SRI schuetzt hier
// nur gegen ein kompromittiertes Vercel-Deployment — und dieser Restnutzen
// wiegt einen selbstausloesenden Totalausfall aller Kundenseiten nicht auf.
// Updates von ab.js muessen ohne Zutun des Kunden ankommen.
//
// SICHERHEITS-TIMEOUT: 3000 ms (Katalog RUN-05, vorher 10 000 ms).
// Der Inline-Poller deckt den Normalfall ab: sobald ab.js geladen ist und
// aufgeloest hat, setzt es __ab_pending_resolve und die Seite wird sichtbar.
// Der Timeout greift nur, wenn ab.js NIE laedt — Adblocker, CSP, Netzfehler,
// Ausfall. Bei 10 s blieb die Kundenseite in genau diesen Faellen zehn Sekunden
// lang komplett unsichtbar; das ist ein Totalschaden an einer fremden Website
// zum Schutz vor einem kurzen Aufblitzen. 3 s deckt einen normalen
// resolve-Roundtrip auch auf langsamem Mobilfunk ab und begrenzt den
// Schadensfall auf ein ertraegliches Mass.
// ACHTUNG: greift nur bei NEUEN Installationen — das Snippet steht fest im
// <head> der Kundenseite. Bestandsinstallationen behalten ihre 10 s, bis der
// Kunde das Snippet neu kopiert.

export const SNIPPET_CODE = `<!-- A/B Testing: universal snippet — paste in <head> on EVERY page -->
<link rel="preconnect" href="https://www.getvariante.com" crossorigin>
<style id="__ab_hide">html.__ab_pending{opacity:0!important}</style>
<script>document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},3000)<\/script>
<script async src="https://www.getvariante.com/ab.js"><\/script>`

/**
 * Generate a personalized snippet for a specific domain.
 * The snippet itself is identical (resolution is host-based), but the
 * comment personalizes it so the user sees their own domain.
 */
export function personalizedSnippet(domain: string): string {
  return `<!-- variante A/B Testing for ${domain} — paste in <head> on EVERY page -->
<link rel="preconnect" href="https://www.getvariante.com" crossorigin>
<style id="__ab_hide">html.__ab_pending{opacity:0!important}</style>
<script>document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},3000)<\/script>
<script async src="https://www.getvariante.com/ab.js"><\/script>`
}
