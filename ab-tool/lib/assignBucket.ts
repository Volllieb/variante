// Sticky Assignment: deterministisches Bucketing statt Münzwurf pro Request.
//
// Ausgangslage: ab_assign() entschied mit `random() * 100 < traffic_split` —
// ein unabhängiger Münzwurf bei JEDEM /api/assign-Call. Zusammen mit dem
// cookieless Default-Modus von ab.js (window.varianteConsent nicht gesetzt →
// Zuweisung lebt nur im In-Memory-Store EINES Seitenaufrufs) hieß das: jeder
// Reload würfelt neu. Derselbe Mensch sah auf Seite 1 A und auf Seite 2 B, und
// visitors_a/b zählte Page-Views statt Besucher. Der Test maß Rauschen.
//
// Lösung ohne Client-Storage (die DSGVO-Entscheidung aus lib/assignToken.ts
// bleibt unangetastet): Die Variante wird aus einem Hash des Requests
// abgeleitet. Nichts wird auf dem Endgerät abgelegt (§25 TTDSG bleibt außen
// vor), und serverseitig entsteht kein Klartext-Personenbezug:
//
//   - Basis ist getClientIp(), das die IP bereits mit IP_HASH_SALT gesalzen
//     sha256-hasht — hier wird nie eine Klartext-IP verarbeitet oder abgelegt.
//   - Der User-Agent geht mit in den Hash ein, damit Besucher hinter einer
//     geteilten NAT-/Firmen-IP nicht in denselben Arm laufen. Er wird
//     ausschließlich gehasht, nie gespeichert.
//   - Der snippetKey geht mit in den Hash ein, damit derselbe Besucher nicht
//     in JEDEM Test in derselben Variante landet (keine Cross-Test-Korrelation)
//     und der visitorId-Hash pro Test verschieden ist.
//
// Die Funktion ist rein: gleicher Request → gleicher Bucket, ohne State.

import { createHash } from 'crypto'
import { getClientIp } from './rateLimit'

export type VisitorIdentity = {
  /** 0–99. Bucket < traffic_split → Variante B. Stabil pro (Test, Besucher). */
  bucket: number
  /** Gesalzener Hash, Dedup-Schlüssel für die Unique-Visitor-Zählung. */
  visitorId: string
}

/**
 * Leitet Bucket + Dedup-Id für einen Besucher und einen Test ab.
 *
 * Gibt `null` zurück, wenn keine Client-IP ermittelbar ist. Ein konstanter
 * Ersatzwert wäre hier schlimmer als kein Wert: ALLE header-losen Requests
 * bekämen denselben Bucket und liefen systematisch in einen Arm. Bei `null`
 * fällt der Aufrufer auf das alte Zufallsverhalten zurück.
 */
export function visitorIdentity(snippetKey: string, req: Request): VisitorIdentity | null {
  const ipHash = getClientIp(req) // bereits gesalzen gehasht, nie Klartext
  if (ipHash === 'unknown') return null

  const ua = req.headers.get('user-agent') || ''
  const digest = createHash('sha256')
    .update(`${snippetKey}|${ipHash}|${ua}`)
    .digest()

  return {
    // Modulo-Bias bei 2^32 % 100 liegt bei ~2e-8 — für einen Traffic-Split
    // irrelevant.
    bucket: digest.readUInt32BE(0) % 100,
    visitorId: digest.toString('hex').slice(0, 24),
  }
}

/** TTL des Dedup-Fensters: ein Besucher zählt einmal pro Tag und Test. */
export const VISITOR_DEDUP_TTL_SECONDS = 86_400
