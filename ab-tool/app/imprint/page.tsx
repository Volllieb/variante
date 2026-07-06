import type { Metadata } from 'next'
import Link from 'next/link'
import { PandaLogo } from '@/components/PandaLogo'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Imprint — Variante',
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
              <PandaLogo className="h-5 w-5 rounded-md p-0.5" />
              variante
            </Link>
          </div>
        </nav>

        <main className="mx-auto max-w-2xl px-6 pb-20 pt-2">
          <div className="rounded-[10px] border border-border bg-bg-1 p-8 sm:p-12">
            <h1 className="text-3xl font-semibold text-text">
              Imprint
            </h1>
            <p className="mt-1.5 text-sm text-text-3">
              Information pursuant to § 5 DDG (formerly TMG)
            </p>

            <div className="mt-10 space-y-8 text-sm leading-relaxed">

              <LegalSection title="Contact">
                <p>
                  Valentin Wilhelm<br />
                  Judenbühlweg 23<br />
                  97082 Würzburg<br />
                  Germany
                </p>
                <p className="mt-3">
                  Email:{' '}
                  <a href="mailto:hello@getvariante.com" className="cursor-pointer text-text underline underline-offset-4 transition-colors hover:text-text/70">
                    hello@getvariante.com
                  </a>
                </p>
              </LegalSection>

              <LegalSection title="Responsible for Content (§ 18 (2) MStV)">
                <p>
                  Valentin Wilhelm<br />
                  Judenbühlweg 23<br />
                  97082 Würzburg
                </p>
              </LegalSection>

              <LegalSection title="VAT">
                <p>Small business according to § 19 UStG. VAT is not charged.</p>
              </LegalSection>

              <LegalSection title="Liability for content">
                <p>
                  As a service provider, we are responsible for our own content on this website
                  under § 7 (1) TMG. However, we are not obligated to monitor transmitted or
                  stored third-party information or to investigate circumstances that indicate
                  illegal activity (§§ 8–10 TMG). This does not affect our obligation to remove
                  or block content under general law. Liability in this regard is only incurred
                  from the time we become aware of a specific legal violation. We will remove
                  such content immediately upon becoming aware of it.
                </p>
              </LegalSection>

              <LegalSection title="Liability for links">
                <p>
                  This website may contain links to external third-party websites. We have no
                  control over the content of linked sites and assume no liability for them. The
                  respective provider or operator is responsible for their content. Linked pages
                  were checked for legal violations at the time of linking. No illegal content
                  was identified. Permanent monitoring of linked pages is not reasonable without
                  specific evidence of a violation. We will remove such links immediately upon
                  becoming aware of legal violations.
                </p>
              </LegalSection>

              <LegalSection title="Copyright">
                <p>
                  Content published on this website is subject to German copyright law.
                  Reproduction, editing, distribution, or any form of commercialization requires
                  the written consent of the author. Downloads and copies are permitted for
                  private, non-commercial use only.
                </p>
              </LegalSection>

              <LegalSection title="EU Dispute Resolution">
                <p>
                  The European Commission provides a platform for online dispute resolution:{' '}
                  <a
                    href="https://ec.europa.eu/consumers/odr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer text-text underline underline-offset-4 transition-colors hover:text-text/70"
                  >
                    ec.europa.eu/consumers/odr
                  </a>
                  . We are not obliged to participate in dispute resolution proceedings before a
                  consumer arbitration board.
                </p>
              </LegalSection>
            </div>
          </div>
        </main>
      </div>
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
