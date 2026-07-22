// Fix: goal="click" → null auf vallisride.com-Test.
// Run: node -e "require('dotenv').config({path:'ab-tool/.env.local'}); require('./ab-tool/__tests__/fix-goal.mjs')"
// Oder direkter: node ab-tool/__tests__/fix-goal.mjs (mit Umgebungsvariablen)

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SNIPPET_KEY = '5fefdc64-288a-4b52-bd5e-26e8d3fecc32'

// .env.local parsen (einfach, ohne dotenv-Dependency)
const envPath = resolve(process.cwd(), '.env.local')
const envRaw = readFileSync(envPath, 'utf8')
const env = {}
for (const line of envRaw.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).replace(/^["']|["']$/g, '')
}

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key)

console.log(`Fix: goal="click" → null für snippet_key=${SNIPPET_KEY}\n`)

// 1. Aktuellen Stand lesen
const { data: test } = await supabase
  .from('tests')
  .select('id, name, selector, goal, site_url')
  .eq('snippet_key', SNIPPET_KEY)
  .single()

if (!test) {
  console.error('❌ Test nicht gefunden')
  process.exit(1)
}

console.log(`Test:   ${test.name}`)
console.log(`URL:    ${test.site_url}`)
console.log(`Selector: ${test.selector}`)
console.log(`Goal (alt): "${test.goal}"`)
console.log()

if (test.goal === null || test.goal === '' || test.goal === test.selector) {
  console.log('✅ Goal ist bereits korrekt — nichts zu tun.')
  process.exit(0)
}

// 2. Goal auf null setzen (= Selektorelement ist das Goal)
const { error } = await supabase
  .from('tests')
  .update({ goal: null })
  .eq('snippet_key', SNIPPET_KEY)

if (error) {
  console.error(`❌ Update fehlgeschlagen: ${error.message}`)
  process.exit(1)
}

console.log('✅ Goal auf null gesetzt.')
console.log('   Klicks auf den Button tracken jetzt Conversions.')
console.log('   normGoal(null, selector) → selector → e.target.closest(selector) matched.')
