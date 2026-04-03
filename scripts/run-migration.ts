/**
 * Runs migration 002 against Supabase by executing each statement
 * via a temporary PL/pgSQL function using the service role client.
 *
 * Usage: npx tsx scripts/run-migration.ts
 */
import { readFileSync } from 'fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' },
})

const sql = readFileSync('supabase/migrations/002_schools_multirole.sql', 'utf-8')

// Split SQL into individual statements (split on semicolons, ignoring those inside $$ blocks)
function splitStatements(rawSql: string): string[] {
  const stmts: string[] = []
  let current = ''
  let inDollarBlock = false

  const lines = rawSql.split('\n')
  for (const line of lines) {
    // Skip pure comment lines
    if (line.trim().startsWith('--') && !inDollarBlock) {
      continue
    }

    if (line.includes('$$')) {
      const dollarCount = (line.match(/\$\$/g) || []).length
      if (dollarCount % 2 === 1) {
        inDollarBlock = !inDollarBlock
      }
    }

    current += line + '\n'

    if (!inDollarBlock && line.trim().endsWith(';')) {
      const stmt = current.trim()
      if (stmt && stmt !== ';') {
        stmts.push(stmt)
      }
      current = ''
    }
  }

  if (current.trim()) {
    stmts.push(current.trim())
  }

  return stmts
}

async function run() {
  // First, create an exec_sql function if it doesn't exist
  const createFn = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ sql_text: 'SELECT 1' }),
  })

  if (createFn.status === 404) {
    // Function doesn't exist, create it
    console.log('Creating exec_sql helper function...')

    // We need to create the function via a different approach
    // Let's try using the SQL endpoint on the project
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '')

    // Try the v1 query endpoint
    const queryRes = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({}),
    })

    console.log('Cannot create helper function via REST API.')
    console.log('')
    console.log('Please run the migration manually:')
    console.log('1. Go to your Supabase Dashboard -> SQL Editor')
    console.log('2. Create a new query')
    console.log('3. Paste the contents of: supabase/migrations/002_schools_multirole.sql')
    console.log('4. Click "Run"')
    console.log('5. Then run: npx tsx scripts/seed-demo.ts')
    console.log('')
    console.log('The migration file is at:')
    console.log('  supabase/migrations/002_schools_multirole.sql')
    process.exit(1)
  }

  // If we get here, exec_sql exists
  const statements = splitStatements(sql)
  console.log(`Running ${statements.length} statements...`)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const shortStmt = stmt.slice(0, 60).replace(/\n/g, ' ')

    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ sql_text: stmt }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[${i + 1}] FAILED: ${shortStmt}...`)
      console.error(`  Error: ${err.slice(0, 200)}`)
    } else {
      console.log(`[${i + 1}] OK: ${shortStmt}...`)
    }
  }

  console.log('\nDone!')
}

run()
