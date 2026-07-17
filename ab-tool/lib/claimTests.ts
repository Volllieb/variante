// Claim: Temp-Session-Tests einem echten User übergeben.
//
// Zwei Aufrufer, ein Pfad:
//   - /api/claim-tests        — Signup ohne Email-Confirm (Session sofort da)
//   - /app/auth/callback      — OAuth + Email-Confirm-Link
//
// Bewusst service-role (lib/supabase) statt des Request-scoped Clients:
// auf `tests` ist RLS aktiv, aber es existiert NUR eine SELECT-Policy
// (005_auth_billing.sql). Ein UPDATE über den anon-Key-Client trifft deshalb
// still 0 Zeilen — kein Fehler, kein Claim. Genau daran ist der Claim im
// auth/callback bisher unbemerkt vorbeigelaufen. Der Callback hat die Session
// vorher verifiziert, service-role ist hier also legitim.

import { supabase } from '@/lib/supabase'
import { safeError } from '@/lib/safeLog'
import type { PreviewChange } from '@/lib/previewAnalyze'

export interface ClaimResult {
  testIds: string[]
}

interface PreviewData {
  changes?: PreviewChange[]
  injectedCss?: string
}

/**
 * Überträgt alle Tests der Temp-Session auf `userId` und macht Preview-Tests
 * live-fähig. Best-effort: wirft nicht — ein fehlgeschlagener Claim darf weder
 * den Auth-Flow noch das Onboarding blockieren.
 */
export async function claimTempSessionTests(userId: string, tempToken: string): Promise<ClaimResult> {
  try {
    const { data: session } = await supabase
      .from('temp_sessions')
      .select('id')
      .eq('token', tempToken)
      .maybeSingle()

    if (!session) return { testIds: [] }

    const { data: claimed, error } = await supabase
      .from('tests')
      .update({ user_id: userId, temp_session_id: null })
      .eq('temp_session_id', session.id)
      .select('id, status, preview_data')

    if (error) {
      safeError('claimTests-update', error)
      return { testIds: [] }
    }

    // Plan §3.3 / §3.6 Phase 2: preview → draft. Erst der Snippet-Install
    // schaltet danach auf 'active'.
    for (const test of claimed ?? []) {
      if (test.status === 'preview') await promotePreviewTest(test.id, test.preview_data as PreviewData | null)
    }

    await supabase.from('temp_sessions').delete().eq('id', session.id)

    return { testIds: (claimed ?? []).map((t) => t.id) }
  } catch (err) {
    safeError('claimTests', err)
    return { testIds: [] }
  }
}

/**
 * Macht aus einem Preview-Test einen echten Draft: die AI-Changes werden zu
 * variant_b_css + selector, damit das Snippet sie nach dem Verify ausliefern
 * kann (Plan §3.6). preview_data bleibt als Referenz erhalten.
 *
 * `selector` ist der Selektor des ersten Changes. Er ist für /api/resolve das
 * Signal "dieser Test ist ausspielbar" — die eigentliche Variante steckt
 * vollständig in variant_b_css, das alle Changes enthält.
 */
async function promotePreviewTest(testId: string, previewData: PreviewData | null): Promise<void> {
  const changes = previewData?.changes ?? []
  const injectedCss = previewData?.injectedCss

  const update: Record<string, unknown> = { status: 'draft' }
  if (changes.length > 0 && injectedCss) {
    update.selector = changes[0].selector
    update.variant_b_css = injectedCss
  }

  const { error } = await supabase.from('tests').update(update).eq('id', testId)
  if (error) safeError('claimTests-promote', error)
}

/** Markiert das Profil als Plugin-Nutzer. Best-effort. */
export async function markFigmaPluginUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ has_figma_plugin: true, last_plugin_sync_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) safeError('claimTests-plugin-flag', error)
}
