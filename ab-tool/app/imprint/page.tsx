import type { Metadata } from 'next'
import Link from 'next/link'
import { PandaLogo } from '@/components/PandaLogo'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Impressum — Variante',
}

export default function ImprintPage() {
  return (
    <div className="min-h-screen bg-bg-0 text-text antialiased">
      <div className="relative z-10">
        <nav className="px-6 py-5">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <Link
              href="/"
              className="flex cursor-pointer items-center gap-1.5 text-sm text-text-3 transition-colors duration-200 hover:text-text"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <span className="text-text-3/30">·</span>
            <Link
              href="/"
              className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-text-2 transition-colors duration-200 hover:text-text"
            >
              <PandaLogo size="sm" />
              variante
            </Link>
          </div>
        </nav>

        <main className="mx-auto max-w-2xl px-6 pb-20 pt-2">
          <div className="rounded-[10px] border border-border bg-bg-1 p-8 sm:p-12">
            <h1 className="text-3xl font-semibold text-text">
              Impressum
            </h1>
            <p className="mt-1.5 text-sm text-text-3">
              Angaben gemäß § 5 DDG
            </p>

            <div className="mt-10 space-y-8 text-sm leading-relaxed">

              <LegalSection title="Anbieter">
                <p>
                  Valentin Wilhelm<br />
                  Judenbühlweg 23<br />
                  97082 Würzburg<br />
                  Deutschland
                </p>
                <p className="mt-3">
                  E-Mail:{' '}
                  <a href="mailto:hello@getvariante.com" className="cursor-pointer text-text underline underline-offset-4 transition-colors hover:text-text/70">
                    hello@getvariante.com
                  </a>
                </p>
                <p className="mt-1 text-xs text-text-3">
                  Kein Telefonsupport. Alle Anfragen ausschließlich per E-Mail.
                </p>
              </LegalSection>

              <LegalSection title="Inhaltlich Verantwortlicher (§ 18 Abs. 2 MStV)">
                <p>
                  Valentin Wilhelm<br />
                  Judenbühlweg 23<br />
                  97082 Würzburg
                </p>
              </LegalSection>

              <LegalSection title="Umsatzsteuer">
                <p>Kleinunternehmer gemäß § 19 UStG. Umsatzsteuer wird nicht ausgewiesen.</p>
              </LegalSection>

              <LegalSection title="Datenschutzaufsicht">
                <p>
                  Zuständige Aufsichtsbehörde für den nicht-öffentlichen Bereich:<br />
                  <strong>Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)</strong><br />
                  Promenade 27, 91522 Ansbach<br />
                  <a
                    href="https://www.lda.bayern.de"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer text-text underline underline-offset-4 transition-colors hover:text-text/70"
                  >
                    lda.bayern.de
                  </a>
                </p>
                <p className="mt-3">
                  Einen Datenschutzbeauftragten haben wir nicht bestellt — gesetzlich nicht erforderlich
                  (§ 38 BDSG: unter 20 Personen mit Zugriff auf personenbezogene Daten).
                </p>
                <p className="mt-3">
                  Unsere{' '}
                  <Link href="/privacy" className="cursor-pointer text-text underline underline-offset-4 transition-colors hover:text-text/70">
                    Datenschutzerklärung
                  </Link>{' '}
                  enthält vollständige Angaben zu Datenkategorien, Verarbeitungszwecken,
                  Betroffenenrechten und Auftragsverarbeitern.
                </p>
              </LegalSection>

              <LegalSection title="Haftung für Inhalte (§ 7 Abs. 1 DDG)">
                <p>
                  Als Diensteanbieter sind wir für eigene Inhalte auf dieser Website nach § 7 Abs. 1 DDG
                  verantwortlich. Nach §§ 8–10 DDG sind wir jedoch nicht verpflichtet, übermittelte oder
                  gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf
                  eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung von
                  Informationen nach allgemeinen Gesetzen bleiben hiervon unberührt. Eine Haftung ist
                  erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei
                  Bekanntwerden werden wir diese Inhalte umgehend entfernen.
                </p>
              </LegalSection>

              <LegalSection title="Haftung für Links (§ 8–10 DDG)">
                <p>
                  Unser Angebot kann Links zu externen Websites Dritter enthalten, auf deren Inhalte wir
                  keinen Einfluss haben. Für diese fremden Inhalte ist der jeweilige Anbieter oder
                  Betreiber verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung
                  auf mögliche Rechtsverstöße geprüft. Rechtswidrige Inhalte waren nicht erkennbar.
                  Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist ohne konkrete
                  Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von
                  Rechtsverletzungen werden wir derartige Links umgehend entfernen.
                </p>
              </LegalSection>

              <LegalSection title="Urheberrecht">
                <p>
                  Die durch den Seitenbetreiber erstellten Inhalte und Werke auf dieser Website
                  unterliegen dem deutschen Urheberrecht. Vervielfältigung, Bearbeitung, Verbreitung
                  und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der
                  schriftlichen Zustimmung des Autors. Downloads und Kopien dieser Seite sind nur
                  für den privaten, nicht kommerziellen Gebrauch gestattet.
                </p>
                <p className="mt-3">
                  KI-generierte Inhalte (z. B. Design-Varianten aus dem Figma-Plugin): Variante
                  nutzt OpenAI zur Generierung von HTML/CSS-Code auf Basis der vom Nutzer
                  bereitgestellten Vorlagen. Der generierte Code ist Eigentum des jeweiligen Nutzers.
                  Variante erhebt keine Urheberrechtsansprüche an nutzergenerierten Inhalten.
                </p>
              </LegalSection>

              <LegalSection title="EU-Streitschlichtung">
                <p>
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit:{' '}
                  <a
                    href="https://ec.europa.eu/consumers/odr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer text-text underline underline-offset-4 transition-colors hover:text-text/70"
                  >
                    ec.europa.eu/consumers/odr
                  </a>
                  . Wir sind zur Teilnahme an einem Streitbeilegungsverfahren vor einer
                  Verbraucherschlichtungsstelle weder verpflichtet noch bereit.
                </p>
              </LegalSection>
            </div>
          </div>
        </main>
      </div>

      {/* JSON-LD BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Variante', item: 'https://www.getvariante.com' },
              { '@type': 'ListItem', position: 2, name: 'Impressum', item: 'https://www.getvariante.com/imprint' },
            ],
          }),
        }}
      />
    </div>
  )
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-8 first:border-t-0 first:pt-0">
      <h2 className="mb-4 text-base font-semibold text-text">
        {title}
      </h2>
      <div className="text-text-2 text-sm leading-relaxed">{children}</div>
    </section>
  )
}
