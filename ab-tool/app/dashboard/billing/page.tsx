import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { BillingClient } from './BillingClient'

export type BillingData = {
  plan: string
  running: number
  totalTests: number
  totalVisitors: number
  totalConversions: number
  avgLift: number | null
}

export default async function BillingPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('user_id', user.id)
    .single()

  const { data: tests } = await supabase
    .from('tests')
    .select('status, visitors_a, visitors_b, conversions_a, conversions_b')
    .eq('user_id', user.id)

  const testList = tests ?? []
  const running = testList.filter((t) => t.status === 'active').length
  const totalTests = testList.length
  const totalVisitors = testList.reduce((s, t) => s + (t.visitors_a ?? 0) + (t.visitors_b ?? 0), 0)
  const totalConversions = testList.reduce((s, t) => s + (t.conversions_a ?? 0) + (t.conversions_b ?? 0), 0)
  const lifts = testList
    .map((t) => {
      const crA = (t.visitors_a ?? 0) > 0 ? (t.conversions_a ?? 0) / (t.visitors_a ?? 0) : 0
      const crB = (t.visitors_b ?? 0) > 0 ? (t.conversions_b ?? 0) / (t.visitors_b ?? 0) : 0
      return crA > 0 ? (crB - crA) / crA : null
    })
    .filter((l): l is number => l !== null && isFinite(l))
  const avgLift = lifts.length > 0 ? lifts.reduce((s, l) => s + l, 0) / lifts.length : null

  const data: BillingData = {
    plan: profile?.plan ?? 'free',
    running,
    totalTests,
    totalVisitors,
    totalConversions,
    avgLift,
  }

  return <BillingClient data={data} />
}
