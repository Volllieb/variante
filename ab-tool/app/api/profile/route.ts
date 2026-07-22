import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'
import { stripe } from '@/lib/stripe'
import { deletePreviewShots } from '@/lib/screenshot'

export async function OPTIONS() {
  return preflight('GET, PATCH, DELETE, OPTIONS')
}

// GET /api/profile — Profil-Daten (inkl. notify_on_winner, last_plugin_sync_at)
export async function GET(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('GET, PATCH, OPTIONS')

  const { data, error } = await supabase
    .from('profiles')
    .select('plan, plan_status, notify_on_winner, last_plugin_sync_at, created_at')
    .eq('user_id', user.userId)
    .single()

  if (error || !data) {
    safeError('profile', error)
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('GET, PATCH, OPTIONS') })
  }

  return Response.json(data, { headers: corsHeaders('GET, PATCH, OPTIONS') })
}

// PATCH /api/profile — Profil-Einstellungen aktualisieren
export async function PATCH(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('PATCH, OPTIONS')

  let body: { notify_on_winner?: boolean }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('PATCH, OPTIONS') })
  }

  const patch: Record<string, unknown> = {}
  if (typeof body.notify_on_winner === 'boolean') patch.notify_on_winner = body.notify_on_winner

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: 'nothing to update' }, { status: 400, headers: corsHeaders('PATCH, OPTIONS') })
  }

  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('user_id', user.userId)

  if (error) {
    safeError('profile:patch', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('PATCH, OPTIONS') })
  }

  return Response.json({ ok: true }, { headers: corsHeaders('GET, PATCH, DELETE, OPTIONS') })
}

// DELETE /api/profile — Account vollständig löschen.
//
// ============================================================================
// Reihenfolge und Umfang korrigiert (Plan BILL-01).
// ============================================================================
// Vorher: daily_stats -> tests -> profiles -> auth.admin.deleteUser().
// Drei Probleme:
//
//  1. Die Stripe-Subscription wurde NICHT gekündigt. Der Kunde löschte seinen
//     Account und wurde weiter abgebucht — ohne Zugang zum Portal, um es zu
//     stoppen. Chargeback-Material.
//  2. Storage-Objekte blieben liegen: das Avatar-Bild im Bucket `avatars`
//     (public=true) und Preview-Screenshots. Ein Personenfoto, das nach
//     "Account löschen" unter einer ratelosen öffentlichen URL abrufbar bleibt,
//     ist ein Verstoß gegen Art. 17 DSGVO.
//  3. Nicht transaktional: schlug deleteUser() fehl, waren Tests und Profil
//     schon weg, der Auth-User blieb. Der Nutzer konnte sich einloggen,
//     getApiUser fand kein Profil, und die App antwortete dauerhaft 401.
//
// Jetzt: erst das Unwiderrufliche außerhalb der DB (Stripe, Storage), dann der
// Auth-User — dessen Löschung die restlichen Tabellen per ON DELETE CASCADE
// mitnimmt. Schlägt ein Schritt fehl, ist noch nichts in der DB zerstört.
export async function DELETE(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('DELETE, OPTIONS')

  // Temp-Sessions haben keinen Account, den man löschen könnte.
  if (user.plan === 'temp') {
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('DELETE, OPTIONS') })
  }

  const userId = user.userId

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_subscription_id, stripe_customer_id')
    .eq('user_id', userId)
    .single()

  // 1. Laufendes Abo kündigen. Ohne diesen Schritt zahlt der Kunde weiter.
  if (profile?.stripe_subscription_id && stripe) {
    try {
      await stripe.subscriptions.cancel(profile.stripe_subscription_id)
    } catch (err) {
      // Bereits gekündigt oder unbekannt: kein Grund, die Löschung zu blockieren.
      // Alles andere schon — sonst löschen wir einen zahlenden Account.
      const code = (err as { code?: string })?.code
      if (code !== 'resource_missing') {
        safeError('profile:delete:stripe', err)
        return Response.json(
          { error: 'Could not cancel your subscription. Please contact support — your account was NOT deleted.' },
          { status: 502, headers: corsHeaders('DELETE, OPTIONS') }
        )
      }
    }
  }

  // 2. Storage-Objekte. Die Buckets sind öffentlich lesbar — was hier
  //    liegenbleibt, bleibt für immer abrufbar.
  try {
    const { data: avatarFiles } = await supabase.storage.from('avatars').list(userId)
    if (avatarFiles?.length) {
      await supabase.storage.from('avatars').remove(avatarFiles.map((f) => `${userId}/${f.name}`))
    }
  } catch (err) {
    safeError('profile:delete:avatar-storage', err)
  }

  try {
    const { data: previewTests } = await supabase
      .from('tests')
      .select('preview_data')
      .eq('user_id', userId)
      .not('preview_data', 'is', null)
    const previewIds = (previewTests ?? [])
      .map((t) => (t.preview_data as { previewId?: string } | null)?.previewId)
      .filter((id): id is string => !!id)
    for (const previewId of previewIds) {
      await deletePreviewShots(previewId)
    }
  } catch (err) {
    safeError('profile:delete:preview-storage', err)
  }

  // 3. Auth-User löschen. Die FK-Kaskaden räumen tests, profiles, domains,
  //    events, agent_runs, site_insights und wizard_drafts mit ab.
  const { error: authError } = await supabase.auth.admin.deleteUser(userId)
  if (authError) {
    safeError('profile:delete:auth', authError)
    return Response.json(
      { error: 'Failed to delete account. Nothing was removed — please try again or contact support.' },
      { status: 500, headers: corsHeaders('DELETE, OPTIONS') }
    )
  }

  // 4. Nachlauf für Tabellen ohne Kaskade auf auth.users.
  const { data: leftoverTests } = await supabase.from('tests').select('id').eq('user_id', userId)
  const leftoverIds = (leftoverTests ?? []).map((t) => t.id)
  if (leftoverIds.length) {
    await supabase.from('daily_stats').delete().in('test_id', leftoverIds)
    await supabase.from('tests').delete().eq('user_id', userId)
  }
  await supabase.from('profiles').delete().eq('user_id', userId)

  return Response.json({ ok: true }, { headers: corsHeaders('DELETE, OPTIONS') })
}
