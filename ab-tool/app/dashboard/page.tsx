import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { ensureProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage(props: { searchParams: Promise<Record<string, string>> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const searchParams = await props.searchParams

  // Parallel: Profile + Tests + Domains gleichzeitig starten (kein Waterfall)
  const [profileRes, testsRes, domainsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('api_token, plan, has_figma_plugin')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('tests')
      .select('id, name, site_url, status, health_status, health_issues, selector, original_html, goal, variant_b_html, variant_b_css, visitors_a, visitors_b, conversions_a, conversions_b, winner, created_at, preview_variant_screenshot_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('domains')
      .select('url, verified, verified_at')
      .eq('user_id', user.id)
      .limit(5),
  ])

  const profile = profileRes.data
  const tests = testsRes.data ?? []
  const domains = domainsRes.data ?? []
  const hasVerifiedDomain = domains.some((d) => d.verified)
  const primaryDomain = domains.find((d) => d.verified)?.url ?? domains[0]?.url ?? null
  const verifiedAt = domains.find((d) => d.verified)?.verified_at ?? null
  const allVerifiedDomains = domains.filter((d) => d.verified).map((d) => ({ url: d.url, verifiedAt: d.verified_at }))

  // ── Demo → Draft: Convert landing page demo URL to a draft test ──
  let demoCreated = false
  try {
    const cookieStore = await cookies()
    const demoUrlCookie = cookieStore.get('variante_demo_url')
    if (demoUrlCookie?.value) {
      const demoUrl = decodeURIComponent(demoUrlCookie.value)
      // Only create draft if user has no tests yet (first visit after signup)
      if (tests.length === 0 && demoUrl.includes('.')) {
        const normalizedUrl = demoUrl.startsWith('http') ? demoUrl : `https://${demoUrl}`
        const { error: draftErr } = await supabase
          .from('tests')
          .insert({
            user_id: user.id,
            name: `Demo test on ${demoUrl}`,
            site_url: normalizedUrl,
            goal: 'click',
            status: 'draft',
            traffic_split: 50,
          })
        if (!draftErr) {
          demoCreated = true
          // Save domain so the dashboard shows "Snippet not found" instead of
          // the empty "Connect your site" banner (Plan §5, Post-Signup UX).
          try {
            const hostOnly = new URL(normalizedUrl).hostname
            await supabase.from('domains').insert({
              user_id: user.id,
              url: hostOnly,
              verified: false,
            })
          } catch { /* domain insert is best-effort — unique constraint handles dupes */ }
          // Re-fetch tests to include the new draft
          const { data: freshTests } = await supabase
            .from('tests')
            .select('id, name, site_url, status, health_status, health_issues, selector, original_html, goal, variant_b_html, variant_b_css, visitors_a, visitors_b, conversions_a, conversions_b, winner, created_at, preview_variant_screenshot_url')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
          if (freshTests) tests.push(...freshTests.filter((t) => !tests.find((e) => e.id === t.id)))
        }
      }
    }
  } catch { /* Cookie-Read ist Best-Effort */ }

  // Fallback: Fehlt der profiles-Eintrag (Trigger-Race bei OAuth)
  if (!profile) {
    await ensureProfile(user.id)
    return <DashboardClient plan="free" tests={[]} hasVerifiedDomain={false} primaryDomain={null} verifiedAt={null} allVerifiedDomains={[]} domainCount={0} highlightNew={searchParams.new === '1'} upgraded={false} openNewTest={false} userId={user.id} />
  }

  return (
    <DashboardClient
      plan={profile.plan ?? 'free'}
      tests={tests}
      hasVerifiedDomain={hasVerifiedDomain}
      primaryDomain={primaryDomain}
      verifiedAt={verifiedAt}
      allVerifiedDomains={allVerifiedDomains}
      domainCount={domains.length}
      highlightNew={demoCreated || searchParams.new === '1'}
      upgraded={searchParams.upgraded === '1'}
      openNewTest={searchParams.newTest === '1'}
      userId={user.id}
    />
  )
}
