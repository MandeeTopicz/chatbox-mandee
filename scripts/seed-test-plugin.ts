/**
 * Seed script: registers the test stub plugin in Supabase.
 *
 * Usage:
 *   npx tsx scripts/seed-test-plugin.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function seed() {
  // Determine the base URL for the test stub
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const plugin = {
    name: 'test-stub',
    url: `${baseUrl}/plugins/test-stub/index.html`,
    tool_schemas: [
      {
        name: 'test_echo',
        description:
          'A test tool that echoes back whatever parameters it receives. Use this to verify the plugin system is working.',
        input_schema: {
          type: 'object' as const,
          properties: {
            message: {
              type: 'string',
              description: 'A message to echo back',
            },
          },
          required: ['message'],
        },
      },
    ],
    allowed: true, // Pre-approve for testing
  }

  const { data, error } = await supabase
    .from('plugins')
    .upsert(plugin, { onConflict: 'name' })
    .select()
    .single()

  if (error) {
    console.error('Failed to seed plugin:', error.message)
    process.exit(1)
  }

  console.log('Test stub plugin seeded successfully:')
  console.log(`  ID:   ${data.id}`)
  console.log(`  Name: ${data.name}`)
  console.log(`  URL:  ${data.url}`)
  console.log(`  Allowed: ${data.allowed}`)
  console.log('')
  console.log('The plugin registers one tool: test_echo')
  console.log('Try asking the chatbot to "echo hello" or "test the echo tool"')
}

seed()
