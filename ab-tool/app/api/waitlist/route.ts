import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  const form = await req.formData()
  const email = form.get('email')?.toString().trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    // Redirect back with error — no JS needed
    return new Response(null, {
      status: 302,
      headers: { Location: '/?waitlist=invalid#notify' },
    })
  }

  const { error } = await supabase.from('waitlist').insert({ email })

  if (error?.code === '23505') {
    // duplicate — already signed up, treat as success
  } else if (error) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/?waitlist=error#notify' },
    })
  }

  return new Response(null, {
    status: 302,
    headers: { Location: '/?waitlist=thanks#notify' },
  })
}
