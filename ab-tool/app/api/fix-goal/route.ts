// One-Shot: Goal-Fix für vallisride.com. WIRD NACH AUFRUF GELÖSCHT.
// Aufruf: GET /api/fix-goal

import { supabase } from '@/lib/supabase'

const SNIPPET_KEY = '5fefdc64-288a-4b52-bd5e-26e8d3fecc32'

export async function GET() {
  const { data: test } = await supabase
    .from('tests')
    .select('id, name, goal')
    .eq('snippet_key', SNIPPET_KEY)
    .single()

  if (!test) {
    return Response.json({ error: 'test not found' }, { status: 404 })
  }

  if (test.goal === null || test.goal === '') {
    return Response.json({ ok: true, already: true, goal: test.goal, name: test.name })
  }

  const { error } = await supabase
    .from('tests')
    .update({ goal: null })
    .eq('snippet_key', SNIPPET_KEY)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, fixed: true, old_goal: test.goal, name: test.name })
}
