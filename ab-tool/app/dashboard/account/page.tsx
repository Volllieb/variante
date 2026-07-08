import { getSessionUser } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import { AccountClient } from './AccountClient'

export default async function AccountPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return <AccountClient email={user.email ?? ''} />
}
