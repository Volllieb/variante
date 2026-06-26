import Link from 'next/link'
import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Check, Sparkles, Paintbrush, Building2, Rocket } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Variante — A/B Testing from Figma, No Dev Needed',
  description:
    'Pick an element on your live site, describe the change in Figma, AI generates Variant B. One snippet tracks conversions.',
  openGraph: {
    title: 'Variante — A/B Testing from Figma',
    description: 'Pick → Generate → Ship. A/B testing without a developer.',
    url: 'https://www.getvariante.com',
    siteName: 'Variante',
  },
}

export const dynamic = 'force-static'

const steps = [
  {
    icon: Paintbrush,
    title: 'Pick',
    body: 'Choose any element on your live website. Hover, click, done. The picker captures the HTML, CSS, and page framework automatically.',
  },
  {
    icon: Sparkles,
    title: 'Generate',
    body: 'Switch to Figma, select the replacement design. AI analyzes both and writes Variant B — preserving your site\'s styling.',
  },
  {
    icon: Rocket,
    title: 'Ship',
    body: <>Copy one snippet into <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">&lt;head&gt;</code>. It serves the right variant and tracks conversions. No deploy pipeline, no dev.</>,
  },
]

const useCases = [
  {
    icon: Paintbrush,
    title: 'Designer',
    body: 'Building sites with AI (Bolt, v0, etc.) and need A/B testing without a dev.',
    outcome: '→ More conversions on your exports',
    accent: 'text-primary',
  },
  {
    icon: Building2,
    title: 'Agency',
    body: 'Running multiple client sites from AI exports — white-label for clients without extra cost.',
    outcome: '→ More client value on every project',
    accent: 'text-amber-700',
  },
  {
    icon: Rocket,
    title: 'Solo Founder',
    body: 'No developer in the team — run A/B tests in 10 minutes yourself.',
    outcome: '→ Ship with confidence',
    accent: 'text-rose-700',
  },
]

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: null,
    features: [
      '1 active experiment',
      'AI variant generation',
      { label: 'Badge ', badge: <Badge variant="amber">ON</Badge> },
    ],
    cta: { label: 'Install plugin', href: '#notify', variant: 'outline' as const },
    recommended: false,
  },
  {
    name: 'Pro',
    price: '$35',
    period: '/month',
    features: [
      'Unlimited experiments',
      'AI variant generation',
      { label: 'Badge ', badge: <Badge variant="gray">OFF</Badge> },
      'Full statistics & significance',
    ],
    cta: { label: 'Start free trial', href: '/signup', variant: 'default' as const },
    recommended: true,
  },
  {
    name: 'Agency',
    price: '$99',
    period: '/month',
    features: [
      'Everything in Pro',
      'White-label (resell as your own)',
      'Multi-site support',
      'Team seats',
    ],
    cta: { label: 'Contact', href: 'mailto:hello@getvariante.com', variant: 'outline' as const },
    recommended: false,
  },
]

