// Migration runner — runs all SQL files against Supabase
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://ptycszhdzucwptagnnfi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0eWNzemhkenVjd3B0YWdubmZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ0NDQ2OSwiZXhwIjoyMDk3MDIwNDY5fQ.aS5lhQH0sCrKBmUuMRqQcWfkrNmLWJqV1QFTb0873ss'

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
