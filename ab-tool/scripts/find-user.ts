import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find unnoorain via auth.users (admin API)
  const { data, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error('❌', error)
    process.exit(1)
  }

  const user = data.users.find(u =>
    u.user_metadata?.full_name?.toLowerCase().includes('unnoorain') ||
    u.user_metadata?.name?.toLowerCase().includes('unnoorain') ||
    u.email?.toLowerCase().includes('unnoorain')
  )

  if (!user) {
    console.log('Users:', data.users.map(u => ({ email: u.email, name: u.user_metadata?.full_name })))
    console.log('❌ User not found')
    process.exit(1)
  }

  console.log('✅ Found:', user.email, user.user_metadata)
}

main()