const featuresList = (features: (string | { label: string; badge: React.ReactNode })[]) =>
  features.map((f, i) => (
    <li key={i} className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      {typeof f === 'string' ? (
        <span>{f}</span>
      ) : (
        <span>{f.label}{f.badge}</span>
      )}
    </li>
  ))

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ waitlist?: string }>
}) {
  const waitlistStatus = (await searchParams).waitlist

  return (
    <>
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-xl font-bold text-primary">
            variante
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Log in
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">Sign up – free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section id="main-content" className="relative overflow-hidden py-24 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-50 to-background" />
        <div aria-hidden="true" className="absolute left-1/2 top-0 -translate-x-1/2">
          <div className="h-[500px] w-[500px] rounded-full bg-violet-200/40 blur-3xl sm:h-[700px] sm:w-[700px]" />
        </div>

        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            A/B testing from <span className="text-primary">Figma</span> —{' '}
            <br className="hidden sm:inline" />
            no dev needed
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Pick an element on your live site, describe the change in Figma, AI
            generates Variant B. One snippet tracks conversions. That&apos;s it.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="group">
              <a href="#notify">
                Install Figma Plugin
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/signup">Create free account</Link>
            </Button>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            ✦{' '}
            <span className="font-medium text-foreground">300+</span> designers
            already testing
          </p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="scroll-mt-20 bg-muted/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-foreground">
            How it works
          </h2>
          <p className="mt-3 text-center text-muted-foreground">
            Three steps. No developer. No deploy.
          </p>

          <div className="mt-16 flex flex-col items-center gap-8 md:flex-row md:gap-0">
            {steps.map((s, i) => (
              <div key={s.title} className="flex w-full items-center md:flex-1">
                <Card className="w-full transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-200 group-hover:scale-110">
                      <s.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{s.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {s.body}
                    </p>
                    <div className="mt-6 flex aspect-video items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
                      🎥 Demo recording
                    </div>
                  </CardContent>
                </Card>
                {/* ponytail: hardcoded arrow — 3 items, never more */}
                {i < steps.length - 1 && (
                  <span className="mx-2 hidden text-2xl text-muted-foreground/40 md:block" aria-hidden="true">
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use Cases ── */}
      <section id="use-cases" className="scroll-mt-20 bg-violet-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-foreground">
            For whom is this?
          </h2>
          <p className="mt-3 text-center text-muted-foreground">
            Built for the workflow of modern designers and builders.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {useCases.map((uc) => (
              <Card key={uc.title} className="p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <uc.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{uc.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{uc.body}</p>
                <p className={`mt-3 text-sm font-medium ${uc.accent}`}>{uc.outcome}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="scroll-mt-20 bg-background py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-foreground">
            Pricing
          </h2>
          <p className="mt-3 text-center text-muted-foreground">
            Simple, transparent. Start free, upgrade when you need more.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-4 lg:gap-6">
            {tiers.map((tier) => (
              <Card
                key={tier.name}
                className={`relative flex flex-col p-8 transition-all duration-200 hover:-translate-y-1 ${tier.recommended ? 'border-primary shadow-md' : 'hover:shadow-md'}`}
              >
                {tier.recommended && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1">
                    Recommended
                  </Badge>
                )}
                <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {tier.price}
                  {tier.period && <span className="text-sm font-normal text-muted-foreground">{tier.period}</span>}
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-muted-foreground">
                  {featuresList(tier.features)}
                </ul>
                <Button asChild variant={tier.cta.variant} className="mt-8 w-full">
                  {tier.cta.href.startsWith('mailto:') ? (
                    <a href={tier.cta.href}>{tier.cta.label}</a>
                  ) : (
                    <Link href={tier.cta.href}>{tier.cta.label}</Link>
                  )}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Notify / Coming Soon ── */}
      <section id="notify" className="scroll-mt-20 bg-violet-50 py-20">
        <div className="mx-auto max-w-xl px-6 text-center">
          {waitlistStatus === 'thanks' ? (
            <>
              <Badge variant="green">You&apos;re on the list</Badge>
              <h2 className="mt-4 text-2xl font-bold text-foreground">Thanks for signing up!</h2>
              <p className="mt-3 text-muted-foreground">
                We&apos;ll email you the moment the Figma plugin is live.
              </p>
            </>
          ) : waitlistStatus === 'error' ? (
            <>
              <Badge variant="destructive">Something went wrong</Badge>
              <h2 className="mt-4 text-2xl font-bold text-foreground">Could not save your email</h2>
              <p className="mt-3 text-muted-foreground">
                Please try again or email us directly at{' '}
                <a href="mailto:hello@getvariante.com" className="text-primary underline">hello@getvariante.com</a>.
              </p>
            </>
          ) : (
            <>
              <Badge variant="amber">Coming soon</Badge>
              <h2 className="mt-4 text-2xl font-bold text-foreground">The Figma plugin is in review</h2>
              <p className="mt-3 text-muted-foreground">
                Leave your email and we&apos;ll notify you the moment it&apos;s live.
              </p>

              <form method="POST" action="/api/waitlist" className="mx-auto mt-8 flex max-w-md gap-3">
                <Input type="email" name="email" required placeholder="you@example.com" className="flex-1" />
                <Button type="submit">Notify me</Button>
              </form>
            </>
          )}

          {/* ponytail: static form — full-page POST to /api/waitlist, redirects back */}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t bg-muted/30 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 text-center text-sm text-muted-foreground sm:flex-row">
          <p>variante — A/B testing from Figma. Made in Bavaria.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/imprint" className="hover:text-foreground">Imprint</Link>
            <span>© 2026</span>
          </div>
        </div>
      </footer>

      {/* ── Floating CTA ── */}
      <Link
        href="#notify"
        className="fixed bottom-6 right-6 z-40 hidden h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 sm:flex"
        aria-label="Install Figma Plugin"
      >
        Install plugin
        <ArrowRight className="h-4 w-4" />
      </Link>
    </>
  )
}
