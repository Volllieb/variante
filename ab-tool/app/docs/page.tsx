import type { Metadata } from 'next'
import { PandaLogo } from '@/components/PandaLogo'

export const metadata: Metadata = {
  title: 'Documentation — How Variante Works',
  description:
    'Complete guide to A/B testing with Variante. Learn how to install the snippet, use the Figma plugin, pick elements, and run your first experiment.',
  openGraph: {
    title: 'Variante Documentation — A/B Testing from Figma',
    description: 'Complete guide: installation, Figma plugin, element picker, experiment setup, and pricing.',
    url: 'https://www.getvariante.com/docs',
    siteName: 'Variante',
    images: [{ url: 'https://www.getvariante.com/og', width: 1200, height: 630, alt: 'Variante Docs' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Variante Documentation — A/B Testing from Figma',
    description: 'Complete guide: installation, Figma plugin, element picker, experiment setup, and pricing.',
    images: ['https://www.getvariante.com/og'],
  },
  alternates: { canonical: 'https://www.getvariante.com/docs' },
}

/* ── Docs sections ── */

const sections = [
  {
    id: 'overview',
    title: 'What is Variante?',
    body: (
      <>
        <p>
          Variante lets designers run A/B tests without a developer. Pick any element on your live
          site, redesign it in Figma, and AI generates the variant code. Paste one snippet into your
          site — Variante handles traffic splitting, variant serving, and conversion tracking.
        </p>
        <p>
          No deploy pipeline. No Git. No waiting for engineering. The entire experiment lifecycle
          lives between your browser, Figma, and the Variante dashboard.
        </p>
      </>
    ),
  },
  {
    id: 'how-it-works',
    title: 'How it works',
    body: (
      <ol className="list-decimal space-y-3 pl-5">
        <li>
          <strong className="font-semibold text-white">Install the snippet.</strong> Paste a single{' '}
          <code className="rounded-[5px] bg-white/[0.08] px-1.5 py-0.5 font-mono text-[13px] text-[#ededed]/62">
            &lt;script&gt;
          </code>{' '}
          tag into your site&apos;s <code className="rounded-[5px] bg-white/[0.08] px-1.5 py-0.5 font-mono text-[13px] text-[#ededed]/62">&lt;head&gt;</code>.
          Works with any framework: Next.js, WordPress, Shopify, plain HTML.
        </li>
        <li>
          <strong className="font-semibold text-white">Pick an element.</strong> Use the built-in
          picker to select any component on your live site. It captures HTML, CSS, and
          framework context automatically — no extension needed.
        </li>
        <li>
          <strong className="font-semibold text-white">Redesign in Figma.</strong> Select your
          replacement design in the Figma plugin. AI reads both sides and writes Variant B —
          pixel-perfect, responsive, matching your existing styles.
        </li>
        <li>
          <strong className="font-semibold text-white">Ship &amp; track.</strong> The variant goes
          live instantly. Variante splits traffic 50/50, serves the right variant to each visitor,
          and tracks every conversion on your dashboard.
        </li>
      </ol>
    ),
  },
  {
    id: 'installation',
    title: 'Installation',
    body: (
      <>
        <p>Add this snippet to the <code className="rounded-[5px] bg-white/[0.08] px-1.5 py-0.5 font-mono text-[13px] text-[#ededed]/62">&lt;head&gt;</code> of every page you want to test:</p>
        <pre className="mt-3 overflow-x-auto rounded-[6px] bg-black px-4 py-4 text-[11px] leading-relaxed text-[#ededed]/62 ring-1 ring-white/10">
{`<!-- A/B Testing: universal snippet — paste in <head> on EVERY page -->
<link rel="preconnect" href="https://www.getvariante.com" crossorigin>
<style id="__ab_hide">html.__ab_pending{opacity:0!important}</style>
<script>document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)<\/script>
<script async src="https://www.getvariante.com/ab.js" integrity="sha384-UWQNoAlUdBZpCeh5Fdi6Wrqdp6Br23/hcRLvJS8N2mUFO03X2S0mdC3+LzwiBSZW" crossorigin="anonymous"><\/script>`}
        </pre>

        <h3 className="mt-6 text-sm font-semibold text-white">Next.js App Router</h3>
        <pre className="mt-2 overflow-x-auto rounded-[6px] bg-black px-4 py-4 text-[11px] leading-relaxed text-[#ededed]/62 ring-1 ring-white/10">
{`// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://www.getvariante.com" crossorigin />
        <style id="__ab_hide">{\`html.__ab_pending{opacity:0!important}\`}</style>
        <script dangerouslySetInnerHTML={{
          __html: \`document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)\`
        }} />
        <script async src="https://www.getvariante.com/ab.js" integrity="sha384-UWQNoAlUdBZpCeh5Fdi6Wrqdp6Br23/hcRLvJS8N2mUFO03X2S0mdC3+LzwiBSZW" crossorigin="anonymous"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}`}
        </pre>

        <h3 className="mt-6 text-sm font-semibold text-white">Next.js Pages Router</h3>
        <pre className="mt-2 overflow-x-auto rounded-[6px] bg-black px-4 py-4 text-[11px] leading-relaxed text-[#ededed]/62 ring-1 ring-white/10">
{`// pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        <link rel="preconnect" href="https://www.getvariante.com" crossorigin />
        <style id="__ab_hide">{\`html.__ab_pending{opacity:0!important}\`}</style>
        <script dangerouslySetInnerHTML={{
          __html: \`document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)\`
        }} />
        <script async src="https://www.getvariante.com/ab.js" integrity="sha384-UWQNoAlUdBZpCeh5Fdi6Wrqdp6Br23/hcRLvJS8N2mUFO03X2S0mdC3+LzwiBSZW" crossorigin="anonymous"></script>
      </Head>
      <body><Main /><NextScript /></body>
    </Html>
  )
}`}
        </pre>

        <h3 className="mt-6 text-sm font-semibold text-white">Plain HTML</h3>
        <pre className="mt-2 overflow-x-auto rounded-[6px] bg-black px-4 py-4 text-[11px] leading-relaxed text-[#ededed]/62 ring-1 ring-white/10">
{`<!DOCTYPE html>
<html>
<head>
  <link rel="preconnect" href="https://www.getvariante.com" crossorigin>
  <style id="__ab_hide">html.__ab_pending{opacity:0!important}</style>
  <script>document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)<\/script>
  <script async src="https://www.getvariante.com/ab.js" integrity="sha384-UWQNoAlUdBZpCeh5Fdi6Wrqdp6Br23/hcRLvJS8N2mUFO03X2S0mdC3+LzwiBSZW" crossorigin="anonymous"><\/script>
</head>
<body><!-- your content --></body>
</html>`}
        </pre>

        <h3 className="mt-6 text-sm font-semibold text-white">WordPress</h3>
        <p>
          Add the snippet via a header/footer plugin like <strong className="font-semibold text-white/70">WPCode</strong> or{' '}
          <strong className="font-semibold text-white/70">Insert Headers and Footers</strong>. Paste it into the{' '}
          <code className="rounded-[5px] bg-white/[0.08] px-1.5 py-0.5 font-mono text-[13px] text-[#ededed]/62">&lt;head&gt;</code> section.
        </p>

        <h3 className="mt-6 text-sm font-semibold text-white">Shopify</h3>
        <p>
          Go to <strong className="font-semibold text-white/70">Online Store → Themes → Edit code</strong>.
          Open <code className="rounded-[5px] bg-white/[0.08] px-1.5 py-0.5 font-mono text-[13px] text-[#ededed]/62">theme.liquid</code> and
          paste the snippet before the closing{' '}
          <code className="rounded-[5px] bg-white/[0.08] px-1.5 py-0.5 font-mono text-[13px] text-[#ededed]/62">&lt;/head&gt;</code> tag.
        </p>
      </>
    ),
  },
  {
    id: 'figma-plugin',
    title: 'Figma Plugin',
    body: (
      <>
        <p>
          The Figma plugin is where you create variants. Open it in Figma, paste your API token from the
          dashboard, and select the frame or component you want to use as Variant B.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Open the{' '}
            <a
              href="https://www.figma.com/community/plugin/1653734891132085565"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline transition-colors hover:opacity-80"
            >
              Variante plugin
            </a>
            {' '}in Figma (<strong className="font-semibold text-white/70">Plugins → Variante</strong>).
          </li>
          <li>Paste your API token (find it in your dashboard under &quot;Plugin token&quot;).</li>
          <li>Click &quot;+ New test&quot; in the dashboard to start a new experiment.</li>
          <li>Select your Variant B design in Figma — the plugin captures it and sends it to Variante.</li>
          <li>AI generates the variant code. It appears in your dashboard within seconds.</li>
        </ol>
        <div className="mt-4 rounded-[6px] border border-white/10 bg-white/[0.02] p-4">
          <p className="text-[13px] text-[#ededed]/50">
            <strong className="font-semibold text-white/70">Note:</strong> The plugin only handles
            creation. Results, analytics, and test management live in the web dashboard.
          </p>
        </div>
      </>
    ),
  },
  {
    id: 'element-picker',
    title: 'Element Picker',
    body: (
      <>
        <p>
          The element picker is built directly into the site snippet — no extra installation needed.
          When you start a test from the Figma plugin, it opens your live site with the picker
          activated. Hover over any element to highlight it, click to capture its HTML, CSS, and
          context.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Start a test in the Figma plugin — enter your site URL and test name.</li>
          <li>The plugin opens your live site. A banner at the top confirms picker mode is active.</li>
          <li>Hover over the element you want to test — it highlights with a blue outline.</li>
          <li>Click the element. The picker captures its HTML, CSS, framework info, and suggests
          conversion goals.</li>
          <li>Return to Figma — the captured element is ready for you to design Variant B.</li>
        </ol>
        <div className="mt-4 rounded-[6px] border border-white/10 bg-white/[0.02] p-4">
          <p className="text-[13px] text-[#ededed]/50">
            <strong className="font-semibold text-white/70">No extension needed:</strong> The picker
            runs directly from your snippet. Element data is only sent when you explicitly click an
            element. No data is collected in the background.
          </p>
        </div>
      </>
    ),
  },
  {
    id: 'experiments',
    title: 'Running Experiments',
    body: (
      <>
        <p>Once your variant is generated, you control the experiment from the dashboard:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="font-semibold text-white">Start:</strong> Begins 50/50 traffic split. Visitors are assigned randomly and stay in their variant group (stored in localStorage).</li>
          <li><strong className="font-semibold text-white">Pause:</strong> Temporarily stops the experiment. All visitors see Variant A.</li>
          <li><strong className="font-semibold text-white">Resume:</strong> Continues the experiment from where it left off.</li>
          <li><strong className="font-semibold text-white">Pick winner:</strong> Manually declare a winner. All visitors are switched to the winning variant.</li>
        </ul>
        <h3 className="mt-5 text-sm font-semibold text-white">Conversion Tracking</h3>
        <p>
          Variante tracks conversions via a simple JavaScript call. Add this wherever a conversion
          happens (button click, form submit, page view):
        </p>
        <pre className="mt-2 overflow-x-auto rounded-[6px] bg-black px-4 py-4 text-[11px] leading-relaxed text-[#ededed]/62 ring-1 ring-white/10">
{`// Track a conversion for the currently running test
window.__ab_track_conversion()`}
        </pre>
        <h3 className="mt-5 text-sm font-semibold text-white">Statistical Significance (Pro)</h3>
        <p>
          Pro plans include automatic significance analysis using a two-proportion z-test. When
          Variant B outperforms Variant A with 95% confidence, a winner is declared automatically.
          No manual number-crunching needed.
        </p>
      </>
    ),
  },
  {
    id: 'pricing',
    title: 'Pricing',
    body: (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[6px] border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#ededed]/25">Free</p>
          <p className="mt-1 text-2xl font-semibold text-white">0 €</p>
          <p className="mt-0.5 text-[11px] text-[#ededed]/40">Forever free. No credit card.</p>
          <ul className="mt-4 space-y-1.5 text-[13px] text-[#ededed]/55">
            <li>· 1 active experiment</li>
            <li>· AI variant generation</li>
            <li>· Conversion tracking</li>
            <li>· &quot;Powered by Variante&quot; badge</li>
          </ul>
        </div>
        <div className="rounded-[6px] border border-[#f5a623]/30 bg-white/[0.02] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#f5a623]">Pro</p>
          <p className="mt-1 text-2xl font-semibold text-white">35 €<span className="text-sm font-normal text-[#ededed]/25">/mo</span></p>
          <p className="mt-0.5 text-[11px] text-[#ededed]/40">Everything in Free, plus:</p>
          <ul className="mt-4 space-y-1.5 text-[13px] text-[#ededed]/55">
            <li>· Unlimited experiments</li>
            <li>· Statistical significance analysis</li>
            <li>· Auto-winner detection</li>
            <li>· No branding on site</li>
            <li>· Priority support</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'faq',
    title: 'FAQ',
    body: (
      <dl className="space-y-5">
        {[
          {
            q: 'Do I need a developer to set this up?',
            a: 'No. The snippet is a one-time paste into your site\'s <head>. If you can edit your theme or layout file, you can install Variante. No build step, no npm, no pipeline.',
          },
          {
            q: 'Does it work with my framework?',
            a: 'Variante works with any framework that lets you add a <script> tag to <head>: Next.js, WordPress, Shopify, plain HTML, Vue, Svelte, Astro, and more. Webflow only on paid plans. Framer, Wix, and Squarespace don\'t support custom <head> tags.',
          },
          {
            q: 'What data does the snippet collect?',
            a: 'ab.js stores a random visitor ID in localStorage (not a cookie). No personal data, no IP addresses, no fingerprinting. Conversion events carry no PII — just a test ID and variant group.',
          },
          {
            q: 'How does AI variant generation work?',
            a: 'You pick an element on your site (built-in picker, no extension) and select a replacement design in Figma. The AI reads the original HTML/CSS and your Figma design, then generates a pixel-perfect variant that matches your existing code style and framework conventions.',
          },
          {
            q: 'What happens when a winner is detected?',
            a: 'On Pro: Variante monitors statistical significance continuously. When B outperforms A at 95% confidence, a winner is declared and you\'re notified. On Free: you manually pick the winner from the dashboard.',
          },
          {
            q: 'Can I run multiple experiments at once?',
            a: 'Free: 1 active experiment. Pro: unlimited. Multiple experiments on the same page are isolated — each visitor gets a random variant per experiment.',
          },
          {
            q: 'Where is my data stored?',
            a: 'Supabase (Frankfurt, Germany). Vercel (us-east). No third-party analytics or CDNs. See our Privacy page for details.',
          },
        ].map(({ q, a }) => (
          <div key={q}>
            <dt className="text-sm font-semibold text-white">{q}</dt>
            <dd className="mt-1 text-[13px] leading-relaxed text-[#ededed]/50">{a}</dd>
          </div>
        ))}
      </dl>
    ),
  },
]

/* ── Page ── */

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-bg-0 text-white/80 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-bg-0/95">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
          <a
            href="/"
            className="flex items-center gap-2.5 text-[1.1rem] font-semibold tracking-tight text-white transition-opacity duration-200 hover:opacity-80"
          >
            <PandaLogo className="h-7 w-7 rounded-lg p-1" />
            variante
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/login"
              className="hidden text-sm text-white/55 transition-colors duration-200 hover:text-white sm:block"
            >
              Log in
            </a>
            <a
              href="/signup"
              className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90"
            >
              Sign up — free
            </a>
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Documentation
        </h1>
        <p className="mt-2 text-sm text-white/40">
          Everything you need to run A/B tests without a developer.
        </p>

        {/* Quick nav */}
        <nav className="mt-8 flex flex-wrap gap-2">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-medium text-[#ededed]/50 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
            >
              {s.title}
            </a>
          ))}
        </nav>

        {/* Sections */}
        <div className="mt-10 space-y-12">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-white">{s.title}</h2>
              <div className="mt-3 text-sm leading-relaxed text-[#ededed]/50 space-y-3">
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-5 sm:px-6 sm:py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-text-3">© 2026 Variante · Made in Bavaria</p>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="text-xs text-text-3 transition-colors duration-200 hover:text-text-2">
              Privacy
            </a>
            <a href="/imprint" className="text-xs text-text-3 transition-colors duration-200 hover:text-text-2">
              Imprint
            </a>
          </div>
        </div>
      </footer>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Variante Documentation',
            description: 'Complete guide to A/B testing with Variante — installation, Figma plugin, element picker, experiments, and pricing.',
            url: 'https://www.getvariante.com/docs',
            isPartOf: { '@type': 'WebSite', name: 'Variante', url: 'https://www.getvariante.com' },
          }),
        }}
      />
    </div>
  )
}
