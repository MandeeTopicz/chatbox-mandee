/**
 * Register the Weather plugin.
 * Usage: npx tsx scripts/seed-weather-plugin.ts
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const PLUGIN = {
  name: 'weather',
  url: `${baseUrl}/plugins/weather/index.html`,
  allowed: true,
  tool_schemas: [
    {
      name: 'get_weather',
      description: 'Get current weather conditions for a city. Returns temperature, humidity, wind speed, and description. Use when the student asks about weather in a specific location.',
      input_schema: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'City name (e.g., "New York", "London", "Tokyo")',
          },
        },
        required: ['city'],
      },
    },
  ],
}

async function seed() {
  const { data, error } = await supabase
    .from('plugins')
    .upsert(PLUGIN, { onConflict: 'name' })
    .select('id, name')
    .single()

  if (error) {
    console.error('Failed:', error.message)
    process.exit(1)
  }

  console.log(`  weather (${data.id})`)
  console.log(`    URL: ${PLUGIN.url}`)
  console.log('    Tools: get_weather')
  console.log('\nDone.')
}

seed()
