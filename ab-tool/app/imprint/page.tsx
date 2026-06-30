import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Imprint — Variante',
}

export default function ImprintPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900">Imprint</h1>
      <p className="mt-2 text-sm text-gray-500">
        Information pursuant to § 5 DDG (formerly TMG)
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
          <p className="mt-2">
            Valentin Wilhelm
            <br />
            Judenbühlweg 23
            <br />
            97082 Würzburg
            <br />
            Germany
          </p>
          <p className="mt-2">
            Email:{' '}
            <a
              href="mailto:hello@getvariante.com"
              className="text-violet-600 underline"
            >
              hello@getvariante.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Responsible for Content (§ 18 (2) MStV)
          </h2>
          <p className="mt-2">
            Valentin Wilhelm
            <br />
            Judenbühlweg 23
            <br />
            97082 Würzburg
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            VAT
          </h2>
          <p className="mt-2">
            Small business according to § 19 UStG. VAT is not charged.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Liability for content
          </h2>
          <p className="mt-2">
            As a service provider, we are responsible for our own content on
            this website under § 7 (1) TMG. However, we are not obligated to
            monitor transmitted or stored third-party information or to
            investigate circumstances that indicate illegal activity (§§ 8–10
            TMG). This does not affect our obligation to remove or block
            content under general law. Liability in this regard is only
            incurred from the time we become aware of a specific legal
            violation. We will remove such content immediately upon becoming
            aware of it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Liability for links
          </h2>
          <p className="mt-2">
            This website may contain links to external third-party websites. We
            have no control over the content of linked sites and assume no
            liability for them. The respective provider or operator is
            responsible for their content. Linked pages were checked for legal
            violations at the time of linking. No illegal content was
            identified. Permanent monitoring of linked pages is not reasonable
            without specific evidence of a violation. We will remove such links
            immediately upon becoming aware of legal violations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">Copyright</h2>
          <p className="mt-2">
            Content published on this website is subject to German copyright
            law. Reproduction, editing, distribution, or any form of
            commercialization requires the written consent of the author.
            Downloads and copies are permitted for private, non-commercial use
            only.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            EU Dispute Resolution
          </h2>
          <p className="mt-2">
            The European Commission provides a platform for online dispute
            resolution:{' '}
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 underline"
            >
              ec.europa.eu/consumers/odr
            </a>
            . We are not obliged to participate in dispute resolution
            proceedings before a consumer arbitration board.
          </p>
        </section>
      </div>
    </main>
  )
}
