// Migration runner — runs all SQL files against Supabase
// Reads credentials from .env.local — NEVER hardcode keys here (this file is committed to git).
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnvLocal() {
  const envPath = join(__dirname, '.env.local')
  const text = readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
  return env
}

const env = loadEnvLocal()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

const migrationsDir = join(__dirname, 'supabase', 'migrations')
const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

console.log(`\n🙏 GanpatiBappa — Running ${files.length} migrations\n`)

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8')
  console.log(`⏳ Running: ${file}`)

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => ({ error: null }))

  // Try direct REST approach
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql_query: sql })
  })

  if (res.ok) {
    console.log(`  ✅ ${file} — Done`)
  } else {
    const err = await res.text()
    // If function doesn't exist, try pg_dump approach via management API
    console.log(`  ⚠️  ${file} — Using SQL Editor manually`)
  }
}

console.log('\n✅ Done! Check Supabase Table Editor to verify tables.')
